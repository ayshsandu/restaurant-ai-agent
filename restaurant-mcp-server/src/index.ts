import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {McpAuthServer} from '@asgardeo/mcp-express';

import { v4 as uuidv4 } from 'uuid';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors'; // Add this import
import 'dotenv/config';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Types
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  allergens: string[];
}

export interface CartItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Session {
  cart: CartItem[];
  created_at: string;
  last_active: string;
}

export interface Order {
  order_id: string;
  items: CartItem[];
  total: number;
  status: string;
  created_at: string;
  customer_info: Record<string, any>;
  payment_info: {
    method: string;
    status: string;
    transaction_id: string;
  };
  notes?: string[];
  created_by?: string;
  user_id?: string;
}

// Load menu items from JSON file
const MENU_JSON_PATH = join(__dirname, "menu_items.json");
export let MENU_ITEMS: MenuItem[];
try {
  MENU_ITEMS = JSON.parse(readFileSync(MENU_JSON_PATH, "utf-8"));
} catch (error) {
  console.error('Error loading menu items:', error);
  process.exit(1);
}

// In-memory storage
export const ORDERS: Record<string, Order> = {};
export const ACTIVE_SESSIONS: Record<string, Session> = {};

// Global variable to store current user's sub for MCP requests
let currentSub: string | undefined = undefined;
let currentAct: string | undefined = undefined;
let currentMcpSessionId: string | undefined = undefined;

import { port } from './config.js';
import { JWTProcessor } from './jwtProcessor.js';

// Validate required environment variables
if (!process.env.BASE_URL) {
  console.error('Error: BASE_URL environment variable is required');
  process.exit(1);
}

