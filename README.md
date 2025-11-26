# Restaurant AI Assistant

A modern, secure restaurant AI assistant built with React and Node.js, featuring an intelligent chatbot powered by Google Gemini AI. The application provides a complete restaurant experience with menu browsing, cart management, order tracking, and AI-powered customer support.

## ✨ Features

- 🤖 **AI-Powered Chatbot**: Intelligent conversation assistant using Google Gemini AI
- 🍽️ **Interactive Menu**: Browse restaurant menu with categories and dietary filters
- 🛒 **Smart Cart System**: Add/remove items with real-time updates
- 📱 **Responsive Design**: Mobile-first design that works on all devices
- 🔒 **Secure Architecture**: API keys kept server-side, never exposed to frontend
- ⚡ **High Performance**: Optimized with React memoization and backend caching
- 🛡️ **Security First**: CORS protection, rate limiting, input validation
- 🔄 **Real-time Updates**: Live order tracking and status updates

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│       UI        │    │      BFF        │    │     AGENT       │
│   (React/Vite)  │◄──►│  (Node/Express) │◄──►│ (TypeScript)    │
│   Port: 3000    │    │   Port: 3001    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                           │    │
         │                                           │    │
         │                      ┌────────────────────┘    │
         ▼                      ▼                         ▼
┌─────────────────┐    ┌─────────────────┐         ┌─────────────────┐
│   REST Backend  │    │      MCP        │         │   AI MODEL      │
│   (Direct Call) │    │   (Tools)       │         │   (Gemini AI)   │
│   Port: 8000    │    │   Port: 8000    │         │                 │
└─────────────────┘    └─────────────────┘         └─────────────────┘
```

### Data Flow

1. **UI → BFF**: User interactions (chat, menu browsing, cart operations)
2. **BFF → Agent**: Chat messages processed by Gemini AI with MCP tools
3. **Agent → MCP**: AI calls restaurant tools for menu/cart/order data
4. **UI → REST**: Direct API calls for menu, cart, and order operations

### Components

- **UI** (`restaurant-ui/`): React + TypeScript + Vite
  - Modern responsive interface
  - Real-time chat with AI assistant
  - Menu browsing and cart management
  - Order tracking and checkout

- **BFF (Backend for Frontend)** (`restaurant-bff/`): Node.js + Express + TypeScript
  - API gateway for Agent interaction
  - Chat processing with session management

- **Agent** (`restaurant-bff/server/src/agent/`): AI processing layer
  - Google Gemini AI integration
  - MCP client for tool calling
  - OAuth authentication handling
  - Session and conversation management

- **MCP Server** (`restaurant-mcp-server/`): Model Context Protocol server
  - AI tools for restaurant operations
  - REST API for direct data access
  - OAuth 2.0 authentication
  - Menu, cart, and order management
  - Also contatin **RESTBackend**: API server
    - Provides REST endpoints
    - Handles menu data, cart sessions, orders
    - Secure authentication and authorization

## 🔧 Model Context Protocol (MCP) & REST API Server

The Restaurant AI Assistant uses a combined **MCP Server** that provides both AI tools via the Model Context Protocol and REST API endpoints for direct data access. The MCP server acts as the central backend service handling restaurant business logic.

### Architecture Overview

```
UI (Direct) → REST API → Restaurant Data
UI (Chat)   → BFF → Agent → MCP Server → Restaurant Data
```

### MCP Tools for AI Assistant

The MCP server provides the following tools that the AI can use for intelligent restaurant operations:

### MCP Server Features

The MCP server serves dual purposes:

#### 🤖 AI Tools (MCP Protocol)
- **Menu Management**: `get_menu_categories`, `list_items_by_category`, `get_item_details`, `find_items_by_criteria`
- **Cart Operations**: `create_cart`, `add_to_cart`, `remove_from_cart`, `get_cart`
- **Order Management**: `checkout`, `get_order_status`, `list_orders`, `get_my_orders`, `add_order_note`

#### 🌐 REST API Endpoints
- **Menu**: `GET /api/menu/categories`, `GET /api/menu/items`
- **Cart**: `POST /api/cart`, `GET /api/cart/:sessionId`, `POST /api/cart/:sessionId/items`
- **Orders**: `POST /api/orders`, `GET /api/orders/:orderId`
- **Health**: `GET /health`, `GET /api-docs`

#### 🔐 Security & Authentication

The MCP server implements enterprise-grade security:

- **OAuth 2.0 Integration**: Supports Asgardeo and WSO2 Identity Server
- **Protected Endpoints**: All MCP operations require authentication
- **Session Management**: Secure session handling with automatic cleanup
- **CORS Configuration**: Controlled cross-origin access
- **JWT Processing**: Token validation and user context

#### 🚀 MCP Server Setup

1. **Navigate to MCP Server Directory:**
   ```bash
   cd restaurant-mcp-server
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env  # Create if doesn't exist
   ```

   Update `.env` with your authentication settings:
   ```env
   # Identity Provider Configuration
   BASE_URL=https://api.asgardeo.io/t/your-tenant
   # OR for WSO2 Identity Server:
   # BASE_URL=https://localhost:9443

   # Server Configuration
   PORT=8000
   NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only
   ```

4. **Start MCP Server:**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

#### 🔗 MCP Integration

The backend automatically connects to the MCP server at `http://localhost:8000/mcp`. Configure the connection in the backend's `.env`:

