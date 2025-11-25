import React, { memo } from 'react';

interface MenuItem {
    name: string;
    description: string;
    price: string;
}

const MenuPreview: React.FC = memo(() => {
    const menuCategories = [
        {
            title: "Starters",
            description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
            items: 8
        },
        {
            title: "Main Courses",
            description: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
            items: 12
        },
        {
            title: "Desserts",
            description: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
            items: 6
        },
        {
            title: "Drinks",
            description: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
            items: 15
        }
    ];

    return (
        <section id="menu" className="py-16 bg-amber-50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-serif font-bold text-gray-900 mb-4">Our Menu</h2>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {menuCategories.map((category, index) => (
                        <div key={index} className="bg-white rounded-lg p-6 text-center">
                            <h3 className="text-xl font-serif font-bold text-gray-900 mb-3">{category.title}</h3>
                            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{category.description}</p>
                            <p className="text-gray-500 text-xs mb-4">{category.items} items available</p>
                            <button className="bg-green-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-900 transition-colors">
                                Order Now
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
});

MenuPreview.displayName = 'MenuPreview';

export default MenuPreview;