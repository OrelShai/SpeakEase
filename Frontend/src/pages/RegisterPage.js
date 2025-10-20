import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register, validatePasswordComplexity, validateEmail } from "../BackEndAPI/DataModelLogicAPI";
import "./RegisterPage.css";

const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // For redirecting after successful registration

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!validatePasswordComplexity(password)) {
      setError("Password must be at least 8 characters and contain at least one number, one special character, and one uppercase letter");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    const userData = { username, email, password };

    try {
      const result = await register(userData);

      if (result.success) {
        alert("User registered successfully!");
        navigate("/login"); // Redirect to login page
      } else {
        setError(result.error || "Failed to register");
      }

    } catch (error) {
      setError("An unexpected error occurred");
      console.error(error);
    }
  };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2>Sign up to SpeakEase</h2>
        <p>Improve your performance</p>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

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
            <div className="password-wrapper">
              <input
                type={passwordVisible ? "text" : "password"}
                id="password"
                placeholder="Enter your Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="toggle-password" onClick={() => setPasswordVisible(!passwordVisible)}>
                {passwordVisible ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <div className="password-wrapper">
              <input
                type={confirmPasswordVisible ? "text" : "password"}
                id="confirm-password"
                placeholder="Confirm your Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <span className="toggle-password" onClick={() => setConfirmPasswordVisible(!confirmPasswordVisible)}>
                {confirmPasswordVisible ? "🙈" : "👁️"}
              </span>
            </div>
          </div>

          <button type="submit" className="register-button">Register</button>
        </form>

        <p className="login-link">
          Already have an Account? <Link to="/login"><b>Login</b></Link>
        </p>
      </div>

      <div className="illustration">
        <img src="/images/small-team-discussing-ideas-2194220-0.png" alt="Illustration of people talking" />
      </div>
    </div>
  );
};

export default RegisterPage;
