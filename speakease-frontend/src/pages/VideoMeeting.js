// speakease-frontend/src/pages/VideoMeeting.js
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import './VideoTraining.css';
import QuestionPanel from './QuestionPanel.jsx';

import {
  MdMic, MdMicOff,
  MdVideocam, MdVideocamOff,
  MdCallEnd
} from 'react-icons/md';

const VideoTraining = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- Session info ---
  const baseName = location.state?.scenarioName || "Training Session";
  const scenarioName = `${baseName} Training Session!`;
  const scenarioId = location.state?.scenarioId || "default-scenario-id";

  // --- UI state ---
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);

  // --- Recording state ---
  const [status, setStatus] = useState('idle'); // idle | recording | paused | stopped | uploading | sent
  const [blob, setBlob] = useState(null);
  const [previewURL, setPreviewURL] = useState('');
  const [question, setQuestion] = useState('Tell me about yourself briefly (up to one minute).');

  // --- Refs ---
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

    // Generate a session id once per page load (could be uuid; here simple timestamp-based)
  const sessionIdRef = useRef(`S-${Date.now()}-${Math.floor(Math.random()*1e6)}`);
  // Current question index within the session
  const [questionIdx, setQuestionIdx] = useState(0);
  const nextIdxRef = useRef(0);                  // authoritative next index
  const isSendingRef = useRef(false);            // re-entrancy guard

  // --- Auth guard ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    try {
      jwtDecode(token);
    } catch {
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate]);

  // --- Get camera/mic ---
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true
        });
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing media devices:", err);
        alert("Couldn't access camera/microphone.");
      }
    };
    init();

    return () => {
      // cleanup
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (previewURL) URL.revokeObjectURL(previewURL);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allocateIdx = () => {
    const i = nextIdxRef.current;
    nextIdxRef.current += 1;
    setQuestionIdx(nextIdxRef.current);          // cosmetic UI update
    return i;
  };

  // --- Mic/Camera toggles ---
  const toggleMicrophone = () => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach(tr => tr.enabled = !tr.enabled);
    setIsMuted(prev => !prev);
  };

  const toggleCamera = () => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach(tr => tr.enabled = !tr.enabled);
    setIsCameraOn(prev => !prev);
  };

  // --- Recording controls ---
  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const preferred = "video/webm;codecs=vp9,opus";
    const options = (window.MediaRecorder && MediaRecorder.isTypeSupported?.(preferred))
      ? { mimeType: preferred }
      : undefined; // let the browser pick if not supported

    try {
      const mr = new MediaRecorder(streamRef.current, options);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const type = mr.mimeType || "video/webm";
        const recorded = new Blob(chunksRef.current, { type });
        setBlob(recorded);
        const url = URL.createObjectURL(recorded);
        setPreviewURL(url);
        setStatus('stopped');
      };

      mr.start(250); // collect chunks every 250ms
      setStatus('recording');
    } catch (err) {
      console.error("MediaRecorder error", err);
      alert("The browser did not allow starting video recording.");
    }
  };

  const pauseOrResume = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === 'recording') {
      mr.pause();
      setStatus('paused');
    } else if (mr.state === 'paused') {
      mr.resume();
      setStatus('recording');
    }
  };

  const stopRecording = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    }
  };

const sendRecording = async () => {
  if (!blob) return alert('No recording to upload.');
  if (isSendingRef.current) {
    alert('Please wait until the previous upload is finished.');
    return;            // prevent double submit
  }
  isSendingRef.current = true;

  // clear blob early to avoid re-click with same file
  const localBlob = blob;
  setBlob(null);
  if (previewURL) URL.revokeObjectURL(previewURL);
  setPreviewURL('');

  setStatus('uploading');

  try {
    const token = localStorage.getItem('token') || '';

    // 0) allocate index synchronously
    const idxToSend = allocateIdx();

    // 1) upload
    const form = new FormData();
    const ext = (localBlob.type || '').includes('mp4') ? 'mp4' : 'webm';
    form.append('file', localBlob, `session_${Date.now()}.${ext}`);

    const uploadRes = await fetch('/api/upload/session-video', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form
    });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
    const { video_url } = await uploadRes.json();

    // 2) analyze + persist
    const analyzeRes = await fetch('/api/performance/analyze-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        scenario_id: scenarioId,
        idx: idxToSend,                         // use allocated index
        video_url
      })
    });
    if (!analyzeRes.ok) {
      const err = await analyzeRes.json().catch(() => ({}));
      throw new Error(`Analyze-item failed: ${analyzeRes.status} ${err.error || ''}`);
    }
    const analysisSaved = await analyzeRes.json();
    console.log('Analyze result:', analysisSaved);

    setStatus('idle');
    setQuestion('Describe a conflict you had in a team and what you learned from it.');
    alert('Recording uploaded and saved successfully!');
  } catch (err) {
    console.error(err);
    setStatus('stopped');
    // roll back index on failure (optional)
    nextIdxRef.current = Math.max(0, nextIdxRef.current - 1);
    setQuestionIdx(nextIdxRef.current);
    alert('Upload or analyze failed.');
  } finally {
    isSendingRef.current = false;
  }
};

