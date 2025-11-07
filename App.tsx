
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import { Message, MessageRole } from './types';
import { apiService } from './services/apiService';

const INITIAL_MESSAGE: Message = {
    id: 'initial',
    role: MessageRole.MODEL,
    text: "Welcome to our restaurant! How can I help you today? You can ask me to see the menu or place an order."
};

const CONNECTION_ERROR_MESSAGE: Message = {
    id: 'connection-error',
    role: MessageRole.MODEL,
    text: "⚠️ Unable to connect to the backend server. Please make sure the server is running on port 3001."
};

const App: React.FC = memo(() => {
    const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
    const [isLoading, setIsLoading] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Generate consistent message IDs
    const generateMessageId = useCallback((prefix: string = '') => {
        return `${prefix}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }, []);

    // Scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        // Check backend connection on app start
        checkBackendConnection();

        // Load or generate session ID
        const storedSessionId = localStorage.getItem('chatSessionId');
        if (storedSessionId) {
            setSessionId(storedSessionId);
        }
    }, []);

    const checkBackendConnection = useCallback(async () => {
        try {
            await apiService.healthCheck();
            setConnectionStatus('connected');
            console.log('Backend connection established');
        } catch (error) {
            setConnectionStatus('disconnected');
            console.error('Backend connection failed:', error);

            // Add a system message about connection issues
            setMessages(prev => [prev[0], CONNECTION_ERROR_MESSAGE]);
        }
    }, []);

    const createErrorMessage = useCallback((text: string): Message => ({
        id: generateMessageId('error-'),
        role: MessageRole.MODEL,
        text
    }), [generateMessageId]);

    const handleSendMessage = useCallback(async (userMessage: string) => {
        if (connectionStatus !== 'connected') {
            const errorMessage = createErrorMessage(
                "Sorry, I can't process your request right now. The backend server is not available."
            );
            setMessages(prev => [...prev, errorMessage]);
            return;
        }

        setIsLoading(true);
        const newUserMessage: Message = {
            id: generateMessageId('user-'),
            role: MessageRole.USER,
            text: userMessage
        };

        setMessages(prev => [...prev, newUserMessage]);

        try {
            const result = await apiService.sendChatMessage(userMessage, sessionId || undefined);

            // Update session ID if it was newly generated
            if (result.sessionId && result.sessionId !== sessionId) {
                setSessionId(result.sessionId);
                localStorage.setItem('chatSessionId', result.sessionId);
            }

            const newBotMessage: Message = {
                id: generateMessageId('bot-'),
                role: MessageRole.MODEL,
                text: result.response
            };
            setMessages(prev => [...prev, newBotMessage]);

        } catch (error) {
            console.error("Failed to get response from backend:", error);

            let errorText = "Sorry, I'm having trouble processing your request. Please try again later.";
            if (error instanceof Error) {
                if (error.message.includes('connect to the server')) {
                    errorText = "Unable to connect to the server. Please make sure the backend is running.";
                    setConnectionStatus('disconnected');
                } else if (error.message.includes('too long')) {
                    errorText = "Your message is too long. Please keep it under 1000 characters.";
                }
            }

            const errorMessage = createErrorMessage(errorText);
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [connectionStatus, sessionId, createErrorMessage]);

    return (
        <div className="flex flex-col h-screen font-sans bg-gray-100 dark:bg-gray-900">
            <Header />
            {connectionStatus === 'disconnected' && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 mx-4 rounded-lg">
                    <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Backend Disconnected</span>
                    </div>
                    <p className="text-sm mt-1">Please start the backend server and refresh the page.</p>
                </div>
            )}
            <main ref={chatContainerRef} className="flex-grow overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto">
                    {messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3 my-4">
                           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="p-3 rounded-lg bg-white dark:bg-gray-700 shadow-sm rounded-bl-none">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-75"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-150"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse delay-300"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>
            <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                disabled={connectionStatus !== 'connected'}
            />
        </div>
    );
});

App.displayName = 'App';

export default App;