
import React, { memo } from 'react';

const Header: React.FC = memo(() => {
    return (
        <header className="bg-white dark:bg-gray-800 shadow-md p-4 flex items-center justify-center sticky top-0 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 mr-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 13c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-2.21 1.79-4 4-4s4 1.79 4 4v8zm-6 0c0 1.1.9 2 2 2s2-.9 2-2V5c0-1.1-.9-2-2-2s-2 .9-2 2v8z"/>
                <path d="M19 13v-2h-2v2c0 3.31-2.69 6-6 6s-6-2.69-6-6v-2H3v2c0 4.41 3.59 8 8 8v3h2v-3c4.41 0 8-3.59 8-8z"/>
            </svg>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Restaurant AI Assistant</h1>
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
