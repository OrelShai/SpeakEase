import { useState, useRef, useEffect } from "react";
import './CustomizeScenario.css';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { useLocation } from "react-router-dom";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { v4 as uuidv4 } from 'uuid';
import "./ScenarioOverview.css";

const coach = {
    name: "Alex Carter",
    imageUrl: "/images/trainers/Alex_Carter.png",
};

const ScenarioOverview = ({ isDarkMode }) => {
    const navigate = useNavigate();
    const [currentTip, setCurrentTip] = useState(0);

    const handleNextTip = () => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
    };

    useEffect(() => {
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
        }
    }, [navigate]);

    const location = useLocation();
    const scenarioId = location.state?.scenarioId;
    const scenarioName = location.state?.scenarioName || "Default Scenario";
    const analysisResults = location.state?.analysisResults || [];
    const categorizeAnalyzer = (key) => {
        // Verbal category: language_quality, speech_style, grammar_ml
        if (
            key.includes('language_quality') ||
            key.includes('speech_style') ||
            key.includes('grammar_ml') ||
            key.includes('grammar') ||
            key.includes('language') ||
            key.includes('speech') ||
            key.includes('clarity') ||
            key.includes('pace') ||
            key.includes('volume') ||
            key.includes('vocal')
        ) {
            return 'verbal';
        }
        // Body Language category: eye_contact, head_pose, facial_expression
        if (
            key.includes('eye_contact') ||
            key.includes('head_pose') ||
            key.includes('facial_expression') ||
            key.includes('gesture') ||
            key.includes('posture') ||
            key.includes('body')
        ) {
            return 'nonverbal';
        }
        // Interaction category: tone, content_answer_quality
        if (
            key.includes('tone') ||
            key.includes('content_answer_quality') ||
            key.includes('content') ||
            key.includes('answer') ||
            key.includes('interaction') ||
            key.includes('engagement')
        ) {
            return 'engagement';
        }
        return 'engagement'; // default fallback
    };
    const sessionAiSummary = location.state?.sessionAiSummary;

    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            sender: 'ai', 
            text: sessionAiSummary || "I've analyzed your recent practice session. You performed well in some areas, but there's room for improvement. Let me know if you want insights on any specific part!" 
        }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('verbal');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const chatEndRef = useRef(null);
    
    // Use categories from completed session instead of analyzers
    const categories = analysisResults[0]?.categories || {};
    const analyzers = analysisResults[0]?.analyzers || {};

    // Helper function to get analyzers for a specific category
    const getAnalyzersForCategory = (categoryName) => {
        const categoryAnalyzers = [];
        
        // Add specific analyzers that belong to this category (without the main category score)
        Object.entries(analyzers).forEach(([key, value]) => {
            const analyzer = categorizeAnalyzer(key);
            
            // Map UI category names to analyzer categories
            const categoryMapping = {
                'verbal': 'verbal',
                'body_language': 'nonverbal', 
                'interaction': 'engagement'
            };
            
            if (categoryMapping[categoryName] === analyzer) {
                categoryAnalyzers.push({
                    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    score: Math.round(value.score || 0),
                    change: 0
                });
            }
        });
        
        return categoryAnalyzers;
    };

    // Map categories to display format with specific analyzers
    const performanceData = {
        verbal: getAnalyzersForCategory('verbal'),
        body_language: getAnalyzersForCategory('body_language'),
        interaction: getAnalyzersForCategory('interaction')
    };

    const pieData = Object.entries(analyzers).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: Math.round(value.score || 0)
    })).filter(item => item.value > 0); // Filter out analyzers with 0 score

    const tips = [
        "Focus on your verbal clarity and reduce filler words.",
        "Try maintaining eye contact for 3-5 seconds before looking away.",
        "Slow down when explaining complex topics to ensure clarity.",
        "Use more hand gestures to emphasize key points in your responses.",
        "Practice deeper breathing before answering difficult questions."
    ];

    const calculateOverallGrade = () => {
        // Calculate based on main categories instead of all analyzers
        const categoryScores = Object.values(categories).map(cat => cat.score || 0).filter(score => score > 0);
        
        if (categoryScores.length === 0) return 0;
        
        const totalScore = categoryScores.reduce((sum, score) => sum + score, 0);
        const avgScore = Math.round(totalScore / categoryScores.length);
        return isNaN(avgScore) ? 0 : avgScore;
    };

    const overallGrade = calculateOverallGrade();

    const [practiceScoreHistory, setPracticeScoreHistory] = useState([
        { practice: 1, score: 65 },  // Oldest session (leftmost)
        { practice: 2, score: 72 },  // Middle session
        { practice: 3, score: 75 }   // Newest session (rightmost)
    ]);

    useEffect(() => {
        const fetchPracticeHistory = async () => {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch('/api/completed-sessions', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                const result = await res.json();
                const allSessions = Array.isArray(result) ? result : [];
                const normalize = str => str.trim().toLowerCase().replace(/_/g, ' ');
                const filteredSessions = allSessions.filter(session =>
                    session &&
                    typeof session.scenario_id === "string" &&
                    typeof scenarioId === "string" &&
                    normalize(session.scenario_id) === normalize(scenarioId)
                );
                
                // Get scores from sessions
                let scores = filteredSessions.map(session => 
                    session.overall?.score ? Math.round(session.overall.score) : 0
                );
                
                // If the server returns newest first, reverse the array to get oldest first
                scores = scores.reverse();
                
                // Create history with proper numbering (1 = oldest, highest number = newest)
                let history = scores.map((score, idx) => ({
                    practice: idx + 1,
                    score: score
                }));
                
                // Add current session as the newest (highest number)
                if (overallGrade > 0 && !history.some(h => h.score === overallGrade)) {
                    const nextPracticeNumber = history.length + 1;
                    history.push({ practice: nextPracticeNumber, score: overallGrade });
                }
                
                // If no history found, add some sample data for demonstration
                if (history.length === 0) {
                    history = [
                        { practice: 1, score: 65 },
                        { practice: 2, score: 72 },
                        { practice: 3, score: overallGrade || 75 }
                    ];
                }
                
                console.log('Final practice history:', history);
                setPracticeScoreHistory(history);
            } catch (err) {
                console.error("Failed to fetch practice history", err);
                // Fallback data if API fails - chronological order
                setPracticeScoreHistory([
                    { practice: 1, score: 65 },
                    { practice: 2, score: 72 },
                    { practice: 3, score: overallGrade || 75 }
                ]);
            }
        };
        fetchPracticeHistory();
    }, [scenarioId, overallGrade]);

    useEffect(() => {
        const fetchScenarioData = async () => {
            setIsLoading(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 1000));
                setIsLoading(false);
            } catch (error) {
                console.error("Error fetching scenario data:", error);
                setIsLoading(false);
            }
        };
        fetchScenarioData();
    }, [scenarioId]);

    if (isLoading) {
        return (
            <div className={isDarkMode ? "dark-mode" : ""}>
                <div className="video-meeting-container loading-container">
                    <p>Loading your scenario data...</p>
                </div>
            </div>
        );
    }

    // Coach questions in English
    const coachQuestions = [
        "How can I improve my body language?",
        "Did I speak clearly enough?",
        "What is my main weakness in this session?",
        "How can I boost my self-confidence?",
        "Did I answer all the questions fully?"
    ];

    // Update the handleSendMessage function to only use backend
    const handleSendMessage = async () => {
        if (newMessage.trim() === '' || isChatLoading) return;
        
        const userMessage = {
            id: uuidv4(),
            sender: 'user',
            text: newMessage
        };
        
        // Add user message immediately
        setMessages(prevMessages => [...prevMessages, userMessage]);
        const currentQuestion = newMessage;
        setNewMessage('');
        setIsChatLoading(true);

        try {
            // Send question to backend
            const token = localStorage.getItem('token');
            const response = await fetch('/api/chat/ask-question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    question: currentQuestion,
                    session_id: analysisResults[0]?.session_id || null,
                    scenario_id: scenarioId,
                    analysis_data: analysisResults[0] || {}
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            // Add AI response
            const aiResponse = {
                id: uuidv4(),
                sender: 'ai',
                text: result.answer || "I'm sorry, I couldn't process your question right now."
            };
            
            setMessages(prevMessages => [...prevMessages, aiResponse]);
            
        } catch (error) {
            console.error('Error sending question to backend:', error);
            
            // Simple error message instead of fallback
            const errorResponse = {
                id: uuidv4(),
                sender: 'ai',
                text: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
            };
            
            setMessages(prevMessages => [...prevMessages, errorResponse]);
        } finally {
            setIsChatLoading(false);
        }
    };

    // Update handleCoachQuestion to use the new backend integration
    const handleCoachQuestion = (question) => {
        setNewMessage(question);
        // Trigger send immediately for preset questions
        setTimeout(() => {
            handleSendMessage();
        }, 100);
    };

    return (
        <div className={isDarkMode ? "dark-mode" : ""}>
            <div className="video-meeting-container">
                <header className="meeting-header">
                    <div className="header-left">
                        <h1 className="scenario-title">Scenario Overview - {scenarioName}</h1>
                    </div>
                    <div className="timer-display">{location.state?.practiceTimer || "00:00:00"}</div>
                </header>
                <main className="scenario-content">
                    <div className="grid-layout-two-column">
                        <div className="metrics-column">
                            <div className="card practice-scores-card">
                                <div className="chart-container">
                                    <div className="tab-container">
                                        <button
                                            onClick={() => setActiveTab('verbal')}
                                            className={`tab-button ${activeTab === 'verbal' ? 'tab-button-active' : ''}`}
                                        >
                                            Verbal
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('body_language')}
                                            className={`tab-button ${activeTab === 'body_language' ? 'tab-button-active' : ''}`}
                                        >
                                            Body Language
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('interaction')}
                                            className={`tab-button ${activeTab === 'interaction' ? 'tab-button-active' : ''}`}
                                        >
                                            Interaction
                                        </button>
                                    </div>
                                    <div className="metrics-container">
                                        {performanceData[activeTab].map((metric, index) => (
                                            <div key={index} className="metric-item">
                                                <div className="metric-header">
                                                    <span className="metric-name">{metric.name}</span>
                                                    <div className="metric-value">
                                                        <span className="metric-score">{Math.round(metric.score)}%</span>
                                                        <span className={
                                                            metric.change > 0 ? 'change-positive' :
                                                                metric.change < 0 ? 'change-negative' :
                                                                    'change-neutral'
                                                        }>
                                                            {metric.change > 0 ? `+${metric.change}%` : `${metric.change}%`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="progress-bar-container">
                                                    <div
                                                        className={`progress-bar ${metric.score > 85 ? 'progress-excellent' :
                                                            metric.score > 70 ? 'progress-good' :
                                                                metric.score > 50 ? 'progress-fair' :
                                                                    'progress-poor'
                                                            }`}
                                                        style={{ width: `${metric.score}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="card progress-chart-card">
                                <div className="chart-container">
                                    <h2 className="chart-title">Practice History</h2>
                                    <div className="chart-content">
                                        {practiceScoreHistory.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={practiceScoreHistory}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#475569" : "#e5e7eb"} />
                                                    <XAxis
                                                        dataKey="practice"
                                                        label={{
                                                            value: 'Practice Session',
                                                            position: 'insideBottom',
                                                            offset: -5
                                                        }}
                                                        stroke={isDarkMode ? "#94a3b8" : "#6b7280"}
                                                    />
                                                    <YAxis
                                                        domain={[0, 100]}
                                                        label={{
                                                            value: 'Score',
                                                            angle: -90,
                                                            position: 'insideLeft'
                                                        }}
                                                        stroke={isDarkMode ? "#94a3b8" : "#6b7280"}
                                                    />
                                                    <Tooltip
                                                        formatter={(value) => [`${value}%`, 'Score']}
                                                        labelFormatter={(practice) => `Practice ${practice}`}
                                                        contentStyle={{
                                                            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                                            borderColor: isDarkMode ? '#334155' : '#e5e7eb',
                                                            color: isDarkMode ? '#e2e8f0' : '#374151'
                                                        }}
                                                    />
                                                    <Line
                                                        type="monotone"
                                                        dataKey="score"
                                                        stroke="#3b82f6"
                                                        strokeWidth={3}
                                                        activeDot={{ r: 8 }}
                                                        dot={{
                                                            stroke: '#3b82f6',
                                                            strokeWidth: 2,
                                                            r: 6,
                                                            fill: isDarkMode ? '#1e293b' : '#ffffff'
                                                        }}
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="no-data-message">
                                                <p>Loading practice history...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="card pie-chart-card">
                                <div className="chart-container">
                                    <h2 className="chart-title">Performance Breakdown</h2>
                                    <div className="chart-content">
                                        {pieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        dataKey="value"
                                                        outerRadius={80}
                                                        innerRadius={60}
                                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                        labelLine={false}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell
                                                                key={`cell-${index}`}
                                                                fill={["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"][index % 6]}
                                                                strokeWidth={2}
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <text
                                                        x="50%"
                                                        y="50%"
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        className="pie-chart-grade"
                                                    >
                                                        {overallGrade}%
                                                    </text>
                                                    <text
                                                        x="50%"
                                                        y="62%"
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        className="pie-chart-label"
                                                    >
                                                        Overall
                                                    </text>
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="no-data-message">
                                                <p>No performance data available</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="tip-container">
                                <div className="tip-header">
                                    <div>
                                        <h3 className="tip-title">Improvement Tip</h3>
                                        <p>{tips[currentTip]}</p>
                                    </div>
                                    <button
                                        onClick={handleNextTip}
                                        className="next-tip-button"
                                    >
                                        Next Tip
                                    </button>
                                </div>
                            </div>
                        </div>
                        {/* Right column - AI chat + Coach questions */}
                        <div className="chat-column">
                            {/* Chat itself - now takes most of the space */}
                            <div className="card chat-container">
                                <div className="chat-header">
                                    <div className="chat-header-content">
                                        <img
                                            src={coach.imageUrl}
                                            alt={coach.name}
                                            className="coach-avatar"
                                        />
                                        <div className="chat-header-text">
                                            <h2 className="chat-header-title">Ask Your Coach</h2>
                                            <p className="chat-header-subtitle">{coach.name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="chat-messages">
                                    <div className="message-list">
                                        {messages.map((message) => (
                                            <div key={message.id} className={`message-row ${message.sender === 'user' ? 'message-row-user' : ''}`}>
                                                <div className={`message-bubble ${message.sender === 'user'
                                                    ? 'message-bubble-user'
                                                    : 'message-bubble-ai'
                                                    }`}>
                                                    {message.sender === 'ai' && <strong className="coach-name">{coach.name}: </strong>}
                                                    <p>{message.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                </div>
                                <div className="chat-input-container">
                                    <div className="chat-input-form">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={isChatLoading ? "Coach is thinking..." : "Ask your coach for feedback..."}
                                            className="chat-input"
                                            disabled={isChatLoading}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="send-button"
                                            disabled={isChatLoading || newMessage.trim() === ''}
                                        >
                                            {isChatLoading ? (
                                                <div className="loading-spinner">...</div>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="send-icon" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Coach questions panel - now at bottom */}
                            <div className="coach-questions-bottom">
                                <div className="quick-questions-header">
                                    <span className="quick-questions-title">Quick Questions:</span>
                                </div>
                                <div className="coach-questions-horizontal">
                                    {coachQuestions.map((q, idx) => (
                                        <button
                                            key={idx}
                                            className="coach-question-pill"
                                            onClick={() => handleCoachQuestion(q)}
                                            disabled={isChatLoading}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ScenarioOverview;