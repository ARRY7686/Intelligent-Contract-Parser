#!/bin/bash

# Contract Intelligence Parser Setup Script
# This script helps set up the development environment

set -e

echo "🚀 Setting up Contract Intelligence Parser..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/uploads
mkdir -p logs

# Set proper permissions
echo "🔐 Setting proper permissions..."
chmod +x backend/tests/run_tests.py

# Build and start the application
echo "🏗️  Building and starting the application..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service status..."
if docker-compose ps | grep -q "Up"; then
    echo "✅ All services are running!"
    echo ""
    echo "🎉 Setup complete! Your application is ready."
    echo ""
    echo "📱 Access your application at:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend API: http://localhost:8000"
    echo "   API Documentation: http://localhost:8000/docs"
    echo ""
    echo "📋 Available commands:"
    echo "   docker-compose up -d          # Start services"
    echo "   docker-compose down           # Stop services"
    echo "   docker-compose logs -f        # View logs"
    echo "   docker-compose restart        # Restart services"
    echo ""
    echo "🧪 To run tests:"
    echo "   docker-compose exec backend python tests/run_tests.py"
    echo ""
    echo "📖 For more information, see the README.md file"
else
    echo "❌ Some services failed to start. Check logs with: docker-compose logs"
    exit 1
fi
