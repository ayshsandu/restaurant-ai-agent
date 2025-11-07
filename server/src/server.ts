import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GeminiService } from './services/geminiService.js';
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

// Session store with cleanup mechanism
const chatSessions = new Map<string, { session: any; lastActivity: number; }>();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Clean up expired sessions periodically
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of chatSessions.entries()) {
        if (now - data.lastActivity > SESSION_TIMEOUT) {
            chatSessions.delete(sessionId);
            console.log(`Cleaned up expired session: ${sessionId}`);
        }
    }
}, 60 * 60 * 1000); // Clean every hour

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
  
  geminiService = new GeminiService(apiKey, mcpServiceUrl);
  console.log('Gemini service initialized successfully');
} catch (error) {
  console.error('Failed to initialize Gemini service:', error);
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
      active: chatSessions.size,
      maxAge: SESSION_TIMEOUT / (60 * 60 * 1000) + ' hours'
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
  const sessionData = chatSessions.get(sessionId);

  if (!sessionData) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId,
    lastActivity: new Date(sessionData.lastActivity).toISOString(),
    age: Date.now() - sessionData.lastActivity
  });
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
    let sessionData = chatSessions.get(currentSessionId);
    if (!sessionData) {
      const chatSession = await geminiService.createChatSession();
      sessionData = {
        session: chatSession,
        lastActivity: Date.now()
      };
      chatSessions.set(currentSessionId, sessionData);
      console.log('Created new chat session for:', currentSessionId);
    } else {
      // Update last activity
      sessionData.lastActivity = Date.now();
    }

    console.log('Received chat request:', {
      sessionId: currentSessionId,
      message: sanitizedMessage.substring(0, 100) + '...'
    });

    const response = await geminiService.runChat(sanitizedMessage, sessionData.session);

    res.json({
      success: true,
      response: response.text,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString()
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
  console.log(`📊 Active sessions: ${chatSessions.size}`);
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