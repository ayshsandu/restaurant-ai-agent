import { GoogleGenAI, Chat, mcpToTool } from '@google/genai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CustomClient } from './customClient.js';
import { AuthorizationCodeOAuthProvider } from './OBOAuthProvider.js';
import { AgentOAuthProvider } from './agentOAuthProvider.js';
import { logger } from '../utils/logger.js';
import { SYSTEM_INSTRUCTION } from './systemInstructions.js';

// ============================================================================
// CONSTANTS & TYPES
// ============================================================================

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const WELCOME_MESSAGE = '👋 Hi there! Before we continue, please take a moment to authenticate.';
const AUTHENTICATION_PROMPT = 'Please authenticate with our restaurant system to continue.';

// Error classification constants
const ERROR_PATTERNS = {
    UNAUTHORIZED: ['unauthorized', '401', 'authentication required', 'invalid token', 'token expired'],
    OAUTH_RELATED: ['auth', 'unauthorized', '401'],
    GEMINI_OVERLOAD: ['overloaded', '503', 'unavailable', 'service unavailable', 'resource exhausted'],
    RATE_LIMIT: ['rate limit', '429', 'quota', 'too many requests'],
    BAD_REQUEST: ['400', 'bad request', 'invalid request']
} as const;

export interface ToolCallInfo {
    name: string;
    args: any;
}

export interface ChatResponse {
    text: string;
    toolCalls?: ToolCallInfo[];
    authorizationRequired?: boolean;
    authorizationUrl?: string;
}

export interface ChatSessionResult {
    type: 'chat';
    session: Chat;
}

export interface OAuthRequiredResult {
    type: 'oauth_required';
    authorizationUrl: string;
    message: string;
}

export type CreateChatSessionResult = ChatSessionResult | OAuthRequiredResult;

export interface ChatSessionData {
    session: Chat;
    client?: CustomClient;
    oauthProvider?: AuthorizationCodeOAuthProvider;
    transportInstance?: StreamableHTTPClientTransport;
    lastActivity: number;
}

/**
 * Optimized Gemini Service with enhanced session management, error handling, and OAuth integration.
 * 
 * Key optimizations:
 * - Consolidated error classification system with single error classifier
 * - Streamlined OAuth flow management with unified authentication error handling
 * - Improved session lifecycle management with proper resource cleanup
 * - Memory optimization with garbage collection hints
 * - Enhanced monitoring and debugging capabilities
 * - Reduced code duplication through method consolidation (7 error methods → 2 methods)
 */
export class GeminiService {
    private readonly ai: GoogleGenAI;
    private readonly mcpServiceUrl: string;
    private readonly oauthProvider?: AuthorizationCodeOAuthProvider;
    private agentAuthProvider?: AgentOAuthProvider;
    private readonly oauthConfig: {
        clientId?: string;
        clientSecret?: string;
        redirectUrl: string;
        tokenEndpoint?: string;
        scope: string;
    };
    private readonly chatSessions = new Map<string, ChatSessionData>();
    private readonly sessionTimeout = SESSION_TIMEOUT_MS;
    private cleanupInterval?: NodeJS.Timeout;

    constructor(apiKey: string, mcpServiceUrl: string, oauthProvider?: AuthorizationCodeOAuthProvider) {
        this.validateConstructorParams(apiKey, mcpServiceUrl);

        this.ai = new GoogleGenAI({ apiKey });
        this.mcpServiceUrl = mcpServiceUrl;
        this.oauthProvider = oauthProvider;
        this.oauthConfig = this.initializeOAuthConfig();

        this.initializeService();
    }

    // ============================================================================
    // ERROR CLASSIFICATION UTILITIES
    // ============================================================================