```env
MCP_SERVER_URL=http://localhost:8000/mcp
```

#### 📋 MCP Server API

**Health Check:**
```bash
curl http://localhost:8000/health
```

**MCP Endpoint (Protected):**
```bash
curl -H "Authorization: Bearer <token>" \
     http://localhost:8000/mcp
```

**Available Tools List:**
```bash
curl -H "Authorization: Bearer <token>" \
     -X POST http://localhost:8000/mcp \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

### MCP Workflow Example

1. **Customer Inquiry:** "What's on the menu?"
2. **AI Processing:** AI receives query via chat endpoint
3. **MCP Tool Call:** AI calls `get_menu_categories` tool
4. **Data Retrieval:** MCP server fetches categories from restaurant data
5. **Response Generation:** AI formats response with menu information
6. **Customer Response:** "We have Appetizers, Main Courses, Desserts, and Beverages..."

### MCP Server Dependencies

- **@modelcontextprotocol/sdk**: Core MCP protocol implementation
- **@asgardeo/mcp-express**: Authentication middleware
- **express**: Web server framework
- **jsonwebtoken**: JWT token handling
- **swagger-ui-express**: API documentation (optional)

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Google AI API Key** ([Get from Google AI Studio](https://makersuite.google.com/app/apikey))
- **Identity Provider** (Asgardeo or WSO2 Identity Server) for MCP authentication

### Automated Setup

```bash
# Clone the repository
git clone <repository-url>
cd restaurant-ai-assistant

# Run the automated setup script for backend
./setup-backend.sh

# Setup MCP Server (provides REST API + MCP tools)
cd restaurant-mcp-server
npm install
cp .env.example .env  # Configure authentication
npm run dev

# In another terminal, start the BFF (Backend for Frontend)
cd ../restaurant-bff/server
npm run dev

# In another terminal, start the frontend
cd ../../restaurant-ui
npm run dev
```

### Manual Setup

#### 1. MCP Server Setup (REST API + AI Tools)

```bash
cd restaurant-mcp-server
npm install
cp .env.example .env
# Configure BASE_URL for your identity provider
npm run dev  # Runs on port 8000
```

#### 2. BFF Setup (AI Chat Processing)

```bash
cd restaurant-bff/server
npm install
cp .env.example .env
# Configure GOOGLE_AI_API_KEY and MCP_SERVER_URL
npm run dev  # Runs on port 3001
```

#### 3. Frontend Setup

```bash
cd restaurant-ui
npm install
npm run dev  # Runs on port 3000
```

#### 4. Access the Application

- **Frontend**: http://localhost:3000
- **BFF API**: http://localhost:3001/api
- **REST Backend**: http://localhost:8000/api
- **MCP Tools**: http://localhost:8000/mcp
- **API Docs**: http://localhost:8000/api-docs

## 🔧 Configuration

### Backend Environment Variables (`restaurant-bff/server/.env`)

```env
# Required
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
MCP_SERVER_URL=http://localhost:8000/mcp
BACKEND_API_URL=http://localhost:8000/api

