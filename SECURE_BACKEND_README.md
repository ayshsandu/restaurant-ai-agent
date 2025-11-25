# Restaurant AI Assistant - Secure Backend Implementation

This project has been updated to use a secure backend architecture where the Google AI API key is kept server-side instead of exposed in the frontend.

## Architecture

- **Frontend**: React + TypeScript + Vite (client-side)
- **Backend**: Node.js + Express + TypeScript (server-side)
- **AI Service**: Google Gemini API (server-side only)

## Security Improvements

✅ **Google AI API key is now secure on the backend**
✅ **CORS protection** 
✅ **Rate limiting** to prevent abuse
✅ **Request validation** and sanitization
✅ **Error handling** without exposing sensitive info
✅ **Environment variable management**

## Setup Instructions

### 1. Backend Setup

```bash
# Run the setup script
./setup-backend.sh

# Or manually:
cd server
npm install
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `restaurant-bff/server/.env` and add your Google AI API key:

```env
GOOGLE_AI_API_KEY=your_actual_google_ai_api_key_here
PORT=3001
NODE_ENV=development
MCP_SERVICE_URL=http://localhost:8000/mcp
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Get your API key**: https://makersuite.google.com/app/apikey

#### Optional: Configure OAuth

If your MCP service requires OAuth authentication, add these variables:

```env
MCP_OAUTH_CLIENT_ID=your_oauth_client_id
MCP_OAUTH_CLIENT_SECRET=your_oauth_client_secret
MCP_OAUTH_REDIRECT_URL=http://localhost:3001/api/oauth/callback
MCP_OAUTH_SCOPE=mcp:tools
MCP_AUTHORIZATION_URL=https://your-oauth-provider.com/oauth/authorize
MCP_OAUTH_TOKEN_ENDPOINT=https://your-oauth-provider.com/oauth/token
```

**OAuth Flow**: When a new chat session is created and OAuth is required, the authorization URL is automatically included in the first chat response. The user must complete authorization before continuing the conversation. Upon successful authorization, the authorization code is automatically exchanged for access tokens.

### 3. Start the Backend

```bash
cd server
npm run dev
```

The backend will start on `http://localhost:3001`

### 4. Start the Frontend

```bash
# From the main directory
npm run dev
```

The frontend will start on `http://localhost:5173`

## Project Structure

```
restaurant-ai-assistant/
├── restaurant-bff/                          # Backend (secure)
│   ├── server/
│   │   ├── src/
│   │   │   ├── server.ts               # Express server
│   │   │   └── services/
│   │   │       └── geminiService.ts    # AI service (server-side)
│   │   ├── package.json
│   ├── .env.example
│   └── .env                        # Your secrets (create from .example)
├── services/
│   └── apiService.ts               # Frontend API client
├── components/                      # React components
├── App.tsx                         # Updated to use backend API
└── setup-backend.sh               # Setup script
```

## API Endpoints

### Backend API

- `GET /api/health` - Health check
- `POST /api/chat` - Send chat message

```javascript
// Example API usage
const response = await fetch('http://localhost:3001/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Show me the menu' })
});
```

### OAuth Endpoints (Optional)

If MCP OAuth is configured, the following endpoints are available:

- `GET /api/oauth/callback` - OAuth callback endpoint for authorization codes
- `POST /api/oauth/authorize` - Manual OAuth authorization flow initiation (optional)

**OAuth Flow**: When a new chat session is created and OAuth is required, the authorization URL is automatically included in the first chat response. The user must complete authorization before continuing the conversation.

```javascript
// Chat response when authorization is required
{
  "success": true,
  "response": "I need to authenticate with the restaurant system...",
  "authorizationRequired": true,
  "authorizationUrl": "https://oauth-provider.com/authorize?...",
  "sessionId": "session-123",
  "timestamp": "2025-01-08T..."
}
```

## Key Changes Made

### 1. Created Secure Backend (`restaurant-bff/server/`)
- Express.js server with TypeScript
- Google AI API key stored securely in environment variables
- CORS and rate limiting for security
- Proper error handling

### 2. Updated Frontend
- Removed direct Gemini API usage
- Added `apiService.ts` to communicate with backend
- Added connection status monitoring
- Updated UI to show backend connection status

### 3. Security Features
- API key never exposed to client
- Rate limiting (100 requests per 15 minutes per IP)
- CORS protection
- Request validation
- Error sanitization

## Environment Variables

### Backend (.env)
```env
GOOGLE_AI_API_KEY=your_key_here
PORT=3001
NODE_ENV=development
MCP_SERVICE_URL=http://localhost:8000/mcp
ALLOWED_ORIGINS=http://localhost:5173

# OAuth Configuration (optional)
MCP_OAUTH_CLIENT_ID=your_oauth_client_id
MCP_OAUTH_CLIENT_SECRET=your_oauth_client_secret
MCP_OAUTH_REDIRECT_URL=http://localhost:3001/api/oauth/callback
MCP_OAUTH_SCOPE=mcp:tools
MCP_AUTHORIZATION_URL=https://your-oauth-provider.com/oauth/authorize
MCP_OAUTH_TOKEN_ENDPOINT=https://your-oauth-provider.com/oauth/token
```

### Frontend (optional .env)
```env
VITE_BFF_BASE_URL=http://localhost:3001/api
```

## Development

### Backend Development
```bash
cd server
npm run dev          # Start with hot reload
npm run build        # Build TypeScript
npm run start        # Start production build
```

### Frontend Development
```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
```

## Production Deployment

1. **Backend**: Deploy to a cloud service (AWS, Google Cloud, etc.)
2. **Environment**: Set production environment variables
3. **CORS**: Update `ALLOWED_ORIGINS` to include your production domain
4. **Frontend**: Update `VITE_BFF_BASE_URL` to your production backend URL

## Troubleshooting

### Backend Won't Start
- Check if `GOOGLE_AI_API_KEY` is set in `restaurant-bff/server/.env`
- Ensure port 3001 is available
- Check the console for error messages

### Frontend Can't Connect
- Ensure backend is running on port 3001
- Check CORS settings in backend
- Verify `VITE_BFF_BASE_URL` in frontend

### API Key Issues
- Get a new key from https://makersuite.google.com/app/apikey
- Ensure the key has access to Gemini API
- Check for any usage quotas or billing issues

## Next Steps

1. **Add Authentication**: Implement user authentication for production use
2. **Database Integration**: Store chat history and user preferences
3. **Enhanced Error Handling**: Add retry logic and better error recovery
4. **Monitoring**: Add logging and monitoring for production
5. **Testing**: Add unit and integration tests