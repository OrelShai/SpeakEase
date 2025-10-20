# Video_Meeting_Controller/meeting_controller.py
from __future__ import annotations
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from statistics import mean

from Data_Model_Logic.repositories.session_items_repo import SessionItemsRepo
from Data_Model_Logic.repositories.completed_sessions_repo import CompletedSessionsRepo

# Schemas for validation
from Data_Model_Logic.models.session_item_models import SessionItemCreate, AnalyzerResult
from Data_Model_Logic.models.completed_session_models import (
    CompletedSessionCreate,
    OverallScore,
    CategoryScore,
    AnalyzerResultFinal,
)

class MeetingController:
    """
    Aggregates per-item analyzer results into a final completed session document.
    Uses Pydantic schemas for validation before writing to DB.
    """

    def __init__(
        self,
        sessions_repo: CompletedSessionsRepo,
        items_repo: SessionItemsRepo,
        weights: Dict[str, Any],
        delete_items_on_finalize: bool = False,
    ):
        self.sessions_repo = sessions_repo
        self.items_repo = items_repo
        self.weights = weights
        self.delete_items_on_finalize = delete_items_on_finalize

    # ---------- Ingestion: save a single item (idempotent by (session_id, idx)) ----------
    def add_item(
        self,
        *,
        session_id: str,
        username: str,
        scenario_id: str,
        idx: int,
        video_url: str,
        analyzers: Dict[str, Dict[str, Any]],
        timestamp: Optional[datetime] = None,
    ) -> None:
        """
        Validates per-item payload and upserts into session_items.
        `analyzers` is a mapping: name -> {score, confidence, version}
        """
        timestamp = timestamp or datetime.now(timezone.utc)

        # Validate analyzer blocks using AnalyzerResult
        validated_analyzers: Dict[str, AnalyzerResult] = {}
        for name, payload in analyzers.items():
            validated_analyzers[name] = AnalyzerResult(**payload)

        # Build and validate the item via Pydantic
        item = SessionItemCreate(
            session_id=session_id,
            username=username,
            scenario_id=scenario_id,
            idx=idx,
            video_url=video_url,
            analyzers={k: v for k, v in validated_analyzers.items()},
            timestamp=timestamp,
        )

        # Persist (idempotent by (session_id, idx))
        self.items_repo.upsert_item(item.dict())

    # ---------- Finalization: aggregate items into a completed session ----------
    def finalize_session(
        self,
        *,
        session_id: str,
        username: str,
        scenario_id: str,
        video_url: str,
        timestamp: Optional[datetime] = None,
        pipeline_version: str = "unknown",
    ) -> str:
        """
        Reads all items for `session_id`, aggregates them with weights, and writes completed session.
        Returns the inserted completed_session id.
        """
        timestamp = timestamp or datetime.now(timezone.utc)

        items = self.items_repo.list_by_session(session_id)
        if not items:
            raise ValueError("No session items found for the given session_id")

        # 1) Aggregate analyzers (confidence-weighted)
        analyzers_final = self._aggregate_analyzers(items)  # analyzer -> AnalyzerResultFinal

        # 2) Aggregate categories from analyzers using configured weights
        categories = self._aggregate_categories(analyzers_final)

        # 3) Aggregate overall from categories
        overall_score = self._aggregate_overall(categories)

        # 4) Build summary text
        summary_text = self._build_summary(categories, analyzers_final)

        # 5) Validate final document with Pydantic
        completed = CompletedSessionCreate(
            username=username,
            scenario_id=scenario_id,
            session_id=session_id,
            timestamp=timestamp,
            video_url=video_url,
            overall=OverallScore(score=overall_score, confidence=0.93),
            categories={k: CategoryScore(**v) for k, v in categories.items()},
            analyzers={
                k: AnalyzerResultFinal(**v) for k, v in analyzers_final.items()
            },
            summary_text=summary_text,
            meta={
                "schema_version": 2,
                "pipeline_version": pipeline_version,
                "weights": self.weights,
                "num_items": len(items),
            },
        )

        # 6) Persist completed session
        completed_id = self.sessions_repo.insert_completed(completed.dict())

        # 7) Optionally delete raw items
        if self.delete_items_on_finalize:
            self.items_repo.delete_session_items(session_id)

        return completed_id, completed.dict()

    # ---------- Helpers: aggregation ----------

    def _aggregate_analyzers(self, items: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Confidence-weighted mean across items for each analyzer.
        Returns: analyzer_name -> {score, confidence, version}
        """
        buckets: Dict[str, List[Tuple[float, float, str]]] = {}
        for it in items:
            for name, payload in it.get("analyzers", {}).items():
                sc = payload.get("score")
                cf = payload.get("confidence", 1.0)
                ver = payload.get("version", "")
                if sc is None:
                    continue
                buckets.setdefault(name, []).append((float(sc), float(cf), str(ver)))

        out: Dict[str, Dict[str, Any]] = {}
        for name, triplets in buckets.items():
            scores = [s for s, _, _ in triplets]
            confs = [c for _, c, _ in triplets]
            vers  = [v for _, _, v in triplets]

            score = self._cw_mean(scores, confs)
            conf  = round(mean(confs), 3) if confs else 1.0
            ver   = vers[-1] if vers else ""

            out[name] = {"score": score, "confidence": conf, "version": ver}
        return out

    def _aggregate_categories(self, analyzers: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Optional[float]]]:
        """
        Applies category weights over analyzers to compute category scores.
        """
        cfg = self.weights.get("categories", {})
        categories: Dict[str, Dict[str, Optional[float]]] = {}
        for cat, mapping in cfg.items():
            terms, ws = [], []
            for an_name, w in mapping.items():
                an = analyzers.get(an_name)
                if an and an.get("score") is not None:
                    terms.append(float(an["score"]) * float(w))
                    ws.append(float(w))
            categories[cat] = {"score": round(sum(terms) / sum(ws), 2)} if ws else {"score": None}
        return categories

    def _aggregate_overall(self, categories: Dict[str, Dict[str, Optional[float]]]) -> float:
        """
        Applies overall weights over categories to compute the final score.
        """
        cfg = self.weights.get("overall", {})
        num, den = 0.0, 0.0
        for cat, w in cfg.items():
            sc = categories.get(cat, {}).get("score")
            if sc is not None:
                num += float(sc) * float(w)
                den += float(w)
        return round(num / den, 2) if den > 0 else 0.0

    def _cw_mean(self, values: List[float], weights: List[float]) -> float:
        """
        Confidence-weighted mean helper.
        """
        if not values:
            return 0.0
        wsum = sum(weights) if sum(weights) > 0 else float(len(values))
        return round(sum(v * w for v, w in zip(values, weights)) / wsum, 2)

    def _build_summary(self, categories: Dict[str, Dict[str, Optional[float]]],
                       analyzers: Dict[str, Dict[str, Any]]) -> str:
        """
        Builds a lightweight human-readable summary based on weak areas.
        """
        tips = []
        def below(name: str, th: float = 75.0) -> bool:
            v = analyzers.get(name, {}).get("score")
            return v is not None and float(v) < th

        if below("speech_style"):
            tips.append("Reduce filler words and keep sentences concise.")
        if below("tone"):
            tips.append("Slow down slightly and emphasize key points.")
        if below("eye_contact"):
            tips.append("Maintain stable eye contact with the camera.")
        if below("facial_expression"):
            tips.append("Use more expressive facial cues to convey engagement.")

        base = "Session summary: solid progress overall."
        return base + (" " + " ".join(tips) if tips else " Keep it up!")