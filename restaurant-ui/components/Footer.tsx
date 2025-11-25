import React, { memo } from 'react';

const Footer: React.FC = memo(() => {
    return (
        <footer className="bg-green-800 text-white py-6">
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center">
                    <div className="text-sm">
                        Copyright for urbanbites.com
                    </div>
                    <div className="text-sm text-gray-300">
                        form/coud/langlocd
                    </div>
                </div>
            </div>
        </footer>
    );
});

Footer.displayName = 'Footer';

export default Footer;