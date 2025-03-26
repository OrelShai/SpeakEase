import { useState, useRef, useEffect } from "react";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./ScenarioOverview.css";

const ScenarioOverview = ({ isDarkMode }) => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "I've analyzed your recent practice session. Your verbal clarity has improved, but you could work on maintaining eye contact." },
    { id: 2, sender: 'user', text: "How can I improve my eye contact during presentations?" },
    { id: 3, sender: 'ai', text: "Try focusing on one person at a time for about 3-5 seconds before moving to another. Also, divide the room into sections and make sure you give attention to each section." },
    { id: 4, sender: 'user', text: "What about my pacing? Was I speaking too quickly?" },
    { id: 5, sender: 'ai', text: "Your pacing was generally good, but you did speed up during the middle section. Remember to take deliberate pauses after key points to let the information sink in." },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('verbal');
  const [currentTip, setCurrentTip] = useState(0);
  const chatEndRef = useRef(null);

  const data = [
    { name: "1", score: 5 },
    { name: "2", score: 6 },
    { name: "3", score: 7 },
    { name: "4", score: 6.5 },
    { name: "5", score: 8 },
    { name: "6", score: 7.5 },
  ];

  const pieData = [
    { name: "Speech Quality", value: 30 },
    { name: "Engagement", value: 20 },
    { name: "Body Language", value: 25 },
    { name: "Voice Usage", value: 25 },
  ];

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

  const tips = [
    "Focus on your verbal clarity and reduce filler words.",
    "Try maintaining eye contact for 3-5 seconds before looking away.",
    "Slow down when explaining complex topics to ensure clarity.",
    "Use more hand gestures to emphasize key points in your responses.",
    "Practice deeper breathing before answering difficult questions."
  ];

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;
    
    const userMessage = { id: messages.length + 1, sender: 'user', text: newMessage };
    setMessages([...messages, userMessage]);
    setNewMessage('');
    
    setTimeout(() => {
      const aiResponse = { 
        id: messages.length + 2, 
        sender: 'ai', 
        text: "That's a great question! Based on your practice, I'd suggest focusing on making your transitions smoother and using more specific examples to illustrate your points."
      };
      setMessages(prevMessages => [...prevMessages, aiResponse]);
    }, 1000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length);
  };

  return (
    <div className={isDarkMode ? "dark-mode" : ""}>
      <div className="video-meeting-container">
        {/* Header */}
        <header className="meeting-header">
          <div className="header-left">
            <h1 className="scenario-title">Scenario Overview</h1>
          </div>
          {/* You can add a timer or other elements here if needed */}
        </header>
        
        {/* Main content */}
        <main className="scenario-content">
          {/* 2-column layout */}
          <div className="grid-layout-two-column">
            {/* Left column - Performance metrics and charts */}
            <div className="metrics-column">
              {/* Performance metrics tabs */}
              <div className="card">
                <div className="chart-container">
                  <h2 className="chart-title">Practice Scores</h2>
                  
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
                            className={`progress-bar ${
                              metric.score > 85 ? 'progress-excellent' : 
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
              <div className="card">
                <div className="chart-container">
                  <h2 className="chart-title">Progress Over Time</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <Line type="monotone" dataKey="score" stroke="#8884d8" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              {/* Pie chart - Now below progress chart */}
              <div className="card">
                <div className="chart-container">
                  <h2 className="chart-title">Performance Breakdown</h2>
                  <div className="chart-content">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={pieData} 
                          dataKey="value" 
                          outerRadius={80} 
                          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0"][index]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - AI chat */}
            <div className="chat-column">
              <div className="card chat-container">
                <div className="chat-header">
                  <h2 className="chat-header-title">Ask Your Coach</h2>
                </div>
                
                <div className="chat-messages">
                  <div className="message-list">
                    {messages.map((message) => (
                      <div key={message.id} className={`message-row ${message.sender === 'user' ? 'message-row-user' : ''}`}>
                        <div className={`message-bubble ${
                          message.sender === 'user' 
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                      </svg>
                    </button>
                  </div>
                </div>
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
        </main>
      </div>
    </div>
  );
};

export default ScenarioOverview;