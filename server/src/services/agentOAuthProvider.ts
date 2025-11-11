import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Agent OAuth Provider implementing the special WSO2 Asgardeo agent authentication flow
 * Handles the multi-step agent authentication protocol for server-side agent identity
 */
export class AgentOAuthProvider implements OAuthClientProvider {
  private _redirectUrl: string | URL;
  private _clientMetadata: OAuthClientMetadata;
  private _clientId?: string;
  private _clientSecret?: string;
  private _agentID?: string;
  private _agentPassword?: string;
  private _tokens?: OAuthTokens;
  private _codeVerifier?: string;
  private _codeChallenge?: string;
  private _tokenEndpoint?: string;
  private _agentTokenPromise?: Promise<OAuthTokens>;

  constructor(
    redirectUrl: string | URL,
    clientMetadata: OAuthClientMetadata,
    clientId?: string,
    clientSecret?: string,
    tokenEndpoint?: string,
    agentID?: string,
    agentPassword?: string
  ) {
    this._redirectUrl = redirectUrl;
    this._clientMetadata = clientMetadata;
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._tokenEndpoint = tokenEndpoint;
    this._agentID = agentID;
    this._agentPassword = agentPassword;
    
    // Generate PKCE code verifier and challenge
    this._generatePKCE();
  }

  /**
   * Generate PKCE code verifier and code challenge according to RFC 7636
   */
  private _generatePKCE(): void {
    // Generate a cryptographically random code verifier (43-128 characters)
    const codeVerifier = randomBytes(32).toString('base64url');
    this._codeVerifier = codeVerifier;

    // Generate code challenge using S256 method (SHA256 hash)
    this._codeChallenge = this._generateCodeChallenge(codeVerifier);

    logger.info('AgentOAuthProvider: PKCE generated successfully');
  }  /**
   * Generate code challenge from code verifier using S256 method
   */
  private _generateCodeChallenge(codeVerifier: string): string {
    // Hash with SHA256 and convert to base64url
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
  }

  state(): string {
    return 'agent_flow';
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
    logger.info('AgentOAuthProvider: Client information updated');
  }

  tokens(): OAuthTokens | undefined {
    // Check if we have valid cached agent tokens
    if (this._tokens && this._isTokenValid(this._tokens)) {
      logger.debug('AgentOAuthProvider: Returning cached valid tokens');
      return this._tokens;
    }

    // If no valid tokens, trigger async token acquisition
    // Note: This is a synchronous method, so we return undefined to let SDK retry
    if (!this._agentTokenPromise) {
      logger.debug('AgentOAuthProvider: No valid tokens, initiating token acquisition');
      this._agentTokenPromise = this._acquireAgentTokens().finally(() => {
        this._agentTokenPromise = undefined;
      });
    } else {
      logger.debug('AgentOAuthProvider: Token acquisition already in progress');
    }

    return undefined;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    logger.info('AgentOAuthProvider: Agent tokens saved successfully');
  }

  /**
   * Check if token is still valid
   */
  private _isTokenValid(tokens: OAuthTokens): boolean {
    if (!tokens.access_token) return false;

    if (tokens.expires_in) {
      // For agent tokens, we track the obtained time separately
      const obtainedAt = (this._tokens === tokens) ?
        (this._tokens as any).obtained_at : Date.now();
      const expiresAt = obtainedAt + (tokens.expires_in * 1000);
      return Date.now() < expiresAt - 60000; // Refresh 1 minute before expiry
    }

    return true;
  }

