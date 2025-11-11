
import React, { useState, useEffect, useCallback, memo } from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import About from './components/About';
import MenuPreview from './components/MenuPreview';
import ReviewsAndLocation from './components/ReviewsAndLocation';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import ChatButton from './components/ChatButton';
import { Message, MessageRole } from './types';
import { apiService } from './services/agentService';

const CONNECTION_ERROR_MESSAGE: Message = {
    id: 'connection-error',
    role: MessageRole.MODEL,
    text: "⚠️ Unable to connect to the backend server. Please make sure the server is running on port 3001."
};

const App: React.FC = memo(() => {
    const [isChatOpen, setIsChatOpen] = useState(false);
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

    return (
        <div className="min-h-screen bg-amber-50">
            {/* Navigation Header */}
            <Header />

            {/* Restaurant Website */}
            <Hero />
            <About />
            <MenuPreview />
            <ReviewsAndLocation />
            <Contact onOpenChat={handleOpenChat} />
            <Footer />

            {/* Chat Button */}
            <ChatButton
                onClick={handleOpenChat}
                hasNewMessage={hasNewMessage}
                isChatOpen={isChatOpen}
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