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

    const [isLoading, setIsLoading] = useState(true);
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: "I've analyzed your recent practice session. You performed well in some areas, but there’s room for improvement. Let me know if you want insights on any specific part!" }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('verbal');
    const chatEndRef = useRef(null);
    
    // Use categories from completed session instead of analyzers
    const categories = analysisResults[0]?.categories || {};
    const analyzers = analysisResults[0]?.analyzers || {};

    // Map categories to display format
    const performanceData = {
        verbal: categories.verbal ? [{
            name: 'Verbal Communication',
            score: Math.round(categories.verbal.score || 0),
            change: 0
        }] : [],
        body_language: categories.body_language ? [{
            name: 'Body Language', 
            score: Math.round(categories.body_language.score || 0),
            change: 0
        }] : [],
        interaction: categories.interaction ? [{
            name: 'Interaction',
            score: Math.round(categories.interaction.score || 0), 
            change: 0
        }] : []
    };

    const pieData = Object.entries(analyzers).map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: Math.round(value.score || 0)
    }));

    const tips = [
        "Focus on your verbal clarity and reduce filler words.",
        "Try maintaining eye contact for 3-5 seconds before looking away.",
        "Slow down when explaining complex topics to ensure clarity.",
        "Use more hand gestures to emphasize key points in your responses.",
        "Practice deeper breathing before answering difficult questions."
    ];

    const calculateOverallGrade = () => {
        const allMetrics = [
            ...performanceData.verbal,
            ...performanceData.body_language,
            ...performanceData.interaction
        ];
        const totalScore = allMetrics.reduce((sum, metric) => sum + metric.score, 0);
        const avgScore = Math.round(totalScore / allMetrics.length);
        return avgScore;
    };

    const overallGrade = calculateOverallGrade();

    const [practiceScoreHistory, setPracticeScoreHistory] = useState([]);

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
                const history = filteredSessions.map((session, idx) => ({
                    practice: idx + 1,
                    score: session.overall?.score ? Math.round(session.overall.score) : 0
                }));
                setPracticeScoreHistory(history);
            } catch (err) {
                console.error("Failed to fetch practice history", err);
                setPracticeScoreHistory([]);
            }
        };
        fetchPracticeHistory();
    }, [scenarioId]);

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

    const handleCoachQuestion = (question) => {
        setNewMessage(question);
        handleSendMessage();
    };

    // Generate real answers from analysisResults
    const getCoachAnswer = (question) => {
        if (!analysisResults || !analysisResults[0]) return "Sorry, I don't have enough data to answer right now.";

        const analyzers = analysisResults[0].analyzers || {};

        if (question.toLowerCase().includes("body language")) {
            const eyeContact = analyzers.eye_contact?.score ?? null;
            const facial = analyzers.facial_expression?.score ?? null;
            const headPose = analyzers.head_pose?.score ?? null;
            if (eyeContact !== null && facial !== null && headPose !== null) {
                return `Your body language score was ${Math.round((eyeContact + facial + headPose) / 3)}%. Try to maintain eye contact and use expressive facial gestures.`;
            }
            return "I couldn't analyze your body language in this session.";
        }
        if (question.toLowerCase().includes("speak clearly")) {
            const grammar = analyzers.grammar?.score ?? null;
            const language = analyzers.language?.score ?? null;
            if (grammar !== null && language !== null) {
                return `Your clarity score was ${Math.round((grammar + language) / 2)}%. Focus on reducing filler words and speaking at a steady pace.`;
            }
            return "I couldn't analyze your speech clarity in this session.";
        }
        if (question.toLowerCase().includes("main weakness")) {
            const metrics = Object.entries(analyzers).map(([k, v]) => ({ name: k, score: v.score }));
            if (metrics.length === 0) return "No metrics available for this session.";
            const weakest = metrics.reduce((min, m) => m.score < min.score ? m : min, metrics[0]);
            return `Your main weakness was ${weakest.name.replace(/_/g, ' ')} (${Math.round(weakest.score)}%). Try to focus on improving this aspect next time.`;
        }
        if (question.toLowerCase().includes("boost my self-confidence")) {
            return "Practice more and prepare in advance. Remember to breathe deeply and maintain positive body language.";
        }
        if (question.toLowerCase().includes("answer all the questions")) {
            return "You answered all the main questions, but some answers could be more detailed. Try to elaborate more next time.";
        }
        return "Sorry, I can only answer questions related to your last session.";
    };

    const handleSendMessage = () => {
        if (newMessage.trim() === '') return;
        const userMessage = {
            id: uuidv4(),
            sender: 'user',
            text: newMessage
        };
        setMessages([...messages, userMessage]);
        setNewMessage('');

        setTimeout(() => {
            let aiText = getCoachAnswer(newMessage);
            const aiResponse = {
                id: uuidv4(),
                sender: 'ai',
                text: aiText
            };
            setMessages(prevMessages => [...prevMessages, aiResponse]);
        }, 1000);
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
                                    </div>
                                </div>
                            </div>
                            <div className="card pie-chart-card">
                                <div className="chart-container">
                                    <h2 className="chart-title">Performance Breakdown</h2>
                                    <div className="chart-content">
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
                                                            fill={["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"][index]}
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
                            {/* Coach questions panel */}
                            <div className="coach-questions-panel card">
                                <h3>Coach Questions</h3>
                                <ul>
                                    {coachQuestions.map((q, idx) => (
                                        <li key={idx}>
                                            <button
                                                className="coach-question-btn"
                                                onClick={() => handleCoachQuestion(q)}
                                            >
                                                {q}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            {/* Chat itself */}
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
                                            placeholder="Ask your coach for feedback..."
                                            className="chat-input"
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            className="send-button"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="send-icon" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                            </svg>
                                        </button>
                                    </div>
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