import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import dotenv from 'dotenv';

import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger.js';
import { GeminiService } from './agent/GeminiService';

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

// Backend API configuration
const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:8000/api';

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security middleware (apply early)
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

// Compression middleware (apply early for all responses)
app.use(compression());

// CORS configuration
app.use(
    cors({
        origin: process.env.NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',') || false
            : true, // Allow all origins for development
        credentials: true,
        exposedHeaders: ['Mcp-Session-Id'],
    })
);

// Body parsing with size limits (apply before rate limiting)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting with different tiers and better configuration
const createRateLimit = (windowMs: number, max: number, message: string, skipSuccessfulRequests = false) => {
    return rateLimit({
        windowMs,
        max,
        message: { error: message },
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests, // Don't count successful requests toward limit
        skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
    });
};

// Stricter rate limiting for chat endpoint (most resource intensive)
app.use('/api/chat', createRateLimit(15 * 60 * 1000, 30, 'Too many chat requests, please slow down', true));

// General API rate limiting
app.use('/api/', createRateLimit(15 * 60 * 1000, 100, 'Too many API requests from this IP', false));

// Request timeout middleware (30 seconds for most requests, 60 for chat)
const createTimeout = (timeoutMs: number) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const timeout = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: 'Request timeout'
                });
            }
        }, timeoutMs);

        res.on('finish', () => clearTimeout(timeout));
        next();
    };
};

// Apply different timeouts for different endpoints
app.use('/api/chat', createTimeout(60000)); // 60 seconds for chat requests
app.use('/api/', createTimeout(30000)); // 30 seconds for other API requests

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
  logger.info('Gemini service initialized successfully');
} catch (error) {
  logger.error('Failed to initialize services:', error);
  process.exit(1);
}

// Health check endpoint with caching
let healthCache: { data: any; timestamp: number } | null = null;
const HEALTH_CACHE_DURATION = 30000; // Cache for 30 seconds

app.get('/api/health', (req, res) => {
  const now = Date.now();

  // Return cached response if still valid
  if (healthCache && (now - healthCache.timestamp) < HEALTH_CACHE_DURATION) {
    return res.json(healthCache.data);
  }

  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'restaurant-ai-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    sessions: {
      active: geminiService.getSessionCount(),
      maxAge: '24 hours'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  // Cache the response
  healthCache = { data: health, timestamp: now };

  res.json(health);
});

// Metrics endpoint for monitoring (development only)
app.get('/api/metrics', (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' });
  }

  const metrics = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    sessions: {
      active: geminiService.getSessionCount()
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  res.json(metrics);
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
    logger.error('Error handling OAuth callback:', error);
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

    // Generate or validate session ID with better validation
    let currentSessionId = sessionId;
    if (!currentSessionId || typeof currentSessionId !== 'string' || currentSessionId.length === 0 || currentSessionId.length > 100) {
      currentSessionId = uuidv4();
      logger.info('Generated new session ID:', currentSessionId);
    } else {
      // Basic sanitization - remove any potentially harmful characters
      currentSessionId = currentSessionId.trim();
      logger.debug('Using existing session ID:', currentSessionId);
    }

    // Get or create chat session
    let sessionData = geminiService.getChatSession(currentSessionId);
    if (!sessionData) {
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
      logger.info('Created new chat session for:', currentSessionId);
    }

    logger.debug('Received chat request:', {
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
    logger.error('Error processing chat request:', error);
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
app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', {
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

// Restaurant API Proxy Routes
/**
 * Proxy middleware for restaurant API endpoints
 * Forwards all restaurant-related requests to the backend API
 */

// Helper function to create proxy requests
const proxyRequest = async (req: express.Request, res: express.Response, endpoint: string) => {
  try {
    const url = `${BACKEND_API_URL}${endpoint}`;
    const queryString = req.url.split('?')[1];
    const fullUrl = queryString ? `${url}?${queryString}` : url;

    const options: any = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Forward any authorization headers if present
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization }),
      },
    };

    // Add body for POST/PUT requests
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      options.body = JSON.stringify(req.body);
    }

    logger.info(`Proxying ${req.method} request to: ${fullUrl}`);
    
    const response = await fetch(fullUrl, options);
    const data = await response.json();

    if (!response.ok) {
      logger.error(`Backend API error: ${response.status} - ${JSON.stringify(data)}`);
      return res.status(response.status).json(data);
    }

    // logger.debug(`Successfully proxied request to ${fullUrl}`);
    res.json(data);
  } catch (error) {
    logger.error('Proxy request failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch')) {
      return res.status(503).json({
        success: false,
        error: 'Backend service unavailable',
        details: 'Unable to connect to restaurant API backend'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Proxy request failed',
      details: process.env.NODE_ENV === 'development' ? errorMessage : 'Internal server error'
    });
  }
};

// Menu API proxy routes
app.get('/api/menu/categories', async (req, res) => {
  await proxyRequest(req, res, '/menu/categories');
});

app.get('/api/menu/items', async (req, res) => {
  await proxyRequest(req, res, '/menu/items');
});

app.get('/api/menu/items/:id', async (req, res) => {
  await proxyRequest(req, res, `/menu/items/${req.params.id}`);
});

// Cart API proxy routes
app.post('/api/cart', async (req, res) => {
  await proxyRequest(req, res, '/cart');
});

app.get('/api/cart/:sessionId', async (req, res) => {
  await proxyRequest(req, res, `/cart/${req.params.sessionId}`);
});

app.post('/api/cart/:sessionId/items', async (req, res) => {
  await proxyRequest(req, res, `/cart/${req.params.sessionId}/items`);
});

app.delete('/api/cart/:sessionId/items/:itemId', async (req, res) => {
  await proxyRequest(req, res, `/cart/${req.params.sessionId}/items/${req.params.itemId}`);
});

// Order API proxy routes
app.post('/api/orders', async (req, res) => {
  await proxyRequest(req, res, '/orders');
});

app.get('/api/orders', async (req, res) => {
  await proxyRequest(req, res, '/orders');
});

app.get('/api/orders/:orderId', async (req, res) => {
  await proxyRequest(req, res, `/orders/${req.params.orderId}`);
});

app.post('/api/orders/:orderId/notes', async (req, res) => {
  await proxyRequest(req, res, `/orders/${req.params.orderId}/notes`);
});

app.put('/api/orders/:orderId/status', async (req, res) => {
  await proxyRequest(req, res, `/orders/${req.params.orderId}/status`);
});

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /api/health',
      'POST /api/chat',
      'GET /api/menu/categories',
      'GET /api/menu/items',
      'GET /api/menu/items/:id',
      'POST /api/cart',
      'GET /api/cart/:sessionId',
      'POST /api/cart/:sessionId/items',
      'DELETE /api/cart/:sessionId/items/:itemId',
      'POST /api/orders',
      'GET /api/orders',
      'GET /api/orders/:orderId',
      'POST /api/orders/:orderId/notes',
      'PUT /api/orders/:orderId/status'
    ]
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
      logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Restaurant AI Backend running on port ${PORT}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`💬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📊 Active sessions: ${geminiService.getSessionCount()}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  server.close(() => {
    logger.info('HTTP server closed');
    // Close any database connections here if needed
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;