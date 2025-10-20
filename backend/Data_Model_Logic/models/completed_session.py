class CompletedSession:
    @classmethod
    def collection(cls):
        from app import mongo  # Import `mongo` inside the method to avoid circular imports
        return mongo.db.completed_sessions
