import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { logger } from '../utils/logger.js';

/**
 * Authorization code grant flow state management
 */
interface AuthState {
  state: string;
  codeVerifier: string;
  resolve: (code: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * OAuth Provider implementing authorization code grant flow
 * Extends OAuthClientProvider from MCP SDK
 */
export class AuthorizationCodeOAuthProvider implements OAuthClientProvider {
  private _redirectUrl: string | URL;
  private _clientMetadata: OAuthClientMetadata;
  private _clientId?: string;
  private _clientSecret?: string;
  private _tokens?: OAuthTokens;
  private _codeVerifier?: string;
  private _tokenEndpoint?: string;

  // State management for authorization code flow
  private pendingAuthStates = new Map<string, AuthState>();

  constructor(
    redirectUrl: string | URL,
    clientMetadata: OAuthClientMetadata,
    clientId?: string,
    clientSecret?: string,
    tokens?: OAuthTokens,
    tokenEndpoint?: string
  ) {
    this._redirectUrl = redirectUrl;
    this._clientMetadata = clientMetadata;
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._tokens = tokens;
    this._tokenEndpoint = tokenEndpoint;
  }

  get redirectUrl(): string | URL {
    return this._redirectUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return this._clientMetadata;
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
    logger.debug('Client information saved');
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    logger.debug('OAuth tokens saved');
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    return crypto.randomUUID();
  }

  /**
   * Generate a code verifier for PKCE
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from code verifier
   */
  private async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Initiate authorization code flow
   * Returns a promise that resolves when the authorization code is received
   */
  async initiateAuthorization(authorizationUrl: URL, timeoutMs: number = 300000): Promise<string> {
    const state = this.generateState();
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Save code verifier for later use
    this.saveCodeVerifier(codeVerifier);

    // Add state parameter to authorization URL
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    // Create promise that will be resolved when callback is received
    const authPromise = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingAuthStates.delete(state);
        reject(new Error('Authorization timeout'));
      }, timeoutMs);

      this.pendingAuthStates.set(state, {
        state,
        codeVerifier,
        resolve,
        reject,
        timeout
      });
    });

    // Redirect to authorization URL (in server context, this would typically
    // return the URL to the client for redirection)
    this.redirectToAuthorization(authorizationUrl);

    return authPromise;
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(code: string, codeVerifier: string): Promise<OAuthTokens> {
    if (!this._tokenEndpoint) {
      throw new Error('Token endpoint not configured');
    }

    if (!this._clientId) {
      throw new Error('Client ID not configured');
    }

    const tokenUrl = new URL(this._tokenEndpoint);
    const params = new URLSearchParams();

    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', this._redirectUrl.toString());
    params.append('client_id', this._clientId);
    params.append('code_verifier', codeVerifier);

    // Add client_secret for confidential clients
    if (this._clientSecret) {
      params.append('client_secret', this._clientSecret);
    }

    try {
      const response = await fetch(tokenUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const tokenData = await response.json();

      // Validate required fields
      if (!tokenData.access_token) {
        throw new Error('Invalid token response: missing access_token');
      }

      const tokens: OAuthTokens = {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in,
        scope: tokenData.scope,
        refresh_token: tokenData.refresh_token,
      };

      return tokens;
    } catch (error) {
      logger.error('Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Handle authorization callback with code and state
   */
  async handleAuthorizationCallback(code: string, state: string): Promise<void> {
    const authState = this.pendingAuthStates.get(state);

    if (!authState) {
      logger.error(`Unknown state parameter: ${state}`);
      return;
    }

    try {
      // Exchange authorization code for tokens
      logger.debug('Exchanging authorization code for tokens...');
      const tokens = await this.exchangeCodeForTokens(code, authState.codeVerifier);

      // Save the tokens
      this.saveTokens(tokens);
      logger.debug('Tokens successfully obtained and saved');

      // Clear timeout and remove from pending states
      clearTimeout(authState.timeout);
      this.pendingAuthStates.delete(state);

      // Resolve the promise with the authorization code (for backward compatibility)
      authState.resolve(code);
    } catch (error) {
      logger.error('Failed to exchange authorization code for tokens:', error);

      // Clear timeout and remove from pending states
      clearTimeout(authState.timeout);
      this.pendingAuthStates.delete(state);

      // Reject the promise with the error
      authState.reject(error instanceof Error ? error : new Error('Token exchange failed'));
    }
  }

  /**
   * Handle authorization error callback
   */
  handleAuthorizationError(error: string, state: string): void {
    const authState = this.pendingAuthStates.get(state);

    if (!authState) {
      logger.error(`Unknown state parameter in error: ${state}`);
      return;
    }

    // Clear timeout and remove from pending states
    clearTimeout(authState.timeout);
    this.pendingAuthStates.delete(state);

    // Reject the promise with the error
    authState.reject(new Error(`Authorization failed: ${error}`));
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    // In a server environment, we typically return the URL to the client
    // or handle the redirect differently than in browser-based flows
    logger.debug('Authorization URL:', authorizationUrl.toString());

    // For server-side implementation, you might want to:
    // 1. Return this URL to the client for redirection
    // 2. Use a headless browser to handle the flow
    // 3. Implement a different strategy based on your use case
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
}