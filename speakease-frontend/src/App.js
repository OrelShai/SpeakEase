import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditProfile from './pages/EditProfile';
import HomePage from './pages/HomePage';
import CustomizeScenario from './pages/CustomizeScenario';
import Navbar from './Components/Navbar/Navbar';

function App() {
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark-mode");
  };

  return (
    <Router>
      <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
        <header className="App-header">
          <Navbar toggleDarkMode={toggleDarkMode} darkMode={darkMode} />
        </header>
        <div className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/edit-profile" element={<EditProfile />} />
            <Route path="/homepage" element={<HomePage />} />
            <Route path="/customizescenario" element={<CustomizeScenario />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
