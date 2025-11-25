import React, { memo, useState, useEffect } from 'react';
import { MenuItem, CartItem } from '../types';
import { apiService } from '../services/apiService';

interface MenuProps {
    onAddToCart: (item: MenuItem) => void;
    cartItems: CartItem[];
}

const Menu: React.FC<MenuProps> = memo(({ onAddToCart, cartItems }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMenuData = async () => {
            try {
                setIsLoading(true);
                const [categoriesResponse, itemsResponse] = await Promise.all([
                    apiService.getMenuCategories(),
                    apiService.getMenuItems()
                ]);
                
                setCategories(['all', ...categoriesResponse]);
                setMenuItems(itemsResponse);
            } catch (err) {
                console.error('Error fetching menu data:', err);
                setError('Failed to load menu. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchMenuData();
    }, []);

    const filteredItems = selectedCategory === 'all' 
        ? menuItems 
        : menuItems.filter(item => item.category === selectedCategory);

    const groupedItems = filteredItems.reduce((acc, item) => {
        const category = item.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, MenuItem[]>);
    if (isLoading) {
        return (
            <section id="menu" className="py-20" style={{ backgroundColor: '#2c2c2c' }}>
                <div className="container mx-auto px-4">
                    <div className="text-center">
                        <h2 className="text-5xl font-bold text-white mb-4">OUR MENU</h2>
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                            <span className="text-white ml-4">Loading menu...</span>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section id="menu" className="py-20" style={{ backgroundColor: '#2c2c2c' }}>
                <div className="container mx-auto px-4">
                    <div className="text-center">
                        <h2 className="text-5xl font-bold text-white mb-4">OUR MENU</h2>
                        <div className="text-center py-12">
                            <p className="text-red-400 text-lg">{error}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="mt-4 bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

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

                {/* Category Filter */}
                <div className="flex justify-center mb-8">
                    <div className="flex flex-wrap gap-2">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedCategory === category
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {category === 'all' ? 'All Categories' : category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Menu Items */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-7xl mx-auto">
                    {Object.entries(groupedItems).map(([categoryName, items]) => (
                        <div key={categoryName}>
                            <MenuSection 
                                title={categoryName} 
                                items={items as MenuItem[]} 
                            />
                        </div>
                    ))}
                </div>

                {filteredItems.length === 0 && !isLoading && (
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-lg">No items found in this category</p>
                    </div>
                )}
            </div>
        </section>
    );
});

Menu.displayName = 'Menu';

export default Menu;