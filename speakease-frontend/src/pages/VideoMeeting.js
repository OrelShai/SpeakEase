import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import VideoMeetingControllerAPI from '../BackEndAPI/VideoMeetingControllerAPI';

import { 
  MdMic, MdMicOff, 
  MdVideocam, MdVideocamOff, 
  MdClosedCaption, MdClosedCaptionOff,
  MdOutlinePanTool, 
  MdFiberManualRecord,
  MdCallEnd
} from 'react-icons/md';
import './VideoTraining.css';

const VideoTraining = ({ onEndCall }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State variables
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isCaptionOn, setIsCaptionOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [analysisResults, setAnalysisResults] = useState({});
  
  // References
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const analysisControllerRef = useRef(null);
  
  // Extract info from location state
  const scenarioName = location.state?.scenarioName + " Training Session!" || "Training Session";
  const scenarioId = location.state?.scenarioId || "default-scenario-id";

  // Authentication check
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

  // Initialize webcam and start continuous analysis
  useEffect(() => {
    const getMedia = async () => {
      try {
        // Get user media stream
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Set local video stream
        localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;
        
        // For demo purposes, use same stream for remote video
        setTimeout(() => {
          remoteVideoRef.current.srcObject = stream;
        }, 1000);
        
        // Start continuous analysis of the stream immediately
        const token = localStorage.getItem("token");
        VideoMeetingControllerAPI.setAuthToken(token);
        
        // Start continuous analysis
        analysisControllerRef.current = VideoMeetingControllerAPI.startContinuousAnalysis(
          stream,
          scenarioId,
          (results) => {
            console.log("Received analysis:", results);
            setAnalysisResults(prevResults => ({
              ...prevResults,
              ...results
            }));
          }
        );
        
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };
    
    getMedia();
    
    // Cleanup: stop webcam and analysis when component unmounts
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Stop the continuous analysis
      if (analysisControllerRef.current) {
        analysisControllerRef.current.stop();
      }
    };
  }, [scenarioId]);
  
  // Timer functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prevTimer => prevTimer + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle end call - submit data to backend
  const handleEndCall = async () => {
    // First stop the continuous analysis
    if (analysisControllerRef.current) {
      analysisControllerRef.current.stop();
    }
    
    // Clean up media resources
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      // Send meeting data to backend
      await VideoMeetingControllerAPI.endMeeting(scenarioId, {
        duration: timer,
        metrics: analysisResults,
        feedback: {
          completion: true,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log("Successfully ended meeting and sent data to server");
    } catch (error) {
      console.error("Error sending meeting data:", error);
    }
    
    // Navigate to overview
    navigate('/ScenarioOverview', { 
      state: { 
        scenarioId: scenarioId,
        scenarioName: scenarioName
      } 
    });
  };
  
  // Format timer as MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Handle microphone toggle
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Handle camera toggle
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOn(!isCameraOn);
    }
  };

  // The original recording button functionality (kept separate from stream analysis)
  const toggleRecording = () => {
    // This is for whatever other recording functionality is needed
    // The actual stream analysis runs continuously regardless of this button
    setIsRecording(!isRecording);
  };

  return (
    <div className="video-meeting-container">
      {/* Header */}
      <header className="meeting-header">
        <div className="header-left">
          <h1 className="scenario-title">{scenarioName}</h1>
        </div>
        <div className="timer-display">
          {formatTime(timer)}
        </div>
      </header>
      
      {/* Video Grid */}
      <main className="video-grid-container">
        <div className="video-grid">
          <div className="video-frame">
            <video 
              ref={localVideoRef}
              autoPlay 
              muted 
              playsInline
              className="video-element"
            />
            {!isCameraOn && (
              <div className="camera-off-indicator">
                <span className="camera-off-text">Camera Off</span>
              </div>
            )}
            <div className="participant-label">You</div>
          </div>
          <div className="video-frame">
            <video 
              ref={remoteVideoRef}
              autoPlay 
              playsInline
              className="video-element"
            />
            <div className="participant-label">Coach</div>
          </div>
        </div>
      </main>
      
      {/* Controls */}
      <footer className="meeting-controls">
        <div className="controls-container">
          <button 
            onClick={toggleMicrophone}
            className={`control-button ${isMuted ? 'button-muted' : ''}`}
          >
            {isMuted ? <MdMicOff size={24} /> : <MdMic size={24} />}
          </button>
          
          <button 
            onClick={toggleCamera}
            className={`control-button ${!isCameraOn ? 'button-camera-off' : ''}`}
          >
            {isCameraOn ? <MdVideocam size={24} /> : <MdVideocamOff size={24} />}
          </button>
          
          <button 
            onClick={() => setIsCaptionOn(!isCaptionOn)}
            className={`control-button ${isCaptionOn ? 'button-caption-on' : ''}`}
          >
            {isCaptionOn ? <MdClosedCaption size={24} /> : <MdClosedCaptionOff size={24} />}
          </button>
          
          <button 
            onClick={() => setIsHandRaised(!isHandRaised)}
            className={`control-button ${isHandRaised ? 'button-hand-raised' : ''}`}
          >
            <MdOutlinePanTool size={24} />
          </button>
          
          <button 
            onClick={toggleRecording}
            className={`control-button ${isRecording ? 'button-recording' : ''}`}
          >
            <MdFiberManualRecord size={24} />
          </button>
          
          <button 
            onClick={handleEndCall}
            className="control-button button-end-call"
          >
            <MdCallEnd size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VideoTraining;