import React, { useState, useEffect } from 'react';
import { PerformanceLineChart, PerformancePieChart, CategoryPerformanceChart } from '../Components/Charts/PerformanceCharts';
import { getUserHistory } from '../BackEndAPI/DataModelLogicAPI';
import '../Components/Charts/PerformanceCharts.css';

const HistoryPage = ({ isDarkMode = false, isActive = true }) => {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false); // Start with false, not true
  const [error, setError] = useState(null);
  const [selectedChart, setSelectedChart] = useState('overall'); // 'overall', 'categories'
  const [hasLoaded, setHasLoaded] = useState(false); // Track if data has been loaded

  useEffect(() => {
    // Only fetch data when the History tab is active AND we haven't loaded yet
    if (isActive && !hasLoaded) {
      fetchHistoryData();
    }
  }, [isActive, hasLoaded]);

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const result = await getUserHistory();
      
      if (result && result.success) {
        setHistoryData(result.data || []);
        setError(null);
      } else {
        setError(result?.error || 'Failed to fetch history data');
        setHistoryData([]);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError('Failed to load training history');
      setHistoryData([]);
    } finally {
      setLoading(false);
      setHasLoaded(true); // Mark as loaded
    }
  };

  // Process data for charts
  const processDataForCharts = () => {
    if (!historyData || historyData.length === 0) {
      return {
        lineChartData: [],
        pieChartData: [],
        categoryData: [],
        latestOverallScore: 0
      };
    }

    // Process overall performance data for line chart
    const lineChartData = historyData.map((session, index) => ({
      session: index + 1,
      score: Math.round(session.overall?.score || 0),
      date: session.date || session.created_at
    }));

    // Process latest session data for pie chart
    const latestSession = historyData[historyData.length - 1];
    const latestAnalyzers = latestSession?.analyzers || {};
    
    const pieChartData = Object.entries(latestAnalyzers).map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: Math.round(value.score || 0)
    }));

    // Process category data for category breakdown chart
    const categoryData = historyData.map(session => {
      const categories = session.categories || {};
      
      // Use the categories directly from the database with their scores
      const categoryScores = {};
      Object.entries(categories).forEach(([categoryName, categoryData]) => {
        // Extract the score from the category object
        categoryScores[categoryName] = Math.round(categoryData.score || 0);
      });

      return categoryScores;
    });

    const latestOverallScore = Math.round(latestSession?.overall?.score || 0);

    return {
      lineChartData,
      pieChartData,
      categoryData,
      latestOverallScore
    };
  };

  const { lineChartData, pieChartData, categoryData, latestOverallScore } = processDataForCharts();

  // Calculate statistics
  const calculateStats = () => {
    if (historyData.length === 0) return null;

    const scores = historyData.map(session => session.overall?.score || 0);
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const bestScore = Math.round(Math.max(...scores));
    const totalSessions = historyData.length;
    const improvement = historyData.length > 1 
      ? Math.round(scores[scores.length - 1] - scores[0])
      : 0;

    return {
      averageScore,
      bestScore,
      totalSessions,
      improvement
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="history-view">
        <div className="loading">
          <h1>Training History</h1>
          <p>Loading your training history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-view">
        <div className="error">
          <h1>Training History</h1>
          <p>Error loading history: {error}</p>
          <button onClick={fetchHistoryData} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (historyData.length === 0) {
    return (
      <div className="history-view">
        <h1>Training History</h1>
        <div className="no-history">
          <p>No training sessions yet.</p>
          <p>Start your first conversation to see your progress!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`history-view ${isDarkMode ? 'dark-mode' : ''}`}>
      <h1>Training History</h1>
      <p>Track your conversation training progress and performance over time.</p>

      {/* Performance Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Sessions</h3>
            <div className="stat-value">{stats.totalSessions}</div>
          </div>
          <div className="stat-card">
            <h3>Average Score</h3>
            <div className="stat-value">{stats.averageScore}%</div>
          </div>
          <div className="stat-card">
            <h3>Best Score</h3>
            <div className="stat-value">{stats.bestScore}%</div>
          </div>
          <div className="stat-card">
            <h3>Improvement</h3>
            <div className={`stat-value ${stats.improvement >= 0 ? 'positive' : 'negative'}`}>
              {stats.improvement >= 0 ? '+' : ''}{stats.improvement}%
            </div>
          </div>
        </div>
      )}

      {/* Chart Selection Tabs */}
      <div className="chart-tabs">
        <button 
          className={`tab-btn ${selectedChart === 'overall' ? 'active' : ''}`}
          onClick={() => setSelectedChart('overall')}
        >
          Overall Performance
        </button>
        <button 
          className={`tab-btn ${selectedChart === 'categories' ? 'active' : ''}`}
          onClick={() => setSelectedChart('categories')}
        >
          Category Breakdown
        </button>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        {selectedChart === 'overall' && (
          <div className="charts-grid">
            <div className="chart-column">
              <PerformanceLineChart 
                data={lineChartData}
                title="Overall Performance Progress"
                isDarkMode={isDarkMode}
              />
            </div>
            <div className="chart-column">
              <PerformancePieChart 
                data={pieChartData}
                overallScore={latestOverallScore}
                title="Latest Session Breakdown"
                isDarkMode={isDarkMode}
              />
            </div>
          </div>
        )}

        {selectedChart === 'categories' && categoryData.length > 0 && (
          <div className="charts-grid single-column">
            <CategoryPerformanceChart 
              data={categoryData}
              title="Performance by Category"
              isDarkMode={isDarkMode}
            />
          </div>
        )}
      </div>

      {/* Session History List */}
      <div className="session-history">
        <h2>Session History</h2>
        <div className="history-list">
          {historyData.map((session, index) => (
            <div key={session._id || index} className="history-item">
              <div className="session-info">
                <h3>Session {index + 1}</h3>
                <p className="session-date">
                  {session.date ? new Date(session.date).toLocaleDateString() : 
                   session.created_at ? new Date(session.created_at).toLocaleDateString() : 
                   'Date not available'}
                </p>
                <p className="session-scenario">
                  Scenario: {session.scenario_id || session.scenario_name || 'General Practice'}
                </p>
              </div>
              <div className="session-stats">
                <div className="score">
                  {Math.round(session.overall?.score || 0)}%
                </div>
                <div className="duration">
                  {session.duration ? `${Math.round(session.duration / 60)}min` : 'N/A'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
