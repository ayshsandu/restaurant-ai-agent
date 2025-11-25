import { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import { OAuthClientMetadata, OAuthClientInformationMixed, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

/**
 * OAuth configuration interface
 */
export interface OAuthConfig {
  clientId?: string;
  clientSecret?: string;
  tokens?: OAuthTokens;
  redirectUrl?: string;
  scope?: string;
}

/**
 * Safe OAuth configuration interface (without sensitive data)
 */
export interface SafeOAuthConfig extends Omit<OAuthConfig, 'clientSecret' | 'tokens'> {
  hasClientSecret: boolean;
  hasTokens: boolean;
  canUseClientCredentials: boolean;
}

/**
 * Server-side OAuth client provider for MCP connections
 * Handles OAuth authentication for server-to-server communication
 */
export class ServerOAuthClientProvider implements OAuthClientProvider {
  private _redirectUrl: string | URL;
  private _clientMetadata: OAuthClientMetadata;
  private _clientId?: string;
  private _clientSecret?: string;
  private _tokens?: OAuthTokens;

  constructor(
    redirectUrl: string | URL,
    clientMetadata: OAuthClientMetadata,
    clientId?: string,
    clientSecret?: string,
    tokens?: OAuthTokens
  ) {
    this._redirectUrl = redirectUrl;
    this._clientMetadata = clientMetadata;
    this._clientId = clientId;
    this._clientSecret = clientSecret;
    this._tokens = tokens;
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
    // In a server environment, client information is typically pre-configured
    // This could be extended to save to a database or configuration file
    console.log('Client information saved:', clientInformation);
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
    console.log('OAuth tokens saved');
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    // In server-side OAuth, we typically use client credentials flow
    // or pre-configured tokens rather than interactive redirects
    console.log('OAuth authorization URL (server-side):', authorizationUrl.toString());
  }

  saveCodeVerifier(codeVerifier: string): void {
    // Not typically used in server-side flows
    console.log('Code verifier saved (server-side)');
  }

  codeVerifier(): string {
    throw new Error('Code verifier not available in server-side OAuth flow');
  }
}

/**
 * OAuth Service for managing MCP authentication
 */
export class OAuthService {
  private config: OAuthConfig;

  constructor(config: OAuthConfig = {}) {
    this.config = {
      redirectUrl: 'http://localhost:3000/callback',
      scope: 'mcp:tools',
      ...config,
    };
  }

  /**
   * Check if OAuth is configured
   */
  isConfigured(): boolean {
    return !!(this.config.clientId || this.config.tokens);
  }

  /**
   * Check if OAuth can perform client credentials flow
   */
  canUseClientCredentials(): boolean {
    return !!(this.config.clientId && this.config.clientSecret);
  }

  /**
   * Check if OAuth has pre-configured tokens
   */
  hasTokens(): boolean {
    return !!this.config.tokens;
  }

  /**
   * Create OAuth client metadata
   */
  private createClientMetadata(): OAuthClientMetadata {
    const hasClientSecret = !!this.config.clientSecret;

    return {
      client_name: 'Restaurant AI Assistant MCP Client',
      redirect_uris: [this.config.redirectUrl || 'http://localhost:3000/callback'],
      grant_types: ['client_credentials', 'authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: hasClientSecret ? 'client_secret_post' : 'none',
      scope: this.config.scope,
    };
  }

  /**
   * Create OAuth client provider for MCP transport
   */
  createOAuthProvider(): ServerOAuthClientProvider | undefined {
    if (!this.isConfigured()) {
      return undefined;
    }

    const clientMetadata = this.createClientMetadata();

    return new ServerOAuthClientProvider(
      this.config.redirectUrl || 'http://localhost:3000/callback',
      clientMetadata,
      this.config.clientId,
      this.config.clientSecret,
      this.config.tokens
    );
  }

  /**
   * Update OAuth configuration
   */
  updateConfig(config: Partial<OAuthConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current OAuth configuration (without sensitive data)
   */
  getConfig(): SafeOAuthConfig {
    const { clientSecret, tokens, ...safeConfig } = this.config;
    return {
      ...safeConfig,
      hasClientSecret: !!clientSecret,
      hasTokens: !!tokens,
      canUseClientCredentials: this.canUseClientCredentials(),
    };
  }
}

/**
 * Factory function to create OAuth service from environment variables
 */
export function createOAuthServiceFromEnv(): OAuthService {
  const config: OAuthConfig = {
    clientId: process.env.MCP_OAUTH_CLIENT_ID,
    clientSecret: process.env.MCP_OAUTH_CLIENT_SECRET,
    redirectUrl: process.env.MCP_OAUTH_REDIRECT_URL,
    scope: process.env.MCP_OAUTH_SCOPE,
    tokens: process.env.MCP_OAUTH_ACCESS_TOKEN ? {
      access_token: process.env.MCP_OAUTH_ACCESS_TOKEN,
      token_type: process.env.MCP_OAUTH_TOKEN_TYPE || 'Bearer',
      expires_in: process.env.MCP_OAUTH_EXPIRES_IN ? parseInt(process.env.MCP_OAUTH_EXPIRES_IN) : undefined,
      scope: process.env.MCP_OAUTH_SCOPE,
      refresh_token: process.env.MCP_OAUTH_REFRESH_TOKEN,
    } : undefined,
  };

  return new OAuthService(config);
}