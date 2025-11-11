import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens, AuthorizationServerMetadata, OAuthTokensSchema } from '@modelcontextprotocol/sdk/shared/auth.js';
import { AgentOAuthProvider } from './agentOAuthProvider.js';
import { FetchLike } from '@modelcontextprotocol/sdk/shared/transport.js';

/**
 * Simple OAuth Provider implementing authorization code grant flow
 * Based on the MCP SDK simpleOAuthClient example
 */
export class AuthorizationCodeOAuthProvider implements OAuthClientProvider {
    private _redirectUrl: string | URL;
    private _clientMetadata: OAuthClientMetadata;
    private _clientId?: string;
    private _clientSecret?: string;
    private _tokens?: OAuthTokens;
    private _codeVerifier?: string;
    private _pendingAuthorizationUrl?: URL;
    private _sessionId?: string;
    private _agentProvider?: AgentOAuthProvider;

    constructor(
        redirectUrl: string | URL,
        clientMetadata: OAuthClientMetadata,
        clientId?: string,
        clientSecret?: string,
        tokens?: OAuthTokens,
        sessionId?: string,
        agentProvider?: AgentOAuthProvider
    ) {
        this._redirectUrl = redirectUrl;
        this._clientMetadata = clientMetadata;
        this._clientId = clientId;
        this._clientSecret = clientSecret;
        this._tokens = tokens;
        this._sessionId = sessionId;
        this._agentProvider = agentProvider;
    }

    get redirectUrl(): string | URL {
        return this._redirectUrl;
    }

    get clientMetadata(): OAuthClientMetadata {
        return this._clientMetadata;
    }

    /**
     * Returns the state parameter for OAuth authorization requests
     * Uses the session ID for state management
     */
    state(): string {
        return this._sessionId || `unknown_session_${Date.now()}`;
    }

    clientInformation(): OAuthClientInformationMixed | undefined {
        if (this._clientId) {
            return {
                client_id: this._clientId,
                client_secret: this._clientSecret,
            };
        }
        return undefined;
    }

    saveClientInformation(clientInformation: OAuthClientInformationMixed): void {
        if (clientInformation.client_id) {
            this._clientId = clientInformation.client_id;
        }
        if (clientInformation.client_secret) {
            this._clientSecret = clientInformation.client_secret;
        }
        console.log('Client information saved: ', this._clientId);
    }

    tokens(): OAuthTokens | undefined {
        return this._tokens;
    }

    saveTokens(tokens: OAuthTokens): void {
        this._tokens = tokens;
        console.log('OAuth tokens saved');
    }

    /**
     * Get agent identity tokens from the agent provider
     */
    agentIdentityTokens(): OAuthTokens | undefined {
        return this._agentProvider?.getAgentTokens();
    }

    /**
     * Check if this provider has an agent provider
     */
    hasAgentProvider(): boolean {
        return !!this._agentProvider;
    }

    /**
     * Get the agent ID from the agent provider
     */
    getAgentID(): string | undefined {
        return this._agentProvider?.getAgentID();
    }

    /**
     * Store the authorization URL for later retrieval
     */
    redirectToAuthorization(authorizationUrl: URL): void {
        console.log('Authorization URL:', authorizationUrl.toString());

        // Add agentID as a parameter if agent provider exists
        if (this._agentProvider) {
            const agentID = this._agentProvider.getAgentID();
            if (agentID) {
                authorizationUrl.searchParams.set('requested_actor', agentID);
            }
        }

        this._pendingAuthorizationUrl = authorizationUrl;
    }

    /**
     * Get the pending authorization URL
     */
    getPendingAuthorizationUrl(): URL | undefined {
        return this._pendingAuthorizationUrl;
    }

    /**
     * Clear the pending authorization URL
     */
    clearPendingAuthorizationUrl(): void {
        this._pendingAuthorizationUrl = undefined;
    }

    /**
     * Check if OAuth tokens are available and valid
     */
    hasValidTokens(): boolean {
        if (!this._tokens) return false;

        // Check if access token exists and hasn't expired
        if (this._tokens.access_token) {
            // If there's an expires_in, check if it's still valid
            if (this._tokens.expires_in) {
                // expires_in is in seconds from now, so we need to track when we got the token
                // For simplicity, assume token is valid if expires_in > 0
                return this._tokens.expires_in > 0;
            }
            // If no expires_in, assume token is valid
            return true;
        }

        return false;
    }

    /**
     * Wait for OAuth tokens to become available
     */
    async waitForTokens(timeoutMs: number = 300000): Promise<OAuthTokens> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            if (this.hasValidTokens()) {
                return this._tokens!;
            }

