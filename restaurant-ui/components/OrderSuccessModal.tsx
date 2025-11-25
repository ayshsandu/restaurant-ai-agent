import React, { memo } from 'react';

interface OrderSuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTrackOrder?: () => void;
    orderId: string;
    estimatedTime?: number;
}

const OrderSuccessModal: React.FC<OrderSuccessModalProps> = memo(({ 
    isOpen, 
    onClose, 
    onTrackOrder,
    orderId, 
    estimatedTime = 30 
}) => {
    if (!isOpen) return null;

    const handleTrackOrder = () => {
        onClose();
        onTrackOrder?.();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
                {/* Success Icon and Header */}
                <div className="p-6 text-center">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                        <svg 
                            className="h-8 w-8 text-green-600" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M5 13l4 4L19 7" 
                            />
                        </svg>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Order Placed Successfully!
                    </h3>
                    
                    <p className="text-gray-600 mb-4">
                        Thank you for your order. We're already preparing your delicious meal.
                    </p>
                    
                    {/* Order Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Order ID:</span>
                                <span className="font-mono text-sm font-semibold text-gray-900">
                                    #{orderId.slice(-8).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Estimated Time:</span>
                                <span className="text-sm font-semibold text-green-600">
                                    {estimatedTime} minutes
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Continue Shopping
                        </button>
                        <button
                            onClick={handleTrackOrder}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                            Track Order
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});

OrderSuccessModal.displayName = 'OrderSuccessModal';

export default OrderSuccessModal;