// Create server
const server = new Server(
  {
    name: "backwards-compatible-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize McpAuthServer (Asgardeo auth middleware)
const mcpAuthServer = new McpAuthServer({
  baseUrl: process.env.BASE_URL,
  issuer: `${process.env.BASE_URL}/oauth2/token`,
  resource: process.env.MCP_RESOURCE || `http://localhost:${port}/mcp`
});

// Initialize JWT Processor
const jwtProcessor = new JWTProcessor();

// Set up echo tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_menu_categories",
        description: "Retrieves a list of all unique menu categories available in the restaurant. This tool is useful for understanding the overall menu structure and helping customers browse by category, such as appetizers, mains, desserts, etc. Returns a sorted array of category names.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_items_by_category",
        description: "Lists all menu items within a specific category. Provide the category name to get detailed information about items including their names, prices, descriptions, and dietary information. This helps customers explore options within their preferred category.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "The name of the menu category to list items from (e.g., 'Appetizers', 'Main Courses', 'Desserts')",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "get_item_details",
        description: "Retrieves detailed information about a specific menu item by its ID or name. This includes price, description, dietary flags (vegetarian, vegan, gluten-free), allergens, and category. Useful for providing comprehensive information when a customer asks about a particular dish.",
        inputSchema: {
          type: "object",
          properties: {
            item_identifier: {
              type: "string",
              description: "The unique ID or exact name of the menu item to retrieve details for",
            },
          },
          required: ["item_identifier"],
        },
      },
      {
        name: "find_items_by_criteria",
        description: "Filters and finds menu items based on various criteria such as dietary preferences, maximum price, allergens to exclude, or specific category. This tool is essential for accommodating customer dietary needs, budget constraints, and preferences. Multiple criteria can be combined for precise filtering.",
        inputSchema: {
          type: "object",
          properties: {
            dietary_preference: {
              type: "string",
              description: "Filter by dietary preference: 'vegetarian' (includes vegetarian items), 'vegan' (includes vegan items), or 'gluten_free' (includes gluten-free items)",
            },
            max_price: {
              type: "number",
              description: "Maximum price per item to include in results",
            },
            exclude_allergens: {
              type: "array",
              items: { type: "string" },
              description: "List of allergens to exclude (e.g., ['nuts', 'dairy', 'gluten']) - items containing these will be filtered out",
            },
            category: {
              type: "string",
              description: "Filter items to only show those in this specific category",
            },
          },
        },
      },
      {
        name: "create_cart",
        description: "Creates a new empty shopping cart session for a customer. This initializes a temporary session to hold selected menu items before checkout. Returns a unique session ID that should be used for all subsequent cart operations. Essential for starting the ordering process.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "add_to_cart",
        description: "Adds a specified quantity of a menu item to an existing cart session. If the item is already in the cart, the quantity will be increased. This tool updates the cart contents and provides the current total. Use this when customers want to add items to their order.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "The unique session ID of the cart to add items to",
            },
            item_id: {
              type: "string",
              description: "The ID of the menu item to add to the cart",
            },
            quantity: {
              type: "integer",
              description: "The quantity of the item to add (defaults to 1 if not specified)",
              default: 1,
            },
          },
          required: ["session_id", "item_id"],
        },
      },
      {
        name: "remove_from_cart",
        description: "Removes a specific menu item from an existing cart session. This completely removes the item regardless of quantity. Use this when customers want to remove items they've added to their cart.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "The unique session ID of the cart to remove items from",
            },
            item_id: {
              type: "string",
              description: "The ID of the menu item to remove from the cart",
            },
          },
          required: ["session_id", "item_id"],
        },
      },
      {
        name: "get_cart",
        description: "Retrieves the current contents of a cart session, including all items with their quantities and individual prices, plus the total cost. This allows customers to review their selections before proceeding to checkout.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "The unique session ID of the cart to retrieve",
            },
          },
          required: ["session_id"],
        },
      },
      {
        name: "checkout",
        description: "Processes the checkout for a cart session, converting it into a confirmed order. Requires customer and payment information. This finalizes the order, generates an order ID, and clears the cart. The order will be marked as 'confirmed' and ready for preparation.",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "The unique session ID of the cart to checkout",
            },
            customer_info: {
              type: "object",
              description: "Customer details such as name, phone, email, or delivery address",
            },
            payment_info: {
              type: "object",
              description: "Payment details including method (e.g., 'credit_card', 'cash') and any required payment data",
            },
          },
          required: ["session_id"],
        },
      },
      {
        name: "get_order_status",
        description: "Retrieves the current status and details of a specific order by its order ID. This includes order items, total, creation time, customer info, and current status (e.g., 'confirmed', 'preparing', 'ready'). Useful for tracking order progress.",
        inputSchema: {
          type: "object",
          properties: {
            order_id: {
              type: "string",
              description: "The unique order ID to check status for",
            },
          },
          required: ["order_id"],
        },
      },
      {
        name: "list_orders",
        description: "Retrieves a list of all orders in the system. This provides an overview of all customer orders with their details. Typically used for administrative purposes or when customers need to reference multiple orders.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_my_orders",
        description: "Retrieves all orders associated with the currently authenticated user. This shows the user's order history including past and current orders. Requires user authentication and filters orders by the user's identity.",
        inputSchema: {
          type: "object",
          properties: {}
        },
      },
      {
        name: "add_order_note",
        description: "Adds a special note or request to an existing order, such as dietary modifications, allergies, or preparation instructions. This allows customers to communicate specific requirements to the kitchen staff for their order.",
        inputSchema: {
          type: "object",
          properties: {
            order_id: {
              type: "string",
              description: "The unique order ID to add the note to",
            },
            note: {
              type: "string",
              description: "The special request or note to add to the order (e.g., 'no onions', 'extra spicy', 'birthday celebration')",
            },
          },
          required: ["order_id", "note"],
        },
      },
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  console.log(`Received request for tool: ${name} with args:`, args);

  switch (name) {
     case "get_menu_categories": {
       console.log(` [${currentMcpSessionId}] Executing Tool: get_menu_categories, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {}`);
       const categories = [...new Set(MENU_ITEMS.map(item => item.category))].sort();
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify(categories),
           },
         ],
       };
     }
 
     case "list_items_by_category": {
       const { category } = args as { category: string };
       console.log(` [${currentMcpSessionId}] Executing Tool: list_items_by_category, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {category: "${category}"}`);
       const items = MENU_ITEMS.filter(item => item.category === category);
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify(items),
           },
         ],
       };
     }
 
     case "get_item_details": {
       const { item_identifier } = args as { item_identifier: string };
       console.log(` [${currentMcpSessionId}] Executing Tool: get_item_details, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {item_identifier: "${item_identifier}"}`);
       const item = MENU_ITEMS.find(
         item => item.id === item_identifier || item.name.toLowerCase() === item_identifier.toLowerCase()
       );
       const result = item || { error: `Item '${item_identifier}' not found` };
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify(result),
           },
         ],
       };
     }
 
     case "find_items_by_criteria": {
       const { dietary_preference, max_price, exclude_allergens, category } = args as {
         dietary_preference?: string;
         max_price?: number;
         exclude_allergens?: string[];
         category?: string;
       };
 
       console.log(` [${currentMcpSessionId}] Executing Tool: find_items_by_criteria, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {dietary_preference: "${dietary_preference || ''}", max_price: ${max_price || 'null'}, exclude_allergens: ${JSON.stringify(exclude_allergens || [])}, category: "${category || ''}"}`);
 
       let filtered = [...MENU_ITEMS];
 
       if (dietary_preference) {
         const pref = dietary_preference.toLowerCase();
         if (pref === 'vegetarian') {
           filtered = filtered.filter(i => i.is_vegetarian);
         } else if (pref === 'vegan') {
           filtered = filtered.filter(i => i.is_vegan);
         } else if (pref === 'gluten_free') {
           filtered = filtered.filter(i => i.is_gluten_free);
         }
       }
 
       if (max_price !== undefined) {
         filtered = filtered.filter(i => i.price <= max_price);
       }
 
       if (exclude_allergens) {
         for (const allergen of exclude_allergens) {
           filtered = filtered.filter(i => 
             !i.allergens.some(a => a.toLowerCase() === allergen.toLowerCase())
           );
         }
       }
 
       if (category) {
         filtered = filtered.filter(i => i.category.toLowerCase() === category.toLowerCase());
       }
 
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify(filtered),
           },
         ],
       };
     }
 
     case "create_cart": {
       const session_id = uuidv4();
       const now = new Date().toISOString();
       ACTIVE_SESSIONS[session_id] = {
         cart: [],
         created_at: now,
         last_active: now,
       };
       console.log(` [${currentMcpSessionId}] Executing Tool: create_cart, Session: ${session_id}, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {}`);
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({ session_id, cart: [] }),
           },
         ],
       };
     }
 
     case "add_to_cart": {
       const { session_id, item_id, quantity = 1 } = args as {
         session_id: string;
         item_id: string;
         quantity?: number;
       };

       const session = ACTIVE_SESSIONS[session_id];
       if (!session) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: "Invalid session ID" }),
             },
           ],
         };
       }

       const item = MENU_ITEMS.find(i => i.id === item_id);
       if (!item) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: `Item '${item_id}' not found` }),
             },
           ],
         };
       }

       const cart = session.cart;
       const existingItem = cart.find(cart_item => cart_item.item_id === item_id);
       
       if (existingItem) {
         existingItem.quantity += quantity;
       } else {
         cart.push({
           item_id: item_id,
           name: item.name,
           price: item.price,
           quantity: quantity,
         });
       }

       session.last_active = new Date().toISOString();
       const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
       console.log(` [${currentMcpSessionId}] Executing Tool: add_to_cart, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {session_id: "${session_id}", item_id: "${item_id}", quantity: ${quantity}}`);

       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({ cart, total }),
           },
         ],
       };
     }     case "add_order_note": {
       const { order_id, note } = args as { order_id: string; note: string };
 
       console.log(` [${currentMcpSessionId}] Executing Tool: add_order_note, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {order_id: "${order_id}", note: "${note}"}`);
 
       const order = ORDERS[order_id];
       if (!order) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: `Order '${order_id}' not found` }),
             },
           ],
         };
       }
       // Attach notes array if not present
       if (!order.notes) {
         order.notes = [];
       }
       order.notes.push(note);
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({ success: true, notes: order.notes }),
           },
         ],
       };
     }

     case "remove_from_cart": {
       const { session_id, item_id } = args as { session_id: string; item_id: string };
 
       console.log(` [${currentMcpSessionId}] Executing Tool: remove_from_cart, Session: ${session_id}, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {session_id: "${session_id}", item_id: "${item_id}"}`);
 
       const session = ACTIVE_SESSIONS[session_id];
       if (!session) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: "Invalid session ID" }),
             },
           ],
         };
       }
 
       session.cart = session.cart.filter(i => i.item_id !== item_id);
       session.last_active = new Date().toISOString();
       const total = session.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
 
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({ cart: session.cart, total }),
           },
         ],
       };
     }
 
     case "get_cart": {
       const { session_id } = args as { session_id: string };
 
       console.log(` [${currentMcpSessionId}] Executing Tool: get_cart, Session: ${session_id}, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {session_id: "${session_id}"}`);
 
       const session = ACTIVE_SESSIONS[session_id];
       if (!session) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: "Invalid session ID" }),
             },
           ],
         };
       }
 
       const total = session.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
 
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({ cart: session.cart, total }),
           },
         ],
       };
     }
 
     case "checkout": {
       const { session_id, customer_info, payment_info } = args as {
         session_id: string;
         customer_info?: Record<string, any>;
         payment_info?: Record<string, any>;
       };
 
       const session = ACTIVE_SESSIONS[session_id];
       if (!session) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: "Invalid session ID" }),
             },
           ],
         };
       }

       if (session.cart.length === 0) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: "Cannot checkout with empty cart" }),
             },
           ],
         };
       }       
       const order_id = `ORD-${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
       const order_time = new Date().toISOString();
       const total = session.cart.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0);

       const order: Order = {
         order_id,
         items: session.cart,
         total,
         status: "confirmed",
         created_at: order_time,
         customer_info: customer_info || {},
         payment_info: {
           method: payment_info?.method || 'credit_card',
           status: "approved",
           transaction_id: `TXN-${uuidv4().replace(/-/g, '').substring(0, 10).toUpperCase()}`,
         },
         created_by: currentAct || currentSub,
         user_id: currentSub,
       };

       ORDERS[order_id] = order;
       session.cart = [];
       session.last_active = new Date().toISOString();
       console.log(` [${currentMcpSessionId}] Executing Tool: checkout, Session: ${session_id}, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {session_id: "${session_id}", customer_info: ${JSON.stringify(customer_info || {})}, payment_info: ${JSON.stringify(payment_info || {})}}`);
 
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({
               order,
               success: true,
               message: "Order placed successfully",
             }),
           },
         ],
       };
     }
 
     case "get_order_status": {
       const { order_id } = args as { order_id: string };
 
       console.log(` [${currentMcpSessionId}] Executing Tool: get_order_status, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {order_id: "${order_id}"}`);
 
       const order = ORDERS[order_id];
       if (!order) {
         return {
           content: [
             {
               type: "text",
               text: JSON.stringify({ error: `Order '${order_id}' not found` }),
             },
           ],
         };
       }
 
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify({ order }),
           },
         ],
       };
     }
 
     case "list_orders": {
       console.log(` [${currentMcpSessionId}] Executing Tool: list_orders, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}, Params: {}`);
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify(Object.values(ORDERS)),
           },
         ],
       };
     }

     case "get_my_orders": {
       console.log(` [${currentMcpSessionId}] Executing Tool: get_my_orders, SUB: ${currentSub || 'N/A'}, ACT: ${currentAct || 'N/A'}`);
       
       const userOrders = Object.values(ORDERS).filter(order => order.user_id === currentSub);
       
       return {
         content: [
           {
             type: "text",
             text: JSON.stringify(userOrders),
           },
         ],
       };
     }
 
     default:
       throw new Error(`Unknown tool: ${name}`);
   }
  
  });

const app = express();
app.use(express.json());
app.use(mcpAuthServer.router());

// Enable CORS (add this block)
app.use(
    cors({
        origin: '*', // Allow all origins for development; restrict in production (e.g., ['https://your-client-domain.com'])
        exposedHeaders: ['Mcp-Session-Id'],
    })
);

// JWT Validation Middleware
app.use(jwtProcessor.middleware());

// Store transports for each session type
const transports = {
  streamable: {} as Record<string, StreamableHTTPServerTransport>
};

// Modern Streamable HTTP endpoint
app.all('/mcp', mcpAuthServer.protect(), async (req, res) => {
  // Check for existing session ID
  currentMcpSessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (currentMcpSessionId && transports.streamable[currentMcpSessionId]) {
    // Reuse existing transport
    transport = transports.streamable[currentMcpSessionId];
  } else if (!currentMcpSessionId && req.method === 'POST') {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => uuidv4(),
      onsessioninitialized: (mcpSessionId) => {
        // Store the transport by session ID
        transports.streamable[mcpSessionId] = transport;
      }
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports.streamable[transport.sessionId];
      }
    };

    // Connect to the MCP server
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Extract sub and act from Authorization header for MCP requests
  const decoded = jwtProcessor.decodeToken(req.headers.authorization as string);
  currentSub = jwtProcessor.extractSubFromDecoded(decoded);
  currentAct = jwtProcessor.extractActFromDecoded(decoded);

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

import createApiRouter from './api.js';
app.use('/api', createApiRouter(mcpAuthServer));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log(`MCP endpoint available at http://localhost:${port}/mcp`);
  console.log(`REST API available at http://localhost:${port}/api`);
  console.log(`API documentation available at http://localhost:${port}/api/docs`);
  console.log(`OpenAPI JSON spec at http://localhost:${port}/api/docs.json`);
  console.log(`OpenAPI YAML spec at http://localhost:${port}/api/docs.yaml`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});