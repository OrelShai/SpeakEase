# Data_Model_Logic/repositories/session_items_repo.py
from typing import Dict, Any, List
from pymongo.collection import Collection
from pymongo import ASCENDING
from bson import ObjectId

class SessionItemsRepo:
    """
    Stores per-question results (raw analyzers) for resiliency/debugging.
    Idempotent upsert by (session_id, idx).
    """

    def __init__(self, db):
        self.col: Collection = db["session_items"]
        # Indexes
        self.col.create_index([("session_id", ASCENDING), ("idx", ASCENDING)],
                              unique=True, name="ux_session_idx")
        self.col.create_index([("user_id", ASCENDING)], name="ix_user")
        self.col.create_index([("scenario_id", ASCENDING)], name="ix_scenario")

    def upsert_item(self, doc: Dict[str, Any]) -> None:
        """
        Expected doc keys:
          session_id (str), idx (int), user_id (str), scenario_id (str),
          video_url (str), analyzers (dict), timestamp (datetime)
        """
        key = {"session_id": doc["session_id"], "idx": int(doc["idx"])}
        self.col.update_one(key, {"$set": doc}, upsert=True)

    def list_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        return list(self.col.find({"session_id": session_id}).sort("idx", ASCENDING))

    def delete_session_items(self, session_id: str) -> int:
        res = self.col.delete_many({"session_id": session_id})
        return res.deleted_count
