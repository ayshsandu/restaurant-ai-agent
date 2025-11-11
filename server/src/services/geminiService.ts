import { GoogleGenAI, Chat, mcpToTool } from '@google/genai';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CustomClient } from './customClient.js';
import { AuthorizationCodeOAuthProvider } from './simpleOAuthProvider.js';
import { AgentOAuthProvider } from './agentOAuthProvider.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const WELCOME_MESSAGE = '👋 Hi there! Before we continue, please take a moment to authenticate.';
const AUTHENTICATION_PROMPT = 'Please authenticate with our restaurant system to continue.';
const SYSTEM_INSTRUCTION = 'You are a friendly and efficient restaurant assistant. Start every conversation with a warm welcome and brief introduction of your capabilities as a restaurant AI assistant. Your goal is to help users browse the menu and place orders. Be polite and clear. When presenting menu items, include their ID, name, description, and price. When an order is placed, confirm the order details back to the user.';

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

    private performSessionCleanup(): void {
        const now = Date.now();
        const expiredSessions: string[] = [];

        for (const [sessionId, data] of this.chatSessions.entries()) {
            if (now - data.lastActivity > this.sessionTimeout) {
                expiredSessions.push(sessionId);
            }
        }

        // Remove expired sessions
        for (const sessionId of expiredSessions) {
            this.chatSessions.delete(sessionId);
            logger.debug(`Cleaned up expired session: ${sessionId}`);
        }

        if (expiredSessions.length > 0) {
            logger.debug(`Session cleanup completed. Removed ${expiredSessions.length} expired sessions.`);
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

    private async createMCPClient(client: CustomClient, oauthProvider?: AuthorizationCodeOAuthProvider): Promise<CustomClient | undefined> {
        try {
            const baseUrl = new URL(this.mcpServiceUrl);
            logger.debug("MCP Service URL:", baseUrl.toString());

            // Create transport with OAuth provider if available
            const transport = new StreamableHTTPClientTransport(
                new URL(baseUrl),
                {
                    authProvider: oauthProvider || this.oauthProvider
                }
            );

            logger.debug("Connecting MCP client with transport options:", {
                authProvider: (oauthProvider || this.oauthProvider) ? 'Provided' : 'None'
            });
            await client.connect(transport);

            // Set OAuth tokens on client if available
            const activeProvider = oauthProvider || this.oauthProvider;
            if (activeProvider?.tokens()) {
                client.setOAuthTokens(activeProvider.tokens());
            }

            return client;
        } catch (error) {
            logger.error('Failed to create MCP client connection:', error);
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

    public async createChatSession(sessionId: string): Promise<CreateChatSessionResult> {
        const oauthProvider = await this.createOAuthProviderForSession(sessionId);

        if (oauthProvider) {
            const oauthCheck = await this.checkOAuthRequirement(oauthProvider);

            if (oauthCheck.required && oauthCheck.authorizationUrl) {
                return this.createOAuthRequiredSession(sessionId, oauthProvider, oauthCheck);
            }
        }

        return this.createNormalChatSession(sessionId, oauthProvider);
    }

    private createOAuthRequiredSession(
        sessionId: string,
        oauthProvider: AuthorizationCodeOAuthProvider,
        oauthCheck: { required: boolean; authorizationUrl?: string; }
    ): OAuthRequiredResult {
        logger.debug('OAuth required - returning authorization information');

        const client = new CustomClient({
            name: 'streamable-http-client',
            version: '1.0.0'
        });

        this.chatSessions.set(sessionId, {
            session: undefined as any,
            client,
            oauthProvider,
            lastActivity: Date.now()
        });

        return {
            type: 'oauth_required',
            authorizationUrl: oauthCheck.authorizationUrl!,
            message: WELCOME_MESSAGE
        };
    }

    private async createNormalChatSession(
        sessionId: string,
        oauthProvider?: AuthorizationCodeOAuthProvider
    ): Promise<ChatSessionResult> {
        const client = new CustomClient({
            name: 'streamable-http-client',
            version: '1.0.0'
        });

        const connectedClient = await this.createMCPClient(client, oauthProvider);
        const chatSession = this.createChatInstance(connectedClient);

        this.chatSessions.set(sessionId, {
            session: chatSession,
            client: connectedClient,
            oauthProvider,
            lastActivity: Date.now()
        });

        logger.debug(`Chat session created for user: ${sessionId}`);

        return {
            type: 'chat',
            session: chatSession
        };
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

    /**
     * Check if OAuth is required and get authorization URL if needed
     */
    public async checkOAuthRequirement(oauthProvider?: AuthorizationCodeOAuthProvider): Promise<{ required: boolean; authorizationUrl?: string }> {
        if (!oauthProvider) {
            return { required: false };
        }

        if (oauthProvider.hasValidTokens()) {
            return { required: false };
        }

        // Try to create a minimal MCP client connection to trigger OAuth
        let transport: StreamableHTTPClientTransport | undefined;
        try {
            const baseUrl = new URL(this.mcpServiceUrl);
            const client = new CustomClient({
                name: 'oauth-check-client',
                version: '1.0.0'
            });

            transport = new StreamableHTTPClientTransport(
                new URL(baseUrl),
                {
                    authProvider: oauthProvider
                }
            );

            // Try to connect - this should trigger OAuth if needed
            logger.debug("Attempting OAuth check connection with transport options:", { authProvider: 'Provided' });

            await client.connect(transport);

            // If we get here, OAuth might not be required or tokens are available
            client.close();
            return { required: false };

        } catch (error) {
            logger.debug('OAuth check connection failed, checking for authorization URL');
            logger.error('OAuth check connection error:', error);
            // Check if an authorization URL was generated
            const authUrl = oauthProvider.getPendingAuthorizationUrl();
            logger.debug("Authorization URL from OAuth provider:", authUrl?.toString());
            if (authUrl) {
                return {
                    required: true,
                    authorizationUrl: authUrl.toString(),
                };
            }

            // No URL available, OAuth might not be required for this endpoint
            return { required: false };
        };
    }

    public getChatSession(sessionId: string): ChatSessionData | undefined {
        const sessionData = this.chatSessions.get(sessionId);
        if (sessionData) {
            // Update last activity
            sessionData.lastActivity = Date.now();
        }
        return sessionData;
    }

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
            return this.handleOAuthError(error, errorDescription, state, oauthProvider);
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

    private handleOAuthError(
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
        const sessionData = this.getChatSession(sessionId);
        if (!sessionData) {
            throw new Error('Chat session not found.');
        }

        logger.debug('Processing message:', message);

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

    private handleChatError(error: unknown, sessionData: ChatSessionData): ChatResponse {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (sessionData.oauthProvider && (!sessionData.session || this.isOAuthRelatedError(errorMessage))) {
            const authUrl = sessionData.oauthProvider.getPendingAuthorizationUrl();
            if (authUrl) {
                return {
                    text: AUTHENTICATION_PROMPT,
                    authorizationRequired: true,
                    authorizationUrl: authUrl.toString(),
                };
            }
        }

        logger.error('Error in chat processing:', error);
        throw new Error(`Chat processing failed: ${errorMessage}`);
    }

    private isOAuthRelatedError(errorMessage: string): boolean {
        const oauthKeywords = ['auth', 'unauthorized', '401'];
        return oauthKeywords.some(keyword =>
            errorMessage.toLowerCase().includes(keyword)
        );
    }
}