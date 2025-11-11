import React, { memo } from 'react';

const Hero: React.FC = memo(() => {
    return (
        <section id="hero" className="bg-amber-50 py-16">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Food photo collage */}
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop"
                            alt="Burger"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=400&fit=crop"
                            alt="Salad"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop"
                            alt="Pasta"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop"
                            alt="Fries with cheese"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=400&h=400&fit=crop"
                            alt="Soup"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop"
                            alt="Ice cream"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop"
                            alt="Drinks"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                        <img
                            src="https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=400&h=400&fit=crop"
                            alt="Dessert"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
});

Hero.displayName = 'Hero';

export default Hero;