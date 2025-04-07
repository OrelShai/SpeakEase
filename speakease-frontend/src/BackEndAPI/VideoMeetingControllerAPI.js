import axios from 'axios';

/**
 * Class to handle all API calls related to video meetings
 * Communicates with the backend for video analysis and processing
 */
class VideoMeetingControllerAPI {
  constructor() {
    this.baseURL = 'http://127.0.0.1:5000'; // Base URL for API calls
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Set authentication token for API requests
   * @param {string} token - JWT token
   */
  setAuthToken(token) {
    this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Convert media stream to base64 encoded data
   * @param {MediaStream} stream - The media stream to encode
   * @returns {Promise<string>} - Base64 encoded video data
   */
  async streamToBase64(stream) {
    return new Promise((resolve, reject) => {
      try {
        // Create a video recorder from the stream
        const recorder = new MediaRecorder(stream);
        const chunks = [];
        
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };
        
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            // Remove the data URL prefix (e.g., "data:video/webm;base64,")
            const base64data = reader.result.split(',')[1];
            resolve(base64data);
          };
        };
        
        // Record for 5 seconds (can be adjusted based on needs)
        recorder.start();
        setTimeout(() => {
          recorder.stop();
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send video stream to backend for analysis
   * @param {MediaStream} stream - The video stream to analyze
   * @param {string} scenarioId - The ID of the scenario being practiced
   * @returns {Promise<Object>} - Analysis results
   */
  async analyzeVideoStream(stream, scenarioId) {
    try {
        
      // First convert the stream to base64
      const videoData = await this.streamToBase64(stream);
      
      // Send to backend
      const response = await this.axiosInstance.post('/api/analyze', {
        video_data: videoData,
        scenario_id: scenarioId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error analyzing video stream:', error);
      throw error;
    }
  }

  /**
   * Send continuous video analysis during a meeting
   * @param {MediaStream} stream - The video stream
   * @param {string} scenarioId - The ID of the scenario
   * @param {function} onResultCallback - Callback function for analysis results
   * @returns {Object} - Controller with stop method
   */
  startContinuousAnalysis(stream, scenarioId, onResultCallback) {
    let isRunning = true;
    
    const analyzeLoop = async () => {
      while (isRunning) {
        try {
          const results = await this.analyzeVideoStream(stream, scenarioId);
          onResultCallback(results);
          
          // Wait before next analysis
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second interval
        } catch (error) {
          console.error('Error in continuous analysis:', error);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Shorter wait on error
        }
      }
    };
    
    // Start the analysis loop
    analyzeLoop();
    
    // Return controller to stop the analysis
    return {
      stop: () => {
        isRunning = false;
      }
    };
  }

  /**
   * End a video meeting session and submit final data
   * @param {string} scenarioId - The ID of the scenario
   * @param {Object} meetingData - Additional data about the meeting
   * @returns {Promise<Object>} - Server response
   */
  async endMeeting(scenarioId, meetingData) {
    try {
      const token = localStorage.getItem('token');
      this.setAuthToken(token);
      
      const response = await this.axiosInstance.post('/video_routes/end_session', {
        scenario_id: scenarioId,
        meeting_duration: meetingData.duration,
        user_metrics: meetingData.metrics || {},
        feedback: meetingData.feedback || {}
      });
      
      return response.data;
    } catch (error) {
      console.error('Error ending meeting:', error);
      throw error;
    }
  }

  /**
   * Get available coaches/AI partners for video meetings
   * @returns {Promise<Array>} - List of available coaches
   */
  async getAvailableCoaches() {
    try {
      const token = localStorage.getItem('token');
      this.setAuthToken(token);
      
      const response = await this.axiosInstance.get('/video_routes/coaches');
      return response.data.coaches;
    } catch (error) {
      console.error('Error fetching coaches:', error);
      throw error;
    }
  }
}

export default new VideoMeetingControllerAPI();