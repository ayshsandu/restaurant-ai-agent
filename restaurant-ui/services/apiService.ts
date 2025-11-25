// Configuration for the backend API - now points to our proxy server
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
console.log("API_BASE_URL:", API_BASE_URL);
import { MenuItem, CartItem, Order, Customer } from '../types';

// API Response interfaces based on the OpenAPI spec
export interface ApiMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  allergens: string[];
  currency?: string;
  ingredients?: string[];
  image_url?: string;
  tags?: string[];
}

export interface ApiCartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CartResponse {
  cart: ApiCartItem[];
  total: number;
}

export interface CartSession {
  session_id: string;
  cart: ApiCartItem[];
}

export interface ApiOrder {
  order_id: string;
  items: ApiCartItem[];
  total: number;
  status: string;
  created_at: string;
  customer_info?: any;
  payment_info?: {
    method: string;
    status: string;
    transaction_id?: string;
  };
  notes?: string[];
}

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

export class ApiService {
  private static instance: ApiService;
  private baseUrl: string;
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second

  private constructor() {
    console.log("API Service initialized with BFF_BASE_URL:", API_BASE_URL);
    this.baseUrl = API_BASE_URL;
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
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
    // The remote API doesn't have a health endpoint, so we'll test with categories
    try {
      await this.getMenuCategories();
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'remote-restaurant-api'
      };
    } catch (error) {
      throw new Error('Remote API is not available');
    }
  }

  // Menu API methods
  public async getMenuCategories(): Promise<string[]> {
    return this.makeRequest('/menu/categories');
  }

  public async getMenuItems(filters?: {
    category?: string;
    dietary_preference?: 'vegetarian' | 'vegan' | 'gluten_free';
    max_price?: number;
    exclude_allergens?: string[];
  }): Promise<ApiMenuItem[]> {
    const params = new URLSearchParams();
    
    if (filters?.category) params.append('category', filters.category);
    if (filters?.dietary_preference) params.append('dietary_preference', filters.dietary_preference);
    if (filters?.max_price) params.append('max_price', filters.max_price.toString());
    if (filters?.exclude_allergens && filters.exclude_allergens.length > 0) {
      params.append('exclude_allergens', filters.exclude_allergens.join(','));
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/menu/items?${queryString}` : '/menu/items';
    
    return this.makeRequest(endpoint);
  }

  public async getMenuItem(id: string): Promise<ApiMenuItem> {
    return this.makeRequest(`/menu/items/${id}`);
  }

  // Cart API methods
  public async createCart(): Promise<CartSession> {
    return this.makeRequest('/cart', {
      method: 'POST',
    });
  }

  public async getCart(cartId: string): Promise<CartResponse> {
    return this.makeRequest(`/cart/${cartId}`);
  }

  public async addToCart(cartId: string, itemId: string, quantity: number = 1): Promise<CartResponse> {
    return this.makeRequest(`/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        item_id: itemId,
        quantity: quantity
      }),
    });
  }

  public async removeFromCart(cartId: string, itemId: string): Promise<CartResponse> {
    return this.makeRequest(`/cart/${cartId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Order API methods
  public async createOrder(cartId: string, customerInfo?: any, paymentInfo?: any): Promise<ApiOrder> {
    return this.makeRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        session_id: cartId,
        customer_info: customerInfo,
        payment_info: paymentInfo
      }),
    });
  }

  public async getOrder(orderId: string): Promise<ApiOrder> {
    return this.makeRequest(`/orders/${orderId}`);
  }

  public async getAllOrders(): Promise<ApiOrder[]> {
    return this.makeRequest('/orders');
  }

  public async addOrderNote(orderId: string, note: string): Promise<{ success: boolean; notes: string[] }> {
    return this.makeRequest(`/orders/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  public async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    return this.makeRequest(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
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
export const apiService = ApiService.getInstance();