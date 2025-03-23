import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const requestData = { username, password };

    try {
      const response = await fetch("http://127.0.0.1:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.access_token); // ✅ שמירת הטוקן ב-localStorage
      alert("Login successful!");
      navigate("/homepage"); // ✅ מעבר לעמוד הראשי

    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome!</h1>
        <h2>Sign in to SpeakEase</h2>
        <p>Improve your performance</p>

        {error && <p className="error-message">{error}</p>}

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

          <div className="options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
          </div>

          <button type="submit" className="login-button">Login</button>
        </form>

        <p className="register">
          Don’t have an Account? <Link to="/register">Register</Link>
        </p>
      </div>
      <div className="illustration">
        <img src="/images/small-team-discussing-ideas-2194220-0.png" alt="Illustration of people talking" />
      </div>
    </div>
  );
};

export default LoginPage;
