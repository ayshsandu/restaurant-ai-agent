import express from "express";
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { McpAuthServer } from '@asgardeo/mcp-express';

// Import shared data and types from index.ts
import { MENU_ITEMS, ORDERS, ACTIVE_SESSIONS, MenuItem, CartItem, Order } from './index.js';
import { port } from './config.js';
import { v4 as uuidv4 } from 'uuid';
import { JWTProcessor } from './jwtProcessor.js';

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'AI Gourmet Restaurant API',
        version: '1.0.0',
        description: 'REST API for restaurant menu, cart, and order management',
    },
    servers: [
        {
            url: `http://localhost:${port}/api`,
            description: 'Development server',
        },
    ],
    components: {
        schemas: {
            MenuItem: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    category: { type: 'string' },
                    price: { type: 'number' },
                    description: { type: 'string' },
                    is_vegetarian: { type: 'boolean' },
                    is_vegan: { type: 'boolean' },
                    is_gluten_free: { type: 'boolean' },
                    allergens: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            CartItem: {
                type: 'object',
                properties: {
                    item_id: { type: 'string' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    quantity: { type: 'integer' }
                }
            },
            Order: {
                type: 'object',
                properties: {
                    order_id: { type: 'string' },
                    items: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/CartItem' }
                    },
                    total: { type: 'number' },
                    status: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' },
                    customer_info: { type: 'object' },
                    payment_info: {
                        type: 'object',
                        properties: {
                            method: { type: 'string' },
                            status: { type: 'string' },
                            transaction_id: { type: 'string' }
                        }
                    },
                    notes: {
                        type: 'array',
                        items: { type: 'string' }
                    },
                    created_by: { type: 'string' },
                    user_id: { type: 'string' }
                }
            }
        }
    }
};

