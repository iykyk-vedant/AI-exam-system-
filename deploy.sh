#!/bin/bash
# Deployment script for SecureExam AI - Phase 2 & 6 implementation

set -e

echo "======================================"
echo "SecureExam AI - Phase 2 & 6 Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Install dependencies
echo -e "${YELLOW}[1/7] Installing backend dependencies...${NC}"
cd backend
npm install
cd ..

echo -e "${YELLOW}[2/7] Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

# Step 2: Load environment variables
echo -e "${YELLOW}[3/7] Validating environment variables...${NC}"
if [ ! -f backend/.env ]; then
    echo -e "${RED}ERROR: backend/.env not found. Please create it with:${NC}"
    echo "DATABASE_URL=..."
    echo "FIREBASE_PROJECT_ID=..."
    echo "FIREBASE_CLIENT_EMAIL=..."
    echo "FIREBASE_PRIVATE_KEY=..."
    echo "OPENAI_API_KEY=..."
    echo "QDRANT_URL=http://localhost:6333"
    echo "REDIS_URL=redis://localhost:6379"
    exit 1
fi

# Step 3: Deploy database migrations
echo -e "${YELLOW}[4/7] Deploying database migrations...${NC}"
psql $DATABASE_URL < db_migrations/001_attempt_questions_immutability.sql
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration successful${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    exit 1
fi

# Step 4: Verify database tables
echo -e "${YELLOW}[5/7] Verifying database tables...${NC}"
psql $DATABASE_URL -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" > /dev/null
echo -e "${GREEN}✓ Database verification successful${NC}"

# Step 5: Run backend tests
echo -e "${YELLOW}[6/7] Running backend tests...${NC}"
cd backend
npm test -- __tests__/services/variantService.test.js --passWithNoTests
npm test -- __tests__/services/leakDetectionService.test.js --passWithNoTests
npm test -- __tests__/controllers/examController.startExam.test.js --passWithNoTests
cd ..

# Step 6: Start services
echo -e "${YELLOW}[7/7] Starting services...${NC}"
echo "Starting Qdrant on port 6333..."
docker run -d -p 6333:6333 qdrant/qdrant:latest
echo "Starting Redis on port 6379..."
docker run -d -p 6379:6379 redis:7-alpine

# Step 7: Start backend and frontend
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "To start the application:"
echo "  Terminal 1: cd backend && npm start"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Services:"
echo "  Backend: http://localhost:5000"
echo "  Frontend: http://localhost:5173"
echo "  Qdrant: http://localhost:6333"
echo "  Redis: localhost:6379"
