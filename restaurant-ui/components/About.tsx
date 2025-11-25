import React, { memo } from 'react';

const About: React.FC = memo(() => {
    return (
        <section id="about" className="py-16 bg-amber-50">
            <div className="container mx-auto px-4">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">About Urban Bites</h2>
                    <p className="text-gray-700 leading-relaxed">
                        Welcome to Urban Bites, your go-to destination for delicious comfort food in the heart of the city.
                        We pride ourselves on serving fresh, quality dishes that bring people together. From juicy burgers
                        to authentic pasta, every meal is crafted with care using the finest ingredients.
                    </p>
                </div>
            </div>
        </section>
    );
});

About.displayName = 'About';

export default About;