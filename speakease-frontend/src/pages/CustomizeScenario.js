import React, { useState, useEffect, useRef } from 'react';
import './CustomizeScenario.css';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import { MdVolumeUp, MdAddAPhoto, MdDelete } from 'react-icons/md';
import axios from 'axios';

const CustomizeScenario = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);

  const [scenarioName, setScenarioName] = useState('');
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

  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [defaultScenarioId, setDefaultScenarioId] = useState('');

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
      return;
    }

    axios.get("/api/partners")
      .then(res => setPartners(res.data))
      .catch(err => console.error("Error loading partners:", err));

    const scenarioNameFromState = location.state?.scenarioName;
    if (scenarioNameFromState) {
      setScenarioName(scenarioNameFromState);

      axios.get("/api/default-scenarios")
        .then(res => {
          const found = res.data.find(s => s.scenario_name === scenarioNameFromState);
          if (found) {
            setDuration(found.duration?.toString() || '');
            setScenarioNotes(found.description || '');
            setDefaultScenarioId(found._id);

            const partnerId = String(found.default_partner_id);
            setSelectedPartnerId(partnerId);

            axios.get(`/api/partners/${partnerId}`)
              .then(response => {
                const partner = response.data;
                setVoice(partner.partner_name || '');
                setVocabularyLevel(partner.vocabulary_level || '');
                setLanguage(partner.language || '');
              })
              .catch(err => {
                console.error("Error fetching partner details:", err);
              });
          }
        })
        .catch(err => {
          console.error("Error fetching default scenarios:", err);
        });
    }
  }, [location.state, navigate]);

  const playVoiceSample = (voiceName) => {
    alert(`Playing voice sample for: ${voiceName}`);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPartnerPicture(file);
      setPartnerPictureURL(URL.createObjectURL(file));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const handleRemovePicture = () => {
    setPartnerPicture(null);
    setPartnerPictureURL(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleStartScenario = async (e) => {
    e.preventDefault();

    if (!scenarioName || !voice || !duration || !language || !vocabularyLevel || !scenarioNotes || !selectedPartnerId) {
      setErrorMessage("Please fill in all fields.");
      setShowPopup(true);
      return;
    }

    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await axios.post(
        "/api/user-custom-scenarios",
        {
          default_scenario_id: defaultScenarioId,
          custom_partner_id: selectedPartnerId,
          custom_duration: duration,
          custom_language: language,
          custom_vocabulary_level: vocabularyLevel,
          custom_tone: voice,
        },
        { headers }
      );

      console.log("✅ Custom scenario saved:", res.data.id);

      navigate("/VideoTraining", {
        state: {
          scenarioName,
          voice,
          duration,
          language,
          vocabularyLevel,
          scenarioNotes,
          partnerPictureURL,
          saveSettings,
          customScenarioId: res.data.id
        },
      });
    } catch (err) {
      console.error("❌ Error saving custom scenario:", err.response?.data || err);
      setErrorMessage("Failed to save your scenario.");
      setShowPopup(true);
    }
  };

  return (
    <div className="customize-container">
      <h1>Customize your scenario</h1>
      <p>Create a scenario that fits your goals and preferences</p>

      {showPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <div className="popup-message">{errorMessage}</div>
            <button className="popup-close" onClick={() => setShowPopup(false)}>close</button>
          </div>
        </div>
      )}

      <form onSubmit={handleStartScenario} className="form-container">
        <div className="left-section">
          <div className="input-group">
            <label>Scenario Name</label>
            <input type="text" value={scenarioName} readOnly className="readonly-input" />
          </div>

          <div className="input-group">
            <label>Voice</label>
            <div className="voice-selection-container">
              <select value={voice} onChange={(e) => setVoice(e.target.value)} className="voice-select">
                <option value="">Select a voice</option>
                <option value="Ella Davis">Ella Davis</option>
                <option value="Sophia Turner">Sophia Turner</option>
                <option value="Liam Reed">Liam Reed</option>
                <option value="Alex Carter">Alex Carter</option>
              </select>
              {voice && (
                <button type="button" className="voice-sample-button" onClick={() => playVoiceSample(voice)}>
                  <MdVolumeUp size={20} />
                </button>
              )}
            </div>
          </div>

          <div className="input-group">
            <label>Duration</label>
            <input type="text" value={duration} readOnly className="readonly-input" />
          </div>

          <div className="input-group">
            <label>Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
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
            <select value={vocabularyLevel} onChange={(e) => setVocabularyLevel(e.target.value)}>
              <option value="">Select vocabulary level</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="input-group">
            <label>Scenario Notes</label>
            <textarea value={scenarioNotes} readOnly rows="4" className="scenario-notes readonly-input" />
          </div>

          <div className="input-group">
            <label>Select Conversation Partner</label>
            <div className="partner-selection">
              {partners.map(partner => (
                <button
                  key={partner._id}
                  type="button"
                  className={`partner-button ${selectedPartnerId === partner._id ? 'selected' : ''}`}
                  onClick={() => setSelectedPartnerId(partner._id)}
                >
                  <img src={partner.profile_picture} alt={partner.partner_name} />
                  <p>{partner.partner_name}</p>
                </button>
              ))}
            </div>
          </div>

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
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
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
