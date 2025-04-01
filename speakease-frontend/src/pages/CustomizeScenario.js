import React, { useState, useEffect, useRef } from 'react';
import './CustomizeScenario.css';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { MdVolumeUp, MdAddAPhoto, MdDelete } from 'react-icons/md';

const CustomizeScenario = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [scenarioName, setScenarioName] = useState('');
  const [conversationGoal, setConversationGoal] = useState('');
  const [voice, setVoice] = useState('');
  const [duration, setDuration] = useState('');
  const [language, setLanguage] = useState('');
  const [vocabularyLevel, setVocabularyLevel] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');
  const [partnerPicture, setPartnerPicture] = useState(null);
  const [partnerPictureURL, setPartnerPictureURL] = useState(null);
  const [saveSettings, setSaveSettings] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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

  // Play voice sample function
  const playVoiceSample = (voiceName) => {
    console.log(`Playing sample for ${voiceName}`);
    // This would play an audio file in a real implementation
    alert(`Playing voice sample for: ${voiceName}`);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPartnerPicture(file);
      setPartnerPictureURL(URL.createObjectURL(file));
    }
  };

  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  // Remove selected picture
  const handleRemovePicture = () => {
    setPartnerPicture(null);
    setPartnerPictureURL(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Enhanced form submission with validation
  const handleStartScenario = (e) => {
    e.preventDefault();

    // Validate all required fields
    if (!scenarioName || !conversationGoal || !voice || !duration ||
      !language || !vocabularyLevel || !scenarioNotes) {
      setErrorMessage("Please fill in all fields.");
      setShowPopup(true);
      return;
    }

    // Navigate to VideoTraining with form data
    navigate('/VideoTraining', {
      state: {
        scenarioName: scenarioName || 'Custom Scenario',
        conversationGoal,
        voice,
        duration,
        language,
        vocabularyLevel,
        scenarioNotes,
        partnerPictureURL,
        saveSettings
      }
    });
  };

  return (
    <div className="customize-container">
      <h1>Customize your scenario</h1>
      <p>Create a scenario that fits your goals and preferences</p>
      {/* Custom popup */}
      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-message">{errorMessage}</div>
            <button
              className="popup-close"
              onClick={() => setShowPopup(false)}
            >
              close
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleStartScenario} className="form-container">
        <div className="left-section">
          <div className="input-group">
            <label>Conversation Goal</label>
            <input
              type="text"
              value={conversationGoal}
              onChange={(e) => setConversationGoal(e.target.value)}
              placeholder="For example: Job interview, Business meeting, etc."
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
            <label>Voice</label>
            <div className="voice-selection-container">
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="voice-select"
              >
                <option value="">Select a voice</option>
                <option value="Ella Davis">Ella Davis</option>
                <option value="Sophia Turner">Sophia Turner</option>
                <option value="Liam Reed">Liam Reed</option>
                <option value="Alex Carter">Alex Carter</option>
              </select>
              {voice && (
                <button
                  type="button"
                  className="voice-sample-button"
                  onClick={() => playVoiceSample(voice)}
                >
                  <MdVolumeUp size={20} />
                </button>
              )}
            </div>
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
            <label>Vocabulary Level</label>
            <select
              value={vocabularyLevel}
              onChange={(e) => setVocabularyLevel(e.target.value)}
            >
              <option value="">Select vocabulary level</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </div>
          <div className="input-group">
            <label>Scenario Notes</label>
            <textarea
              value={scenarioNotes}
              onChange={(e) => setScenarioNotes(e.target.value)}
              placeholder="Add specific details or requests for your scenario"
              rows="4"
              className="scenario-notes"
            />
          </div>
          
          {/* Compact partner picture upload section */}
          <div className="input-group">
            <label>Partner Picture</label>
            <div className="picture-upload-container">
              {partnerPictureURL ? (
                <div className="picture-preview">
                  <img src={partnerPictureURL} alt="Partner" className="preview-image" />
                  <button type="button" className="remove-picture-button" onClick={handleRemovePicture}>
                    <MdDelete size={18} />
                  </button>
                </div>
              ) : (
                <button type="button" className="upload-picture-button" onClick={handleUploadClick}>
                  <MdAddAPhoto size={18} /> <span>Add picture</span>
                </button>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{display:'none'}} />
            </div>
          </div>
          
          <button type="submit" className="start-scenario">Start scenario</button>
          <p className="back-home">Want a built-in scenario? <Link to="/">Back to home screen</Link></p>
        </div>
      </form>
    </div>
  );
};

export default CustomizeScenario;
