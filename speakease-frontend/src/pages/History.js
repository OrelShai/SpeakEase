import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getUserHistory } from "../BackEndAPI/DataModelLogicAPI";
import "./History.css";

const History = () => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      jwtDecode(token);
    } catch (error) {
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    // Fetch history data
    const fetchHistory = async () => {
      try {
        const result = await getUserHistory();
        if (result.success) {
          setHistoryData(result.data);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError("Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [navigate]);

  if (loading) {
    return (
      <div className="history-container">
        <div className="history-header">
          <h1>Practice History</h1>
        </div>
        <div className="loading">Loading your practice history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-container">
        <div className="history-header">
          <h1>Practice History</h1>
        </div>
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h1>Practice History</h1>
        <p>Track your progress and review past sessions</p>
      </div>
      
      <div className="history-content">
        {historyData.length === 0 ? (
          <div className="no-history">
            <p>No practice sessions found.</p>
            <p>Start practicing to build your history!</p>
          </div>
        ) : (
          <div className="history-list">
            {historyData.map((session, index) => (
              <div key={index} className="history-item">
                <div className="session-info">
                  <h3>{session.scenarioName}</h3>
                  <p className="session-date">{new Date(session.date).toLocaleDateString()}</p>
                </div>
                <div className="session-stats">
                  <span className="score">Score: {session.score}%</span>
                  <span className="duration">Duration: {session.duration}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
