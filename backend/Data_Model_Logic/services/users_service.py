from typing import Optional, Dict, Any
from flask_jwt_extended import create_access_token

from ..repositories.users_repo import UsersRepository
from ..models.user_models import UserCreate, UserUpdate, UserOut, UserLogin

class UsersService:
    """Business logic layer for user operations"""

    def __init__(self, db):
        self.repository = UsersRepository(db)

    def register_user(self, user_data: UserCreate) -> Dict[str, str]:
        """Register new user with business validation"""
        # Business rule: Check uniqueness
        if self.repository.exists_by_username(user_data.username):
            raise ValueError("Username already exists")
        
        if self.repository.exists_by_email(user_data.email):
            raise ValueError("Email already registered")

        # Hash password
        hashed_password = self._hash_password(user_data.password)

        # Prepare data for storage
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "password": hashed_password
        }

        # Create user
        user_id = self.repository.create(user_doc)

        return {
            "user_id": user_id,
            "message": "User registered successfully"
        }

    def authenticate_user(self, login_data: UserLogin) -> Dict[str, str]:
        """Authenticate user and return access token"""
        user = self.repository.find_by_username(login_data.username)
        
        if not user:
            raise ValueError("Invalid username or password")

        if not self._verify_password(user["password"], login_data.password):
            raise ValueError("Invalid username or password")

        # Generate JWT token
        access_token = create_access_token(identity=user["username"])
        
        return {
            "access_token": access_token,
            "message": "Login successful"
        }

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user data for output - return raw dict to avoid ObjectId issues"""
        user = self.repository.find_by_username(username)
        if not user:
            return None
        
        # Return simplified dict without password - let routes handle formatting
        return {
            "username": user["username"],
            "email": user["email"],
            "created_at": user.get("created_at")
        }

    def update_user(self, current_username: str, new_username: str, update_data: UserUpdate) -> Dict[str, Any]:
        """Update user with business validation"""
        print(f"SERVICE: update_user called with current='{current_username}', new='{new_username}'")
        
        # Verify user exists
        user = self.repository.find_by_username(current_username)
        if not user:
            raise ValueError("User not found")

        updates = {}
        response = {"message": "User updated successfully"}

        # Business rule: Username change validation
        if new_username != current_username:
            if self.repository.exists_by_username(new_username):
                raise ValueError("Username already taken")
            updates["username"] = new_username
            # Generate new token for username change
            response["new_token"] = create_access_token(identity=new_username)
            print(f"SERVICE: Username change detected, will update to '{new_username}'")

        # Update other fields
        if update_data.email:
            # Check if email already exists for another user
            existing_user = self.repository.find_by_email(update_data.email)
            if existing_user and existing_user["username"] != current_username:
                raise ValueError("Email already registered")
            updates["email"] = update_data.email
            print(f"SERVICE: Email update to '{update_data.email}'")

        if update_data.password:
            hashed_password = self._hash_password(update_data.password)
            updates["password"] = hashed_password
            print(f"SERVICE: Password updated (hashed)")

        if not updates:
            raise ValueError("No valid fields to update")

        print(f"SERVICE: Final updates to apply: {list(updates.keys())}")

        # Perform update
        success = self.repository.update_by_username(current_username, updates)
        if not success:
            print("SERVICE: Repository update returned False")
            raise ValueError("Failed to update user")
            
        print("SERVICE: Update completed successfully")
        return response

    def delete_user(self, username: str) -> Dict[str, str]:
        """Delete user with validation"""
        if not self.repository.exists_by_username(username):
            raise ValueError("User not found")

        success = self.repository.delete_by_username(username)
        if not success:
            raise ValueError("Failed to delete user")

        return {"message": "User deleted successfully"}

    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt - SpeakEase pattern with internal import"""
        from flask_bcrypt import Bcrypt
        bcrypt = Bcrypt()
        return bcrypt.generate_password_hash(password).decode('utf-8')

    def _verify_password(self, stored_password: str, provided_password: str) -> bool:
        """Verify password against hash - SpeakEase pattern with internal import"""
        from flask_bcrypt import Bcrypt
        bcrypt = Bcrypt()
        return bcrypt.check_password_hash(stored_password, provided_password)