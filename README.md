# Restaurant AI Assistant

A secure restaurant AI assistant with separate frontend and backend, keeping API keys server-side.

## 🏗️ Architecture

- **Frontend** (React + Vite): Runs on port 3000, handles UI and user interactions
- **Backend** (Node.js + Express): Runs on port 3001, securely handles AI operations
- **AI Service**: Google Gemini API accessed only from the backend
- **MCP Service**: Model Context Protocol service for backend resource and tool integration
- **Google AI Key**: Stored server-side only, never exposed to the frontend

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Google AI API Key (from [Google AI Studio](https://makersuite.google.com/app/apikey))

### 1. Setup Backend
```bash
cd server
cp .env.example .env
# Edit .env and set your GOOGLE_AI_API_KEY
npm install
npm run build
npm run dev
```

### 2. Setup Frontend (in another terminal)
```bash
npm install
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/chat

## 🔧 Configuration

### Environment Variables (server/.env)
```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
PORT=3001
NODE_ENV=development
MCP_SERVICE_URL=http://localhost:8000/mcp
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend Configuration
The frontend automatically connects to `http://localhost:3001/api`. To change this, set:
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

## 🔒 Security Features

- **API Key Protection**: Google AI key never leaves the server
- **CORS Protection**: Configured to only allow specific origins
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Message length and type validation
- **Helmet Security**: Security headers enabled

## 📡 API Endpoints

### Health Check
```http
GET /api/health
```

### Chat
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Show me the menu"
}
```

## 🛠️ Development

### Backend Scripts
```bash
npm run dev      # Start development server with hot reload
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint code quality checks
npm run type-check # Run TypeScript type checking
```

### Frontend Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## 🧹 Code Quality

This project maintains high code quality standards:

- **ESLint**: Configured for both frontend and backend with TypeScript support
- **TypeScript**: Strict type checking enabled
- **Code Linting**: Automated code quality checks
- **Security**: No known vulnerabilities (regular audit checks)
- **Performance**: Optimized React components with memoization

### Running Code Quality Checks

```bash
# Backend linting
cd server
npm run lint

# Frontend is handled by Vite's built-in ESLint integration
```

## 🐛 Troubleshooting

### CORS Errors
- Ensure backend is running on port 3001
- Check that frontend origin is allowed in CORS configuration
- Verify no firewall blocking localhost connections

### Backend Won't Start
- Check that `.env` file exists and `GOOGLE_AI_API_KEY` is set
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript compilation errors: `npm run build`

### AI Not Responding
- Verify your Google AI API key is valid
- Check backend logs for API errors
- Ensure MCP service is running (if used)


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both frontend and backend
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
