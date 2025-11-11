import React, { memo } from 'react';

const ReviewsAndLocation: React.FC = memo(() => {
    return (
        <section className="py-16 bg-amber-50">
            <div className="container mx-auto px-4">
                <div className="grid md:grid-cols-2 gap-12">
                    {/* Customer Reviews */}
                    <div className="text-center">
                        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6">Customer Reviews</h2>
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <div className="flex justify-center mb-4">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <blockquote className="text-gray-700 italic mb-4">
                                "Amazing food and great service! The burgers are juicy and the pasta is authentic. Highly recommend this place for a casual dining experience."
                            </blockquote>
                            <cite className="text-gray-600 text-sm">- Sarah Johnson</cite>
                        </div>
                    </div>

                    {/* Location & Hours */}
                    <div>
                        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-6 text-center md:text-left">Location & Hours</h2>
                        <div className="bg-white rounded-lg p-6 shadow-sm">
                            <div className="mb-6">
                                <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                                <p className="text-gray-600 text-sm">
                                    Artsi 19-CM, Dut. 19:00<br />
                                    Ustarnetex May 7 100
                                </p>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-2">Operating Hours</h3>
                                <div className="text-gray-600 text-sm space-y-1">
                                    <p>Operation: 1:18 PM</p>
                                    <p>Peronerjor: Muly 5-7:00</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
});

ReviewsAndLocation.displayName = 'ReviewsAndLocation';

export default ReviewsAndLocation;