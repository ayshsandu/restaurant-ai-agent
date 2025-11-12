
import React, { useState, useEffect, useCallback, memo } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import Menu from './components/Menu';
import Cart from './components/Cart';
import CartButton from './components/CartButton';
import Checkout from './components/Checkout';
import OrderTracking from './components/OrderTracking';
import ReviewsAndLocation from './components/ReviewsAndLocation';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import ChatButton from './components/ChatButton';
import { Message, MessageRole, MenuItem, CartItem, Customer } from './types';
import { apiService } from './services/apiService';

const CONNECTION_ERROR_MESSAGE: Message = {
    id: 'connection-error',
    role: MessageRole.MODEL,
    text: "⚠️ Unable to connect to the backend server. Please make sure the server is running on port 3001."
};

const App: React.FC = memo(() => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isOrderTrackingOpen, setIsOrderTrackingOpen] = useState(false);
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartSessionId, setCartSessionId] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
    const [hasNewMessage, setHasNewMessage] = useState(false);

    useEffect(() => {
        // Check backend connection on app start
        checkBackendConnection();
    }, []);

    const checkBackendConnection = useCallback(async () => {
        try {
            await apiService.healthCheck();
            setConnectionStatus('connected');
            console.log('Backend connection established');
        } catch (error) {
            setConnectionStatus('disconnected');
            console.error('Backend connection failed:', error);
        }
    }, []);

    const handleOpenChat = useCallback(() => {
        setIsChatOpen(true);
        setHasNewMessage(false);
    }, []);

    const handleCloseChat = useCallback(() => {
        setIsChatOpen(false);
    }, []);

    // Initialize cart session
    useEffect(() => {
        const initializeCart = async () => {
            try {
                const session = await apiService.createCart();
                setCartSessionId(session.session_id);
            } catch (error) {
                console.error('Failed to initialize cart:', error);
            }
        };
        initializeCart();
    }, []);

    // Cart management functions
    const handleAddToCart = useCallback(async (item: MenuItem) => {
        if (!cartSessionId) return;
        
        try {
            const response = await apiService.addToCart(cartSessionId, item.id, 1);
            // Convert API cart items to local cart format
            const updatedItems = response.cart.map(apiItem => ({
                id: apiItem.item_id,
                name: apiItem.name,
                price: apiItem.price,
                quantity: apiItem.quantity,
                category: item.category || 'Unknown',
                description: item.description || ''
            }));
            setCartItems(updatedItems);
        } catch (error) {
            console.error('Failed to add item to cart:', error);
        }
    }, [cartSessionId]);

    const handleUpdateQuantity = useCallback(async (itemId: string, quantity: number) => {
        if (!cartSessionId) return;
        
        if (quantity <= 0) {
            handleRemoveItem(itemId);
            return;
        }
        
        try {
            // Remove existing item and add with new quantity
            await apiService.removeFromCart(cartSessionId, itemId);
            if (quantity > 0) {
                const response = await apiService.addToCart(cartSessionId, itemId, quantity);
                const updatedItems = response.cart.map(apiItem => ({
                    id: apiItem.item_id,
                    name: apiItem.name,
                    price: apiItem.price,
                    quantity: apiItem.quantity,
                    category: 'Unknown', // We'd need to fetch this from menu items
                    description: ''
                }));
                setCartItems(updatedItems);
            }
        } catch (error) {
            console.error('Failed to update item quantity:', error);
        }
    }, [cartSessionId]);

    const handleRemoveItem = useCallback(async (itemId: string) => {
        if (!cartSessionId) return;
        
        try {
            const response = await apiService.removeFromCart(cartSessionId, itemId);
            const updatedItems = response.cart.map(apiItem => ({
                id: apiItem.item_id,
                name: apiItem.name,
                price: apiItem.price,
                quantity: apiItem.quantity,
                category: 'Unknown',
                description: ''
            }));
            setCartItems(updatedItems);
        } catch (error) {
            console.error('Failed to remove item from cart:', error);
        }
    }, [cartSessionId]);

    const handleAddSpecialInstructions = useCallback((itemId: string, instructions: string) => {
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, specialInstructions: instructions } : item
            )
        );
    }, []);

    const handleOpenCart = useCallback(() => {
        setIsCartOpen(true);
    }, []);

    const handleCloseCart = useCallback(() => {
        setIsCartOpen(false);
    }, []);

    const handleCheckout = useCallback(() => {
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
    }, []);

    const handleCloseCheckout = useCallback(() => {
        setIsCheckoutOpen(false);
    }, []);

    const handleOpenOrderTracking = useCallback(() => {
        setIsOrderTrackingOpen(true);
    }, []);

    const handleCloseOrderTracking = useCallback(() => {
        setIsOrderTrackingOpen(false);
    }, []);

    const handlePlaceOrder = useCallback(async (customer: Customer, orderType: 'delivery' | 'pickup' | 'dine-in', notes?: string) => {
        if (!cartSessionId) {
            throw new Error('No cart session available');
        }
        
        try {
            const customerInfo = {
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                orderType,
                notes
            };

            const result = await apiService.createOrder(cartSessionId, customerInfo);
            
            // Clear cart after successful order
            setCartItems([]);
            setIsCheckoutOpen(false);
            
            // Create new cart session for next order
            const newSession = await apiService.createCart();
            setCartSessionId(newSession.session_id);
            
            // Show success message (you could add a toast notification here)
            alert(`Order placed successfully! Order ID: ${result.order_id}`);
            
            return {
                orderId: result.order_id,
                estimatedTime: 30, // Default since API doesn't provide this
                order: result
            };
        } catch (error) {
            console.error('Failed to place order:', error);
            throw error;
        }
    }, [cartSessionId]);

    return (
        <div className="min-h-screen bg-amber-50">
            {/* Navigation Header */}
            <Header onOpenOrderTracking={handleOpenOrderTracking} />

            {/* Restaurant Website */}
            <Hero />
            <About />
            <Menu onAddToCart={handleAddToCart} cartItems={cartItems} />
            <ReviewsAndLocation />
            <Contact onOpenChat={handleOpenChat} />
            <Footer />

            {/* Cart Button */}
            <CartButton
                items={cartItems}
                onClick={handleOpenCart}
            />

            {/* Chat Button */}
            <ChatButton
                onClick={handleOpenChat}
                hasNewMessage={hasNewMessage}
                isChatOpen={isChatOpen}
            />

            {/* Cart Modal */}
            <Cart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onAddSpecialInstructions={handleAddSpecialInstructions}
                onCheckout={handleCheckout}
                isOpen={isCartOpen}
                onClose={handleCloseCart}
            />

            {/* Checkout Modal */}
            <Checkout
                items={cartItems}
                isOpen={isCheckoutOpen}
                onClose={handleCloseCheckout}
                onPlaceOrder={handlePlaceOrder}
            />

            {/* Order Tracking Modal */}
            <OrderTracking
                isOpen={isOrderTrackingOpen}
                onClose={handleCloseOrderTracking}
            />

            {/* Chatbot Modal */}
            <Chatbot
                isOpen={isChatOpen}
                onClose={handleCloseChat}
            />

            {/* Connection Status Indicator */}
            {connectionStatus === 'disconnected' && (
                <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg shadow-md z-30">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">Backend Disconnected</span>
                    </div>
                </div>
            )}
        </div>
    );
});

App.displayName = 'App';

export default App;