    /**
     * Consolidated error classifier to reduce code duplication
     */
    private classifyError(errorMessage: string): {
        isUnauthorized: boolean;
        isOAuthRelated: boolean;
        isGeminiOverload: boolean;
        isRateLimit: boolean;
        isBadRequest: boolean;
    } {
        const lowerMessage = errorMessage.toLowerCase();
        
        return {
            isUnauthorized: ERROR_PATTERNS.UNAUTHORIZED.some(keyword => lowerMessage.includes(keyword.toLowerCase())),
            isOAuthRelated: ERROR_PATTERNS.OAUTH_RELATED.some(keyword => lowerMessage.includes(keyword)),
            isGeminiOverload: ERROR_PATTERNS.GEMINI_OVERLOAD.some(keyword => lowerMessage.includes(keyword.toLowerCase())),
            isRateLimit: ERROR_PATTERNS.RATE_LIMIT.some(keyword => lowerMessage.includes(keyword.toLowerCase())),
            isBadRequest: ERROR_PATTERNS.BAD_REQUEST.some(keyword => lowerMessage.includes(keyword.toLowerCase()))
        };
    }

    private validateConstructorParams(apiKey: string, mcpServiceUrl: string): void {
        if (!apiKey) {
            throw new Error('Google AI API key is required');
        }
        if (!mcpServiceUrl) {
            throw new Error('MCP service URL is required');
        }
    }

    private initializeOAuthConfig(): typeof this.oauthConfig {
        return {
            clientId: process.env.MCP_OAUTH_CLIENT_ID,
            clientSecret: process.env.MCP_OAUTH_CLIENT_SECRET,
            redirectUrl: process.env.MCP_OAUTH_REDIRECT_URL!,
            tokenEndpoint: process.env.MCP_OAUTH_TOKEN_ENDPOINT,
            scope: process.env.MCP_OAUTH_SCOPE!
        };
    }

    private initializeService(): void {
        this.startCleanupInterval();
        this.initializeAgentAuthProvider();
    }

    private async initializeAgentAuthProvider(): Promise<void> {
        if (!this.oauthConfig.clientId) {
            return;
        }

        // Create a agentAuthProvider
        logger.debug("Creating AgentAuthProvider with ID from env");
        const agentID = process.env.AGENT_ID;
        const agentPassword = process.env.AGENT_PASSWORD;
        const tokenEndpoint = this.oauthConfig.tokenEndpoint;
        logger.debug("Token endpoint for AgentOAuthProvider:", tokenEndpoint);
        this.agentAuthProvider = new AgentOAuthProvider(
            this.oauthConfig.redirectUrl,
            {
                client_name: `Restaurant AI Assistant MCP Client`,
                redirect_uris: [this.oauthConfig.redirectUrl],
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code'],
                token_endpoint_auth_method: this.oauthConfig.clientSecret ? 'client_secret_post' : 'none',
                scope: this.oauthConfig.scope,
            },
            this.oauthConfig.clientId,
            this.oauthConfig.clientSecret,
            tokenEndpoint,
            agentID,
            agentPassword
        );
        await this.agentAuthProvider.tokens();
    }

    private startCleanupInterval(): void {
        this.cleanupInterval = setInterval(() => {
            this.performSessionCleanup();
        }, CLEANUP_INTERVAL_MS);
    }

    // ============================================================================
    // OPTIMIZED SESSION CLEANUP AND MEMORY MANAGEMENT
    // ============================================================================

    private performSessionCleanup(): void {
        const now = Date.now();
        const expiredSessionIds: string[] = [];

        // Single pass to identify expired sessions
        for (const [sessionId, data] of this.chatSessions.entries()) {
            if (now - data.lastActivity > this.sessionTimeout) {
                expiredSessionIds.push(sessionId);
            }
        }

        // Batch cleanup with proper resource disposal
        if (expiredSessionIds.length > 0) {
            for (const sessionId of expiredSessionIds) {
                const sessionData = this.chatSessions.get(sessionId);
                if (sessionData) {
                    // Properly close client connections
                    if (sessionData.client) {
                        try {
                            sessionData.client.close();
                        } catch (error) {
                            logger.warn(`Failed to close client for session ${sessionId}:`, error);
                        }
                    }
                    // Clear session data
                    this.chatSessions.delete(sessionId);
                }
            }
            
            logger.debug(`Session cleanup completed. Removed ${expiredSessionIds.length} expired sessions.`);
            
            // Force garbage collection if available (helpful for memory optimization)
            if (global.gc) {
                global.gc();
            }
        }
    }

