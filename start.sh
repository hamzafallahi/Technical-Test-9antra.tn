#!/bin/bash

# Start all services
echo "Starting 9antra platform..."
docker-compose up -d

echo "Services started!"
echo "Backend API: http://localhost:3000"
echo "pgAdmin: http://localhost:8080 (admin@9antra.tn / admin123)"
echo "PostgreSQL: localhost:5432"

# Show logs
echo "Showing logs..."
docker-compose logs -f