            // Wait 1 second before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error(`OAuth token acquisition timed out after ${timeoutMs}ms`);
    }

    saveCodeVerifier(codeVerifier: string): void {
        this._codeVerifier = codeVerifier;
    }

    codeVerifier(): string {
        if (!this._codeVerifier) {
            throw new Error('Code verifier not available. Authorization flow not initiated.');
        }
        return this._codeVerifier;
    }

    //   /**
    //    * Override exchangeAuthorization from OAuthClientProvider to add logging
    //    */
    //   exchangeAuthorization(authorizationServerUrl: string | URL, params: {
    //     metadata?: AuthorizationServerMetadata;
    //     clientInformation: OAuthClientInformationMixed;
    //     authorizationCode: string;
    //     codeVerifier: string;
    //     redirectUri: string | URL;
    //     resource?: URL;
    //     addClientAuthentication?: OAuthClientProvider['addClientAuthentication'];
    //     fetchFn?: FetchLike;
    //   }): Promise<OAuthTokens> {
    //     console.log('OAuthClientProvider: Starting authorization code exchange', {
    //       authorizationServerUrl: authorizationServerUrl.toString(),
    //       clientId: params.clientInformation.client_id,
    //       hasCodeVerifier: !!params.codeVerifier,
    //       redirectUri: params.redirectUri.toString(),
    //       resource: params.resource?.toString(),
    //       sessionId: this._sessionId,
    //       hasAgentProvider: !!this._agentProvider
    //     });

    //     return this.exchangeCodeForTokens(
    //       params.authorizationCode,
    //       authorizationServerUrl.toString(),
    //       this._agentProvider?.getAgentTokens()?.access_token
    //     );
    //   }

    /**
     * Exchange authorization code for tokens with optional agent token
     */
    async exchangeCodeForTokens(tokenEndpoint: string | undefined, code: string, agentToken?: string): Promise<OAuthTokens> {
        if (!tokenEndpoint) {
            throw new Error('Token endpoint is required for token exchange');
        }
        const body: any = {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: typeof this._redirectUrl === 'string' ? this._redirectUrl : this._redirectUrl.toString(),
            client_id: this._clientId,
            code_verifier: this._codeVerifier,
        };

        // Include client_secret if available (for confidential clients)
        if (this._clientSecret) {
            body.client_secret = this._clientSecret;
        }

        // Include agent identity token in the request if provided or available from agent provider
        const tokenToUse = agentToken || this._agentProvider?.getAgentTokens()?.access_token;
        if (tokenToUse) {
            body.actor_token = tokenToUse;
        }

        console.log('Exchanging code for tokens with body:', body);

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams(body).toString(),
        });

        //log response status and the content 
        console.log('Token exchange response status:', response);
        if (!response.ok) {
            throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
        }

        // Save tokens
        const tokens = OAuthTokensSchema.parse(await response.json());
        this.saveTokens(tokens);

        return tokens;
    }

    /**
     * Create an agent identity OAuth provider instance
     */
    static createAgentIdentityProvider(
        redirectUrl: string | URL,
        clientMetadata: OAuthClientMetadata,
        clientId?: string,
        clientSecret?: string,
        agentIdentityTokens?: OAuthTokens,
        agentID?: string,
        agentPassword?: string
    ): AuthorizationCodeOAuthProvider {
        // Create the agent provider
        const agentProvider = new AgentOAuthProvider(
            redirectUrl,
            clientMetadata,
            clientId,
            clientSecret,
            undefined, // tokenEndpoint
            agentID,
            agentPassword
        );

        // If agent tokens are provided, save them
        if (agentIdentityTokens) {
            agentProvider.saveTokens(agentIdentityTokens);
        }

        return new AuthorizationCodeOAuthProvider(
            redirectUrl,
            clientMetadata,
            clientId,
            clientSecret,
            undefined, // user tokens
            'agent_identity', // session ID
            agentProvider
        );
    }

    /**
     * Create a user OAuth provider instance
     */
    static createUserProvider(
        redirectUrl: string | URL,
        clientMetadata: OAuthClientMetadata,
        sessionId: string,
        clientId?: string,
        clientSecret?: string,
        agentProvider?: AgentOAuthProvider
    ): AuthorizationCodeOAuthProvider {
        return new AuthorizationCodeOAuthProvider(
            redirectUrl,
            clientMetadata,
            clientId,
            clientSecret,
            undefined, // user tokens
            sessionId,
            agentProvider
        );
    }
}