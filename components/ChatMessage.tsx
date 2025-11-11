
import React, { memo } from 'react';
import { Message, MessageRole } from '../types';

interface ChatMessageProps {
    message: Message;
}

const UserIcon: React.FC = memo(() => (
    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold flex-shrink-0">
        U
    </div>
));

const BotIcon: React.FC = memo(() => (
    <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center text-white font-bold flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    </div>
));

const ToolIcon: React.FC = memo(() => (
     <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0L7.86 6.81C7.6 7.73 6.81 8.4 5.9 8.53L2.26 9.02c-1.62.22-2.26 2.23-1.04 3.33l2.84 2.6c.7.64.97 1.62.72 2.55l-.83 3.63c-.36 1.58 1.4 2.82 2.84 1.95l3.2-1.93c.82-.5 1.8-.5 2.62 0l3.2 1.93c1.44.87 3.2-0.37 2.84-1.95l-.83-3.63c-.25-.93.02-1.91.72-2.55l2.84-2.6c1.22-1.1-0.58-3.11-2.2-3.33l-3.64-.49c-.9-.13-1.7-.8-1.95-1.72L11.49 3.17z" clipRule="evenodd" />
        </svg>
    </div>
));

// Safe text formatting without dangerouslySetInnerHTML
const formatMessageText = (text: string): React.ReactNode => {
    // Split by line breaks first
    const lines = text.split(/(\r\n|\n|\r)/);

    return lines.map((line, lineIndex) => {
        if (line.match(/(\r\n|\n|\r)/)) {
            return <br key={`br-${lineIndex}`} />;
        }

        // Handle bold text and list items
        const parts = line.split(/(\*\*.*?\*\*|\* |- )/);

        return (
            <React.Fragment key={`line-${lineIndex}`}>
                {parts.map((part, partIndex) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={`part-${lineIndex}-${partIndex}`}>{part.slice(2, -2)}</strong>;
                    } else if (part === '* ' || part === '- ') {
                        return <span key={`part-${lineIndex}-${partIndex}`}>• </span>;
                    }
                    return part;
                })}
            </React.Fragment>
        );
    });
};

const ChatMessage: React.FC<ChatMessageProps> = memo(({ message }) => {
    const isUser = message.role === MessageRole.USER;
    const isModel = message.role === MessageRole.MODEL;
    const isTool = message.role === MessageRole.TOOL;

    const wrapperClasses = `flex items-start gap-3 my-4 ${isUser ? 'justify-end' : ''}`;
    const bubbleClasses = `p-3 rounded-lg max-w-lg ${
        isUser ? 'bg-blue-500 text-white rounded-br-none' :
        isModel ? 'bg-white dark:bg-gray-700 dark:text-gray-200 text-gray-800 rounded-bl-none shadow-sm' :
        'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm italic'
    }`;

    const getIcon = () => {
        switch (message.role) {
            case MessageRole.USER: return <UserIcon />;
            case MessageRole.MODEL: return <BotIcon />;
            case MessageRole.TOOL: return <ToolIcon />;
            default: return null;
        }
    };

    return (
        <div className={wrapperClasses}>
            {!isUser && getIcon()}
            <div className={bubbleClasses}>
                 <p className="text-sm">{formatMessageText(message.text)}</p>
                 {message.authorizationRequired && message.authorizationUrl && (
                     <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                         <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                             🔐 Authentication Required
                         </p>
                         <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                             Once you're authenticated, I'll be ready to assist you with reservations, orders, and menu questions!
                         </p>
                         <a
                             href={message.authorizationUrl}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors duration-200"
                         >
                             <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                             </svg>
                             Authorize Access
                         </a>
                         {message.waitingForAuth && (
                             <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                                 Waiting for authorization to complete...
                             </p>
                         )}
                     </div>
                 )}
            </div>
            {isUser && getIcon()}
        </div>
    );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
