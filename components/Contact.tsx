import React, { memo } from 'react';

const Contact: React.FC = memo(() => {
    return (
        <section id="contact" className="py-16 bg-amber-50">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Contact Us</h2>
                    <p className="text-gray-700 mb-8">
                        Have questions about our menu or want to place a special order?
                        Get in touch with us and we'll be happy to help!
                    </p>
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                        <p className="text-gray-600">
                            Email: info@urbanbites.com<br />
                            Phone: (555) 123-4567
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
});

Contact.displayName = 'Contact';

export default Contact;