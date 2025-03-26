import React, { useState } from 'react';
import './CustomizeScenario.css';
import { Link, useNavigate } from 'react-router-dom';

const CustomizeScenario = () => {
  // 1. Move useNavigate to the component level
  const navigate = useNavigate();
  
  // 2. Add state for form fields
  const [scenarioName, setScenarioName] = useState('');
  const [conversationGoal, setConversationGoal] = useState('');
  const [partnerTone, setPartnerTone] = useState('Friendly');
  const [duration, setDuration] = useState('');
  const [language, setLanguage] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Beginner');
  const [vocabularyLevel, setVocabularyLevel] = useState('Basic');
  const [participantsNumber, setParticipantsNumber] = useState('');
  const [saveSettings, setSaveSettings] = useState(false);

  // 3. Handle form submission and navigation
  const handleStartScenario = (e) => {
    e.preventDefault();
    
    // Navigate to VideoTraining with all form data
    navigate('/VideoTraining', { 
      state: { 
        scenarioName: scenarioName || 'Custom Scenario',
        conversationGoal,
        partnerTone,
        duration,
        language,
        experienceLevel,
        vocabularyLevel,
        participantsNumber,
        saveSettings
      } 
    });
  };

  return (
    <div className="customize-container">
      <h1>Customize your scenario</h1>
      <p>Create a scenario that fits your goals and preferences</p>
      
      <form onSubmit={handleStartScenario} className="form-container">
        <div className="left-section">
          <div className="input-group">
            <label>Conversation Goal</label>
            <input 
              type="text" 
              value={conversationGoal}
              onChange={(e) => setConversationGoal(e.target.value)}
              placeholder="For example: persuade, present information, ask questions..." 
            />
          </div>
          <div className="input-group">
            <label>Scenario Name</label>
            <input 
              type="Add your scenario name" 
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Add your scenario name" 
            />
          </div>
          <div className="input-group">
            <label>Partner's Tone</label>
            <select
              value={partnerTone}
              onChange={(e) => setPartnerTone(e.target.value)}
            >
              <option value="Friendly">Friendly</option>
              <option value="Professional">Professional</option>
              <option value="Strict">Strict</option>
              <option value="Humorous">Humorous</option>
            </select>
          </div>
          <div className="input-group">
            <label>Duration</label>
            <input 
              type="text" 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="How long would you like to practice?" 
            />
          </div>
          <div className="input-group">
            <label>Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              <option value="">Choose your practice language</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="German">German</option>
            </select>
          </div>
        </div>
        
        <div className="right-section">
          <div className="input-group">
            <label>Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
            </select>
          </div>
          <div className="input-group">
            <label>Use of Complex Vocabulary</label>
            <select
              value={vocabularyLevel}
              onChange={(e) => setVocabularyLevel(e.target.value)}
            >
              <option value="Basic">Basic</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>
          <div className="input-group">
            <label>Group Scenarios</label>
            <select
              value={participantsNumber}
              onChange={(e) => setParticipantsNumber(e.target.value)}
            >
              <option value="">Choose participants number</option>
              <option value="2">2 people</option>
              <option value="3">3 people</option>
              <option value="4">4 people</option>
            </select>
          </div>
          <button type="button" className="add-partner">Add partner picture</button>
          <div className="save-settings">
            <input 
              type="checkbox" 
              checked={saveSettings}
              onChange={(e) => setSaveSettings(e.target.checked)}
            /> 
            Save the settings for future practice sessions.
          </div>
          
          <button type="submit" className="start-scenario">Start scenario</button>
          <p className="back-home">Want a built-in scenario? <Link to="/">Back to home screen</Link></p>
        </div>
      </form>
    </div>
  );
};

export default CustomizeScenario;
