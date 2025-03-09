import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css';
import LoginPage from './pages/LoginPage';
import CustomizeScenario from './pages/CustomizeScenario';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/customizesenario" element={< CustomizeScenario />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
