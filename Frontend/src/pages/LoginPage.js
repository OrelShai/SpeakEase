import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../BackEndAPI/DataModelLogicAPI';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const result = await login(username, password);

      if (result.success) {
        setPopupMessage("Login successful!");
        setShowPopup(true);
        setTimeout(() => {
          navigate("/homepage");
        }, 1500);
      } else {
        setError(result.error);
        setPopupMessage(result.error);
        setShowPopup(true);
      }
    } catch (error) {
      const errorMessage = error.message || "An unexpected error occurred";
      setError(errorMessage);
      setPopupMessage(errorMessage);
      setShowPopup(true);
    }
  };

  return (
    <div className="login-container">
      <div className="login-view">
        <div className="login-card">
          <h1 className="login-title">Welcome!</h1>
          <h2 className="login-subtitle">Sign in to SpeakEase</h2>
          <h3 className="login-subtitle">Improve your performance</h3>

          {/* Custom popup alert */}
          {showPopup && (
            <div className="popup-overlay">
              <div className="popup-content">
                <div className="popup-message">{popupMessage}</div>
                <button
                  className="popup-close"
                  onClick={() => setShowPopup(false)}
                >
                  close
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label htmlFor="username">User name</label>
              <input 
                type="text" 
                id="username" 
                placeholder="Enter your user name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="login-button">Login</button>
          </form>

          <p className="register">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
      <div className="login-image">
        <img src="/images/small-team-discussing-ideas-2194220-0.png" alt="Illustration of people talking" />
      </div>
    </div>
  );
};

export default LoginPage;