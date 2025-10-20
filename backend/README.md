# SpeakEase Backend

Flask-based REST API server providing AI-powered video analysis and coaching capabilities for the SpeakEase platform.

## 🏗️ Architecture

```
backend/
├── app.py                          # Main Flask application
├── requirements.txt               # Python dependencies
├── Data_Model_Logic/              # Data layer and business logic
│   ├── models/                    # Pydantic data models
│   ├── repositories/              # Database access layer
│   ├── routes/                    # API endpoints
│   └── services/                  # Business logic services
├── Performance_Analyzer/          # AI analysis pipeline
│   ├── analyzers/                 # Individual analysis modules
│   ├── Config/                    # Configuration files
│   └── utils/                     # Utility functions
├── Video_Meeting_Controller/       # Video session management
├── tests/                         # Unit and integration tests
└── tools/                         # Data and model training utilities
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- MongoDB
- FFmpeg
- Google Gemini API key

### Installation

1. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Environment Setup**
```bash
# Required environment variables
export GEMINI_API_KEY=your_gemini_api_key_here
export MONGODB_URI=mongodb://localhost:27017/speakease
export JWT_SECRET_KEY=your_secret_key_here
```

4. **Run the application**
```bash
python app.py
```

The server will start at `http://localhost:5000`

## 📡 API Endpoints

### Authentication
- `POST /api/users/register` - User registration
- `POST /api/users/login` - User login
- `PUT /api/users/profile` - Update user profile

### Scenario Management
- `POST /api/scenarios/create-scenario` - Create custom scenario
- `GET /api/user-custom-scenarios` - Get user scenarios

### Video Analysis
- `POST /api/performance/analyze-item` - Analyze video performance
- `POST /api/upload/session-video` - Upload session video

### Session Management
- `POST /api/completed-sessions` - Create completed session
- `GET /api/completed-sessions` - Get user's completed sessions

### AI Coaching
- `POST /api/chat/question` - Send question to AI coach

## 🤖 AI Analysis Pipeline

### Performance Analyzer

The core analysis system processes videos through multiple specialized analyzers:

#### Eye Contact Analyzer
- **Technology**: MediaPipe FaceMesh with iris tracking
- **Metrics**: Gaze direction, eye contact percentage
- **Output**: Forward-looking ratio score (0-100)

```python
from Performance_Analyzer.analyzers.eye_contact import EyeContactAnalyzer

analyzer = EyeContactAnalyzer()
result = analyzer.analyze("video_path.mp4")
```

#### Head Pose Analyzer
- **Technology**: MediaPipe + OpenCV PnP
- **Metrics**: Yaw, pitch, roll angles
- **Output**: Forward-facing posture score (0-100)

#### Facial Expression Analyzer
- **Technology**: Custom CNN model
- **Metrics**: 7 emotion classes (happy, sad, angry, etc.)
- **Output**: Expressiveness and positivity scores

#### Speech Analysis
- **Speech-to-Text**: Whisper-based transcription
- **Grammar Analysis**: LanguageTool + ML models
- **Speech Style**: Politeness, formality, filler word detection
- **Tone Analysis**: Prosody, pitch variation, energy

#### Content Quality Evaluator
- **Technology**: Google Gemini AI
- **Metrics**: Answer relevance, depth, clarity
- **Output**: Content quality score with detailed feedback

### Configuration

Each analyzer can be configured via [`Performance_Analyzer/Config/weights.py`](Performance_Analyzer/Config/weights.py):

```python
DEFAULT_WEIGHTS = {
    "overall": { 
        "verbal": 0.2, 
        "body_language": 0.3, 
        "interaction": 0.5 
    },
    "categories": {
        "verbal": { 
            "language_quality": 0.0, 
            "speech_style": 0.5, 
            "grammar_ml": 0.5 
        },
        "body_language": { 
            "eye_contact": 0.34, 
            "head_pose": 0.33, 
            "facial_expression": 0.33 
        },
        "interaction": { 
            "tone": 0.2, 
            "content_answer_quality": 0.8 
        }
    }
}
```

## 🗄️ Data Models

### User Management
- [`UserCreate`](Data_Model_Logic/models/user_models.py) - User registration
- [`UserUpdate`](Data_Model_Logic/models/user_models.py) - Profile updates
- [`UserOut`](Data_Model_Logic/models/user_models.py) - Public user data

### Session Management
- [`SessionItemCreate`](Data_Model_Logic/models/session_item_models.py) - Individual video analysis
- [`CompletedSessionCreate`](Data_Model_Logic/models/completed_session_models.py) - Full session data

### Analysis Results
- [`MetricResult`](Performance_Analyzer/schemas.py) - Individual analyzer output
- [`AnalyzerResult`](Data_Model_Logic/models/session_item_models.py) - Validated scores

## 🧠 AI Integration

### Google Gemini Integration
The platform uses Google Gemini for:
- **Question Generation**: Creating scenario-specific questions
- **Content Evaluation**: Assessing answer quality and relevance
- **AI Coaching**: Providing personalized feedback and suggestions


### Machine Learning Models

#### Grammar Quality Model
- **Type**: Logistic Regression with linguistic features
- **Training**: [`tools/train_models/train_grammar_quality.py`](tools/train_models/train_grammar_quality.py)
- **Features**: Error rates, filler words, TTR, sentence complexity

## 🔧 Development

### Running Tests
```bash
# Run all tests
python -m pytest tests/

# Run specific analyzer tests
python Performance_Analyzer/analyzers/Analyzers_tests/Content_Answer_Evalutor_tests/ContentAnswerEvaluator_test.py

# Test Gemini integration
python tests/test_gemini_question_generator.py
```

### Training Models
```bash
# Train grammar quality model
python tools/train_models/train_grammar_quality.py --csv tools/data/grammar_quality_labeled.csv

# Train speech style model  
python tools/train_models/train_speech_style.py
```

### Adding New Analyzers

1. Create analyzer class inheriting from [`BaseAnalyzer`](Performance_Analyzer/analyzers/base.py)
2. Register in [`registry.py`](Performance_Analyzer/analyzers/registry.py)
3. Add configuration to [`performance_analyzer.py`](Performance_Analyzer/performance_analyzer.py)

```python
class NewAnalyzer(BaseAnalyzer):
    metric = "new_metric"
    model = "algorithm_name"
    version = "1.0.0"
    
    def analyze(self, video_path: str) -> MetricResult:
        # Implementation here
        pass
```

## 📊 Performance Monitoring

### Logging
- Request/response logging
- Analysis pipeline performance
- Error tracking and reporting

### Metrics
- Analysis processing time
- Model accuracy scores
- API endpoint performance

## 🔒 Security

- JWT-based authentication
- Input validation with Pydantic
- File upload size limits
- CORS configuration
- Environment variable protection


For more information, see the [main project README](../README.md).