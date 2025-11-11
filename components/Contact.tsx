import React, { memo } from 'react';

interface ContactProps {
    onOpenChat: () => void;
}

const Contact: React.FC<ContactProps> = memo(({ onOpenChat }) => {
    return (
        <section id="contact" className="py-16 bg-amber-50">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Contact Us</h2>
                    <p className="text-gray-700 mb-8">
                        Have questions about our menu or want to place a special order?
                        Get instant help from our AI assistant or contact us directly!
                    </p>
                    
                    {/* AI Assistant Card */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                        <div className="flex items-center justify-center mb-4">
                            <div className="bg-green-800 text-white rounded-full p-2 mr-3">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">AI Restaurant Assistant</h3>
                        </div>
                        <p className="text-gray-700 mb-4">
                            Get instant answers about our menu, make reservations, and place orders with our intelligent assistant available 24/7.
                        </p>
                        <button
                            onClick={onOpenChat}
                            className="bg-green-800 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-900 transition-colors shadow-md"
                        >
                            Chat with AI Assistant
                        </button>
                    </div>

                    {/* Traditional Contact */}
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Or Contact Us Directly</h4>
                        <p className="text-gray-600">
                            Email: info@urbanbites.com<br />
                            Phone: (555) 123-4567<br />
                            <span className="text-sm text-gray-500 mt-2 block">Business Hours: Mon-Sun 11AM-10PM</span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
});

Contact.displayName = 'Contact';

export default Contact;