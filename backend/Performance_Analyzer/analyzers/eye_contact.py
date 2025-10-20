# analyzers/eye_contact.py
# ----------------------------
# Purpose:
#   Estimate Eye Contact % across the video using MediaPipe FaceMesh with iris landmarks.
#
# Approach (MVP heuristic):
#   - Sample every Nth frame (frame_stride) for speed.
#   - For each sampled frame:
#       * Run FaceMesh (refine_landmarks=True) to get eye + iris landmarks
#       * Compute the centroid of the eye region and the iris region
#       * Compute normalized offset (distance / (half eye width))
#       * If offset <= forward_thresh, count as "looking forward"
#   - Score = % of sampled frames that were "forward"
#   - Confidence = simple proxy: fraction of frames successfully processed
#
# Notes:
#   - This is a practical MVP. You can later refine using head pose, face orientation,
#     or per-user calibration.
# ----------------------------

import time
from collections import defaultdict
from typing import List, Set, Tuple, Dict, Iterable, Optional

import cv2
import numpy as np
import mediapipe as mp

from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult


class EyeContactAnalyzer(BaseAnalyzer):
    """
    Concrete analyzer that returns eye-contact percentage across the video.
    """
    metric = "eye_contact"
    model = "MediaPipeFaceMesh"
    version = "1.0.0"

    def __init__(self, config: Optional[Dict] = None):
        super().__init__(config)
        # Sampling stride: process every Nth frame to reduce CPU usage
        self.frame_stride: int = int(self.config.get("frame_stride", 5))
        # Threshold for deciding "forward" gaze (normalized by half eye width)
        self.forward_thresh: float = float(self.config.get("forward_thresh", 0.35))
        # MediaPipe detection/tracking confidences
        self.min_detection_confidence: float = float(self.config.get("min_detection_confidence", 0.5))
        self.min_tracking_confidence: float = float(self.config.get("min_tracking_confidence", 0.5))

        self.require_both_eyes   = bool(self.config.get("require_both_eyes", True))
        self.max_eye_width_ratio = float(self.config.get("max_eye_width_ratio", 1.6))
        self.dynamic_thresh      = bool(self.config.get("dynamic_thresh", True))
        self.vertical_weight = float(self.config.get("vertical_weight", 0.7))
        self.smooth_window = int(self.config.get("smooth_window", 5))



        # MediaPipe FaceMesh solution (provides face + iris landmarks)
        self.mp_face_mesh = mp.solutions.face_mesh

    # ---------- Internal helpers ----------

    @staticmethod
    def _components_from_connections(conns: Iterable[Tuple[int, int]]) -> List[Set[int]]:
        """
        Build connected components (sets of landmark indices) from MediaPipe connection pairs.
        Why:
          MediaPipe provides pairs (edges). We group them into index sets so we can
          extract the points for left/right eyes or irises, even if the underlying
          graph contains multiple small groups.
        """
        graph: Dict[int, Set[int]] = defaultdict(set)
        for a, b in conns:
            graph[a].add(b)
            graph[b].add(a)
            graph[a].add(a)  # ensure node appears in its own adjacency
            graph[b].add(b)

        visited: Set[int] = set()
        comps: List[Set[int]] = []
        for node in list(graph.keys()):
            if node in visited:
                continue
            stack = [node]
            comp: Set[int] = set()
            while stack:
                v = stack.pop()
                if v in visited:
                    continue
                visited.add(v)
                comp.add(v)
                stack.extend(list(graph[v] - visited))
            comps.append(comp)
        return comps

    @staticmethod
    def _centroid(pts: np.ndarray) -> np.ndarray:
        """
        Compute centroid (x,y) of Nx2 points. Returns [nan, nan] if empty.
        """
        return pts.mean(axis=0) if len(pts) else np.array([np.nan, np.nan])

    def _eye_contact_for_landmarks(self, h: int, w: int, landmarks) -> Tuple[bool, Dict]:
        """
        Decide whether the current frame counts as "eye contact".

        Returns:
          (is_forward, debug_details)
        """
        fm = self.mp_face_mesh

        # Build index sets for left/right eyes and irises
        left_eye_idx_sets = self._components_from_connections(fm.FACEMESH_LEFT_EYE)
        right_eye_idx_sets = self._components_from_connections(fm.FACEMESH_RIGHT_EYE)
        iris_idx_sets = self._components_from_connections(fm.FACEMESH_IRISES)

        # Pick the largest components as the main sets
        left_eye_idx = max(left_eye_idx_sets, key=len) if left_eye_idx_sets else set()
        right_eye_idx = max(right_eye_idx_sets, key=len) if right_eye_idx_sets else set()

        # FACEMESH_IRISES typically yields two components (left & right irises)
        iris_left_idx, iris_right_idx = (set(), set())
        if len(iris_idx_sets) >= 2:
            comps_sorted = sorted(iris_idx_sets, key=len, reverse=True)[:2]
            iris_left_idx, iris_right_idx = comps_sorted[0], comps_sorted[1]
        elif len(iris_idx_sets) == 1:
            iris_left_idx = iris_idx_sets[0]  # best effort

        # Convert normalized landmarks (x,y in [0..1]) to pixel coordinates
        def idx_to_xy(index_set: Set[int]) -> np.ndarray:
            pts = []
            for idx in index_set:
                lm = landmarks[idx]
                pts.append([lm.x * w, lm.y * h])
            return np.array(pts, dtype=np.float32)

        left_eye_pts = idx_to_xy(left_eye_idx)
        right_eye_pts = idx_to_xy(right_eye_idx)
        iris_left_pts = idx_to_xy(iris_left_idx)
        iris_right_pts = idx_to_xy(iris_right_idx)

        # Compute centroids for eyes and irises
        left_eye_ctr = self._centroid(left_eye_pts)
        right_eye_ctr = self._centroid(right_eye_pts)
        iris_left_ctr = self._centroid(iris_left_pts)
        iris_right_ctr = self._centroid(iris_right_pts)

        # Estimate eye width for normalization
        def eye_width(eye_pts: np.ndarray) -> float:
            if len(eye_pts) == 0:
                return np.nan
            xs = eye_pts[:, 0]
            return float(xs.max() - xs.min())

        lw = eye_width(left_eye_pts)
        rw = eye_width(right_eye_pts)

        # Normalized offset = distance(iris_center, eye_center) / (eye_width/2)
        def norm_offset_components(eye_ctr: np.ndarray, iris_ctr: np.ndarray, width: float) -> Tuple[float, float, float]:
            if np.isnan(width) or width <= 1e-6 or np.isnan(eye_ctr).any() or np.isnan(iris_ctr).any():
                return np.inf, np.inf, np.inf
            dx = float(iris_ctr[0] - eye_ctr[0])
            dy = float(iris_ctr[1] - eye_ctr[1])
            half_w = width / 2.0
            # Normalize by half eye-width
            dxn = abs(dx) / half_w
            dyn = abs(dy) / half_w
            # Merge with horizontal-heavy weighting (penalize sideways more than up/down)
            k_vert = getattr(self, "vertical_weight", 0.7)  # <--- add to __init__: self.vertical_weight = float(self.config.get("vertical_weight", 0.7))
            merged = float(np.hypot(dxn, k_vert * dyn))
            return merged, dxn, dyn

        left_off,  left_dx,  left_dy  = norm_offset_components(left_eye_ctr,  iris_left_ctr,  lw)
        right_off, right_dx, right_dy = norm_offset_components(right_eye_ctr, iris_right_ctr, rw)


        # Require valid eye widths
        if not (np.isfinite(lw) and np.isfinite(rw)) or lw <= 1e-6 or rw <= 1e-6:
            return False, {"reason": "invalid_eye_widths"}

        # Eye-width ratio (when head turns, one eye appears wider)
        width_ratio = max(lw, rw) / max(1e-6, min(lw, rw))

        # Effective threshold: stricter when head is likely turned
        eff_thresh = self.forward_thresh
        if self.dynamic_thresh:
            # Example: ratio 1.0 => no change; ratio 1.6 => stricter threshold
            eff_thresh = max(0.15, self.forward_thresh / width_ratio)

        # Check each eye against the effective threshold
        left_ok  = np.isfinite(left_off)  and (left_off  <= eff_thresh)
        right_ok = np.isfinite(right_off) and (right_off <= eff_thresh)

        if self.require_both_eyes:
            # Require both eyes valid + moderate width ratio
            is_forward = left_ok and right_ok and (width_ratio <= self.max_eye_width_ratio)
            avg_off = None  # No average in this mode
        else:
            # Soft mode: use average of available eyes; still gate by width_ratio
            if np.isfinite(left_off) and np.isfinite(right_off):
                avg_off = float((left_off + right_off) / 2.0)
            else:
                avg_off = left_off if np.isfinite(left_off) else right_off
            is_forward = (avg_off is not None and avg_off <= eff_thresh) and (width_ratio <= self.max_eye_width_ratio)

        debug = {
            "left_offset": left_off if np.isfinite(left_off) else None,
            "right_offset": right_off if np.isfinite(right_off) else None,
            "avg_offset": avg_off,
            "width_ratio": width_ratio,
            "effective_thresh": eff_thresh,
            "used_rule": "both" if self.require_both_eyes else "avg",
            "left_dxn": left_dx if np.isfinite(left_dx) else None,
            "left_dyn": left_dy if np.isfinite(left_dy) else None,
            "right_dxn": right_dx if np.isfinite(right_dx) else None,
            "right_dyn": right_dy if np.isfinite(right_dy) else None,
        }
        return is_forward, debug


    # ---------- Public API ----------

    def analyze(self, video_path: str) -> MetricResult:
        """
        Run eye-contact analysis on a given video path.

        Returns:
        MetricResult containing:
            - score: eye-contact percentage (0..100) AFTER temporal smoothing
            - confidence: fraction of frames successfully processed
            - details: sample debug data (first few frames), parameters, counts
        """
        start = time.time()

        # Open the video file
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return MetricResult(
                metric=self.metric,
                score=0.0,
                confidence=None,
                model=self.model,
                version=self.version,
                duration_ms=int((time.time() - start) * 1000),
                errors=[f"Failed to open video: {video_path}"],
            )

        processed = 0        # number of sampled frames we actually analyzed
        forward_frames_raw = 0   # raw count before temporal smoothing (for diagnostics)
        debug_samples: List[Dict] = []  # a few sample frames for inspection
        stride = max(1, self.frame_stride)

        # NEW: collect per-sample boolean flags to enable temporal smoothing later
        flags: List[bool] = []

        # Run MediaPipe FaceMesh once; it maintains internal state
        with self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,  # required for iris landmarks
            min_detection_confidence=self.min_detection_confidence,
            min_tracking_confidence=self.min_tracking_confidence,
        ) as face_mesh:

            frame_idx = 0
            while True:
                ok, frame_bgr = cap.read()
                if not ok:
                    break  # end of video

                # Subsample frames for speed
                if frame_idx % stride != 0:
                    frame_idx += 1
                    continue

                h, w = frame_bgr.shape[:2]
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                res = face_mesh.process(frame_rgb)

                if res.multi_face_landmarks:
                    # Use the first detected face
                    lm = res.multi_face_landmarks[0].landmark
                    is_forward, dbg = self._eye_contact_for_landmarks(h, w, lm)

                    processed += 1
                    if is_forward:
                        forward_frames_raw += 1

                    # NEW: store the raw decision for smoothing
                    flags.append(bool(is_forward))

                    # Collect a few debug samples only (to avoid huge payloads)
                    if len(debug_samples) < 5:
                        dbg["frame"] = frame_idx
                        debug_samples.append(dbg)

                frame_idx += 1

        cap.release()
        duration_ms = int((time.time() - start) * 1000)

        if processed == 0:
            # No frames analyzed (e.g., no face detected at all)
            return MetricResult(
                metric=self.metric,
                score=0.0,
                confidence=None,
                model=self.model,
                version=self.version,
                duration_ms=duration_ms,
                errors=["No frames processed or face not detected."],
            )

        # NEW: temporal majority filter to reduce flicker (window size configurable)
        def majority_filter(xs: List[bool], win: int = 5) -> List[bool]:
            if not xs or win <= 1:
                return xs
            k = win // 2
            out: List[bool] = []
            for i in range(len(xs)):
                lo, hi = max(0, i - k), min(len(xs), i + k + 1)
                window = xs[lo:hi]
                out.append(sum(1 for v in window if v) > (len(window) // 2))
            return out

        smoothed = majority_filter(flags, win=self.smooth_window)
        forward_frames_smoothed = sum(1 for v in smoothed if v)
        processed_smoothed = len(smoothed)  # should equal 'processed'

        # Final metrics (AFTER smoothing)
        ratio = forward_frames_smoothed / max(1, processed_smoothed)
        score = round(ratio * 100.0, 2)

        # Confidence heuristic: fraction of sampled frames that yielded usable landmarks
        confidence = round(min(1.0, processed / max(1, frame_idx / stride)), 3)

        details = {
            "frames_used": processed_smoothed,
            "forward_frames": forward_frames_smoothed,
            "ratio": ratio,
            "samples": debug_samples,
            "postprocess": {
                "smoothing_window": self.smooth_window,
                "raw_forward_frames": forward_frames_raw,
                "raw_ratio": (forward_frames_raw / max(1, processed)),
            },
            "params": {
                "frame_stride": self.frame_stride,
                "forward_thresh": self.forward_thresh,
                "require_both_eyes": self.require_both_eyes,
                "max_eye_width_ratio": self.max_eye_width_ratio,
                "dynamic_thresh": self.dynamic_thresh,
            }
        }

        return MetricResult(
            metric=self.metric,
            score=score,
            confidence=confidence,
            model=self.model,
            version=self.version,
            duration_ms=duration_ms,
            details=details,
        )

