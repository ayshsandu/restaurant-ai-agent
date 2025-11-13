import React, { memo } from 'react';

interface ChatButtonProps {
    onClick: () => void;
    hasNewMessage?: boolean;
    isChatOpen?: boolean;
}

const ChatButton: React.FC<ChatButtonProps> = memo(({ onClick, hasNewMessage = false, isChatOpen = false }) => {
    const buttonClasses = isChatOpen 
        ? "fixed bottom-6 right-6 bg-green-800 hover:bg-green-900 text-white p-6 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-800/50 z-40 group"
        : "fixed bottom-6 right-6 bg-green-800 hover:bg-green-900 text-white p-6 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-800/50 z-40 group animate-bounce";

    return (
        <button
            onClick={onClick}
            className={buttonClasses}
            aria-label="Chat with our AI restaurant assistant"
        >
            {hasNewMessage && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full animate-pulse border-2 border-white"></div>
            )}

            {/* AI Agent Icon */}
            <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
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
                {/* AI Active indicator */}
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border border-white"></div>
            </div>

            {/* Enhanced Tooltip */}
            <div className="absolute bottom-full right-0 mb-4 px-6 py-3 bg-gray-900 text-white text-base rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-lg">
                <div className="font-semibold text-lg">🤖 Urban Bites AI Assistant</div>
                <div className="text-sm text-gray-300 mt-1">Ask about menu, orders & reservations</div>
                <div className="absolute top-full right-6 w-0 h-0 border-l-5 border-r-5 border-t-5 border-transparent border-t-gray-900"></div>
            </div>
        </button>
    );
});

ChatButton.displayName = 'ChatButton';

export default ChatButton;