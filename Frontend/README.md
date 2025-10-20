# SpeakEase Frontend

Modern React.js web application providing an intuitive interface for AI-powered public speaking training and performance analysis.

## 🎨 Features

- **Real-time Video Recording** - Media Capture API for video recording
- **Video Upload & Analysis** - File-based processing pipeline
- **Interactive Training Sessions** - Scenario-based practice with live questions
- **Performance Dashboard** - Comprehensive analytics with charts and insights
- **AI Coaching Chat** - Real-time conversation with AI coach
- **Dark/Light Mode** - Customizable UI themes
- **User Management** - Registration, login, and profile management

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- SpeakEase Backend running on port 5000

### Installation

1. **Install dependencies**
```bash
cd Frontend
npm install
```

2. **Environment Setup**
Create `.env` file:
```bash
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ENVIRONMENT=development
```

3. **Start development server**
```bash
npm start
```

The application will open at `http://localhost:3000`

## 📦 Key Dependencies

- **React 18** - UI framework
- **React Router DOM** - Client-side routing
- **Recharts** - Performance charts and analytics
- **Axios** - HTTP client
- **JWT Decode** - JWT token handling

## 🎭 Main Components

### Pages
- **HomePage** - Landing page with scenario selection
- **VideoMeeting** - Real-time video recording interface
- **ScenarioOverview** - Performance analytics dashboard
- **LoginPage/RegisterPage** - User authentication

### Components
- **Navbar** - Navigation with authentication and theme control
- **QuickSetupModal** - Modal for scenario configuration
- **PerformanceCharts** - Recharts integration for data visualization

## 🔗 API Integration

Located in `src/BackEndAPI/`:
- **DataModelLogicAPI.js** - User management, scenarios, session data
- **VideoMeetingControllerAPI.js** - Video upload and AI coaching

## 🎨 Styling

- **Component-scoped CSS** - Each component has its own CSS file
- **CSS Variables** - Consistent theming system
- **Dark Mode Support** - Theme switching capability
- **Responsive Design** - Mobile-first approach

## 🛠️ Development

### Available Scripts
```bash
npm start     # Start development server
npm run build # Build for production
npm test      # Run tests
```

### Project Structure
```
src/
├── components/    # Reusable UI components
├── pages/        # Main application pages
├── BackEndAPI/   # API integration layer
├── App.js        # Main application component
└── index.js      # Application entry point
```

## 🔐 Authentication

JWT token-based authentication with localStorage for session management.

## 🐛 Troubleshooting

1. **CORS Errors** - Check backend CORS configuration and API URL
2. **Video Recording Issues** - Verify browser permissions for camera/microphone
3. **Chart Rendering Problems** - Check data format for Recharts components

---

For more information, see the [main project README](../README.md) and [backend documentation](../backend/README.md).