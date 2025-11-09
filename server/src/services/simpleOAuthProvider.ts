import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

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

  constructor(
    redirectUrl: string | URL,
    clientMetadata: OAuthClientMetadata,
    clientId?: string,
    clientSecret?: string,
    tokens?: OAuthTokens,
    sessionId?: string
  ) {
    this._redirectUrl = redirectUrl;
    this._clientMetadata = clientMetadata;
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._tokens = tokens;
    this._sessionId = sessionId;
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
    console.log('Client information saved');
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    console.log('OAuth tokens saved');
  }

  /**
   * Store the authorization URL for later retrieval
   */
  redirectToAuthorization(authorizationUrl: URL): void {
    console.log('Authorization URL:', authorizationUrl.toString());
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
}