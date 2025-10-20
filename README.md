# SpeakEase
Unified repo: /Frontend (React), /Backend (Flask)
# SpeakEase - AI-Powered Public Speaking Training Platform

![SpeakEase Logo](Frontend/public/images/navbar/SpeakEaseLogo-LightMode.png)

SpeakEase is a comprehensive AI-powered platform designed to help users improve their public speaking skills through real-time video analysis, personalized feedback, and interactive training sessions.

## 🎯 Project Overview

SpeakEase combines computer vision, machine learning, and natural language processing to provide users with detailed analysis of their speaking performance including:

- **Eye Contact Analysis** - Track and improve gaze patterns
- **Body Language Assessment** - Analyze facial expressions and head pose
- **Speech Quality Evaluation** - Grammar, tone, and speech style analysis
- **Content Quality Assessment** - AI-powered evaluation of answer relevance
- **Real-time Feedback** - Instant coaching during practice sessions

## 🏗️ Architecture

The project is structured as a full-stack application:

```
SpeakEase/
├── Frontend/          # React.js web application
├── backend/           # Flask REST API server
└── README.md         # This file
```

### Frontend (React.js)
- Modern React application with responsive design
- Real-time video recording
- Interactive dashboard with performance analytics
- Scenario-based training modules
- Dark/Light mode support

### Backend (Flask)
- RESTful API with JWT authentication
- Video processing and AI analysis pipeline
- MongoDB integration for data persistence
- Real-time AI coaching using Google Gemini
- Performance analytics and scoring system

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- MongoDB
- FFmpeg
- Google Gemini API key (for AI features)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd SpeakEase
```

2. **Setup Backend**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

3. **Setup Frontend**
```bash
cd Frontend
npm install
npm start
```

4. **Environment Variables**
```bash
# Backend
export GEMINI_API_KEY=your_gemini_api_key
export MONGODB_URI=your_mongodb_connection_string

# Frontend
REACT_APP_API_URL=http://localhost:5000
```

## 🎭 Features

### Core Training Scenarios
- **Job Interview Practice** - Simulate real interview conditions
- **Presentation Training** - Improve public speaking skills
- **First Date Conversations** - Casual conversation practice
- **Storytelling** - Narrative and engagement skills
- **Custom Scenarios** - User-defined practice sessions

### AI Analysis Modules
- **Eye Contact Tracking** - MediaPipe-based gaze analysis
- **Head Pose Detection** - 3D head orientation tracking
- **Facial Expression Analysis** - CNN-based emotion recognition
- **Speech-to-Text** - Whisper-powered transcription
- **Grammar Analysis** - Language quality assessment
- **Tone Analysis** - Prosody and intonation evaluation
- **Content Evaluation** - AI-powered answer quality scoring

### Performance Analytics
- Real-time scoring across multiple metrics
- Historical performance tracking
- Detailed improvement suggestions
- Visual progress charts and insights

## 🛠️ Technology Stack

### Frontend
- **React.js** - UI framework
- **React Router** - Navigation
- **Recharts** - Data visualization
- **CSS3** - Styling and animations
- **WebRTC** - Video recording

### Backend
- **Flask** - Web framework
- **PyMongo** - MongoDB integration
- **OpenCV** - Computer vision
- **MediaPipe** - Face and pose detection
- **Librosa** - Audio analysis
- **Whisper** - Speech recognition
- **Google Gemini** - AI coaching
- **scikit-learn** - Machine learning models

### Infrastructure
- **MongoDB** - Database
- **JWT** - Authentication
- **FFmpeg** - Video processing
- **Gunicorn** - Production server

## 📊 Performance Metrics

SpeakEase evaluates users across three main categories:

### Verbal Communication (20%)
- **Language Quality** - Grammar and vocabulary usage
- **Speech Style** - Appropriateness and politeness
- **Grammar ML** - Advanced linguistic analysis

### Body Language (30%)
- **Eye Contact** - Gaze tracking and engagement
- **Head Pose** - Posture and orientation
- **Facial Expression** - Emotional expressiveness

### Interaction Quality (50%)
- **Tone Analysis** - Voice modulation and variety
- **Content Answer Quality** - Relevance and depth of responses

## 🔧 Development

### Backend Development
```bash
cd backend
# Run in development mode
python app.py

# Run tests
python -m pytest tests/

# Train ML models
python tools/train_models/train_grammar_quality.py
python tools/train_models/train_speech_style.py
```

### Frontend Development
```bash
cd Frontend
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 📁 Project Structure

For detailed information about each component:
- [Frontend Documentation](Frontend/README.md)
- [Backend Documentation](backend/README.md)


## 👥 Team

SpeakEase is developed as a final year project at Bar-Ilan University.

---

Made with ❤️ for better communication skills
