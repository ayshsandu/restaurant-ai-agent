import { GoogleGenAI, Chat, FunctionCall, Part, Type, mcpToTool } from '@google/genai';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface ToolCallInfo {
  name: string;
  args: any;
}

export interface ChatResponse {
  text: string;
  toolCalls?: ToolCallInfo[];
}

export class GeminiService {
  private ai: GoogleGenAI;
  private mcpServiceUrl: string;

  constructor(apiKey: string, mcpServiceUrl: string) {
    if (!apiKey) {
      throw new Error("Google AI API key is required");
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.mcpServiceUrl = mcpServiceUrl;
  }

  private async createMCPClient(): Promise<Client | undefined> {
    try {
      const baseUrl = new URL(this.mcpServiceUrl);
      const client = new Client({
        name: 'streamable-http-client',
        version: '1.0.0'
      });
      const transport = new StreamableHTTPClientTransport(new URL(baseUrl));
      await client.connect(transport);
      console.log('Created new MCP client connection for session');
      return client;
    } catch (error) {
      console.error('Failed to create MCP client connection:', error);
      return undefined;
    }
  }

  public async createChatSession(): Promise<Chat> {
    // Create a new MCP client for this session
    const client = await this.createMCPClient();

    return this.ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: 'You are a friendly and efficient restaurant assistant. Your goal is to help users browse the menu and place orders. Be polite and clear. When presenting menu items, include their ID, name, description, and price. When an order is placed, confirm the order details back to the user.',
        tools: client ? [mcpToTool(client)] : [],
      },
    });
  }

  public async runChat(prompt: string, chatSession: Chat): Promise<ChatResponse> {
    if (!chatSession) {
      throw new Error("Chat session is required.");
    }

    console.log("Processing message:", prompt);

    try {
      let response = await chatSession.sendMessage({ message: prompt });
      console.log("Final AI response:", response.text);
      return {
        text: response.text || '',
      };
    } catch (error) {
      console.error("Error in chat processing:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Chat processing failed: ${errorMessage}`);
    }
  }
}