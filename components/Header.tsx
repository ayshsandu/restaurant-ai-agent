
import React, { memo, useState } from 'react';

const Header: React.FC = memo(() => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
        setIsMenuOpen(false);
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-100">
            <nav className="container mx-auto px-4 py-6">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center">
                        <h1 className="text-2xl font-serif font-bold text-gray-900">Urban Bites</h1>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        <button
                            onClick={() => scrollToSection('hero')}
                            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
                        >
                            Home
                        </button>
                        <button
                            onClick={() => scrollToSection('menu')}
                            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
                        >
                            Menu
                        </button>
                        <button
                            onClick={() => scrollToSection('about')}
                            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
                        >
                            About
                        </button>
                        <button
                            onClick={() => scrollToSection('contact')}
                            className="text-gray-700 hover:text-gray-900 transition-colors font-medium"
                        >
                            Contact
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden text-gray-700 hover:text-gray-900 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {isMenuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile Navigation */}
                {isMenuOpen && (
                    <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
                        <div className="flex flex-col space-y-4 pt-4">
                            <button
                                onClick={() => scrollToSection('hero')}
                                className="text-left text-gray-700 hover:text-gray-900 transition-colors font-medium"
                            >
                                Home
                            </button>
                            <button
                                onClick={() => scrollToSection('menu')}
                                className="text-left text-gray-700 hover:text-gray-900 transition-colors font-medium"
                            >
                                Menu
                            </button>
                            <button
                                onClick={() => scrollToSection('about')}
                                className="text-left text-gray-700 hover:text-gray-900 transition-colors font-medium"
                            >
                                About
                            </button>
                            <button
                                onClick={() => scrollToSection('contact')}
                                className="text-left text-gray-700 hover:text-gray-900 transition-colors font-medium"
                            >
                                Contact
                            </button>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
});

Header.displayName = 'Header';

export default Header;
