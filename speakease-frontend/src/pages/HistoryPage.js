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
  const [selectedSession, setSelectedSession] = useState(null); // For detailed view
  const [showDetails, setShowDetails] = useState(false); // Modal state

  useEffect(() => {
    // Only fetch data when the History tab is active AND we haven't loaded yet
    if (isActive && !hasLoaded) {
      fetchHistoryData();
    }
  }, [isActive, hasLoaded]);

  // Normalize various date shapes (ISO string, number, Mongo {$date}, Firestore-like, etc.)
  const extractDateValue = (raw) => {
    if (!raw) return null;
    if (raw instanceof Date) return raw;
    if (typeof raw === 'string' || typeof raw === 'number') return new Date(raw);
    // Mongo Extended JSON: { $date: "..." } OR { $date: { $numberLong: "..." } }
    if (raw.$date) {
      const v = raw.$date;
      if (typeof v === 'string' || typeof v === 'number') return new Date(v);
      if (typeof v === 'object' && v.$numberLong) return new Date(Number(v.$numberLong));
    }
    // Firestore-like: { _seconds: 1694956776, _nanoseconds: 0 }
    if (raw._seconds) return new Date(raw._seconds * 1000);
    return null;
    };

  const fetchHistoryData = async () => {
    try {
      setLoading(true);
      const result = await getUserHistory();
      
      if (result && result.success) {
        const rawData = result.data || [];
        
        // Reverse the data so oldest session is first, newest is last
        // This ensures Session 1 = oldest (high score), Session 16 = newest (lower score)
        const reversedData = rawData.reverse();
        
        setHistoryData(reversedData);
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

    // For line chart, use original chronological order (oldest to newest)
    const lineChartData = historyData.map((session, index) => ({
      session: index + 1,
      score: Math.round(session.overall?.score || 0),
      date: (extractDateValue(session.timestamp) || 
        extractDateValue(session.created_at) || 
        extractDateValue(session.date))?.toISOString?.() ||
        null
    }));

    // For pie chart, we want the LATEST session (last item in array)
    const latestSession = historyData[historyData.length - 1];
    const latestAnalyzers = latestSession?.analyzers || {};
    
    const pieChartData = Object.entries(latestAnalyzers).map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: Math.round(value.score || 0)
    }));

    // For category data, use chronological order
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
    // Calculate improvement as latest session score minus average of all previous sessions
    const improvement = historyData.length > 1 
      ? (() => {
          // Calculate average of all sessions except the last one
          const previousScores = scores.slice(0, -1); // All scores except the last
          const previousAverage = previousScores.reduce((sum, score) => sum + score, 0) / previousScores.length;
          return Math.round(scores[scores.length - 1] - previousAverage);
        })()
      : 0;

    return {
      averageScore,
      bestScore,
      totalSessions,
      improvement
    };
  };

  const stats = calculateStats();

  // Helper function to format date safely
  const formatDate = (session) => {
    try {
      // Prefer explicit timestamp; then created_at/date
      const date =
        extractDateValue(session.timestamp) ||
        extractDateValue(session.created_at) ||
        extractDateValue(session.date);

      if (!date || isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date error';
    }
  };

  // Helper function to open details modal
  const openDetailsModal = (session, sessionIndex) => {
    // Session number matches chronological order: oldest session = 1, newest = historyData.length
    const sessionNumber = sessionIndex + 1;
    setSelectedSession({ ...session, sessionNumber });
    setShowDetails(true);
  };

  // Helper function to close details modal
  const closeDetailsModal = () => {
    setSelectedSession(null);
    setShowDetails(false);
  };

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
            <h3>Latest Improvement</h3>
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
          {historyData.map((session, index) => {
            // Session number matches chronological order: oldest session = 1, newest = historyData.length
            const sessionNumber = index + 1;
            // Debug: Log session data to see what's available
            console.log(`Session ${sessionNumber} data:`, session);
            console.log(`Session ${sessionNumber} ID:`, session._id);
            
            return (
              <div key={session._id || index} className="history-item">
                <div className="session-header">
                  <h3>Session {sessionNumber}</h3>
                  <div className="session-date">
                    {formatDate(session)}
                  </div>
                  <div className="session-scenario">
                    Scenario: {session.scenario_id || session.scenario_name || 'General Practice'}
                  </div>
                </div>
                
                <div className="session-divider"></div>
                
                <div className="session-content">
                  <div className="overall-score">
                    <div className="session-score">
                      {Math.round(session.overall?.score || 0)}%
                    </div>
                    <div className="score-label">Overall Score</div>
                  </div>
                  
                  <div className="category-scores">
                    {session.categories && Object.entries(session.categories).map(([category, data]) => (
                      <div key={category} className="category-score">
                        <span className="category-name">
                          {category === 'verbal' ? '🗣️ Verbal Communication' : 
                           category === 'body_language' ? '👤 Body Language' : 
                           category === 'interaction' ? '🤝 Interaction' : 
                           `📊 ${category.replace(/_/g, ' ')}`}
                        </span>
                        <span className="category-value">{Math.round(data.score || 0)}%</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="session-actions">
                    <button 
                      className="details-btn" 
                      onClick={() => openDetailsModal(session, index)}
                    >
                      📊 View Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Session Details Modal */}
      {showDetails && selectedSession && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Session {selectedSession.sessionNumber} Details</h2>
              <button className="modal-close" onClick={closeDetailsModal}>
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {/* Session Overview */}
              <div className="detail-section">
                <h3>📅 Session Overview</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{formatDate(selectedSession)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Scenario:</span>
                    <span className="detail-value">
                      {selectedSession.scenario_id || selectedSession.scenario_name || 'General Practice'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Overall Score:</span>
                    <span className="detail-value score-highlight">
                      {Math.round(selectedSession.overall?.score || 0)}%
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Confidence:</span>
                    <span className="detail-value">
                      {selectedSession.overall?.confidence ? 
                        `${(selectedSession.overall.confidence * 100).toFixed(1)}%` : 
                        'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Performance */}
              {selectedSession.categories && Object.keys(selectedSession.categories).length > 0 && (
                <div className="detail-section">
                  <h3>📊 Category Performance</h3>
                  <div className="category-details">
                    {Object.entries(selectedSession.categories).map(([category, data]) => (
                      <div key={category} className="category-detail-item">
                        <div className="category-detail-header">
                          <span className="category-icon">
                            {category === 'verbal' ? '🗣️' : 
                             category === 'body_language' ? '👤' : 
                             category === 'interaction' ? '🤝' : '📊'}
                          </span>
                          <span className="category-title">
                            {category === 'verbal' ? 'Verbal Communication' : 
                             category === 'body_language' ? 'Body Language' : 
                             category === 'interaction' ? 'Interaction' : 
                             category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="category-score-large">
                            {Math.round(data.score || 0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyzer Breakdown */}
              {selectedSession.analyzers && Object.keys(selectedSession.analyzers).length > 0 && (
                <div className="detail-section">
                  <h3>🔍 Analyzer Breakdown</h3>
                  <div className="analyzer-details">
                    {Object.entries(selectedSession.analyzers).map(([analyzer, data]) => (
                      <div key={analyzer} className="analyzer-item">
                        <div className="analyzer-header">
                          <span className="analyzer-name">
                            {analyzer.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                          <span className="analyzer-score">
                            {Math.round(data.score || 0)}%
                          </span>
                        </div>
                        {data.confidence && (
                          <div className="analyzer-confidence">
                            Confidence: {(data.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Summary */}
              {selectedSession.summary_text && (
                <div className="detail-section">
                  <h3>📝 Session Summary</h3>
                  <div className="summary-text">
                    {selectedSession.summary_text}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              <div className="detail-section">
                <h3>🔧 Technical Details</h3>
                <div className="detail-grid">
                  {selectedSession.meta && (
                    <>
                      <div className="detail-item">
                        <span className="detail-label">Schema Version:</span>
                        <span className="detail-value">{selectedSession.meta.schema_version}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Pipeline Version:</span>
                        <span className="detail-value">{selectedSession.meta.pipeline_version}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Items Processed:</span>
                        <span className="detail-value">{selectedSession.meta.num_items}</span>
                      </div>
                    </>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Session ID:</span>
                    <span className="detail-value session-id">{selectedSession._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
