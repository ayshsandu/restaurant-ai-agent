import React, { memo } from 'react';
import { CartItem } from '../types';

interface CartButtonProps {
  items: CartItem[];
  onClick: () => void;
}

const CartButton: React.FC<CartButtonProps> = memo(({ items, onClick }) => {
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);

  if (totalItems === 0) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-amber-600 hover:bg-amber-700 text-white rounded-full shadow-lg transition-all duration-200 hover:scale-105 z-40"
      aria-label={`Open cart with ${totalItems} items`}
    >
      <div className="flex items-center space-x-3 px-4 py-3 min-w-[120px]">
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v5a2 2 0 01-2 2H9a2 2 0 01-2-2v-5m6-5V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2" />
          </svg>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </div>
        <div className="text-left">
          <div className="text-sm font-semibold">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </div>
          <div className="text-xs opacity-90">
            ${totalPrice.toFixed(2)}
          </div>
        </div>
      </div>
    </button>
  );
});

CartButton.displayName = 'CartButton';

export default CartButton;