    // Clean up resources when service is destroyed
    public destroy(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.chatSessions.clear();
    }

    // ============================================================================
    // OPTIMIZED MCP CLIENT MANAGEMENT
    // ============================================================================

    /**
     * Optimized MCP client creation with better error handling and connection reuse
     */
    private async createMCPClient(client: CustomClient, oauthProvider?: AuthorizationCodeOAuthProvider): Promise<CustomClient | undefined> {
        try {
            const baseUrl = new URL(this.mcpServiceUrl);
            const activeProvider = oauthProvider || this.oauthProvider;
            
            logger.debug("Creating MCP client connection", {
                url: baseUrl.toString(),
                hasAuthProvider: !!activeProvider
            });

            // Create transport with optimized configuration
            const transport = new StreamableHTTPClientTransport(baseUrl, {
                authProvider: activeProvider
            });

            await client.connect(transport);

            // Set OAuth tokens if available (optimized check)
            if (activeProvider?.tokens()) {
                client.setOAuthTokens(activeProvider.tokens());
            }

            logger.debug("MCP client connected successfully");
            return client;
        } catch (error) {
            logger.error('Failed to create MCP client connection:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                mcpUrl: this.mcpServiceUrl
            });
            return undefined;
        }
    }

    // Function to create OAuth provider for a session
    private async createOAuthProviderForSession(sessionId: string): Promise<AuthorizationCodeOAuthProvider | undefined> {
        if (!this.oauthConfig.clientId) {
            return undefined;
        }

        logger.debug(`Creating OAuth provider for session: ${sessionId}`);
        return new AuthorizationCodeOAuthProvider(
            this.oauthConfig.redirectUrl,
            {
                client_name: `Restaurant AI Assistant MCP Client - Session ${sessionId}`,
                redirect_uris: [this.oauthConfig.redirectUrl],
                grant_types: ['authorization_code', 'refresh_token'],
                response_types: ['code'],
                token_endpoint_auth_method: this.oauthConfig.clientSecret ? 'client_secret_post' : 'none',
                scope: this.oauthConfig.scope,
            },
            this.oauthConfig.clientId,
            this.oauthConfig.clientSecret,
            undefined, // tokens
            sessionId, // session ID for state parameter
            this.agentAuthProvider // agent provider
        );
    }

    // ============================================================================
    // OPTIMIZED SESSION MANAGEMENT
    // ============================================================================

    /**
     * Optimized session creation with consolidated OAuth handling
     */
    public async createChatSession(sessionId: string): Promise<CreateChatSessionResult> {
        const oauthProvider = await this.createOAuthProviderForSession(sessionId);
        
        // Early OAuth check optimization
        if (oauthProvider) {
            const oauthStatus = await this.getOAuthStatus(oauthProvider);
            if (oauthStatus.required) {
                return this.buildOAuthRequiredResponse(sessionId, oauthProvider, oauthStatus.authorizationUrl!);
            }
        }

        return this.buildChatSessionResponse(sessionId, oauthProvider);
    }

    /**
     * Optimized OAuth status check
     */
    private async getOAuthStatus(oauthProvider: AuthorizationCodeOAuthProvider): Promise<{
        required: boolean;
        authorizationUrl?: string;
    }> {
        if (oauthProvider.hasValidTokens()) {
            return { required: false };
        }

        try {
            const client = new CustomClient({ name: 'oauth-check-client', version: '1.0.0' });
            const transport = new StreamableHTTPClientTransport(
                new URL(this.mcpServiceUrl),
                { authProvider: oauthProvider }
            );

            await client.connect(transport);
            client.close();
            return { required: false };
        } catch (error) {
            logger.debug('OAuth check failed, authorization required');
            const authUrl = oauthProvider.getPendingAuthorizationUrl();
            return {
                required: !!authUrl,
                authorizationUrl: authUrl?.toString()
            };
        }
    }

    /**
     * Build OAuth required response
     */
    private buildOAuthRequiredResponse(
        sessionId: string,
        oauthProvider: AuthorizationCodeOAuthProvider,
        authorizationUrl: string
    ): OAuthRequiredResult {
        const client = new CustomClient({ name: 'streamable-http-client', version: '1.0.0' });
        
        this.chatSessions.set(sessionId, {
            session: undefined as any,
            client,
            oauthProvider,
            lastActivity: Date.now()
        });

        return {
            type: 'oauth_required',
            authorizationUrl,
            message: WELCOME_MESSAGE
        };
    }

    /**
     * Build normal chat session response
     */
    private async buildChatSessionResponse(
        sessionId: string,
        oauthProvider?: AuthorizationCodeOAuthProvider
    ): Promise<ChatSessionResult> {
        const client = new CustomClient({ name: 'streamable-http-client', version: '1.0.0' });
        const connectedClient = await this.createMCPClient(client, oauthProvider);
        const chatSession = this.createChatInstance(connectedClient);

        this.chatSessions.set(sessionId, {
            session: chatSession,
            client: connectedClient,
            oauthProvider,
            lastActivity: Date.now()
        });

        logger.debug(`Chat session created for user: ${sessionId}`);
        return { type: 'chat', session: chatSession };
    }

    private createChatInstance(connectedClient?: CustomClient): Chat {
        return this.ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                tools: connectedClient ? [mcpToTool(connectedClient)] : [],
            },
        });
    }

    public getChatSession(sessionId: string): ChatSessionData | undefined {
        const sessionData = this.chatSessions.get(sessionId);
        if (sessionData) {
            // Update last activity
            sessionData.lastActivity = Date.now();
        }
        return sessionData;
    }

    // ============================================================================
    // OPTIMIZED MONITORING AND UTILITIES
    // ============================================================================

    public getSessionCount(): number {
        return this.chatSessions.size;
    }

    public getSessionInfo(sessionId: string): { lastActivity: number; age: number } | undefined {
        const sessionData = this.chatSessions.get(sessionId);
        if (!sessionData) return undefined;

        return {
            lastActivity: sessionData.lastActivity,
            age: Date.now() - sessionData.lastActivity
        };
    }

    /**
     * Get comprehensive service statistics for monitoring
     */
    public getServiceStats(): {
        totalSessions: number;
        activeSessions: number;
        oldestSessionAge: number;
        memoryUsage: NodeJS.MemoryUsage;
    } {
        const now = Date.now();
        let oldestAge = 0;
        let activeSessions = 0;

        for (const sessionData of this.chatSessions.values()) {
            const age = now - sessionData.lastActivity;
            if (age < this.sessionTimeout) {
                activeSessions++;
            }
            oldestAge = Math.max(oldestAge, age);
        }

        return {
            totalSessions: this.chatSessions.size,
            activeSessions,
            oldestSessionAge: oldestAge,
            memoryUsage: process.memoryUsage()
        };
    }

    public getOAuthProvider(sessionId: string): AuthorizationCodeOAuthProvider | undefined {
        return this.chatSessions.get(sessionId)?.oauthProvider;
    }

    public getClient(sessionId: string): CustomClient | undefined {
        return this.chatSessions.get(sessionId)?.client;
    }

    //get transport instance for session
    public getTransportInstance(sessionId: string): StreamableHTTPClientTransport | undefined {
        return this.chatSessions.get(sessionId)?.transportInstance;
    }

    public async asynchandleOAuthCallback(code?: string, state?: string, error?: string, errorDescription?: string):
        Promise<{ success: boolean; message: string; sessionId?: string; error?: string; details?: string; }> {
        const oauthProvider = state ? this.getOAuthProvider(state) : undefined;

        if (error) {
            return this.handleOAuthCallbackError(error, errorDescription, state, oauthProvider);
        }

        const validation = this.validateOAuthCallbackParams(code, state);
        if (!validation.valid) {
            return validation.result!;
        }

        if (!oauthProvider) {
            return {
                success: false,
                error: 'Invalid session or OAuth provider not found',
                message: 'Session not found'
            };
        }

        try {
            return await this.completeOAuthFlow(code!, state!, oauthProvider);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to complete OAuth flow:', error);
            return {
                success: false,
                error: 'OAuth flow completion failed',
                message: errorMessage
            };
        }
    }

    private handleOAuthCallbackError(
        error: string,
        errorDescription?: string,
        state?: string,
        oauthProvider?: AuthorizationCodeOAuthProvider
    ): { success: boolean; message: string; error: string; details?: string } {
        logger.error('OAuth authorization error:', error, errorDescription);

        if (state && oauthProvider) {
            oauthProvider.clearPendingAuthorizationUrl();
        }

        return {
            success: false,
            error: 'Authorization failed',
            details: errorDescription || error,
            message: 'OAuth authorization failed'
        };
    }

    private validateOAuthCallbackParams(
        code?: string,
        state?: string
    ): { valid: boolean; result?: { success: boolean; message: string; error: string } } {
        if (!code || !state) {
            return {
                valid: false,
                result: {
                    success: false,
                    error: 'Missing authorization code or state parameter',
                    message: 'Invalid OAuth callback parameters'
                }
            };
        }
        return { valid: true };
    }

    private async completeOAuthFlow(
        code: string,
        state: string,
        oauthProvider: AuthorizationCodeOAuthProvider
    ): Promise<{ success: boolean; message: string; sessionId: string }> {
        logger.debug(`OAuth callback received for session ${state} - transport will complete authorization`);

        logger.debug('Finishing OAuth authorization with code:', {
            codeExists: !!code,
            code: code
        });

        if (code) {
            await oauthProvider.exchangeCodeForTokens(this.oauthConfig.tokenEndpoint, code);
            logger.debug('OAuth tokens:', oauthProvider.tokens());
            oauthProvider.clearPendingAuthorizationUrl();
        }

        const sessionData = this.chatSessions.get(state);
        if (!sessionData || !sessionData.client) {
            throw new Error('Session client not found');
        }

        const client = new CustomClient({
            name: 'streamable-http-client',
            version: '1.0.0'
        });
        const connectedClient = await this.createMCPClient(client, oauthProvider);

        const chatSession = this.createChatInstance(connectedClient);

        this.chatSessions.set(state, {
            ...sessionData,
            session: chatSession,
            lastActivity: Date.now()
        });

        logger.debug(`Chat session updated for user: ${state} after OAuth callback`);

        return {
            success: true,
            message: 'Authorization code received successfully',
            sessionId: state
        };
    }

    public async runChat(message: string, sessionId: string): Promise<ChatResponse> {
        let sessionData = this.getChatSession(sessionId);
        
        logger.debug('Processing message:', message);

        // If no session exists, create a new one
        if (!sessionData) {
            logger.debug(`No session found for ${sessionId}, creating new session`);
            const createResult = await this.createChatSession(sessionId);
            
            if (createResult.type === 'oauth_required') {
                return {
                    text: createResult.message,
                    authorizationRequired: true,
                    authorizationUrl: createResult.authorizationUrl,
                };
            }
            
            sessionData = this.getChatSession(sessionId);
            if (!sessionData) {
                throw new Error('Failed to create chat session.');
            }
        }

        // If session exists but no chat instance, try to create one
        if (!sessionData.session) {
            logger.debug(`Session exists but no chat instance for ${sessionId}, attempting to create connection`);
            
            try {
                const connectedClient = await this.createMCPClient(
                    sessionData.client || new CustomClient({
                        name: 'streamable-http-client',
                        version: '1.0.0'
                    }),
                    sessionData.oauthProvider
                );
                
                if (!connectedClient) {
                    // If MCP client creation fails, check OAuth requirement
                    if (sessionData.oauthProvider) {
                        const oauthStatus = await this.getOAuthStatus(sessionData.oauthProvider);
                        if (oauthStatus.required && oauthStatus.authorizationUrl) {
                            return {
                                text: AUTHENTICATION_PROMPT,
                                authorizationRequired: true,
                                authorizationUrl: oauthStatus.authorizationUrl,
                            };
                        }
                    }
                    throw new Error('Failed to establish MCP connection');
                }
                
                const chatSession = this.createChatInstance(connectedClient);
                
                // Update session data with new chat instance
                this.chatSessions.set(sessionId, {
                    ...sessionData,
                    session: chatSession,
                    client: connectedClient,
                    lastActivity: Date.now()
                });
                
                sessionData = this.getChatSession(sessionId)!;
                logger.debug(`Chat instance created successfully for session: ${sessionId}`);
                
            } catch (error) {
                logger.error('Failed to create chat instance:', error);
                return this.handleChatError(error, sessionData);
            }
        }

        // Now we should have a valid session with chat instance
        try {
            const response = await sessionData.session.sendMessage({ message });
            logger.debug('Final AI response:', response.text);

            return {
                text: response.text || '',
            };
        } catch (error) {
            return this.handleChatError(error, sessionData);
        }
    }

    /**
     * Optimized error handler with consolidated error classification
     */
    private handleChatError(error: unknown, sessionData: ChatSessionData): ChatResponse {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorTypes = this.classifyError(errorMessage);
        
        // Handle unauthorized/401 responses with optimized OAuth handling
        if (errorTypes.isUnauthorized) {
            return this.handleAuthenticationError(sessionData, true); // Clear tokens for unauthorized
        }
        
        // Handle other OAuth-related errors
        if (errorTypes.isOAuthRelated && sessionData.oauthProvider && !sessionData.session) {
            return this.handleAuthenticationError(sessionData, false); // Don't clear tokens for general OAuth errors
        }

        // Handle Gemini API specific errors with user-friendly messages
        if (errorTypes.isGeminiOverload) {
            logger.warn('Gemini API overloaded:', errorMessage);
            throw new Error('The AI model is currently overloaded. Please try again in a moment.');
        }

        if (errorTypes.isRateLimit) {
            logger.warn('Rate limit exceeded:', errorMessage);
            throw new Error('Please wait a moment before sending another message.');
        }

        if (errorTypes.isBadRequest) {
            logger.warn('Bad request to Gemini API:', errorMessage);
            throw new Error('There was an issue processing your message. Please try rephrasing your question.');
        }

        logger.error('Error in chat processing:', error);
        throw new Error(`Chat processing failed: ${errorMessage}`);
    }

    /**
     * Consolidated authentication error handler for both unauthorized and OAuth errors
     */
    private handleAuthenticationError(sessionData: ChatSessionData, clearTokens: boolean = false): ChatResponse {
        logger.warn('Authentication error detected, handling OAuth requirements');
        
        if (sessionData.oauthProvider) {
            // Clear tokens if specified (for unauthorized errors)
            if (clearTokens) {
                logger.debug('Clearing tokens to force re-authentication');
                sessionData.oauthProvider.saveTokens(undefined as any);
            }
            
            // Try to get or generate authorization URL
            const authUrl = sessionData.oauthProvider.getPendingAuthorizationUrl();
            if (authUrl) {
                return {
                    text: AUTHENTICATION_PROMPT,
                    authorizationRequired: true,
                    authorizationUrl: authUrl.toString(),
                };
            }
        }
        
        return {
            text: 'Authentication required. Please authenticate to continue.',
            authorizationRequired: true,
        };
    }
}