# Optional
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# OAuth Configuration (if using MCP with OAuth)
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3001/api/oauth/callback
```

### MCP Server Environment Variables (`restaurant-mcp-server/.env`)

```env
# Identity Provider Configuration (choose one)
# For Asgardeo:
BASE_URL=https://api.asgardeo.io/t/your-tenant

# For WSO2 Identity Server:
# BASE_URL=https://localhost:9443

# Server Configuration
PORT=8000
NODE_TLS_REJECT_UNAUTHORIZED=0  # Development only - disable SSL verification

# Optional: Custom MCP Resource Identifier
# MCP_RESOURCE=http://localhost:8000/mcp
```

### Frontend Environment Variables (`restaurant-ui/.env`)

```env
# BFF (Backend for Frontend) - for chat functionality
VITE_BFF_BASE_URL=http://localhost:3001/api

# REST Backend (MCP Server) - for menu, cart, orders
VITE_API_BASE_URL=http://localhost:8000/api
```

## 📡 API Endpoints

### BFF (Backend for Frontend) Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with system status |
| `POST` | `/api/chat` | Send chat message to AI assistant |
| `GET` | `/api/oauth/callback` | OAuth authorization callback |

### REST Backend (MCP Server) Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/health` | MCP server health check | ❌ |
| `GET` | `/api-docs` | Swagger API documentation | ❌ |
| `GET` | `/api/menu/categories` | Get menu categories | ❌ |
| `GET` | `/api/menu/items` | Get menu items with filters | ❌ |
| `POST` | `/api/cart` | Create shopping cart | ❌ |
| `GET` | `/api/cart/:sessionId` | Get cart contents | ❌ |
| `POST` | `/api/cart/:sessionId/items` | Add item to cart | ❌ |
| `PUT` | `/api/cart/:sessionId/items/:itemId` | Update cart item | ❌ |
| `DELETE` | `/api/cart/:sessionId/items/:itemId` | Remove cart item | ❌ |
| `POST` | `/api/orders` | Place new order | ❌ |
| `GET` | `/api/orders/:orderId` | Get order details | ❌ |
| `POST` | `/mcp` | MCP protocol endpoint for AI tools | ✅ OAuth |

### Request/Response Examples

#### Chat API
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What are today'\''s specials?", "sessionId": "optional-session-id"}'
```

Response:
```json
{
  "success": true,
  "response": "Today we have several specials including...",
  "sessionId": "generated-or-provided-session-id",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Health Check
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "restaurant-ai-backend",
  "version": "1.0.0",
  "environment": "development",
  "sessions": {
    "active": 5,
    "maxAge": "24 hours"
  }
}
```

## 🛠️ Development

### Available Scripts

#### Backend Scripts (`restaurant-bff/server/`)

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint code quality checks
npm run type-check   # Run TypeScript type checking
```

#### MCP Server Scripts (`restaurant-mcp-server/`)

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript and copy assets
npm run start        # Start production server
npm run clean        # Remove build artifacts
npm run build:watch  # Watch mode compilation
```

#### Frontend Scripts (`restaurant-ui/`)

```bash
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Development Workflow

1. **Start MCP Server** (provides REST API and AI tools):
   ```bash
   cd restaurant-mcp-server
   npm run dev  # Runs on port 8000
   ```

2. **Start BFF Server** (handles chat and API proxying):
   ```bash
   cd restaurant-bff/server
   npm run dev  # Runs on port 3001
   ```

3. **Start Frontend** (React UI):
   ```bash
   cd restaurant-ui
   npm run dev  # Runs on port 3000
   ```

