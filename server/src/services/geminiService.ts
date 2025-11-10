import { GoogleGenAI, Chat, mcpToTool } from '@google/genai';
// import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CustomClient } from './customClient.js';
import { AuthorizationCodeOAuthProvider } from './simpleOAuthProvider.js';
import { logger } from '../utils/logger.js';

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
    private ai: GoogleGenAI;
    private mcpServiceUrl: string;
    private oauthProvider?: AuthorizationCodeOAuthProvider;
    private oauthConfig: {
        clientId?: string;
        clientSecret?: string;
        redirectUrl: string;
        tokenEndpoint?: string;
        scope: string;
    };
    private chatSessions = new Map<string, ChatSessionData>();
    private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    private cleanupInterval?: NodeJS.Timeout;

    constructor(apiKey: string, mcpServiceUrl: string, oauthProvider?: AuthorizationCodeOAuthProvider) {
        if (!apiKey) {
            throw new Error("Google AI API key is required");
        }

        this.ai = new GoogleGenAI({ apiKey });
        this.mcpServiceUrl = mcpServiceUrl;
        this.oauthProvider = oauthProvider;

        // Initialize OAuth config from environment
        this.oauthConfig = {
            clientId: process.env.MCP_OAUTH_CLIENT_ID,
            clientSecret: process.env.MCP_OAUTH_CLIENT_SECRET,
            redirectUrl: process.env.MCP_OAUTH_REDIRECT_URL || `http://localhost:3001/api/oauth/callback`,
            tokenEndpoint: process.env.MCP_OAUTH_TOKEN_ENDPOINT,
            scope: process.env.MCP_OAUTH_SCOPE || 'mcp:tools'
        };

        // Start cleanup interval (less frequent, more efficient)
        this.startCleanupInterval();
    }

    private startCleanupInterval(): void {
        // Clean up expired sessions every 30 minutes instead of every hour
        this.cleanupInterval = setInterval(() => {
            this.performSessionCleanup();
        }, 30 * 60 * 1000);
    }

    private performSessionCleanup(): void {
        const now = Date.now();
        const expiredSessions: string[] = [];

        // Find expired sessions
        for (const [sessionId, data] of this.chatSessions.entries()) {
            if (now - data.lastActivity > this.SESSION_TIMEOUT) {
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
    private createOAuthProviderForSession(sessionId: string): AuthorizationCodeOAuthProvider | undefined {
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
            sessionId // session ID for state parameter
        );
    }

    public async createChatSession(sessionId: string): Promise<CreateChatSessionResult> {
        // Create OAuth provider for this session if OAuth is configured
        const oauthProvider = this.createOAuthProviderForSession(sessionId);

        // First check if OAuth is required for this session
        if (oauthProvider) {
            logger.debug('OAuth configured for new session - checking OAuth requirements');

            try {
                const oauthCheck = await this.checkOAuthRequirement(oauthProvider);

                if (oauthCheck.required && oauthCheck.authorizationUrl) {
                    logger.debug('OAuth required - returning authorization information');

                    // Create client for this session
                    const client = new CustomClient({
                        name: 'streamable-http-client',
                        version: '1.0.0'
                    });

                    // Store the session data
                    this.chatSessions.set(sessionId, {
                        session: undefined as any, // session will be created after OAuth
                        client: client,
                        oauthProvider: oauthProvider,
                        transportInstance: oauthCheck.transportInstance,
                        lastActivity: Date.now()
                    });

                    return {
                        type: 'oauth_required',
                        authorizationUrl: oauthCheck.authorizationUrl,
                        message: `👋 Hi there! Before we continue, please take a moment to authenticate.`
                    };
                }

                logger.debug('OAuth not required or tokens available');
            } catch (error) {
                logger.error('Error checking OAuth requirements:', error);
                // Continue with normal flow if OAuth check fails
            }
        }

        // Create a new MCP client for this session
        const client = new CustomClient({
            name: 'streamable-http-client',
            version: '1.0.0'
        });
        const connectedClient = await this.createMCPClient(client, oauthProvider);

        const chatSession = this.ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a friendly and efficient restaurant assistant. Start every conversation with a warm welcome and brief introduction of your capabilities as a restaurant AI assistant. Your goal is to help users browse the menu and place orders. Be polite and clear. When presenting menu items, include their ID, name, description, and price. When an order is placed, confirm the order details back to the user.',
                tools: connectedClient ? [mcpToTool(connectedClient)] : [],
            },
        });

        logger.debug('New chat session created:', chatSession);

        // Store the session data
        this.chatSessions.set(sessionId, {
            session: chatSession,
            client: connectedClient,
            oauthProvider: oauthProvider,
            lastActivity: Date.now()
        });

        logger.debug(`Chat session created for user: ${sessionId}`);

        return {
            type: 'chat',
            session: chatSession
        };
    }

    /**
     * Check if OAuth is required and get authorization URL if needed
     */
    public async checkOAuthRequirement(oauthProvider?: AuthorizationCodeOAuthProvider): Promise<{ required: boolean; authorizationUrl?: string, transportInstance?: StreamableHTTPClientTransport }> {
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
            //log  
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
                    transportInstance: transport
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
        let oauthProvider: AuthorizationCodeOAuthProvider | undefined;
        if (state) {
            oauthProvider = this.getOAuthProvider(state);
        }
        if (error) {
            logger.error('OAuth authorization error:', error, errorDescription);
            // Try to clear pending URL for the session if state contains session ID
            if (state) {
                oauthProvider?.clearPendingAuthorizationUrl();
            }
            return {
                success: false,
                error: 'Authorization failed',
                details: errorDescription || error,
                message: 'OAuth authorization failed'
            };
        }

        if (!code || !state) {
            return {
                success: false,
                error: 'Missing authorization code or state parameter',
                message: 'Invalid OAuth callback parameters'
            };
        }

        // Find the session's OAuth provider using the state (which should be the session ID)
        if (!oauthProvider) {
            return {
                success: false,
                error: 'Invalid session or OAuth provider not found',
                message: 'Session not found'
            };
        }

        // The MCP transport will handle the OAuth callback internally
        // when it receives the authorization code. We just need to acknowledge receipt.
        logger.debug(`OAuth callback received for session ${state} - transport will complete authorization`);

        // Clear the pending authorization URL since callback was received



        // transportInstance finishauth
        const transport = this.getTransportInstance(state);

        //log transport and code
        logger.debug('Finishing OAuth authorization with transport and code:', {
            transportExists: !!transport,
            codeExists: !!code
        });
        if (transport && code) {
            await transport.finishAuth(code);
            if (oauthProvider) {
                //log tokens
                logger.debug('OAuth tokens:', oauthProvider.tokens());
                oauthProvider.clearPendingAuthorizationUrl();
            }

        }

        // Get existing session data and reuse the client
        const sessionData = this.chatSessions.get(state);
        if (!sessionData || !sessionData.client) {
            return {
                success: false,
                error: 'Session client not found',
                message: 'Session client not available'
            };
        }

        // Create a new MCP client for this session
        const client = new CustomClient({
            name: 'streamable-http-client',
            version: '1.0.0'
        });
        const connectedClient = await this.createMCPClient(client, oauthProvider);

        const chatSession = this.ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a friendly and efficient restaurant assistant. Your goal is to help users browse the menu and place orders. Be polite and clear. When presenting menu items, include their ID, name, description, and price. When an order is placed, confirm the order details back to the user.',
                tools: connectedClient ? [mcpToTool(connectedClient)] : [],
            },
        });

        // Create new chat session with existing client
        // const chatSession = this.ai.chats.create({
        //   model: 'gemini-2.5-flash',
        //   config: {
        //     systemInstruction: 'You are a friendly and efficient restaurant assistant. Your goal is to help users browse the menu and place orders. Be polite and clear. When presenting menu items, include their ID, name, description, and price. When an order is placed, confirm the order details back to the user.',
        //     tools: sessionData.client ? [mcpToTool(sessionData.client)] : [],
        //   },
        // });

        // Update the session data with new chat session
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
        const sessionData = this.chatSessions.get(sessionId);
        if (!sessionData) {
            throw new Error("Chat session not found.");
        }

        logger.debug("Processing message:", message);

        try {
            const response = await sessionData.session.sendMessage({ message: message });
            logger.debug("Final AI response:", response.text);
            return {
                text: response.text || '',
            };
        } catch (error) {

            // Check if this is an OAuth-related error
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // If OAuth is required, check if we have a pending authorization URL
            if (sessionData.oauthProvider && (!sessionData.session || errorMessage.toLowerCase().includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('401'))) {
                const authUrl = sessionData.oauthProvider.getPendingAuthorizationUrl();
                if (authUrl) {
                    return {
                        text: `Please authenticate with our restaurant system to continue.`,
                        authorizationRequired: true,
                        authorizationUrl: authUrl.toString(),
                    };
                }
            }

            logger.error("Error in chat processing:", error);
            throw new Error(`Chat processing failed: ${errorMessage}`);
        }
    }
}