import React, { useState } from "react";
import { useEffect } from "react";
import { getUserProfile, updateUserProfile, validateEmail as apiValidateEmail, validatePasswordComplexity } from "../BackEndAPI/DataModelLogicAPI";

import "./EditProfile.css";
import { FaUser, FaHistory, FaCheck, FaEye, FaEyeSlash } from "react-icons/fa";

const EditProfile = () => {
  const [activeTab, setActiveTab] = useState("history");

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Username and email states
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  
  // Validation states
  const [usernameValid, setUsernameValid] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [confirmPasswordValid, setConfirmPasswordValid] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const result = await getUserProfile();
        
        if (result.success) {
          setUsername(result.data.username);
          setEmail(result.data.email);
          setUsernameValid(result.data.username.length >= 3);
          setEmailValid(validateEmail(result.data.email));
        } else {
          console.error("Failed to fetch user details:", result.error);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };
  
    fetchUserDetails();
  }, []);

  // Use the API's password validation for consistency
  const isPasswordValid = (pwd) => {
    return validatePasswordComplexity(pwd);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameValid(value.length >= 3);
  };

  const handleEmailChange = async (e) => {
    const value = e.target.value;
    setEmail(value);

    if (validateEmail(value)) {
      try {
        const result = await apiValidateEmail(value);
        setEmailValid(result.isValid);
      } catch (error) {
        console.error("Error validating email:", error);
        setEmailValid(false);
      }
    } else {
      setEmailValid(false);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordValid(isPasswordValid(value));
    
    if (value === "" || isPasswordValid(value)) {
      setPasswordError("");
      setShowError(false);
    } else {
      setPasswordError("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
      setShowError(true);
    }

    // Re-validate confirm password if it exists
    if (confirmPassword) {
      setConfirmPasswordValid(value === confirmPassword && isPasswordValid(value));
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordValid(value === password && isPasswordValid(password));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!usernameValid || !emailValid) {
      setPasswordError("Please fix the validation errors before saving.");
      setShowError(true);
      return;
    }

    // If password fields are filled, validate them
    if (password || confirmPassword) {
      if (!passwordValid || !confirmPasswordValid || password !== confirmPassword) {
        setPasswordError("Please ensure passwords match and meet the requirements.");
        setShowError(true);
        return;
      }
    }

    try {
      const profileData = {
        username: username,
        email: email
      };

      // Only include password if it's provided
      if (password) {
        profileData.password = password;
      }

      const result = await updateUserProfile(profileData);
      
      if (result.success) {
        setShowSuccess(true);
        setShowError(false);
        setPassword("");
        setConfirmPassword("");
        setPasswordError("");
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        setPasswordError(result.error || "Failed to update profile.");
        setShowError(true);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setPasswordError("An error occurred while updating your profile.");
      setShowError(true);
    }
  };

  const handleCancel = () => {
    // Reset to original values or navigate away
    setPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowError(false);
    setShowSuccess(false);
  };

  return (
    <div className="edit-profile-container">
      {/* Sidebar */}
      <div className="profile-sidebar">
        <h2>My Profile</h2>
        <ul className="profile-menu">
          <li 
            className={activeTab === "history" ? "active" : ""} 
            onClick={() => setActiveTab("history")}
          >
            <FaHistory className="menu-icon" />
            History
          </li>
          <li 
            className={activeTab === "edit" ? "active" : ""} 
            onClick={() => setActiveTab("edit")}
          >
            <FaUser className="menu-icon" />
            Edit Profile
          </li>
        </ul>
      </div>

      {/* Content Area */}
      <div className="profile-content">
        {activeTab === "history" && (
          <div className="history-view">
            <h1>Training History</h1>
            <p>Your conversation training sessions will appear here.</p>
            {/* History content will be implemented */}
            <div className="no-history">
              <p>No training sessions yet.</p>
              <p>Start your first conversation to see your progress!</p>
            </div>
          </div>
        )}

        {activeTab === "edit" && (
          <>
            <h1>Edit Profile</h1>
            
            {showSuccess && (
              <div className="success-message">
                Profile updated successfully!
              </div>
            )}

            <div className="profile-form">
              <div className="form-columns">
                <div className="form-main">
                  <form onSubmit={handleSave}>
                    <div className="input-group">
                      <label htmlFor="username">Username</label>
                      <div className="input-with-validation">
                        <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={handleUsernameChange}
                          placeholder="Enter your username"
                        />
                        {usernameValid && <FaCheck className="validation-check" />}
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="email">Email</label>
                      <div className="input-with-validation">
                        <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={handleEmailChange}
                          placeholder="Enter your email"
                        />
                        {emailValid && <FaCheck className="validation-check" />}
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="password">New Password (Optional)</label>
                      <div className="input-with-validation">
                        <input
                          type={passwordVisible ? "text" : "password"}
                          id="password"
                          value={password}
                          onChange={handlePasswordChange}
                          placeholder="Enter new password"
                        />
                        {passwordValid && password && <FaCheck className="validation-check" />}
                        <span 
                          className="toggle-visibility" 
                          onClick={() => setPasswordVisible(!passwordVisible)}
                        >
                          {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                        </span>
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <div className="input-with-validation">
                        <input
                          type={confirmPasswordVisible ? "text" : "password"}
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                          placeholder="Confirm new password"
                        />
                        {confirmPasswordValid && <FaCheck className="validation-check" />}
                        <span 
                          className="toggle-visibility" 
                          onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        >
                          {confirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                        </span>
                      </div>
                    </div>

                    {showError && passwordError && (
                      <div className="password-error">
                        {passwordError}
                      </div>
                    )}

                    <div className="button-group">
                      <button type="button" className="cancel-button" onClick={handleCancel}>
                        Cancel
                      </button>
                      <button type="submit" className="save-button">
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>

                <div className="form-illustration">
                  <div className="profile-illustration"></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditProfile;