4. **Test Integration**:
   ```bash
   # Test MCP/REST server health
   curl http://localhost:8000/health

   # Test BFF health
   curl http://localhost:3001/api/health

   # Test chat with AI assistant
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Show me the menu"}'

   # Test direct REST API call
   curl http://localhost:8000/api/menu/categories
   ```

## 🔒 Security Features

- **API Key Protection**: Google AI keys stored server-side only
- **CORS Configuration**: Restricted to allowed origins
- **Rate Limiting**: 
  - Chat endpoint: 30 requests per 15 minutes
  - General API: 100 requests per 15 minutes
- **Input Validation**: Message length limits and sanitization
- **Request Timeouts**: 60s for chat, 30s for other requests
- **Security Headers**: Helmet.js protection enabled
- **Error Handling**: No sensitive information leaked in responses

## 🧹 Code Quality

### Linting and Type Checking

```bash
# Backend quality checks
cd restaurant-bff/server
npm run lint
npm run type-check

# Frontend quality (handled by Vite)
cd restaurant-ui
npm run build  # Includes ESLint checks
```

### Code Standards

- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured for both frontend and backend
- **Prettier**: Code formatting consistency
- **Security Audit**: Regular dependency vulnerability checks

## 🐛 Troubleshooting

### Common Issues

#### MCP/REST Server Connection Issues
```bash
# Check if MCP server is running
curl http://localhost:8000/health

# Verify REST API endpoints are accessible
curl http://localhost:8000/api/menu/categories

# Verify MCP endpoint is accessible (requires auth)
curl -H "Authorization: Bearer <token>" http://localhost:8000/mcp

# Check MCP server logs for authentication errors
cd restaurant-mcp-server && npm run dev
```

#### BFF Server Issues
```bash
# Check if BFF is running
curl http://localhost:3001/api/health

# Verify MCP server URL configuration
grep MCP_SERVER_URL restaurant-bff/server/.env

# Check BFF logs for connection errors
cd restaurant-bff/server && npm run dev
```

#### AI Chat Not Working
```bash
# Verify API key is valid in BFF
grep GOOGLE_AI_API_KEY restaurant-bff/server/.env

# Check BFF logs for API errors
cd restaurant-bff/server && npm run dev

# Ensure MCP service is running on port 8000
curl http://localhost:8000/health

# Test MCP tool availability (requires auth)
curl -X POST http://localhost:8000/mcp \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

#### Restaurant API Not Working
```bash
# Test direct REST API calls
curl http://localhost:8000/api/menu/categories

# Check MCP server logs
cd restaurant-mcp-server && npm run dev

# Verify frontend is configured to call correct API
grep VITE_API_BASE_URL restaurant-ui/.env
```

#### Port Conflicts
```bash
# Find what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # BFF (Backend for Frontend)
lsof -i :8000  # MCP/REST Server

# Kill process if needed
kill -9 <PID>
```

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG=restaurant-ai:*
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/your-feature-name`
3. **Make** your changes with tests
4. **Run** quality checks:
   ```bash
   cd restaurant-bff/server && npm run lint && npm run type-check
   cd ../../restaurant-ui && npm run build
   ```
5. **Commit** your changes: `git commit -m "Add your feature"`
6. **Push** to your branch: `git push origin feature/your-feature-name`
7. **Create** a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Add TypeScript types for new features
- Update documentation for API changes
- Test both frontend and backend functionality
- Ensure security best practices are followed

## 📚 Additional Documentation

- **[MCP Server Documentation](./restaurant-mcp-server/README.md)**: Comprehensive guide for the Model Context Protocol server
- **[API Documentation](./api-docs.yaml)**: Complete OpenAPI specification
- **[Secure Backend Guide](./SECURE_BACKEND_README.md)**: Security implementation details
- **[Proxy Implementation](./PROXY_IMPLEMENTATION.md)**: Backend proxy architecture

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powering the intelligent chatbot
- **Model Context Protocol** for AI service integration
- **React & Vite** for the modern frontend framework
- **Express.js** for the robust backend framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: See `api-docs.yaml` for complete API specification

---

**Happy coding! 🍽️🤖**

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
