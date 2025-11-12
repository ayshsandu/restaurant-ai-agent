import React, { memo, useState } from 'react';
import { CartItem, Customer, DeliveryAddress } from '../types';

interface CheckoutProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onPlaceOrder: (customer: Customer, orderType: 'delivery' | 'pickup' | 'dine-in', notes?: string) => void;
}

const Checkout: React.FC<CheckoutProps> = memo(({ items, isOpen, onClose, onPlaceOrder }) => {
  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'dine-in'>('delivery');
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      instructions: ''
    }
  });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subtotal = items.reduce((total, item) => total + (item.price * item.quantity), 0);
  const tax = subtotal * 0.08875;
  const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
  const total = subtotal + tax + deliveryFee;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customer.name.trim()) newErrors.name = 'Name is required';
    if (!customer.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(customer.email)) newErrors.email = 'Email is invalid';
    if (!customer.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\+?[\d\s\-\(\)]+$/.test(customer.phone)) newErrors.phone = 'Phone number is invalid';

    if (orderType === 'delivery' && customer.address) {
      if (!customer.address.street.trim()) newErrors.street = 'Street address is required';
      if (!customer.address.city.trim()) newErrors.city = 'City is required';
      if (!customer.address.state.trim()) newErrors.state = 'State is required';
      if (!customer.address.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
      else if (!/^\d{5}(-\d{4})?$/.test(customer.address.zipCode)) newErrors.zipCode = 'ZIP code is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onPlaceOrder(customer, orderType, notes);
      // Reset form after successful order
      setCustomer({
        name: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          instructions: ''
        }
      });
      setNotes('');
      onClose();
    } catch (error) {
      console.error('Failed to place order:', error);
      // Handle error - could show a toast or error message
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomerChange = (field: keyof Customer, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: keyof DeliveryAddress, value: string) => {
    setCustomer(prev => ({
      ...prev,
      address: {
        ...prev.address!,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-70 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close checkout"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Order Type Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Order Type</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'delivery', label: 'Delivery', icon: '🚚' },
                { value: 'pickup', label: 'Pickup', icon: '🏪' },
                { value: 'dine-in', label: 'Dine In', icon: '🍽️' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setOrderType(type.value as any)}
                  className={`p-4 border rounded-lg text-center transition-colors ${
                    orderType === type.value
                      ? 'border-amber-500 bg-amber-50 text-amber-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => handleCustomerChange('name', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full name"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => handleCustomerChange('phone', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="(555) 123-4567"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => handleCustomerChange('email', e.target.value)}
                  className={`w-full p-3 border rounded-lg ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your@email.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          {orderType === 'delivery' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Delivery Address</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={customer.address?.street || ''}
                    onChange={(e) => handleAddressChange('street', e.target.value)}
                    className={`w-full p-3 border rounded-lg ${
                      errors.street ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="123 Main Street"
                  />
                  {errors.street && <p className="text-red-500 text-sm mt-1">{errors.street}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={customer.address?.city || ''}
                      onChange={(e) => handleAddressChange('city', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="New York"
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      value={customer.address?.state || ''}
                      onChange={(e) => handleAddressChange('state', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="NY"
                    />
                    {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={customer.address?.zipCode || ''}
                      onChange={(e) => handleAddressChange('zipCode', e.target.value)}
                      className={`w-full p-3 border rounded-lg ${
                        errors.zipCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="10001"
                    />
                    {errors.zipCode && <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Instructions (optional)
                  </label>
                  <textarea
                    value={customer.address?.instructions || ''}
                    onChange={(e) => handleAddressChange('instructions', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="e.g., Ring doorbell, leave at door..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Order Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Any special requests or notes for your order..."
            />
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
              isSubmitting || items.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-amber-600 hover:bg-amber-700 text-white'
            }`}
          >
            {isSubmitting ? 'Placing Order...' : `Place Order • $${total.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
});

Checkout.displayName = 'Checkout';

export default Checkout;
