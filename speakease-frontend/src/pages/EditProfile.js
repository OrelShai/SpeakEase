import React, { useState } from "react";
import { useEffect } from "react";

import "./EditProfile.css";
import { FaUser, FaHistory, FaCheck, FaEye, FaEyeSlash } from "react-icons/fa"; // Add react-icons

const EditProfile = () => {

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeView, setActiveView] = useState("profile"); // "profile" or "history"

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
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found");
          return;
        }
  
        const response = await fetch("http://127.0.0.1:5000/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
  
        const data = await response.json();
  
        if (response.ok) {
          setUsername(data.username);
          setEmail(data.email);
          setUsernameValid(data.username.length >= 3);
          setEmailValid(validateEmail(data.email));
        } else {
          console.error("Failed to fetch user details:", data.error);
        }
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };
  
    fetchUserDetails();
  }, []);

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
    return password === confirmPassword && password !== "";
  };

  // Validate email format
  const validateEmail = (email) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  };

  // Handle username change
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    setUsernameValid(value.length >= 3);
    
    if (showSuccess) setShowSuccess(false);
  };

  // Handle email change
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailValid(validateEmail(value));
    
    if (showSuccess) setShowSuccess(false);
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordValid(isPasswordValid(value));
    setConfirmPasswordValid(value && value === confirmPassword);
    
    if (showError || showSuccess) {
      setShowError(false);
      setShowSuccess(false);
      setPasswordError("");
    }
  };

  // Handle confirm password change
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setConfirmPasswordValid(password && value === password);
    
    if (showError || showSuccess) {
      setShowError(false);
      setShowSuccess(false);
      setPasswordError("");
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    setShowError(false);
    setShowSuccess(false);
  
    // Validate passwords
    if (password || confirmPassword) {
      if ((password && !confirmPassword) || (!password && confirmPassword)) {
        setPasswordError("Both password fields must be filled");
        setShowError(true);
        return;
      }
  
      if (!isPasswordValid(password)) {
        setPasswordError(
          "Password must be at least 8 characters and contain at least one number, one special character, and one uppercase letter."
        );
        setShowError(true);
        return;
      }
  
      if (!passwordsMatch()) {
        setPasswordError("Passwords do not match");
        setShowError(true);
        return;
      }
    }
  
    try {
      const token = localStorage.getItem("token"); 
      const payload = {};
      if (emailValid) payload.email = email;
      if (passwordValid && confirmPasswordValid) payload.password = password;
  
      const response = await fetch(`http://127.0.0.1:5000/api/users/${username}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
  
      const result = await response.json(); // ← קריאה יחידה בלבד!
  
      if (response.ok) {
        if (result.new_token) {
          localStorage.setItem("token", result.new_token);
        }
        setShowSuccess(true);
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
      {/* Left column with navigation */}
      <div className="profile-sidebar">
        <h2>Settings</h2>
        <ul className="profile-menu">
          <li 
            className={activeView === "profile" ? "active" : ""}
            onClick={() => setActiveView("profile")}
          >
            <FaUser className="menu-icon" />
            <span>Edit Profile</span>
          </li>
          <li 
            className={activeView === "history" ? "active" : ""}
            onClick={() => setActiveView("history")}
          >
            <FaHistory className="menu-icon" />
            <span>History</span>
          </li>
        </ul>
      </div>

      {/* Right column with content */}
      <div className="profile-content">
        {activeView === "profile" ? (
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
                    <label htmlFor="password">Password</label>
                    <div className="input-with-validation">
                    <input 
                     type={passwordVisible ? "text" : "password"} 
                     id="password" 
                     placeholder="********"  // 👈 נראה כמו שיש סיסמה, בלי לחשוף אותה
                      value={password}
                     onChange={handlePasswordChange}
/>

                      <span 
                        className="toggle-visibility" 
                        onClick={() => setPasswordVisible(!passwordVisible)}
                      >
                        {passwordVisible ? <FaEyeSlash /> : <FaEye />}
                      </span>
                      {passwordValid && <FaCheck className="validation-check" />}
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="input-with-validation">
                      <input 
                        type={confirmPasswordVisible ? "text" : "password"} 
                        id="confirmPassword" 
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                      />
                      <span 
                        className="toggle-visibility" 
                        onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                      >
                        {confirmPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                      </span>
                      {confirmPasswordValid && <FaCheck className="validation-check" />}
                    </div>
                    {showError && passwordError && (
                      <div className="password-error">{passwordError}</div>
                    )}
                  </div>

                  <div className="button-group">
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
        ) : (
          <div className="history-view">
            <h1>History</h1>
            <p>Your practice history will appear here.</p>
            {/* History content goes here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProfile;
