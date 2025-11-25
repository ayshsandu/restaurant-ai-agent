# Restaurant MCP Server

A Model Context Protocol (MCP) server built with TypeScript and Express.js for restaurant operations, including menu management, cart handling, and order processing. This server provides secure, authenticated access to restaurant business logic for AI assistants.

## Features

- **Menu Management**: Browse categories, filter items by dietary preferences, allergens, and price
- **Shopping Cart**: Create, modify, and manage customer shopping sessions
- **Order Processing**: Complete checkout flow with customer and payment information
- **Order Tracking**: Real-time order status updates and history
- **Authentication**: OAuth 2.0 integration with Asgardeo and WSO2 Identity Server
- **Session Management**: Secure session handling with automatic cleanup
- **API Documentation**: Swagger/OpenAPI documentation included

## Architecture

```
AI Assistant → MCP Client → MCP Server → Restaurant Data
     ↓              ↓              ↓              ↓
  Gemini AI    Streamable HTTP   Express Server   In-Memory Store
```

## Security

This MCP server uses **@asgardeo/mcp-express** for enterprise-grade authentication and security:

- **OAuth 2.0 Integration**: Supports Asgardeo Cloud and WSO2 Identity Server
- **Protected Endpoints**: The `/mcp` endpoint requires valid authentication
- **JWT Validation**: Automatic token verification and user context extraction
- **Session Security**: Secure session management with configurable timeouts
- **CORS Protection**: Configured cross-origin access control
- **Request Validation**: Input sanitization and validation for all operations

## Prerequisites

- Node.js (version 18 or higher)
- npm

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd mcp-server-typescript
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   - `BASE_URL`: The base URL for the MCP server (e.g., `https://localhost:9443` for WSO2 Identity Server or `https://api.asgardeo.io/t/myagents` for Asgardeo)
   - `PORT`: The port number for the server (default: 8000)
   - `NODE_TLS_REJECT_UNAUTHORIZED`: Set to "0" to disable TLS certificate verification (for development only)

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

The server will start on the port specified in the `.env` file (default: 8000).

## Usage

This MCP server provides tools for restaurant operations that can be integrated with MCP-compatible clients, such as AI assistants or other MCP applications.

### Available Tools
- Menu management
- Cart operations
- Order processing

## Project Structure

- `src/index.ts`: Main server file
- `src/menu_items.json`: Menu data
- `dist/`: Compiled JavaScript files
- `.env`: Environment configuration

## Scripts

- `npm run build`: Compile TypeScript and copy assets
- `npm run dev`: Run in development mode with hot reload
- `npm start`: Run the compiled server
- `npm run clean`: Remove build artifacts

## Integration with Restaurant AI Assistant

This MCP server is designed to work with the Restaurant AI Assistant backend:

### Backend Configuration
Add to `restaurant-bff/server/.env`:
```env
MCP_SERVER_URL=http://localhost:8000/mcp
```

### Authentication Flow
1. User authenticates with identity provider (Asgardeo/WSO2)
2. Backend receives OAuth tokens
3. AI assistant uses tokens to call MCP tools
4. MCP server validates tokens and provides restaurant data

### Example Workflow
1. Customer asks: "What's on the menu?"
2. AI calls `get_menu_categories` MCP tool
3. MCP server returns available categories
4. AI responds with formatted menu information

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-tool`)
3. Make your changes
4. Test with authentication enabled
5. Run `npm run build` to ensure compilation
6. Update documentation for new tools
7. Submit a pull request

## License

This project is licensed under the MIT License. See the main project LICENSE file for details.