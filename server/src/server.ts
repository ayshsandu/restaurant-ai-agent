import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GeminiService } from './services/geminiService.js';
import { AuthorizationCodeOAuthProvider } from './services/simpleOAuthProvider.js';
// import {AuthorizationCodeOAuthProvider} from './services/oauthProvider.js';

import { v4 as uuidv4 } from 'uuid';

/**
 * Restaurant AI Assistant Backend Server
 *
 * This server provides a REST API for the restaurant AI assistant chat application.
 * It handles chat conversations with session management and integrates with Google's Gemini AI.
 */

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Enable CORS with proper configuration
app.use(
    cors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',') || false
            : true, // Allow all origins for development
        credentials: true,
        exposedHeaders: ['Mcp-Session-Id'],
    })
);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting with different tiers
const createRateLimit = (windowMs: number, max: number, message: string) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
    });
};

app.use('/api/chat', createRateLimit(15 * 60 * 1000, 50, 'Too many chat requests, please slow down'));
app.use('/api/', createRateLimit(15 * 60 * 1000, 100, 'Too many API requests from this IP'));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Initialize Gemini service
let geminiService: GeminiService;

try {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  const mcpServiceUrl = process.env.MCP_SERVER_URL;
  
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is required');
  }

  if (!mcpServiceUrl) {
    throw new Error('MCP_SERVER_URL environment variable is required');
  }

  // Initialize Gemini service without global OAuth provider
  geminiService = new GeminiService(apiKey, mcpServiceUrl);
  console.log('Gemini service initialized successfully');
} catch (error) {
  console.error('Failed to initialize services:', error);
  process.exit(1);
}

// Health check endpoint with details
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'restaurant-ai-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    sessions: {
      active: geminiService.getSessionCount(),
      maxAge: '24 hours'
    }
  };

  res.json(health);
});

// Add session info endpoint for debugging
app.get('/api/sessions/:sessionId', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const { sessionId } = req.params;
  const sessionInfo = geminiService.getSessionInfo(sessionId);

  if (!sessionInfo) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId,
    lastActivity: new Date(sessionInfo.lastActivity).toISOString(),
    age: sessionInfo.age
  });
});

// OAuth callback endpoint
/**
 * GET /api/oauth/callback
 * Handles OAuth authorization code callback
 *
 * @param {string} code - The authorization code from the OAuth provider
 * @param {string} state - The state parameter containing session ID for CSRF protection
 * @param {string} error - Error parameter if authorization failed
 * @returns {Object} Success or error response
 */
app.get('/api/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    const result = await geminiService.asynchandleOAuthCallback(
      code as string | undefined,
      state as string | undefined,
      error as string | undefined,
      error_description as string | undefined
    );

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        sessionId: result.sessionId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(result.error === 'Authorization failed' ? 400 : 500).json({
        success: false,
        error: result.error,
        details: result.details
      });
    }

  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    res.status(500).json({
      success: false,
      error: 'Failed to process OAuth callback',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
});

// Chat endpoint
/**
 * POST /api/chat
 * Handles chat messages and maintains conversation sessions
 *
 * @param {string} message - The user's message (required, max 1000 chars)
 * @param {string} sessionId - Optional session ID for conversation continuity
 * @returns {Object} Chat response with AI reply and session info
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    // Input validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long. Maximum 1000 characters allowed.'
      });
    }

    // Sanitize input
    const sanitizedMessage = message.trim();
    if (!sanitizedMessage) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    // Generate or validate session ID
    let currentSessionId = sessionId;
    if (!currentSessionId || typeof currentSessionId !== 'string' || currentSessionId.length > 100) {
      currentSessionId = uuidv4();
      console.log('Generated new session ID:', currentSessionId);
    } else {
      console.log('Using existing session ID:', currentSessionId);
    }

    // Get or create chat session
    let sessionData = geminiService.getChatSession(currentSessionId);
    let isNewSession = false;
    if (!sessionData) {
      isNewSession = true;

      // Create chat session with session-specific OAuth provider
      const chatSessionResult = await geminiService.createChatSession(currentSessionId);

      if (chatSessionResult.type === 'oauth_required') {
        // OAuth is required - return authorization information
        return res.json({
          success: true,
          response: chatSessionResult.message,
          authorizationRequired: true,
          authorizationUrl: chatSessionResult.authorizationUrl,
          sessionId: currentSessionId,
          timestamp: new Date().toISOString(),
          waitingForAuth: true
        });
      }

      // OAuth not required - session was created and stored internally
      sessionData = geminiService.getChatSession(currentSessionId);
      console.log('Created new chat session for:', currentSessionId);
    }

    console.log('Received chat request:', {
      sessionId: currentSessionId,
      message: sanitizedMessage.substring(0, 100) + '...'
    });

    const response = await geminiService.runChat(sanitizedMessage, currentSessionId);

    res.json({
      success: true,
      response: response.text,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      ...(response.authorizationRequired && {
        authorizationRequired: true,
        authorizationUrl: response.authorizationUrl
      })
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';

    // Don't leak sensitive information in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    res.status(error instanceof Error && error.message.includes('rate limit') ? 429 : 500).json({
      success: false,
      error: 'Failed to process chat request',
      ...(isDevelopment && { details: errorMessage })
    });
  }
});

// Global error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(isDevelopment && {
      details: error.message,
      stack: error.stack?.split('\n').slice(0, 5) // First 5 lines of stack
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Restaurant AI Backend running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Active sessions: ${geminiService.getSessionCount()}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);

  server.close(() => {
    console.log('HTTP server closed');
    // Close any database connections here if needed
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;