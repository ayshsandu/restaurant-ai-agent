
export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  TOOL = 'tool'
}

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  timestamp?: string;
  authorizationRequired?: boolean;
  authorizationUrl?: string;
  waitingForAuth?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_vegetarian?: boolean;
  is_vegan?: boolean;
  is_gluten_free?: boolean;
  allergens?: string[];
  currency?: string;
  ingredients?: string[];
  image_url?: string;
  tags?: string[];
  // Legacy fields for compatibility
  available?: boolean;
  image?: string;
  preparationTime?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

export interface Customer {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address?: DeliveryAddress;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  instructions?: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  orderType: 'delivery' | 'pickup' | 'dine-in';
  estimatedTime: number; // in minutes
  createdAt: Date;
  customer: Customer;
  notes?: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
}

export interface ApiError {
  success: false;
  error: string;
  details?: string;
}

export interface ChatSuccessResponse {
  success: true;
  response: string;
  sessionId: string;
  timestamp: string;
  authorizationRequired?: boolean;
  authorizationUrl?: string;
}

export type ChatResponse = ChatSuccessResponse | ApiError;
