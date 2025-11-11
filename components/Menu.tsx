import React, { memo, useState } from 'react';

interface MenuItem {
    id: string;
    name: string;
    description: string;
    price: number;
}

interface CartItem extends MenuItem {
    quantity: number;
}

interface MenuProps {
    onAddToCart: (item: MenuItem) => void;
    cartItems: CartItem[];
}

const Menu: React.FC<MenuProps> = memo(({ onAddToCart, cartItems }) => {
    const appetizers: MenuItem[] = [
        { id: 'bruschetta', name: "Bruschetta, Tomato, Basil", description: "Grilled bread topped with fresh tomatoes, basil, and balsamic glaze", price: 12 },
        { id: 'antipasto', name: "Antipasto Platter", description: "Selection of cured meats, cheeses, and marinated vegetables", price: 18 },
        { id: 'calamari', name: "Calamari Fritti", description: "Crispy fried squid rings with marinara sauce", price: 16 }
    ];

    const mainCourses: MenuItem[] = [
        { id: 'salmon', name: "Grilled Salmon", description: "Fresh Atlantic salmon with seasonal vegetables and lemon herb sauce", price: 28 },
        { id: 'ribeye', name: "Ribeye Steak", description: "Prime ribeye with roasted potatoes and seasonal vegetables", price: 42 },
        { id: 'chicken-parm', name: "Chicken Parmesan", description: "Breaded chicken breast with marinara sauce and melted mozzarella", price: 24 }
    ];

    const desserts: MenuItem[] = [
        { id: 'tiramisu', name: "Tiramisu", description: "Classic Italian dessert with coffee-soaked ladyfingers and mascarpone", price: 10 },
        { id: 'panna-cotta', name: "Panna Cotta", description: "Silky vanilla custard with berry compote", price: 9 },
        { id: 'gelato', name: "Gelato Selection", description: "House-made gelato in seasonal flavors", price: 8 }
    ];

    const getItemQuantity = (itemId: string) => {
        const cartItem = cartItems.find(item => item.id === itemId);
        return cartItem ? cartItem.quantity : 0;
    };

    const MenuSection = ({ title, items }: { title: string; items: MenuItem[] }) => (
        <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-wider">{title}</h3>
            <div className="space-y-6">
                {items.map((item) => {
                    const quantity = getItemQuantity(item.id);
                    return (
                        <div key={item.id} className="text-white border-b border-gray-700 pb-4">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-lg text-left flex-1">{item.name}</h4>
                                <span className="font-bold text-lg ml-4">${item.price}</span>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed mb-3 text-left">{item.description}</p>
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => onAddToCart(item)}
                                    className="bg-transparent border border-white text-white px-4 py-2 text-sm uppercase tracking-wider hover:bg-white hover:text-gray-900 transition-colors"
                                >
                                    Add to Order
                                </button>
                                {quantity > 0 && (
                                    <span className="text-sm text-gray-400">
                                        {quantity} in cart
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <section id="menu" className="py-20" style={{ backgroundColor: '#2c2c2c' }}>
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-5xl font-bold text-white mb-4">OUR MENU</h2>
                    <p className="text-gray-300 text-lg">Select your favorite dishes and place your order online</p>
                </div>

                <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
                    <MenuSection title="Appetizers" items={appetizers} />
                    <MenuSection title="Main Courses" items={mainCourses} />
                    <MenuSection title="Desserts" items={desserts} />
                </div>
            </div>
        </section>
    );
});

Menu.displayName = 'Menu';

export default Menu;