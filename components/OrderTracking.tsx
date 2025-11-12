import React, { memo, useState } from 'react';
import { Order } from '../types';
import { apiService } from '../services/apiService';

interface OrderTrackingProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderTracking: React.FC<OrderTrackingProps> = memo(({ isOpen, onClose }) => {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId.trim()) {
      setError('Please enter an order ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.getOrder(orderId.trim());
      // Convert API order to local format
      const convertedOrder: Order = {
        id: response.order_id,
        customerId: 'unknown',
        items: response.items.map(item => ({
          id: item.item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          category: 'Unknown',
          description: ''
        })),
        subtotal: response.total * 0.9, // Approximate (90% of total)
        tax: response.total * 0.1, // Approximate (10% of total)
        deliveryFee: 0,
        total: response.total,
        status: response.status as Order['status'],
        orderType: 'delivery',
        estimatedTime: 30,
        createdAt: new Date(response.created_at),
        customer: {
          name: response.customer_info?.name || 'Customer',
          email: response.customer_info?.email || '',
          phone: response.customer_info?.phone || ''
        },
        notes: response.notes?.join(', ') || ''
      };
      setOrder(convertedOrder);
    } catch (err) {
      setError('Order not found. Please check your order ID and try again.');
      setOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusProgress = (status: Order['status']) => {
    const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
    const cancelledStatuses = ['cancelled'];
    
    if (cancelledStatuses.includes(status)) {
      return { progress: 0, isCancelled: true };
    }
    
    const currentIndex = statuses.indexOf(status);
    return { 
      progress: currentIndex >= 0 ? ((currentIndex + 1) / statuses.length) * 100 : 0,
      isCancelled: false
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Track Your Order</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close order tracking"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Order ID Search */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter your Order ID"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Searching...' : 'Track Order'}
              </button>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-2">{error}</p>
            )}
          </form>

          {/* Order Details */}
          {order && (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Order #{order.id.slice(-8)}
                    </h3>
                    <p className="text-gray-600">{order.customer.name}</p>
                    <p className="text-sm text-gray-500">
                      Ordered on {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="text-sm text-gray-500 capitalize">
                      {order.orderType} order
                    </div>
                  </div>
                </div>

                {/* Status Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Order Status</span>
                    <span className={`text-sm font-semibold ${
                      order.status === 'cancelled' 
                        ? 'text-red-600' 
                        : order.status === 'delivered' 
                        ? 'text-green-600' 
                        : 'text-blue-600'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>

                  {order.status !== 'cancelled' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${getStatusProgress(order.status).progress}%` }}
                      ></div>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span className={order.status === 'pending' || order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'delivered' ? 'text-amber-600 font-medium' : ''}>
                      Confirmed
                    </span>
                    <span className={order.status === 'preparing' || order.status === 'ready' || order.status === 'delivered' ? 'text-amber-600 font-medium' : ''}>
                      Preparing
                    </span>
                    <span className={order.status === 'ready' || order.status === 'delivered' ? 'text-amber-600 font-medium' : ''}>
                      Ready
                    </span>
                    <span className={order.status === 'delivered' ? 'text-green-600 font-medium' : ''}>
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Estimated Time */}
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-blue-800">
                        Estimated {order.orderType === 'delivery' ? 'delivery' : 'ready'} time: {order.estimatedTime} minutes
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Order Items</h4>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{item.name}</h5>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        {item.specialInstructions && (
                          <p className="text-xs text-gray-500 italic mt-1">
                            Special instructions: {item.specialInstructions}
                          </p>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          Quantity: {item.quantity}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="font-semibold text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(item.price)} each
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Order Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax</span>
                    <span>{formatCurrency(order.tax)}</span>
                  </div>
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Delivery Fee</span>
                      <span>{formatCurrency(order.deliveryFee)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {order.orderType === 'delivery' && order.customer.address && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Delivery Address</h4>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      {order.customer.address.street}<br />
                      {order.customer.address.city}, {order.customer.address.state} {order.customer.address.zipCode}
                    </p>
                    {order.customer.address.instructions && (
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Instructions: {order.customer.address.instructions}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Notes */}
              {order.notes && (
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Order Notes</h4>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help Text */}
          {!order && !error && (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-500">Enter your Order ID to track your order status</p>
              <p className="text-sm text-gray-400 mt-1">Your Order ID was sent to your email after placing the order</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

OrderTracking.displayName = 'OrderTracking';

export default OrderTracking;