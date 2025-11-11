import React, { memo } from 'react';

interface ChatButtonProps {
    onClick: () => void;
    hasNewMessage?: boolean;
}

const ChatButton: React.FC<ChatButtonProps> = memo(({ onClick, hasNewMessage = false }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-6 right-6 bg-green-800 hover:bg-green-900 text-white p-5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-800/50 z-40 group animate-bounce"
            aria-label="Chat with our AI restaurant assistant"
        >
            {hasNewMessage && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse border-2 border-white"></div>
            )}

            {/* AI Robot Icon */}
            <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {/* AI Brain indicator */}
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            </div>

            {/* Enhanced Tooltip */}
            <div className="absolute bottom-full right-0 mb-3 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-lg">
                <div className="font-semibold">🤖 Urban Bites AI Assistant</div>
                <div className="text-xs text-gray-300 mt-1">Ask about menu, orders & reservations</div>
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
            </div>
        </button>
    );
});

ChatButton.displayName = 'ChatButton';

export default ChatButton;