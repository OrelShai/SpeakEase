import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSun } from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";

const Navbar = ({ toggleDarkMode, darkMode, setSidebar }) => {
  return (
    <div>
      <nav className="navbar">
        <div className="navbar-left">
          <i onClick={() => setSidebar((prev) => !prev)}></i>
          <Link to="/">
            <img
              className="logo"
              src={darkMode ? "/images/navbar/SpeakEaseLogo-DarkMode.png" : "/images/navbar/SpeakEaseLogo-LightMode.png"}
              alt="logo"
            />
          </Link>
        </div>

        <div className="navbar-right">
          <button onClick={toggleDarkMode} className="dark-mode-icon">
            <FontAwesomeIcon icon={faSun} />
          </button>
          <Link to="/login" className="login-icon">
            <FontAwesomeIcon icon={faUser} />
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;