  /**
   * Acquire tokens using the special agent authentication flow
   */
  private async _acquireAgentTokens(): Promise<OAuthTokens> {
    try {
      logger.debug('AgentOAuthProvider: Starting agent authentication flow');

      // Step 1: Initiate authorization with direct response mode
      const authResponse = await this._initiateAgentAuthorization();
      logger.debug('AgentOAuthProvider: Authorization initiated, flowId:', authResponse.flowId);

      // Step 2: Authenticate with agent credentials
      const codeResponse = await this._authenticateAgent(authResponse.flowId);
      logger.debug('AgentOAuthProvider: Agent authentication successful, received authorization code');

      // Step 3: Exchange code for tokens
      const tokens = await this._exchangeAgentCodeForTokens(codeResponse.authData.code);
      logger.debug('AgentOAuthProvider: Token exchange completed successfully');

      return tokens;
    } catch (error) {
      logger.error('AgentOAuthProvider: Agent authentication failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Initiate authorization request with direct response mode
   */
  private async _initiateAgentAuthorization(): Promise<any> {
    const tokenEndpoint = this._getTokenEndpoint();
    const baseUrl = tokenEndpoint.replace('/oauth2/token', '');

    const authUrl = `${baseUrl}/oauth2/authorize`;

    const body = new URLSearchParams({
      client_id: this._clientId!,
      response_type: 'code',
      redirect_uri: typeof this._redirectUrl === 'string' ? this._redirectUrl : this._redirectUrl.toString(),
      scope: this._clientMetadata.scope || 'openid',
      response_mode: 'direct',
      code_challenge: this._codeChallenge!,
      code_challenge_method: 'S256'
    });

    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Authorization initiation failed: ${response.status} ${response.statusText}`);
    }

    const authData = await response.json();
    return authData;
  }

  /**
   * Step 2: Authenticate with agent credentials
   */
  private async _authenticateAgent(flowId: string): Promise<any> {
    const tokenEndpoint = this._getTokenEndpoint();
    const baseUrl = tokenEndpoint.replace('/oauth2/token', '');

    const authnUrl = `${baseUrl}/oauth2/authn`;

    const body = {
      flowId: flowId,
      selectedAuthenticator: {
        authenticatorId: "QmFzaWNBdXRoZW50aWNhdG9yOkxPQ0FM", // Basic Authenticator ID
        params: {
          username: `AGENT/${this._agentID || this._clientId!}`, // Use agent ID if available, otherwise fallback to client_id
          password: this._agentPassword || this._clientSecret!, // Use agent password if available, otherwise fallback to client_secret
        }
      }
    };

    const response = await fetch(authnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Agent authentication failed: ${response.status} ${response.statusText}`);
    }

    const authnData = await response.json();
    return authnData;
  }

  /**
   * Step 3: Exchange authorization code for tokens
   */
  private async _exchangeAgentCodeForTokens(code: string): Promise<OAuthTokens> {
    const tokenEndpoint = this._getTokenEndpoint();

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this._clientId!,
      code: code,
      code_verifier: this._codeVerifier!,
      redirect_uri: typeof this._redirectUrl === 'string' ? this._redirectUrl : this._redirectUrl.toString(),
    });

    // Include client_secret if available
    if (this._clientSecret) {
      body.append('client_secret', this._clientSecret);
    }

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();

    const tokens: OAuthTokens = {
      access_token: tokenData.access_token,
      token_type: tokenData.token_type || 'Bearer',
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    };

    // Store obtained time for agent tokens
    (tokens as any).obtained_at = Date.now();

    // Save agent identity tokens
    this.saveTokens(tokens);

    return tokens;
  }

  /**
   * Get the token endpoint URL
   */
  private _getTokenEndpoint(): string {
    // Use stored token endpoint if available
    if (this._tokenEndpoint) {
      return this._tokenEndpoint;
    }

    // Fallback: construct from redirect URL pattern
    const redirectUrl = typeof this._redirectUrl === 'string' ? this._redirectUrl : this._redirectUrl.toString();
    const baseUrl = redirectUrl.replace('/callback', '').replace('/oauth2/callback', '');
    return `${baseUrl}/oauth2/token`;
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
    // Also generate code challenge from the provided verifier
    this._codeChallenge = this._generateCodeChallenge(codeVerifier);
    logger.info('AgentOAuthProvider: Code verifier and challenge updated');
  }

  codeVerifier(): string {
    if (!this._codeVerifier) {
      throw new Error('Code verifier not available. PKCE not initialized.');
    }
    return this._codeVerifier;
  }

  /**
   * Get the code challenge for PKCE
   */
  codeChallenge(): string {
    if (!this._codeChallenge) {
      throw new Error('Code challenge not available. PKCE not initialized.');
    }
    return this._codeChallenge;
  }

  redirectToAuthorization(_authorizationUrl: URL): void {
    // Agent flow doesn't use interactive authorization, so this is a no-op
  }

  /**
   * Get agent identity tokens
   */
  getAgentTokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  /**
   * Get the agent ID
   */
  getAgentID(): string | undefined {
    return this._agentID;
  }
}