import React, { useState, useEffect, useRef } from 'react';
import { 
  MdMic, MdMicOff, 
  MdVideocam, MdVideocamOff, 
  MdClosedCaption, MdClosedCaptionOff,
  MdOutlinePanTool, 
  MdFiberManualRecord,
  MdCallEnd
} from 'react-icons/md';
import './VideoTraining.css';

// scenarioName is a prop that will be passed to the VideoTraining component
const VideoTraining = ({ scenarioName = "Scenario Name", onEndCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isCaptionOn, setIsCaptionOn] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  
  // useref is a React Hook that provides a way to create a mutable reference that persists across renders. 
  // Think of it like a container that holds a value, but when that value changes, it doesn't cause your component to re-render.
  const localVideoRef = useRef(null);  // Reference to the use video element
  const remoteVideoRef = useRef(null); // Reference to the ai video element
  const localStreamRef = useRef(null); // Storage user webcam's MediaStream
  
  // Initialize webcam
  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        localVideoRef.current.srcObject = stream;
        localStreamRef.current = stream;
        
        // For demo purposes, we'll use the same stream for the remote video
        // In a real app, this would come from WebRTC or other source
        // we should change it when the stream of the ai is ready
        setTimeout(() => {
          remoteVideoRef.current.srcObject = stream;
        }, 1000);
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };
    
    getMedia();
    
    // Cleanup function to ensure that we stop the webcam when the component is unmounted
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Timer functionality
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prevTimer => prevTimer + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Format timer as MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    // padStart() method pads the current string with another string (multiple times, if needed) until the resulting string reaches the given length.
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
      
      {/* buttons */}
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
            onClick={() => setIsRecording(!isRecording)}
            className={`control-button ${isRecording ? 'button-recording' : ''}`}
          >
            <MdFiberManualRecord size={24} />
          </button>
          
          {/* End Call button should be linked to feedback page */}
          <button 
            onClick={onEndCall}
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