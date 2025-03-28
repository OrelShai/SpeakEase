import React, { useState } from "react";
import "./EditProfile.css";

const EditProfile = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <div className="edit-profile-container">
      {/* Left Edge Sidebar (Icons Only) */}
      <div className="icon-sidebar">
        <i>🏠</i>
        <i>🔔</i>
        <i>🔒</i>
        <i>⚙️</i>
      </div>

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

        <form>
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
              />
              <span className="toggle-password" onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <div className="bottom-section">
            <div className="button-group">
              <button type="button" className="cancel-button">Cancel</button>
              <button type="submit" className="save-button">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
