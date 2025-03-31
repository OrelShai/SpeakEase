import React, { useState } from "react";
import "./EditProfile.css";

const EditProfile = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // New state for success notification

  // Check if password meets complexity requirements
  const isPasswordValid = (pwd) => {
    // Check minimum length (8 characters)
    if (pwd.length < 8) return false;
    
    // Check for at least one number
    if (!/\d/.test(pwd)) return false;
    
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(pwd)) return false;
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(pwd)) return false;
    
    return true;
  };

  // Check if passwords match
  const passwordsMatch = () => {
    return password === confirmPassword;
  };

  // Simple handlers to update state without validation
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    // Only hide notifications when typing
    if (showError || showSuccess) {
      setShowError(false);
      setShowSuccess(false);
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    // Only hide notifications when typing
    if (showError || showSuccess) {
      setShowError(false);
      setShowSuccess(false);
      setPasswordError("");
    }
  };

  // Handle form submission with validation
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Reset notifications
    setShowError(false);
    setShowSuccess(false);
    
    // Only validate if either password field is filled
    if (password || confirmPassword) {
      // Check if one field is empty while the other has a value
      if ((password && !confirmPassword) || (!password && confirmPassword)) {
        setPasswordError("Both password fields must be filled");
        setShowError(true);
        return;
      }
      
      // Validate password complexity
      if (!isPasswordValid(password)) {
        setPasswordError("Password must be at least 8 characters and contain at least one number, one special character, and one uppercase letter.");
        setShowError(true);
        return;
      }
      
      // Validate passwords match
      if (!passwordsMatch()) {
        setPasswordError("Passwords do not match");
        setShowError(true);
        return;
      }
      
      // If we get here, validation passed - show success notification
      setShowSuccess(true);
    } else {
      // No password changes, just show success for other fields
      setShowSuccess(true);
    }
    
    // Continue with form submission
    console.log("Form submitted successfully");
    // Add your API calls or further processing here
  };

  return (
    <div className="edit-profile-container">
      {/* Main Sidebar (Thinner) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">Pd</div>
          <h3>Settings</h3>
        </div>
        <ul className="menu">
          <li className="active"><span>✏️</span> Edit profile</li>
          <li><span>🔔</span> Notification</li>
          <li><span>🔒</span> Security</li>
          <li><span>📅</span> Appearance</li>
          <li><span>📊</span> Help</li>
        </ul>
      </div>

      {/* Profile Form */}
      <div className="profile-content">
        <h1>Edit Profile</h1>

        {/* Success notification */}
        {showSuccess && (
          <div className="success-message">
            Your profile has been updated successfully!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input type="text" id="username" placeholder="Enter your username" />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" placeholder="Enter your email" />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <input 
                type={passwordVisible ? "text" : "password"} 
                id="password" 
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
              />
              <span className="toggle-password" onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-with-icon">
              <input 
                type={confirmPasswordVisible ? "text" : "password"} 
                id="confirmPassword" 
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
              />
              <span className="toggle-password" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
                {confirmPasswordVisible ? "🙈" : "👁️"}
              </span>
            </div>
            {showError && passwordError && <div className="password-error">{passwordError}</div>}
          </div>

          <div className="bottom-section">
            <div className="button-group">
              <button type="button" className="cancel-button">Cancel</button>
              <button type="submit" className="save-button">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