const options = {
    swaggerDefinition,
    apis: ['./src/api.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

export default function createApiRouter(mcpAuthServer: McpAuthServer) {
    const router = express.Router();

    /**
     * @swagger
     * /menu/categories:
     *   get:
     *     summary: Get all menu categories
     *     tags: [Menu]
     *     responses:
     *       200:
     *         description: List of menu categories
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: string
     */
    router.get('/menu/categories', (req, res) => {
        const categories = [...new Set(MENU_ITEMS.map((item: MenuItem) => item.category))].sort();
        res.json(categories);
    });

    /**
     * @swagger
     * /menu/items:
     *   get:
     *     summary: Get menu items with optional filtering
     *     tags: [Menu]
     *     parameters:
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *         description: Filter by category
     *       - in: query
     *         name: dietary_preference
     *         schema:
     *           type: string
     *           enum: [vegetarian, vegan, gluten_free]
     *         description: Filter by dietary preference
     *       - in: query
     *         name: max_price
     *         schema:
     *           type: number
     *         description: Maximum price filter
     *       - in: query
     *         name: exclude_allergens
     *         schema:
     *           type: array
     *           items:
     *             type: string
     *         description: Allergens to exclude (comma-separated)
     *     responses:
     *       200:
     *         description: List of menu items
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/MenuItem'
     */
    router.get('/menu/items', (req, res) => {
        const { category, dietary_preference, max_price, exclude_allergens } = req.query;

        let filtered = [...MENU_ITEMS];

        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }

        if (dietary_preference) {
            const pref = (dietary_preference as string).toLowerCase();
            if (pref === 'vegetarian') {
                filtered = filtered.filter((i: MenuItem) => i.is_vegetarian);
            } else if (pref === 'vegan') {
                filtered = filtered.filter((i: MenuItem) => i.is_vegan);
            } else if (pref === 'gluten_free') {
                filtered = filtered.filter((i: MenuItem) => i.is_gluten_free);
            }
        }

        if (max_price) {
            filtered = filtered.filter((i: MenuItem) => i.price <= parseFloat(max_price as string));
        }

        if (exclude_allergens) {
            const allergens = (exclude_allergens as string).split(',');
            for (const allergen of allergens) {
                filtered = filtered.filter((i: MenuItem) =>
                    !i.allergens.some((a: string) => a.toLowerCase() === allergen.toLowerCase().trim())
                );
            }
        }

        res.json(filtered);
    });

    /**
     * @swagger
     * /menu/items/{id}:
     *   get:
     *     summary: Get menu item details by ID
     *     tags: [Menu]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Menu item ID
     *     responses:
     *       200:
     *         description: Menu item details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/MenuItem'
     *       404:
     *         description: Item not found
     */
    router.get('/menu/items/:id', (req: any, res: any) => {
        const { id } = req.params;
        const item = MENU_ITEMS.find((item: MenuItem) => item.id === id);
        if (!item) {
            return res.status(404).json({ error: `Item '${id}' not found` });
        }
        res.json(item);
    });

    /**
     * @swagger
     * /cart:
     *   post:
     *     summary: Create a new shopping cart
     *     tags: [Cart]
     *     responses:
     *       201:
     *         description: Cart created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 session_id:
     *                   type: string
     *                 cart:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/CartItem'
     */
    router.post('/cart', (req, res) => {
        const session_id = uuidv4();
        const now = new Date().toISOString();
        ACTIVE_SESSIONS[session_id] = {
            cart: [],
            created_at: now,
            last_active: now,
        };
        res.status(201).json({ session_id, cart: [] });
    });

    /**
     * @swagger
     * /cart/{session_id}:
     *   get:
     *     summary: Get cart contents
     *     tags: [Cart]
     *     parameters:
     *       - in: path
     *         name: session_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Cart session ID
     *     responses:
     *       200:
     *         description: Cart contents
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cart:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/CartItem'
     *                 total:
     *                   type: number
     *       404:
     *         description: Session not found
     */
    router.get('/cart/:session_id', (req: any, res: any) => {
        const { session_id } = req.params;
        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
            return res.status(404).json({ error: "Invalid session ID" });
        }
        const total = session.cart.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0);
        res.json({ cart: session.cart, total });
    });

    /**
     * @swagger
     * /cart/{session_id}/items:
     *   post:
     *     summary: Add item to cart
     *     tags: [Cart]
     *     parameters:
     *       - in: path
     *         name: session_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Cart session ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - item_id
     *             properties:
     *               item_id:
     *                 type: string
     *               quantity:
     *                 type: integer
     *                 default: 1
     *     responses:
     *       200:
     *         description: Item added to cart
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cart:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/CartItem'
     *                 total:
     *                   type: number
     *       404:
     *         description: Session or item not found
     */
    router.post('/cart/:session_id/items', (req: any, res: any) => {
        const { session_id } = req.params;
        const { item_id, quantity = 1 } = req.body;

        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
            return res.status(404).json({ error: "Invalid session ID" });
        }

        const item = MENU_ITEMS.find((i: MenuItem) => i.id === item_id);
        if (!item) {
            return res.status(404).json({ error: `Item '${item_id}' not found` });
        }

        const cart = session.cart;
        const existingItem = cart.find((cart_item: CartItem) => cart_item.item_id === item_id);

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
        const total = cart.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0);

        res.json({ cart, total });
    });

    /**
     * @swagger
     * /cart/{session_id}/items/{item_id}:
     *   delete:
     *     summary: Remove item from cart
     *     tags: [Cart]
     *     parameters:
     *       - in: path
     *         name: session_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Cart session ID
     *       - in: path
     *         name: item_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Item ID to remove
     *     responses:
     *       200:
     *         description: Item removed from cart
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 cart:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/CartItem'
     *                 total:
     *                   type: number
     *       404:
     *         description: Session not found
     */
    router.delete('/cart/:session_id/items/:item_id', (req: any, res: any) => {
        const { session_id, item_id } = req.params;

        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
            return res.status(404).json({ error: "Invalid session ID" });
        }

        session.cart = session.cart.filter((i: CartItem) => i.item_id !== item_id);
        session.last_active = new Date().toISOString();
        const total = session.cart.reduce((sum: number, i: CartItem) => sum + (i.price * i.quantity), 0);

        res.json({ cart: session.cart, total });
    });

    /**
     * @swagger
     * /orders:
     *   post:
     *     summary: Checkout and create order
     *     tags: [Orders]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - session_id
     *             properties:
     *               session_id:
     *                 type: string
     *               customer_info:
     *                 type: object
     *               payment_info:
     *                 type: object
     *     responses:
     *       201:
     *         description: Order created successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Order'
     *       400:
     *         description: Invalid request (empty cart or invalid session)
     *   get:
     *     summary: List all orders
     *     tags: [Orders]
     *     responses:
     *       200:
     *         description: List of all orders
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Order'
     */
    router.post('/orders', (req: any, res: any) => {
        // Extract user from token
        let created_by: string | undefined = undefined;
        let user_id: string | undefined = undefined;
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            try {
                const jwtProcessor = new JWTProcessor();
                const decoded = jwtProcessor.decodeToken(`Bearer ${token}`);
                const currentUserSub = jwtProcessor.extractSubFromDecoded(decoded);
                const currentUserAct = jwtProcessor.extractActFromDecoded(decoded);
                created_by = currentUserAct || currentUserSub;
                user_id = currentUserSub;
            } catch (error) {
                console.error('Failed to decode token:', error);
            }
        }

        const { session_id, customer_info, payment_info } = req.body;

        const session = ACTIVE_SESSIONS[session_id];
        if (!session) {
            return res.status(400).json({ error: "Invalid session ID" });
        }

        if (session.cart.length === 0) {
            return res.status(400).json({ error: "Cannot checkout with empty cart" });
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
            created_by,
            user_id,
        };

        ORDERS[order_id] = order;
        session.cart = [];
        session.last_active = new Date().toISOString();

        res.status(201).json(order);
    });

    router.get('/orders', (req, res) => {
        res.json(Object.values(ORDERS));
    });

    /**
     * @swagger
     * /orders/{order_id}:
     *   get:
     *     summary: Get order details
     *     tags: [Orders]
     *     parameters:
     *       - in: path
     *         name: order_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Order ID
     *     responses:
     *       200:
     *         description: Order details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Order'
     *       404:
     *         description: Order not found
     */
    router.get('/orders/:order_id', (req: any, res: any) => {
        const { order_id } = req.params;
        const order = ORDERS[order_id];
        if (!order) {
            return res.status(404).json({ error: `Order '${order_id}' not found` });
        }
        res.json({ order });
    });

    /**
     * @swagger
     * /orders/{order_id}/notes:
     *   post:
     *     summary: Add note to order
     *     tags: [Orders]
     *     parameters:
     *       - in: path
     *         name: order_id
     *         required: true
     *         schema:
     *           type: string
     *         description: Order ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - note
     *             properties:
     *               note:
     *                 type: string
     *     responses:
     *       200:
     *         description: Note added successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 notes:
     *                   type: array
     *                   items:
     *                     type: string
     *       404:
     *         description: Order not found
     */
    router.post('/orders/:order_id/notes', (req: any, res: any) => {
        const { order_id } = req.params;
        const { note } = req.body;

        const order = ORDERS[order_id];
        if (!order) {
            return res.status(404).json({ error: `Order '${order_id}' not found` });
        }

        if (!order.notes) {
            order.notes = [];
        }
        order.notes.push(note);

        res.json({ success: true, notes: order.notes });
    });

    /**
     * @swagger
     * /users/{user_id}/orders:
     *   get:
     *     summary: Get all orders for a specific user
     *     tags: [Orders]
     *     parameters:
     *       - in: path
     *         name: user_id
     *         required: true
     *         schema:
     *           type: string
     *         description: User ID (sub claim from JWT)
     *     responses:
     *       200:
     *         description: List of user's orders
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Order'
     */
    router.get('/users/:user_id/orders', (req: any, res: any) => {
        const { user_id } = req.params;
        const userOrders = Object.values(ORDERS).filter(order => order.user_id === user_id);
        res.json(userOrders);
    });

    // Swagger UI
    router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    // Serve OpenAPI JSON
    router.get('/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    // Serve OpenAPI YAML
    router.get('/docs.yaml', (req, res) => {
        res.setHeader('Content-Type', 'application/yaml');
        res.send(YAML.stringify(swaggerSpec));
    });

    return router;
}