import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EditProfile from './pages/EditProfile';
import HomePage from './pages/HomePage';
import CustomizeScenario from './pages/CustomizeScenario';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/homepage" element={<HomePage />} />
          <Route path="/customizesenario" element={< CustomizeScenario />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
