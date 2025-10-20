import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getUserProfile, updateUserProfile, validateEmail as apiValidateEmail, validatePasswordComplexity, getUserHistory } from "../BackEndAPI/DataModelLogicAPI";
import { FaUser, FaHistory, FaCheck, FaEye, FaEyeSlash } from "react-icons/fa";
import "./EditProfile.css"; // Use the original EditProfile CSS

const MyProfile = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("history"); // Start with history as default

  // Profile states (keeping the original EditProfile structure)
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [usernameValid, setUsernameValid] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [confirmPasswordValid, setConfirmPasswordValid] = useState(false);

  // History states
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      jwtDecode(token);
    } catch (error) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    // Fetch user profile data
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

    // Fetch history data
    const fetchHistory = async () => {
      try {
        const result = await getUserHistory();
        if (result.success) {
          setHistoryData(result.data);
        } else {
          setHistoryError(result.error);
        }
      } catch (err) {
        setHistoryError("Failed to load history");
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchUserDetails();
    fetchHistory();
  }, [navigate]);

  // Use the original EditProfile validation functions
  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameValid(value.length >= 3);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailValid(validateEmail(value));
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    
    const isValid = validatePasswordComplexity(value);
    setPasswordValid(isValid.isValid);
    
    if (!isValid.isValid) {
      setPasswordError(isValid.message);
    } else {
      setPasswordError("");
    }
    
    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordValid(false);
    } else if (confirmPassword && value === confirmPassword) {
      setConfirmPasswordValid(true);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordValid(value === password && value !== "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!usernameValid || !emailValid) {
      setShowError(true);
      setPasswordError("Please fix the validation errors before submitting");
      return;
    }
    
    if (password && (!passwordValid || !confirmPasswordValid)) {
      setShowError(true);
      setPasswordError("Please fix the password validation errors before submitting");
      return;
    }

    try {
      const updateData = {
        username,
        email,
        ...(password && { password })
      };

      const result = await updateUserProfile(updateData);
      
      if (result.success) {
        setShowSuccess(true);
        setShowError(false);
        setPassword("");
        setConfirmPassword("");
        setPasswordValid(false);
        setConfirmPasswordValid(false);
        
        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        setShowError(true);
        setPasswordError(result.error || "Update failed");
      }
    } catch (error) {
      setShowError(true);
      setPasswordError("An unexpected error occurred");
      console.error(error);
    }
  };

  return (
    <div className="edit-profile-container">
      {/* Left column with navigation - keeping original structure */}
      <div className="profile-sidebar">
        <h2>My Profile</h2>
        <ul className="profile-menu">
          <li 
            className={activeView === "history" ? "active" : ""}
            onClick={() => setActiveView("history")}
          >
            <FaHistory className="menu-icon" />
            <span>Practice History</span>
          </li>
          <li 
            className={activeView === "profile" ? "active" : ""}
            onClick={() => setActiveView("profile")}
          >
            <FaUser className="menu-icon" />
            <span>Edit Profile</span>
          </li>
        </ul>
      </div>

      {/* Right column with content */}
      <div className="profile-content">
        {activeView === "history" ? (
          <div className="history-view">
            <h1>Practice History</h1>
            <p>Track your progress and review past sessions</p>
            
            {historyLoading ? (
              <div className="loading">Loading your practice history...</div>
            ) : historyError ? (
              <div className="error">Error: {historyError}</div>
            ) : historyData.length === 0 ? (
              <div className="no-history">
                <p>No practice sessions found.</p>
                <p>Start practicing to build your history!</p>
              </div>
            ) : (
              <div className="history-list">
                {historyData.map((session, index) => (
                  <div key={index} className="history-item">
                    <div className="session-info">
                      <h3>{session.scenarioName}</h3>
                      <p className="session-date">{new Date(session.date).toLocaleDateString()}</p>
                    </div>
                    <div className="session-stats">
                      <span className="score">Score: {session.score}%</span>
                      <span className="duration">Duration: {session.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Keep the EXACT original EditProfile form structure
          <>
            <h1>Edit Profile</h1>
            
            {showSuccess && (
              <div className="success-message">
                Your profile has been updated successfully!
              </div>
            )}

            <form onSubmit={handleSubmit} className="profile-form">
              <div className="form-columns">
                <div className="form-main">
                  <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <div className="input-with-validation">
                      <input 
                        type="text" 
                        id="username" 
                        placeholder="Enter your username"
                        value={username}
                        onChange={handleUsernameChange}
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
                        placeholder="Enter your email"
                        value={email}
                        onChange={handleEmailChange}
                      />
                      {emailValid && <FaCheck className="validation-check" />}
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="password">New Password (optional)</label>
                    <div className="input-with-validation">
                      <input 
                        type={passwordVisible ? "text" : "password"} 
                        id="password" 
                        placeholder="Enter new password (leave empty to keep current)"
                        value={password}
                        onChange={handlePasswordChange}
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                      >
                        {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      {passwordValid && <FaCheck className="validation-check" />}
                    </div>
                    {passwordError && password && (
                      <span className="validation-message">{passwordError}</span>
                    )}
                  </div>

                  {password && (
                    <div className="input-group">
                      <label htmlFor="confirmPassword">Confirm New Password</label>
                      <div className="input-with-validation">
                        <input 
                          type={confirmPasswordVisible ? "text" : "password"} 
                          id="confirmPassword" 
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={handleConfirmPasswordChange}
                        />
                        <button
                          type="button"
                          className="toggle-password"
                          onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                        >
                          {confirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        {confirmPasswordValid && <FaCheck className="validation-check" />}
                      </div>
                      {confirmPassword && !confirmPasswordValid && (
                        <span className="validation-message">Passwords do not match</span>
                      )}
                    </div>
                  )}

                  {showError && (
                    <div className="error-message">
                      {passwordError}
                    </div>
                  )}

                  <div className="form-buttons">
                    <button type="button" className="cancel-button">Cancel</button>
                    <button type="submit" className="save-button">Save</button>
                  </div>
                </div>
                
                <div className="form-illustration">
                  <div className="profile-illustration"></div>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default MyProfile;
