// Configuration for the backend API
const BFF_BASE_URL = import.meta.env.VITE_BFF_BASE_URL || 'http://localhost:3001/api';
console.log("BFF_BASE_URL:", BFF_BASE_URL);
export interface ChatResponse {
  success: boolean;
  response?: string;
  sessionId?: string;
  error?: string;
  details?: string;
  timestamp?: string;
  authorizationRequired?: boolean;
  authorizationUrl?: string;
}

export class AgentService {
  private static instance: AgentService;
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  private constructor() {
    this.baseUrl = BFF_BASE_URL;
  }

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        // Retry on server errors (5xx) but not on client errors (4xx)
        if (response.status >= 500 && retryCount < this.maxRetries) {
          console.warn(`Request failed with ${response.status}, retrying... (${retryCount + 1}/${this.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
          return this.makeRequest(endpoint, options, retryCount + 1);
        }

        throw new Error(
          errorData.error ||
          errorData.details ||
          `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the server. Please make sure the backend is running.');
      }

      // Re-throw the error if it's already our custom error
      if (error instanceof Error && (
        error.message.includes('Unable to connect') ||
        error.message.includes('HTTP')
      )) {
        throw error;
      }

      throw new Error('Network error occurred. Please try again.');
    }
  }

  public async healthCheck(): Promise<{ status: string; timestamp: string; service: string; version?: string; sessions?: any }> {
    return this.makeRequest('/health');
  }

  public async sendChatMessage(message: string, sessionId?: string): Promise<{ 
    response: string; 
    sessionId: string;
    authorizationRequired?: boolean;
    authorizationUrl?: string;
  }> {
    // Input validation
    if (!message || typeof message !== 'string') {
      throw new Error('Message must be a non-empty string');
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      throw new Error('Message cannot be empty');
    }

    if (trimmedMessage.length > 1000) {
      throw new Error('Message too long. Maximum 1000 characters allowed.');
    }

    // Validate session ID if provided
    if (sessionId && (typeof sessionId !== 'string' || sessionId.length > 100)) {
      throw new Error('Invalid session ID');
    }

    try {
      const response = await this.makeRequest<ChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmedMessage,
          sessionId: sessionId || undefined
        }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get response from AI');
      }

      const responseText = response.response || '';
      const responseSessionId = response.sessionId || sessionId || '';

      if (!responseSessionId) {
        console.warn('No session ID returned from server');
      }

      return {
        response: responseText,
        sessionId: responseSessionId,
        authorizationRequired: response.authorizationRequired,
        authorizationUrl: response.authorizationUrl,
      };
    } catch (error) {
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred while sending message');
    }
  }
}

// Export a singleton instance
export const apiService = AgentService.getInstance();