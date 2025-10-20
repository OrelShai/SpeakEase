# analyzers/head_pose.py
# ----------------------------
# Purpose:
#   Estimate head orientation (yaw/pitch/roll) per sampled frame using
#   MediaPipe FaceMesh + solvePnP, and score % of frames that are "forward".
#   "Forward" uses an elliptical gate:
#     (|yaw|/yaw_thresh)^2 + (|pitch|/pitch_thresh)^2 <= 1
#
# Enhancements:
#   - Camera-left/right ordering by X
#   - Yaw unwrapping around ±180°
#   - Temporal smoothing (majority filter)
#   - Optional yaw/pitch biases (calibration)
#   - SOFT margin near ellipse boundary with continuous per-frame weights
#   - Optional display normalization (floor/ceil anchors)
# ----------------------------

from typing import Optional, Dict, Tuple, List
import time
import math
import numpy as np
import cv2
import mediapipe as mp

from Performance_Analyzer.analyzers.base import BaseAnalyzer
from Performance_Analyzer.schemas import MetricResult


class HeadPoseAnalyzer(BaseAnalyzer):
    metric  = "head_pose"
    model   = "FaceMesh+PnP"
    version = "0.3.0"  # bumped due to soft-margin + optional display normalization

    # MediaPipe landmark indices:
    IDX_NOSE_TIP        = 1
    IDX_CHIN            = 199
    IDX_EYE_RIGHT_OUTER = 33
    IDX_EYE_LEFT_OUTER  = 263
    IDX_MOUTH_RIGHT     = 61
    IDX_MOUTH_LEFT      = 291

    def __init__(self, config: Optional[Dict] = None):
        super().__init__(config)
        # Sampling
        self.frame_stride: int = int(self.config.get("frame_stride", 3))
        # Thresholds for "forward" classification (degrees)
        self.yaw_thresh:   float = float(self.config.get("yaw_thresh",   18.0))
        self.pitch_thresh: float = float(self.config.get("pitch_thresh", 25.0))
        # Optional biases (per-user/camera calibration)
        self.yaw_bias:     float = float(self.config.get("yaw_bias",   0.0))
        self.pitch_bias:   float = float(self.config.get("pitch_bias", 0.0))
        # Temporal smoothing (majority filter)
        self.smooth_window: int = int(self.config.get("smooth_window", 7))
        # Soft margin around ellipse (fraction of radius). Example: 0.30 → 30% wider shell.
        self.soft_margin: float = float(self.config.get("soft_margin", 0.30))
        # Score mode: "soft" (weighted) or "binary" (inside ellipse only)
        self.score_mode: str = str(self.config.get("score_mode", "soft")).lower()
        # Optional display normalization (ratio anchors). If None → disabled.
        self.display_floor = self.config.get("display_floor", None)  # e.g., 0.20
        self.display_ceil  = self.config.get("display_ceil",  None)  # e.g., 0.85
        # MP confidences
        self.min_detection_confidence: float = float(self.config.get("min_detection_confidence", 0.5))
        self.min_tracking_confidence:  float = float(self.config.get("min_tracking_confidence", 0.5))
        self.mp_face_mesh = mp.solutions.face_mesh

    @staticmethod
    def _rvec_to_euler_deg(rvec: np.ndarray) -> Tuple[float, float, float]:
        R, _ = cv2.Rodrigues(rvec)
        sy = math.sqrt(R[0,0]*R[0,0] + R[1,0]*R[1,0])
        singular = sy < 1e-6
        if not singular:
            pitch = math.degrees(math.atan2(-R[2,0], sy))
            yaw   = math.degrees(math.atan2(R[1,0], R[0,0]))
            roll  = math.degrees(math.atan2(R[2,1], R[2,2]))
        else:
            pitch = math.degrees(math.atan2(-R[2,0], sy))
            yaw   = math.degrees(math.atan2(-R[0,1], R[1,1]))
            roll  = 0.0
        return yaw, pitch, roll

    @staticmethod
    def _unwrap_yaw(yaw_deg: float) -> float:
        y = ((yaw_deg + 180.0) % 360.0) - 180.0
        if abs(y) > 90.0:
            y = math.copysign(180.0 - abs(y), y)
        return y

    def _image_points(self, lm, w: int, h: int) -> Optional[np.ndarray]:
        try:
            nose  = (lm[self.IDX_NOSE_TIP].x  * w, lm[self.IDX_NOSE_TIP].y  * h)
            chin  = (lm[self.IDX_CHIN].x      * w, lm[self.IDX_CHIN].y      * h)
            eye_a = (lm[self.IDX_EYE_RIGHT_OUTER].x * w,  lm[self.IDX_EYE_RIGHT_OUTER].y * h)
            eye_b = (lm[self.IDX_EYE_LEFT_OUTER].x  * w,  lm[self.IDX_EYE_LEFT_OUTER].y  * h)
            eye_left, eye_right = sorted([eye_a, eye_b], key=lambda p: p[0])
            mouth_a = (lm[self.IDX_MOUTH_RIGHT].x * w,  lm[self.IDX_MOUTH_RIGHT].y * h)
            mouth_b = (lm[self.IDX_MOUTH_LEFT].x  * w,  lm[self.IDX_MOUTH_LEFT].y  * h)
            mouth_left, mouth_right = sorted([mouth_a, mouth_b], key=lambda p: p[0])
            pts = np.array([nose, chin, eye_left, eye_right, mouth_left, mouth_right], dtype=np.float32)
            return pts
        except Exception:
            return None

    def _model_points(self) -> np.ndarray:
        return np.array([
            [  0.0,   0.0,    0.0  ],   # Nose tip
            [  0.0, -63.6,  -12.5 ],   # Chin
            [ -43.3, 32.7,  -26.0 ],   # CAM-LEFT eye outer
            [  43.3, 32.7,  -26.0 ],   # CAM-RIGHT eye outer
            [ -28.9,-28.9,  -24.1 ],   # CAM-LEFT mouth corner
            [  28.9,-28.9,  -24.1 ],   # CAM-RIGHT mouth corner
        ], dtype=np.float32)

    @staticmethod
    def _majority_filter(xs: List[bool], win: int = 5) -> List[bool]:
        if not xs or win <= 1:
            return xs
        k = win // 2
        out: List[bool] = []
        for i in range(len(xs)):
            lo, hi = max(0, i - k), min(len(xs), i + k + 1)
            window = xs[lo:hi]
            out.append(sum(1 for v in window if v) > (len(window) // 2))
        return out

    def _soft_weight(self, ey: float, ep: float) -> float:
        """
        Continuous weight in [0..1] based on distance from ellipse center.
        d = sqrt( (yaw/yaw_th)^2 + (pitch/pitch_th)^2 )
        - if d <= 1: weight 1.0
        - if 1 < d <= 1+soft_margin: linear decay to 0 at 1+soft_margin
        - else: 0
        """
        d = math.sqrt(ey*ey + ep*ep)
        if d <= 1.0:
            return 1.0
        limit = 1.0 + max(0.0, self.soft_margin)
        if d <= limit:
            return (limit - d) / max(1e-6, (limit - 1.0))
        return 0.0

    def analyze(self, video_path: str) -> MetricResult:
        start = time.time()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return MetricResult(
                metric=self.metric, score=0.0, confidence=None,
                model=self.model, version=self.version,
                duration_ms=int((time.time() - start) * 1000),
                errors=[f"Failed to open video: {video_path}"],
            )

        processed = 0
        forward_frames_binary = 0
        weight_sum = 0.0
        yaw_list: List[float] = []
        pitch_list: List[float] = []
        roll_list: List[float] = []
        binary_flags: List[bool] = []  # inside-ellipse decisions (pre-smoothing)
        debug_samples: List[Dict] = []
        stride = max(1, self.frame_stride)

        model_pts = self._model_points()

        with self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=self.min_detection_confidence,
            min_tracking_confidence=self.min_tracking_confidence,
        ) as face_mesh:

            frame_idx = 0
            while True:
                ok, frame_bgr = cap.read()
                if not ok:
                    break

                if frame_idx % stride != 0:
                    frame_idx += 1
                    continue

                h, w = frame_bgr.shape[:2]
                frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
                res = face_mesh.process(frame_rgb)

                if res.multi_face_landmarks:
                    lm = res.multi_face_landmarks[0].landmark
                    img_pts = self._image_points(lm, w, h)
                    if img_pts is None:
                        frame_idx += 1
                        continue

                    # Camera intrinsics approximation
                    f = (w + h) / 2.0
                    cx, cy = (w / 2.0), (h / 2.0)
                    K = np.array([[f, 0, cx],
                                  [0, f, cy],
                                  [0, 0, 1]], dtype=np.float32)
                    dist = np.zeros((4, 1), dtype=np.float32)

                    ok_pnp, rvec, tvec = cv2.solvePnP(
                        model_pts, img_pts, K, dist,
                        flags=cv2.SOLVEPNP_ITERATIVE
                    )
                    if not ok_pnp:
                        frame_idx += 1
                        continue

                    yaw, pitch, roll = self._rvec_to_euler_deg(rvec)
                    yaw = self._unwrap_yaw(yaw)

                    # Apply biases
                    yaw   -= self.yaw_bias
                    pitch -= self.pitch_bias

                    yaw_list.append(yaw)
                    pitch_list.append(pitch)
                    roll_list.append(roll)

                    processed += 1

                    # Elliptical gating
                    ey = abs(yaw)   / max(1e-6, self.yaw_thresh)
                    ep = abs(pitch) / max(1e-6, self.pitch_thresh)
                    inside = (ey*ey + ep*ep) <= 1.0
                    if inside:
                        forward_frames_binary += 1
                    binary_flags.append(inside)

                    # Soft weighting
                    weight_sum += self._soft_weight(ey, ep)

                    if len(debug_samples) < 5:
                        debug_samples.append({"frame": frame_idx, "yaw": yaw, "pitch": pitch, "roll": roll})

                frame_idx += 1

        cap.release()
        duration_ms = int((time.time() - start) * 1000)

        if processed == 0:
            return MetricResult(
                metric=self.metric, score=0.0, confidence=None,
                model=self.model, version=self.version,
                duration_ms=duration_ms,
                errors=["No frames processed or face not detected."],
            )

        # Binary smoothing (for stability diagnostics)
        binary_smoothed = self._majority_filter(binary_flags, win=self.smooth_window)
        forward_frames_smoothed = sum(1 for v in binary_smoothed if v)
        processed_smoothed = len(binary_smoothed)

        # Ratios
        binary_raw_ratio      = forward_frames_binary      / processed
        binary_smoothed_ratio = forward_frames_smoothed    / max(1, processed_smoothed)
        soft_weight_ratio     = weight_sum                 / processed

        # Choose ratio according to score_mode
        if self.score_mode == "binary":
            ratio = binary_smoothed_ratio
            chosen_mode = "binary_smoothed"
        else:
            ratio = soft_weight_ratio
            chosen_mode = "soft_weighted"

        # Optional display normalization
        if (self.display_floor is not None) and (self.display_ceil is not None):
            lo = float(self.display_floor)
            hi = float(self.display_ceil)
            if hi <= lo:
                norm_ratio = ratio  # bad config → ignore
            else:
                norm_ratio = (ratio - lo) / (hi - lo)
                norm_ratio = max(0.0, min(1.0, norm_ratio))
            score = round(norm_ratio * 100.0, 2)
        else:
            score = round(ratio * 100.0, 2)

        # Confidence heuristic: fraction of sampled frames that yielded usable landmarks
        confidence = round(min(1.0, processed / max(1, (frame_idx // stride) or 1)), 3)

        def _stats(xs: List[float]) -> Dict[str, float]:
            arr = np.array(xs, dtype=np.float32)
            return {
                "mean": float(arr.mean()) if arr.size else 0.0,
                "std":  float(arr.std())  if arr.size else 0.0,
                "min":  float(arr.min())  if arr.size else 0.0,
                "max":  float(arr.max())  if arr.size else 0.0,
            }

        details = {
            "frames_used": processed_smoothed,
            "forward_frames": forward_frames_smoothed,
            "ratio": ratio,  # chosen ratio
            "samples": debug_samples,
            "params": {
                "frame_stride": self.frame_stride,
                "yaw_thresh": self.yaw_thresh,
                "pitch_thresh": self.pitch_thresh,
                "smooth_window": self.smooth_window,
                "yaw_bias": self.yaw_bias,
                "pitch_bias": self.pitch_bias,
                "soft_margin": self.soft_margin,
                "score_mode": self.score_mode,
                "display_floor": self.display_floor,
                "display_ceil": self.display_ceil,
            },
            "postprocess": {
                "binary_raw_ratio":      binary_raw_ratio,
                "binary_smoothed_ratio": binary_smoothed_ratio,
                "soft_weight_ratio":     soft_weight_ratio,
                "chosen_mode":           chosen_mode,
            },
            "yaw_stats":   _stats(yaw_list),
            "pitch_stats": _stats(pitch_list),
            "roll_stats":  _stats(roll_list),
        }

        return MetricResult(
            metric=self.metric, score=score, confidence=confidence,
            model=self.model, version=self.version,
            duration_ms=duration_ms, details=details
        )
