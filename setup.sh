#!/bin/bash
# ============================================================
# SuperiorTests — Quick Start Script
# ============================================================
# Usage: bash setup.sh [option]
#
# Options:
#   demo      - Frontend only (localStorage, no database)
#   full      - Full stack with local PostgreSQL
#   docker    - Full stack with Docker
#   help      - Show this help message

set -e

echo "╔══════════════════════════════════════════╗"
echo "║       SuperiorTests — Setup              ║"
echo "╚══════════════════════════════════════════╝"
echo ""

show_help() {
  echo "Usage: bash setup.sh [option]"
  echo ""
  echo "Options:"
  echo "  demo      Frontend only (localStorage, no database needed)"
  echo "  full      Full stack with local PostgreSQL"
  echo "  docker    Full stack with Docker Compose"
  echo "  help      Show this help message"
  echo ""
}

setup_demo() {
  echo "→ Setting up demo mode (frontend only)..."
  echo ""

  if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
  fi

  echo "✓ Node.js $(node -v) detected"

  echo "→ Installing dependencies..."
  npm install --silent

  echo ""
  echo "✓ Setup complete!"
  echo ""
  echo "→ Starting development server..."
  echo "  Open http://localhost:5173 in your browser"
  echo ""
  echo "  Press Ctrl+C to stop the server"
  echo ""
  npm run dev
}

setup_full() {
  echo "→ Setting up full stack..."
  echo ""

  # Check prerequisites
  if ! command -v node &> /dev/null; then
    echo "✗ Node.js is not installed."
    exit 1
  fi
  echo "✓ Node.js $(node -v)"

  if ! command -v psql &> /dev/null; then
    echo "⚠ PostgreSQL client not found. Make sure PostgreSQL is installed."
    echo "  Download from: https://www.postgresql.org/download/"
  else
    echo "✓ PostgreSQL detected"
  fi

  # Install frontend
  echo "→ Installing frontend dependencies..."
  npm install --silent
  echo "✓ Frontend dependencies installed"

  # Install backend
  echo "→ Installing backend dependencies..."
  cd server
  npm install --silent
  echo "✓ Backend dependencies installed"

  # Setup environment
  if [ ! -f ../.env ]; then
    echo "→ Creating .env file..."
    cp ../.env.example ../.env
    
    # Generate JWT secret
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    
    # Update .env with generated secret (macOS/BSD sed)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" ../.env
    else
      sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" ../.env
    fi
    
    echo "✓ .env created with generated JWT_SECRET"
    echo ""
    echo "⚠ Please edit ../.env to set your DATABASE_URL and SMTP settings"
  else
    echo "✓ .env already exists"
  fi

  cd ..

  # Database setup
  echo ""
  echo "→ Database setup..."
  echo "  Make sure PostgreSQL is running and the 'superiortests' database exists."
  echo "  Create it with: createdb superiortests"
  echo ""
  read -p "  Is the database ready? (y/n) " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd server
    echo "→ Generating Prisma client..."
    npx prisma generate
    echo "→ Running migrations..."
    npx prisma migrate dev --name init
    cd ..
    echo "✓ Database initialized"
  else
    echo "⚠ Skipping database setup. Run migrations manually later."
  fi

  echo ""
  echo "✓ Setup complete!"
  echo ""
  echo "→ To start the application:"
  echo ""
  echo "  Terminal 1 (Backend):"
  echo "    cd server && npm run dev"
  echo ""
  echo "  Terminal 2 (Frontend):"
  echo "    npm run dev"
  echo ""
  echo "  Then open http://localhost:5173"
  echo ""
}

setup_docker() {
  echo "→ Setting up with Docker..."
  echo ""

  if ! command -v docker &> /dev/null; then
    echo "✗ Docker is not installed."
    echo "  Download Docker Desktop from: https://www.docker.com/products/docker-desktop/"
    exit 1
  fi
  echo "✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',') detected"

  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "✗ Docker Compose is not available."
    exit 1
  fi
  echo "✓ Docker Compose detected"

  # Setup environment
  if [ ! -f .env ]; then
    echo "→ Creating .env file..."
    cp .env.example .env
    
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo "change-me-in-production")
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    else
      sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env 2>/dev/null || true
    fi
    
    echo "✓ .env created"
  fi

  echo "→ Building and starting services..."
  docker-compose up -d --build

  echo ""
  echo "→ Waiting for services to be ready..."
  sleep 5

  echo "→ Initializing database..."
  docker-compose exec -T api npx prisma migrate deploy 2>/dev/null || echo "  (Migration will run on first start)"

  echo ""
  echo "✓ Setup complete!"
  echo ""
  echo "  Frontend: http://localhost:4173"
  echo "  API:      http://localhost:3000"
  echo ""
  echo "  Useful commands:"
  echo "    docker-compose logs -f     # View logs"
  echo "    docker-compose down        # Stop services"
  echo "    docker-compose down -v     # Stop and remove data"
  echo ""
}

# Main
case "${1:-}" in
  demo)
    setup_demo
    ;;
  full)
    setup_full
    ;;
  docker)
    setup_docker
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo "Welcome to SuperiorTests!"
    echo ""
    echo "Please choose a setup option:"
    echo ""
    echo "  1) Demo mode    — Frontend only, no database needed (recommended for testing)"
    echo "  2) Full stack   — Backend + PostgreSQL (for development)"
    echo "  3) Docker       — Full stack in containers (easiest for full setup)"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
      1) setup_demo ;;
      2) setup_full ;;
      3) setup_docker ;;
      *) echo "Invalid choice. Run 'bash setup.sh help' for options."; exit 1 ;;
    esac
    ;;
esac
