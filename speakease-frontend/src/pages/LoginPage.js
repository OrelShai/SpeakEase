import React from 'react';
import './LoginPage.css';
import { Link } from 'react-router-dom';


const LoginPage = () => {
  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome!</h1>
        <h2>Sign in to SpeakEase</h2>
        <p>Improve your performance</p>
        <form>
          <div className="input-group">
            <label htmlFor="username">User name</label>
            <input type="text" id="username" placeholder="Enter your user name" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" placeholder="Enter your Password" />
            <span className="toggle-password">👁️</span>
          </div>
          <div className="options">
            <label>
              <input type="checkbox" /> Remember me
            </label>
            <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
        <div className="social-login">
          <p>Or sign in with:</p>
          <div className="social-icons">
            <button className="google"><img src="/images/google_original_round.png" alt="Google" /></button>
            <button className="microsoft"><img src="/images/microsoft_round.png" alt="Microsoft" /></button>
            <button className="facebook"><img src="/images/Facebook_round.png" alt="Facebook" /></button>
            <button className="apple"><img src="/images/apple_round.png" alt="Apple" /></button>
          </div>
        </div>
        <p className="register">Don’t have an Account? <Link to="/register">Register</Link></p>
      </div>
      <div className="illustration">
        <img src="/images/small-team-discussing-ideas-2194220-0.svg" alt="Illustration of people talking" />
      </div>
    </div>
  );
};

export default LoginPage;
