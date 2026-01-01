#!/bin/bash

# Topic Modeling YouTube - Deployment Script

set -e

echo "====================================="
echo "Topic Modeling YouTube - Deployment"
echo "====================================="
echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists, if not copy from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing!"
    echo "   Especially change the POSTGRES_PASSWORD value."
    read -p "Press enter to continue..."
fi

# Pull latest images
echo "📥 Pulling latest base images..."
docker-compose pull postgres

# Build images
echo "🔨 Building application images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Services:"
echo "  - Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "  - Backend API: http://localhost:${BACKEND_PORT:-4242}"
echo "  - Database: localhost:${POSTGRES_PORT:-5432}"
echo ""
echo "Useful commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose stop"
echo "  - Restart services: docker-compose restart"
echo "  - Remove all: docker-compose down -v"
echo ""
