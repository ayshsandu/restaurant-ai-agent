import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Request, Notification, Result } from "@modelcontextprotocol/sdk/types.js";
import { logger } from '../utils/logger';
import { error } from "console";

/**
 * Custom MCP Client extending the base Client class
 * Allows for custom modifications and method overrides
 */
export class CustomClient extends Client {
  constructor(
    info: { name: string; version: string },
    capabilities?: { [key: string]: any }
  ) {
    super(info, capabilities);
  }

  /**
   * Override request method if needed
   * Currently delegates to parent implementation
   */
  async request<T extends Result>(
    request: Request,
    schema?: any
  ): Promise<T> {
    return super.request(request, schema);
  }

  /**
   * Override notification method if needed
   * Currently delegates to parent implementation
   */
  async notification(notification: Notification): Promise<void> {
    return super.notification(notification);
  }

  /**
   * Override connect method if needed
   * Currently delegates to parent implementation
   */
  async connect(transport: any): Promise<void> {
    return super.connect(transport);
  }

  /**
   * Custom method for session management
   * Can be used to track session-specific state
   */
  setSessionId(sessionId: string): void {
    (this as any)._sessionId = sessionId;
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | undefined {
    return (this as any)._sessionId;
  }

  /**
   * Custom method for OAuth token management
   * Can be used to store/retrieve OAuth tokens for the session
   */
  setOAuthTokens(tokens: any): void {
    (this as any)._oauthTokens = tokens;
  }

  /**
   * Get OAuth tokens for the current session
   */
  getOAuthTokens(): any {
    return (this as any)._oauthTokens;
  }

  /**
   * Override listTools method to add custom logic
   * Currently delegates to parent implementation
   */
  async listTools(params?: any, options?: any) {
    logger.debug(`[CustomClient] Listing tools for session: ${this.getSessionId()}`);
    const result = await super.listTools(params, options);
    logger.debug(`[CustomClient] Found ${result.tools?.length || 0} tools`);
    return result;
  }

  /**
   * Override callTool method to add custom logic
   * Currently delegates to parent implementation
   */
  async callTool(params: any, resultSchema?: any, options?: any) {
    console.log(`[CustomClient] Calling tool: ${params.name} for session: ${this.getSessionId()} with arguments: ${params.arguments}`);

    try {
      const result = await super.callTool(params, resultSchema, options);
      logger.debug(`[CustomClient] Tool call completed successfully`);
      return result;
    } catch (error) {
      logger.error(`[CustomClient] Tool call failed:`, error);
      throw error;
    }
  }
}