const handleEndCall = async () => {
  try {
    const token = localStorage.getItem('token') || '';

    // Stop camera/mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    // Finalize the session on the server (creates completed_sessions doc)
    const res = await fetch('/api/performance/finalize-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        session_id: sessionIdRef.current,
        scenario_id: scenarioId
        // optional: video_url, pipeline_version
      })
    });

    let completedId = null;
    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      completedId = json.session_id || null;
      console.log('Completed session id:', completedId);
    } else {
      const err = await res.json().catch(() => ({}));
      console.warn('Finalize failed:', res.status, err);
      // You can choose to block navigation here if finalize is required
    }

    // Navigate to results/overview (pass completedId if you want to show fresh results)
    navigate('/ScenarioOverview', {
      state: { scenarioId, scenarioName, completedId }
    });
  } catch (e) {
    console.error('Finalize error:', e);
    // Fallback navigation even if finalize failed
    navigate('/ScenarioOverview', { state: { scenarioId, scenarioName } });
  }
};


  return (
    <div className="video-meeting-container">
      {/* Header */}
      <header className="meeting-header">
        <div className="header-left">
          <h1 className="scenario-title">{scenarioName}</h1>
        </div>
        {/* timer removed */}
      </header>

      {/* Main: left = user video, right = question panel */}
      <main className="video-grid-container">
        <div
          className="video-grid"
          style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24 }}
        >
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

          <div className="question-sticky">
            <QuestionPanel question={question} />
          </div>
        </div>
      </main>

      {/* Preview after stop */}
      {previewURL && (
        <div style={{ paddingInline: 24, marginTop: 8 }}>
          <h4>Preview</h4>
          <video src={previewURL} controls style={{ maxWidth: 480, width: '100%' }} />
        </div>
      )}

      {/* Controls */}
      <footer className="meeting-controls">
        <div className="controls-container" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {/* Mic */}
          <button onClick={toggleMicrophone} className={`control-button ${isMuted ? 'button-muted' : ''}`}>
            {isMuted ? <MdMicOff size={24} /> : <MdMic size={24} />}
          </button>

          {/* Camera */}
          <button onClick={toggleCamera} className={`control-button ${!isCameraOn ? 'button-camera-off' : ''}`}>
            {isCameraOn ? <MdVideocam size={24} /> : <MdVideocamOff size={24} />}
          </button>

          {/* Record controls */}
          <button
            onClick={startRecording}
            disabled={status === 'recording' || status === 'paused'}
            className={`control-button ${status === 'recording' ? 'button-recording' : ''}`}
            aria-pressed={status === 'recording'}
            title="Start recording"
          >
            record
          </button>

          <button
            onClick={pauseOrResume}
            disabled={!(status === 'recording' || status === 'paused')}
            className="control-button"
          >
            {status === 'paused' ? 'continue' : 'pause'}
          </button>

          <button
            onClick={stopRecording}
            disabled={!(status === 'recording' || status === 'paused')}
            className="control-button"
          >
            stop
          </button>

          <button
            onClick={sendRecording}
            disabled={!blob || status === 'uploading' || status === 'sent'}
            className="control-button"
          >
            upload
          </button>

          {/* End */}
          <button onClick={handleEndCall} className="control-button button-end-call">
            <MdCallEnd size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default VideoTraining;
