#!/bin/bash

# Restaurant AI Assistant Backend Setup Script

echo "🚀 Setting up Restaurant AI Assistant Backend..."

# Navigate to server directory
cd server

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please update the .env file with your Google AI API key!"
    echo "   Edit server/.env and set GOOGLE_AI_API_KEY to your actual API key"
    echo ""
    echo "   You can get an API key from: https://makersuite.google.com/app/apikey"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Build the TypeScript code
echo "🔨 Building TypeScript code..."
npm run build

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update server/.env with your Google AI API key"
echo "   2. Start the backend: npm run dev (from the server directory)"
echo "   3. Start the frontend: npm run dev (from the main directory)"
echo ""