from typing import Optional, Dict, Any, List
from pymongo.collection import Collection
from bson import ObjectId
from pymongo import ASCENDING
from datetime import datetime

class UsersRepository:
    """Database access layer for users - no business logic"""

    def __init__(self, db):
        self.collection: Collection = db.users
        self._ensure_indexes()

    def _ensure_indexes(self):
        """Create unique indexes for username and email - SpeakEase MongoDB pattern"""
        try:
            self.collection.create_index([("username", ASCENDING)], unique=True, name="ux_username")
            self.collection.create_index([("email", ASCENDING)], unique=True, name="ux_email")
        except Exception:
            # Indexes might already exist
            pass

    # ---- CREATE ----
    def create(self, user_data: Dict[str, Any]) -> str:
        """Insert new user document"""
        user_data["created_at"] = datetime.utcnow()
        result = self.collection.insert_one(user_data)
        return str(result.inserted_id)

    # ---- READ ----
    def find_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Find user by username - SpeakEase PyMongo pattern"""
        return self.collection.find_one({"username": username})

    def find_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find user by email"""
        return self.collection.find_one({"email": email})

    def exists_by_username(self, username: str) -> bool:
        """Check if username exists"""
        return self.collection.count_documents({"username": username}) > 0

    def exists_by_email(self, email: str) -> bool:
        """Check if email exists"""
        return self.collection.count_documents({"email": email}) > 0

    # ---- UPDATE ----
    def update_by_username(self, username: str, update_data: Dict[str, Any]) -> bool:
        """Update user by username - following SpeakEase update patterns"""
        print(f"Repository updating user '{username}' with data: {update_data}")
        result = self.collection.update_one(
            {"username": username}, 
            {"$set": update_data}
        )
        print(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
        return result.modified_count > 0

    # ---- DELETE ----
    def delete_by_username(self, username: str) -> bool:
        """Delete user by username"""
        result = self.collection.delete_one({"username": username})
        return result.deleted_count > 0