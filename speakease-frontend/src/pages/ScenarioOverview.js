import { useState, useRef, useEffect } from "react";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
import "./ScenarioOverview.css";

const scenarioName = "Scenario Name from api"; // This should come from the backend
const practiceTimer = "00:00:00"; // This should come from the backend

// Coach info - this will make it easy to update later from API
const coach = {
    name: "Alex Carter",
    imageUrl: "/images/trainers/Alex_Carter.png",
};

const ScenarioOverview = ({ isDarkMode }) => {
    // Ai chat messages static for now
    const [messages, setMessages] = useState([
        { id: 1, sender: 'ai', text: "I've analyzed your recent practice session. You performed well in [mention strengths], but there’s room for improvement in [mention weaknesses]. Let me know if you want insights on any specific part!" }
    ]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('verbal');
    const [currentTip, setCurrentTip] = useState(0); // usestate 0 to show the first tip
    const chatEndRef = useRef(null);

    // Sample data for charts (Progress Over Time)
    const data = [
        { name: "1", score: 5 },
        { name: "2", score: 6 },
        { name: "3", score: 7 },
        { name: "4", score: 6.5 },
        { name: "5", score: 8 },
        { name: "6", score: 4 },
    ];

    // static data for pie chart will probably calculate this base on the performance data 
    const pieData = [
        { name: "Speech Quality", value: 30 },
        { name: "Engagement", value: 20 },
        { name: "Body Language", value: 25 },
        { name: "Voice Usage", value: 25 },
    ];

    // Sample performance data
    const performanceData = {
        verbal: [
            { name: "Verbal Clarity", score: 92, change: +8 },
            { name: "Tone and Intonation", score: 85, change: +5 },
            { name: "Pacing", score: 78, change: +12 },
        ],
        nonverbal: [
            { name: "Posture", score: 83, change: +3 },
            { name: "Gestures", score: 76, change: -2 },
            { name: "Eye Contact", score: 64, change: +6 },
            { name: "Facial Expressions", score: 79, change: +10 },
        ],
        engagement: [
            { name: "Stress Level", score: 71, change: +15 },
            { name: "Appropriateness", score: 88, change: +4 },
        ]
    };

    // sample tips should get it from the backend
    const tips = [
        "Focus on your verbal clarity and reduce filler words.",
        "Try maintaining eye contact for 3-5 seconds before looking away.",
        "Slow down when explaining complex topics to ensure clarity.",
        "Use more hand gestures to emphasize key points in your responses.",
        "Practice deeper breathing before answering difficult questions."
    ];

    // Calculate overall grade based on performance data
    const calculateOverallGrade = () => {
        // Flatten all metrics from all categories
        const allMetrics = [
            ...performanceData.verbal,
            ...performanceData.nonverbal,
            ...performanceData.engagement
        ];

        // Calculate average score
        const totalScore = allMetrics.reduce((sum, metric) => sum + metric.score, 0);
        const avgScore = Math.round(totalScore / allMetrics.length);

        return avgScore;
    };

    const overallGrade = calculateOverallGrade();

    // Function to handle sending a message in the chat
    const handleSendMessage = () => {
        if (newMessage.trim() === '') return; // Don't send empty messages

        // Create a new message object in a json format, uuidv4 is used to generate a unique id for each message
        const userMessage = {
            id: uuidv4(),
            sender: 'user',
            text: newMessage
        };
        setMessages([...messages, userMessage]); // Add the new message to the list
        setNewMessage(''); // Clear the input field

        // setTimeout to simulate an AI response after 1 second. it should come from the backend api call
        setTimeout(() => {
            const aiResponse = {
                id: messages.length + 2,
                sender: 'ai',
                text: "That's a great question! Based on your practice, I'd suggest focusing on making your transitions smoother and using more specific examples to illustrate your points."
            };
            setMessages(prevMessages => [...prevMessages, aiResponse]);
        }, 1000);
    };

    // next tip button handler
    const handleNextTip = () => {
        setCurrentTip((prev) => (prev + 1) % tips.length);
    };

    // Enhanced Progress Chart component

    // Update your data array with more meaningful practice scores
    const practiceScoreHistory = [
        { practice: 1, score: 60 },
        { practice: 2, score: 80 },
        { practice: 3, score: 78 },
        { practice: 4, score: 69 },
        { practice: 5, score: 100 },
        { practice: 6, score: 89 }
    ];

    return (
        <div className={isDarkMode ? "dark-mode" : ""}>
            <div className="video-meeting-container">
                {/* Header */}
                <header className="meeting-header">
                    <div className="header-left">
                        <h1 className="scenario-title">Scenario Overview - {scenarioName}</h1>
                    </div>
                    <div className="timer-display">{practiceTimer}</div>
                    {/* You can add a timer or other elements here if needed */}
                </header>

                {/* Main content */}
                <main className="scenario-content">
                    {/* 2-column layout */}
                    <div className="grid-layout-two-column">
                        {/* Left column - Performance metrics and charts */}
                        <div className="metrics-column">
                            {/* Performance metrics tabs */}
                            <div className="card practice-scores-card">
                                <div className="chart-container">

                                    {/* Tabs */}
                                    <div className="tab-container">
                                        <button
                                            onClick={() => setActiveTab('verbal')}
                                            className={`tab-button ${activeTab === 'verbal' ? 'tab-button-active' : ''}`}
                                        >
                                            Verbal
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('nonverbal')}
                                            className={`tab-button ${activeTab === 'nonverbal' ? 'tab-button-active' : ''}`}
                                        >
                                            Non-verbal
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('engagement')}
                                            className={`tab-button ${activeTab === 'engagement' ? 'tab-button-active' : ''}`}
                                        >
                                            Engagement
                                        </button>
                                    </div>

                                    {/* Metrics list */}
                                    <div className="metrics-container">
                                        {performanceData[activeTab].map((metric, index) => (
                                            <div key={index} className="metric-item">
                                                <div className="metric-header">
                                                    <span className="metric-name">{metric.name}</span>
                                                    <div className="metric-value">
                                                        <span className="metric-score">{metric.score}%</span>
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

                            {/* Progress chart - Now below practice scores */}
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

                            {/* Updated Pie Chart with total grade */}
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
                                                    innerRadius={60} /* Add inner radius to create a donut chart */
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                    labelLine={false} /* Remove label lines for cleaner look */
                                                >
                                                    {pieData.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"][index]}
                                                            strokeWidth={2}
                                                        />
                                                    ))}
                                                </Pie>
                                                {/* total grade */}
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

                            {/* Tip Section at bottom */}
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

                        {/* Right column - AI chat */}
                        <div className="chat-column">
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
                                                    {message.sender === 'ai' && <strong className="coach-name">Coach: </strong>}
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