import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { Moon, Sun, User } from "lucide-react";
import { jwtDecode } from "jwt-decode";

import "./Navbar.css";

const Navbar = ({ toggleDarkMode, darkMode, setSidebar }) => {
  const [username, setUsername] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUsername(decoded.sub || decoded.username);
      } catch (e) {
        localStorage.removeItem("token");
        setUsername(null);
      }
    } else {
      setUsername(null);
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setUsername(null);
    navigate("/login");
  };

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-left">
          <i onClick={() => setSidebar((prev) => !prev)}></i>
          <Link to="/">
            <img
              className="logo"
              src={
                darkMode
                  ? "/images/navbar/SpeakEaseLogo-DarkMode.png"
                  : "/images/navbar/SpeakEaseLogo-LightMode.png"
              }
              alt="logo"
            />
          </Link>
        </div>

        <div className="navbar-right">
          <button onClick={toggleDarkMode} className="dark-mode-icon">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {username ? (
            <>
              {/* Profile Icon */}
              <button 
                onClick={() => navigate("/my-profile")} 
                className="profile-icon"
                title="My Profile"
              >
                <User size={20} />
              </button>

              {/* Logout Icon */}
              <img
                src={
                  darkMode
                    ? "/images/navbar/DARK-Log_Out.png"
                    : "/images/navbar/WHITE-Log_Out.png"
                }
                alt="Log Out"
                className="logout-icon"
                onClick={handleLogout}
              />
            </>
          ) : (
            <Link to="/login" className="login-icon">
              <FontAwesomeIcon icon={faUser} />
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
