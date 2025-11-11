import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { Message, MessageRole } from '../types';
import { apiService } from '../services/apiService';

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
}

const Chatbot: React.FC<ChatbotProps> = memo(({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const initialCallMadeRef = useRef(false);

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
        if (initializedRef.current || !isOpen) return;
        initializedRef.current = true;

        // Load or generate session ID
        const storedSessionId = localStorage.getItem('chatSessionId');
        if (storedSessionId) {
            setSessionId(storedSessionId);
        }
    }, [isOpen]);

    const createErrorMessage = useCallback((text: string): Message => ({
        id: generateMessageId('error-'),
        role: MessageRole.MODEL,
        text
    }), [generateMessageId]);

    // Make initial backend call when chat opens
    useEffect(() => {
        if (!isOpen || initialCallMadeRef.current || messages.length > 0) return;

        const makeInitialCall = async () => {
            setIsLoading(true);
            try {
                console.log("Making initial backend call for chat session");
                const result = await apiService.sendChatMessage("Hello", sessionId || undefined);

                // Update session ID if it was newly generated
                if (result.sessionId && result.sessionId !== sessionId) {
                    setSessionId(result.sessionId);
                    localStorage.setItem('chatSessionId', result.sessionId);
                }

                // Handle authorization requirement
                if (result.authorizationRequired && result.authorizationUrl) {
                    const authMessage: Message = {
                        id: generateMessageId('auth-'),
                        role: MessageRole.MODEL,
                        text: result.response,
                        authorizationRequired: true,
                        authorizationUrl: result.authorizationUrl,
                        waitingForAuth: (result as any).waitingForAuth || false
                    };
                    setMessages([authMessage]);
                    return;
                }

                const welcomeMessage: Message = {
                    id: generateMessageId('welcome-'),
                    role: MessageRole.MODEL,
                    text: result.response
                };
                setMessages([welcomeMessage]);
                initialCallMadeRef.current = true;

            } catch (error) {
                console.error("Failed to get initial response from backend:", error);
                let errorText = "Sorry, I'm having trouble connecting. Please try again later.";
                if (error instanceof Error) {
                    if (error.message.includes('connect to the server')) {
                        errorText = "Unable to connect to the server. Please make sure the backend is running.";
                    }
                }

                const errorMessage = createErrorMessage(errorText);
                setMessages([errorMessage]);
            } finally {
                setIsLoading(false);
            }
        };

        makeInitialCall();
    }, [isOpen, sessionId, messages.length, generateMessageId, createErrorMessage]);

    const handleSendMessage = useCallback(async (userMessage: string) => {
        setIsLoading(true);
        const newUserMessage: Message = {
            id: generateMessageId('user-'),
            role: MessageRole.USER,
            text: userMessage
        };

        setMessages(prev => [...prev, newUserMessage]);

        try {
            console.log("Sending user message:", userMessage, "with session ID:", sessionId);
            const result = await apiService.sendChatMessage(userMessage, sessionId || undefined);

            // Update session ID if it was newly generated
            if (result.sessionId && result.sessionId !== sessionId) {
                setSessionId(result.sessionId);
                localStorage.setItem('chatSessionId', result.sessionId);
            }

            // Handle authorization requirement
            if (result.authorizationRequired && result.authorizationUrl) {
                const authMessage: Message = {
                    id: generateMessageId('auth-'),
                    role: MessageRole.MODEL,
                    text: result.response,
                    authorizationRequired: true,
                    authorizationUrl: result.authorizationUrl,
                    waitingForAuth: (result as any).waitingForAuth || false
                };
                setMessages(prev => [...prev, authMessage]);
                return;
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
                } else if (error.message.includes('too long')) {
                    errorText = "Your message is too long. Please keep it under 1000 characters.";
                }
            }

            const errorMessage = createErrorMessage(errorText);
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, createErrorMessage]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-amber-50 rounded-lg shadow-2xl w-full max-w-2xl h-[600px] flex flex-col border border-gray-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-white rounded-t-lg">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-800 flex items-center justify-center text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                {/* Robot Head */}
                                <rect x="6" y="4" width="12" height="10" rx="2" ry="2" fill="currentColor" />
                                
                                {/* Antenna */}
                                <circle cx="9" cy="2" r="1" fill="currentColor" />
                                <circle cx="15" cy="2" r="1" fill="currentColor" />
                                <line x1="9" y1="3" x2="9" y2="4" stroke="currentColor" strokeWidth="1" />
                                <line x1="15" y1="3" x2="15" y2="4" stroke="currentColor" strokeWidth="1" />
                                
                                {/* Eyes */}
                                <circle cx="9" cy="8" r="1.5" fill="white" />
                                <circle cx="15" cy="8" r="1.5" fill="white" />
                                <circle cx="9" cy="8" r="0.8" fill="#10b981" />
                                <circle cx="15" cy="8" r="0.8" fill="#10b981" />
                                
                                {/* Mouth/Speaker */}
                                <rect x="10" y="11" width="4" height="1.5" rx="0.75" fill="white" />
                                
                                {/* Body */}
                                <rect x="7" y="14" width="10" height="6" rx="1" ry="1" fill="currentColor" />
                                
                                {/* Arms */}
                                <rect x="4" y="15" width="3" height="1.5" rx="0.75" fill="currentColor" />
                                <rect x="17" y="15" width="3" height="1.5" rx="0.75" fill="currentColor" />
                                
                                {/* Control Panel */}
                                <circle cx="10" cy="17" r="0.8" fill="white" />
                                <circle cx="14" cy="17" r="0.8" fill="white" />
                                <rect x="11" y="18.5" width="2" height="0.8" rx="0.4" fill="white" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-serif font-bold text-gray-900">Urban Bites AI Assistant</h3>
                            <p className="text-sm text-gray-600">Your Restaurant AI Helper</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Messages */}
                <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4">
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} />
                        ))}
                        {isLoading && (
                            <div className="flex items-start gap-3">
                               <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center text-white font-bold flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="p-3 rounded-lg bg-white shadow-sm rounded-bl-none border border-gray-200">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse delay-75"></div>
                                        <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse delay-150"></div>
                                        <div className="w-2 h-2 bg-green-800 rounded-full animate-pulse delay-300"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input */}
                <ChatInput
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                    disabled={false}
                />
            </div>
        </div>
    );
});

Chatbot.displayName = 'Chatbot';

export default Chatbot;