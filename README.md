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
│   Frontend      │    │   Backend       │    │   External APIs │
│   (React/Vite)  │◄──►│   (Node/Express)│◄──►│   - Gemini AI   │
│   Port: 3000    │    │   Port: 3001    │    │   - Restaurant  │
└─────────────────┘    └─────────────────┘    │     API (8000) │
                                              └─────────────────┘
```

### Components

- **Frontend** (`restaurant-ui/`): React + TypeScript + Vite
  - Modern UI with responsive design
  - Real-time chat interface
  - Cart and checkout system
  - Order tracking

- **Backend** (`restaurant-bff/server/`): Node.js + Express + TypeScript
  - RESTful API endpoints
  - Google Gemini AI integration
  - Session management
  - Proxy to restaurant backend API

- **AI Service**: Google Gemini API with MCP (Model Context Protocol)
  - Intelligent conversation handling
  - Context-aware responses
  - OAuth integration for enhanced features

- **MCP Server** (`restaurant-mcp-server/`): Restaurant-specific AI tools
  - Menu browsing and filtering tools
  - Shopping cart management
  - Order processing and tracking
  - Secure authentication with Asgardeo/WSO2

## 🔧 Model Context Protocol (MCP) Server

The Restaurant AI Assistant uses the **Model Context Protocol (MCP)** to provide AI agents with secure, structured access to restaurant operations. The MCP server acts as a bridge between the AI chatbot and restaurant business logic.

### MCP Architecture

```
AI Assistant → MCP Client → MCP Server → Restaurant Data/API
     ↓              ↓              ↓              ↓
  Gemini AI    Streamable HTTP   Express Server   Menu/Cart/Order DB
```

### MCP Server Features

#### 🛠️ Available Tools

The MCP server provides the following tools that the AI can use:

**Menu Management:**
- `get_menu_categories` - Get all menu categories
- `list_items_by_category` - Browse items in a specific category
- `get_item_details` - Get detailed information about a menu item
- `find_items_by_criteria` - Filter items by dietary preferences, price, allergens

**Cart Operations:**
- `create_cart` - Create a new shopping cart session
- `add_to_cart` - Add items to cart with quantity
- `remove_from_cart` - Remove items from cart
- `get_cart` - View current cart contents and total

**Order Management:**
- `checkout` - Process cart into confirmed order
- `get_order_status` - Check order status and details
- `list_orders` - View all orders (admin)
- `get_my_orders` - Get user's order history
- `add_order_note` - Add special instructions to order

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

# Setup MCP Server
cd restaurant-mcp-server
npm install
cp .env.example .env  # Configure authentication
npm run dev

# In another terminal, start the backend
cd ../restaurant-bff/server
npm run dev

# In another terminal, start the frontend
cd ../../restaurant-ui
npm run dev
```

### Manual Setup

#### 1. MCP Server Setup

```bash
cd restaurant-mcp-server
npm install
cp .env.example .env
# Configure BASE_URL for your identity provider
npm run dev
```

#### 2. Backend Setup

```bash
cd restaurant-bff/server
npm install
cp .env.example .env
# Edit .env with your API keys (see Configuration section)
npm run build
npm run dev
```

#### 3. Frontend Setup

```bash
cd restaurant-ui
npm install
npm run dev
```

#### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **MCP Server**: http://localhost:8000/mcp
- **Health Check**: http://localhost:3001/api/health

## 🔧 Configuration

### Backend Environment Variables (`restaurant-bff/server/.env`)

```env
# Required
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
MCP_SERVER_URL=http://localhost:8000/mcp

# Optional
PORT=3001
NODE_ENV=development
BACKEND_API_URL=http://localhost:8000/api
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
VITE_BFF_BASE_URL=http://localhost:3001/api
```

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with system status |
| `POST` | `/api/chat` | Send chat message to AI assistant |
| `GET` | `/api/oauth/callback` | OAuth authorization callback |

### MCP Server Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/mcp` | MCP protocol endpoint for AI tools | ✅ OAuth |
| `GET` | `/health` | MCP server health check | ❌ |
| `GET` | `/api-docs` | Swagger API documentation | ❌ |

### Proxied Restaurant API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/menu/categories` | Get menu categories |
| `GET` | `/api/menu/items` | Get menu items with filters |
| `POST` | `/api/cart` | Create shopping cart |
| `GET` | `/api/cart/:sessionId` | Get cart contents |
| `POST` | `/api/orders` | Place new order |

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

1. **Start MCP Server** (provides AI tools):
   ```bash
   cd restaurant-mcp-server
   npm run dev  # Runs on port 8000
   ```

2. **Start Backend Server** (AI chat API):
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
   # Test MCP server health
   curl http://localhost:8000/health

   # Test backend health
   curl http://localhost:3001/api/health

   # Test chat with MCP integration
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Show me the menu"}'
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

#### MCP Server Connection Issues
```bash
# Check if MCP server is running
curl http://localhost:8000/health

# Verify MCP endpoint is accessible
curl -H "Authorization: Bearer <token>" http://localhost:8000/mcp

# Check MCP server logs for authentication errors
cd restaurant-mcp-server && npm run dev
```

#### Authentication Problems
```bash
# Ensure BASE_URL is correctly configured in MCP server .env
# For Asgardeo: https://api.asgardeo.io/t/your-tenant
# For WSO2: https://localhost:9443

# Check OAuth configuration in backend .env
grep OAUTH restaurant-bff/server/.env
```

#### Backend Won't Start
```bash
# Check if .env file exists and has required variables
cd restaurant-bff/server
ls -la .env

# Verify Google AI API key is set
grep GOOGLE_AI_API_KEY .env

# Check for build errors
npm run build

# Check Node.js version
node --version  # Should be 18+
```

#### Frontend Connection Issues
```bash
# Verify backend is running
curl http://localhost:3001/api/health

# Check CORS configuration
# Ensure ALLOWED_ORIGINS includes your frontend URL
```

#### AI Chat Not Working
```bash
# Verify API key is valid
# Check backend logs for API errors
# Ensure MCP service is running on port 8000
curl http://localhost:8000/health

# Test MCP tool availability
curl -X POST http://localhost:8000/mcp \
  -H "Authorization: Bearer <token>" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

#### Port Conflicts
```bash
# Find what's using the ports
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :8000  # MCP Server

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
