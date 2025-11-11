
import React, { useState, useCallback, memo } from 'react';

interface ChatInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = memo(({ onSendMessage, isLoading, disabled = false }) => {
    const [input, setInput] = useState('');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = input.trim();
        if (trimmedInput && !isLoading && !disabled) {
            onSendMessage(trimmedInput);
            setInput('');
        }
    }, [input, isLoading, disabled, onSendMessage]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }, []);

    const isInputDisabled = isLoading || disabled;
    const canSubmit = input.trim() && !isInputDisabled;

    return (
        <div className="p-4 bg-amber-50 border-t border-gray-300">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <input
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    placeholder={disabled ? "Backend server not connected..." : "Ask about the menu or place an order..."}
                    className="flex-grow p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-800 bg-white text-gray-900 disabled:opacity-50 transition-colors"
                    disabled={isInputDisabled}
                    maxLength={1000}
                />
                <button
                    type="submit"
                    className="bg-green-800 text-white p-3 rounded-full hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-800 focus:ring-offset-2 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                    disabled={!canSubmit}
                    aria-label="Send message"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                </button>
            </form>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;
