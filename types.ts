
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
  category: 'Appetizer' | 'Main Course' | 'Dessert' | 'Beverage';
  available?: boolean;
  allergens?: string[];
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
