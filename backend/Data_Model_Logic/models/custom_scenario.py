class CustomScenario:
    @classmethod
    # Returns a reference to the custom scenarioS collection in MongoDB.
    def collection(cls):
        from app import mongo  # Import `mongo` inside the method to avoid circular imports
        return mongo.db.user_custom_scenarios
