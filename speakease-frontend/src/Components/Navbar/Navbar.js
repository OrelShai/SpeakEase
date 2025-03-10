import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faSun, faSignOutAlt } from "@fortawesome/free-solid-svg-icons";
import "./Navbar.css";
import Darkmode from "./Darkmode";

const Navbar = ({ setSidebar, setIsChecked, setSearch }) => {
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(false);
    const [searchString, setSearchString] = useState("");

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle("dark-mode");
    };

    return (
        <div>
            <nav>
                <div>
                    <img className="logo" onClick={() => { navigate("/"); }}
                        src={darkMode ? "/images/navbar/SpeakEaseLogo-DarkMode.png" : "/images/navbar/SpeakEaseLogo-LightMode.png"}
                        alt="logo" 
                    />
                </div>

                <nav className="navbar">
                    <div className="navbar-left">
                        <img src={darkMode ? "/images/navbar/SpeakEaseLogo-DarkMode.png" : "/images/navbar/SpeakEaseLogo-LightMode.png"} alt="Logo" className="logo" />
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

            </nav>
        </div>
    );
};

export default Navbar;