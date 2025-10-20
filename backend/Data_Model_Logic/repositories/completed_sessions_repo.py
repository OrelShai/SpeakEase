# Data_Model_Logic/repositories/completed_sessions_repo.py
from typing import Dict, Any, List, Optional
from pymongo.collection import Collection
from pymongo import ASCENDING, DESCENDING
from bson import ObjectId

class CompletedSessionsRepo:
    """
    Stores the unified (final) session document produced by the MeetingController.
    """

    def __init__(self, db):
        self.col: Collection = db["completed_sessions"]
        # Indexes for history & lookups
        self.col.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)],
                              name="ix_user_ts")
        self.col.create_index([("scenario_id", ASCENDING), ("timestamp", DESCENDING)],
                              name="ix_scenario_ts")
        # Optional: if video_url is unique per session, set unique=True
        self.col.create_index([("video_url", ASCENDING)], name="ix_video_url")

    # ---- CRUD ----
    def insert_completed(self, doc: Dict[str, Any]) -> str:
        res = self.col.insert_one(doc)
        return str(res.inserted_id)

    def get_one(self, session_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"_id": ObjectId(session_id)}
        if user_id:
            query["user_id"] = user_id
        return self.col.find_one(query)

    def list_by_user(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        return list(
            self.col.find({"user_id": user_id})
                    .sort("timestamp", DESCENDING)
                    .limit(limit)
        )

    def update(self, session_id: str, patch: Dict[str, Any]) -> int:
        res = self.col.update_one({"_id": ObjectId(session_id)}, {"$set": patch})
        return res.modified_count

    def delete(self, session_id: str, user_id: Optional[str] = None) -> int:
        query: Dict[str, Any] = {"_id": ObjectId(session_id)}
        if user_id:
            query["user_id"] = user_id
        res = self.col.delete_one(query)
        return res.deleted_count
