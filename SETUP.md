# SuperiorTests — Setup Guide

Choose the setup option that fits your needs:

## Option 1: Quick Demo (Frontend Only) ⚡

**Best for:** Testing features immediately, no backend needed

**Time:** 2 minutes

### Steps:

```bash
# 1. Install dependencies (if not already done)
npm install

# 2. Start the development server
npm run dev
```

**Open:** http://localhost:5173

**What works:**
- ✅ Create account (stored in browser localStorage)
- ✅ Create tests with all 8 question types
- ✅ Take tests as guest
- ✅ View results
- ✅ Export PDF/CSV
- ✅ Dark/light mode

**Limitations:**
- Data stored in browser only (not persistent across devices)
- No real email sending
- No multi-user support

---

## Option 2: Full Stack (Local Development) 🔧

**Best for:** Development, testing with real database

**Time:** 10-15 minutes

**Prerequisites:**
- Node.js 20+ ([download](https://nodejs.org/))
- PostgreSQL 16+ ([download](https://www.postgresql.org/download/))
- Git

### Step 1: Clone and Install

```bash
# If you haven't already, navigate to the project
cd superiortests

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Step 2: Setup Database

**Option A: Using PostgreSQL directly**

```bash
# Create database (using psql or pgAdmin)
createdb superiortests

# Or connect with your credentials:
# Host: localhost
# Port: 5432
# User: your_postgres_user
# Password: your_password
# Database: superiortests
```

**Option B: Using Docker for database only**

```bash
# Start PostgreSQL in Docker
docker-compose up -d postgres

# Wait for it to be ready (check with: docker-compose ps)
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your values
```

**Required .env values:**

```env
# Database connection (adjust if using different credentials)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/superiortests

# Generate a secure JWT secret
# Run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-secure-random-string-here

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Email (optional - leave blank to disable)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Step 4: Initialize Database

```bash
cd server

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# (Optional) Seed demo data
npx prisma db seed

cd ..
```

### Step 5: Start Backend

```bash
cd server

# Start API server (runs on port 3000)
npm run dev
```

**Keep this terminal open.**

### Step 6: Start Frontend

```bash
# In a new terminal
npm run dev
```

**Open:** http://localhost:5173

### Step 7: Connect Frontend to Backend

The frontend currently uses localStorage. To use the real backend:

**Edit `src/store.ts`** and replace localStorage calls with API calls:

```typescript
// Example: Replace signup function
export async function signup(email: string, name: string, password: string) {
  const response = await fetch('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    return { success: false, error: error.error };
  }
  
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return { success: true };
}
```

**Note:** This requires refactoring the entire store. For now, the demo mode works perfectly for testing all features.

---

## Option 3: Docker (Full Stack) 🐳

**Best for:** Production-like environment, easy setup

**Time:** 5 minutes

**Prerequisites:**
- Docker Desktop ([download](https://www.docker.com/products/docker-desktop/))
- Docker Compose (included with Docker Desktop)

### Steps:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd superiortests

# 2. Create environment file
cp .env.example .env

# 3. Edit .env (at minimum, set JWT_SECRET)
# Generate secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Build and start all services
docker-compose up -d

# 5. Wait for services to be ready (check status)
docker-compose ps

# 6. Initialize database (first time only)
docker-compose exec api npx prisma migrate deploy
```

**Access:**
- Frontend: http://localhost:4173
- API: http://localhost:3000
- Database: localhost:5432

**Useful commands:**

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f postgres

# Stop all services
docker-compose down

# Stop and remove data (fresh start)
docker-compose down -v

# Rebuild after code changes
docker-compose up -d --build
```

---

## Option 4: Production Deployment 🚀

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or build and deploy manually
npm run build
# Upload dist/ folder to Vercel/Netlify/any static host
```

### Backend (Railway / Render / Fly.io)

**Railway:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Add PostgreSQL plugin
railway add

# Set environment variables
railway variables set JWT_SECRET=your-secret
railway variables set DATABASE_URL=postgresql://...

# Deploy
railway up
```

**Render:**
1. Connect GitHub repo
2. Set root directory: `server`
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npm start`
5. Add PostgreSQL service
6. Set environment variables

### Database (Managed PostgreSQL)

**Options:**
- **Supabase** (free tier): Create project, get connection string
- **Railway PostgreSQL**: Automatic with Railway deployment
- **AWS RDS**: For enterprise
- **Neon** (free tier): Serverless PostgreSQL

---

## Testing Your Setup

### 1. Create Account

1. Go to http://localhost:5173
2. Click "Create Account"
3. Fill in name, email, password
4. Click "Create Account"

### 2. Create a Test

1. Click "New Test"
2. Enter test name: "Sample Quiz"
3. Click "Add Question"
4. Select question type: "Multiple Choice (Single)"
5. Enter question: "What is 2 + 2?"
6. Add options:
   - A. 3
   - B. 4 (mark as correct)
   - C. 5
   - D. 6
7. Set points: 1
8. Click "Save"
9. Click "Publish"

### 3. Take the Test

1. Copy the test link (click the copy icon)
2. Open in incognito/private window
3. Enter your name and email
4. Answer the question
5. Click "Submit"

### 4. View Results

1. Go back to dashboard
2. Click on your test
3. Click "Results" (bar chart icon)
4. See the submission with score

---

## Troubleshooting

### "Cannot connect to database"

**Check:**
- PostgreSQL is running: `docker-compose ps` or `pg_isready`
- DATABASE_URL in .env is correct
- Database exists: `psql -l | grep superiortests`

### "Port already in use"

**Fix:**
```bash
# Find process using port
lsof -i :3000  # or :5173, :5432

# Kill it
kill -9 <PID>

# Or change port in .env
```

### "Module not found" errors

**Fix:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Same for server
cd server
rm -rf node_modules package-lock.json
npm install
```

### "Prisma client not generated"

**Fix:**
```bash
cd server
npx prisma generate
```

### CORS errors in browser console

**Fix:**
- Check FRONTEND_URL in .env matches your actual frontend URL
- Restart backend after changing .env

### Email not sending

**Check:**
- SMTP credentials are correct in .env
- For Gmail: use App Password (not account password)
- Check console logs for email errors
- Leave SMTP fields blank to disable email (logs to console instead)

---

## Development Workflow

### Frontend Development

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend Development

```bash
cd server

# Start with auto-reload
npm run dev

# Run database migrations
npx prisma migrate dev

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Database Management

```bash
# Open Prisma Studio (visual database editor)
cd server
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Create new migration after schema changes
npx prisma migrate dev --name your_migration_name
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for JWT tokens (min 32 chars) |
| `PORT` | No | API server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:5173) |
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From email address |

---

## Quick Reference Commands

```bash
# Frontend
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Backend
cd server
npm run dev              # Start API server
npx prisma studio        # Open database GUI
npx prisma migrate dev   # Run migrations
npx prisma generate      # Regenerate Prisma client

# Docker
docker-compose up -d     # Start all services
docker-compose down      # Stop all services
docker-compose logs -f   # View logs
docker-compose ps        # Check service status

# Database
createdb superiortests   # Create database (PostgreSQL)
psql superiortests       # Connect to database
```

---

## Need Help?

1. Check the main [README.md](./README.md) for feature documentation
2. Review [PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md) for architecture details
3. Check API endpoints in backend route files
4. Review database schema in `server/prisma/schema.prisma`

---

**Ready to start?** Begin with Option 1 (Quick Demo) to test all features immediately!
