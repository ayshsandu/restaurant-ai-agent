#!/bin/bash

# Start the Restaurant AI Backend Server

echo "🚀 Starting Restaurant AI Backend..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please copy .env.example to .env and set your GOOGLE_AI_API_KEY"
    exit 1
fi

# Check if GOOGLE_AI_API_KEY is set
if ! grep -q "^GOOGLE_AI_API_KEY=" .env || grep -q "^GOOGLE_AI_API_KEY=$" .env; then
    echo "❌ GOOGLE_AI_API_KEY not set in .env file!"
    echo "Please set your Google AI API key in the .env file"
    exit 1
fi

# Build the project
echo "🔨 Building TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Start the server
echo "🌟 Starting server..."
npm run dev