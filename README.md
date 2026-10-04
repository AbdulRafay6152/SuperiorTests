# SuperiorTests

**Online Testing Platform for Colleges**

A professional, production-ready online assessment platform designed for academic institutions. Create secure tests, enforce academic integrity with anti-cheat controls, and generate detailed reports.

---

## Features

### Test Authoring
- **8 Question Types**: Multiple choice (single/multi), True/False, Fill-in-blank, Short answer, Essay, Numeric (with tolerance), Matching pairs
- **Bulk Import**: Paste plain text to auto-parse questions with preview
- **Points & Explanations**: Per-question scoring and feedback
- **Shuffle**: Randomize questions and/or answer options

### Test Settings (Testmoz-level depth)
- Time limits and attempt restrictions
- Availability windows (start/end dates)
- Access control: Open, Passcode, Email whitelist, Student ID whitelist
- Result display options (immediate/delayed, with/without correct answers)
- Negative marking with configurable penalty
- One-question-per-page or all-on-one-page modes

### Anti-Cheat Controls (8 independent toggles)
- Tab-switch / window-blur detection
- Fullscreen enforcement
- Copy/paste blocking
- Right-click context menu disabled
- Text selection disabled
- Watermark overlay with taker identity
- Page refresh prevention
- Resume control (paused attempts require owner approval)
- Full audit trail with timestamped events

### Test Taking
- Clean, distraction-free interface
- Question navigator with answered/unanswered/flagged states
- Flag for review
- Countdown timer with warning states
- Auto-submit on time expiry
- Progress auto-save
- LaTeX/Math rendering (KaTeX)

### Results & Reporting
- Per-test results table with search and sort
- Per-student detail view (question-by-question breakdown)
- Statistics: average, highest, lowest, pass rate, per-question correctness
- PDF export (single student + bulk multi-student)
- CSV export
- Anti-cheat event flags per attempt

### Accounts & Auth
- Email + password signup with bcrypt hashing
- JWT authentication with refresh tokens
- Password reset via email
- Profile management (name, email, password)

---

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (design tokens)
- **React Router** (routing)
- **Lucide React** (icons)
- **KaTeX** (math rendering)
- **jsPDF** (PDF generation)
- **date-fns** (date formatting)

### Backend (Reference Implementation)
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** (PostgreSQL)
- **JWT** + **bcrypt** (authentication)
- **Nodemailer** (transactional email)
- **Docker** (containerization)

---

## Project Structure

```
superiortests/
├── src/                          # Frontend (React + Vite)
│   ├── components/               # Shared UI components
│   │   └── Layout.tsx            # Authenticated layout with header
│   ├── pages/                    # Route pages
│   │   ├── Landing.tsx           # Public landing page
│   │   ├── Login.tsx             # Login form
│   │   ├── Signup.tsx            # Signup form
│   │   ├── Dashboard.tsx         # Test list (owner)
│   │   ├── TestEditor.tsx        # Test authoring (questions)
│   │   ├── TestSettings.tsx      # Test configuration
│   │   ├── TestTake.tsx          # Test taking (guest)
│   │   ├── Results.tsx           # Results table
│   │   ├── ResultDetail.tsx      # Single attempt detail
│   │   └── Profile.tsx           # User profile
│   ├── utils/
│   │   └── pdf.ts                # PDF/CSV export utilities
│   ├── types.ts                  # TypeScript type definitions
│   ├── store.ts                  # Data layer (localStorage → API swap)
│   ├── App.tsx                   # Router setup
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Design tokens + Tailwind
├── server/                       # Backend (Express + Prisma)
│   ├── routes/
│   │   ├── auth.ts               # Signup, login, refresh, password reset
│   │   ├── tests.ts              # Test CRUD, publish/unpublish
│   │   ├── attempts.ts           # Test taking, submit, anti-cheat
│   │   └── results.ts            # Results, stats, CSV export
│   ├── middleware/
│   │   └── auth.ts               # JWT verification
│   ├── utils/
│   │   └── email.ts              # Nodemailer wrapper
│   ├── config.ts                 # Environment config
│   └── index.ts                  # Express server entry
├── prisma/
│   └── schema.prisma             # Database schema
├── docker-compose.yml            # PostgreSQL + API + Web
├── .env.example                  # Environment template
└── README.md                     # This file
```

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 16+ (or Docker)

### 1. Clone and Install

```bash
git clone <repo-url>
cd superiortests
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Database Setup

**Option A: Local PostgreSQL**
```bash
# Create database
createdb superiortests

# Run migrations
npx prisma migrate dev --name init

# (Optional) Generate Prisma client
npx prisma generate
```

**Option B: Docker**
```bash
docker-compose up -d db
# Wait for DB to be ready, then:
npx prisma migrate dev --name init
```

### 4. Run Frontend (Development)

```bash
npm run dev
# Opens at http://localhost:5173
```

### 5. Run Backend (Development)

```bash
# In a separate terminal
cd server
npm install
npm run dev
# API runs at http://localhost:3001
```

---

## Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Services:
- **Web**: http://localhost:4173 (Vite preview)
- **API**: http://localhost:3001
- **DB**: localhost:5432

### Option 2: Manual Deployment

**Frontend**
```bash
npm run build
# Serve dist/ with nginx, Vercel, Netlify, etc.
```

**Backend**
```bash
cd server
npm install
npm run build
node dist/index.js
```

**Environment Variables**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/superiortests
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-another>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
APP_URL=https://your-domain.com
```

---

## API Endpoints

### Authentication
- `POST /api/auth/signup` — Create account
- `POST /api/auth/login` — Login
- `POST /api/auth/refresh` — Refresh access token
- `POST /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user
- `PUT /api/auth/profile` — Update profile
- `PUT /api/auth/password` — Change password
- `POST /api/auth/password-reset` — Request reset email
- `POST /api/auth/password-reset/confirm` — Confirm reset

### Tests
- `GET /api/tests` — List user's tests
- `POST /api/tests` — Create test
- `GET /api/tests/:id` — Get test (owner)
- `GET /api/tests/slug/:slug` — Get test by slug (public)
- `PUT /api/tests/:id` — Update test
- `PATCH /api/tests/:id/publish` — Publish/unpublish
- `DELETE /api/tests/:id` — Delete test

### Attempts
- `POST /api/attempts/start/:slug` — Start attempt
- `PUT /api/attempts/:id/progress` — Auto-save progress
- `POST /api/attempts/:id/anti-cheat` — Log anti-cheat event
- `POST /api/attempts/:id/submit` — Submit attempt
- `POST /api/attempts/:id/resume` — Resume paused attempt

### Results
- `GET /api/results/:testId` — Get test results
- `GET /api/results/:testId/attempts/:attemptId` — Get attempt detail
- `GET /api/results/:testId/question-stats` — Per-question stats
- `GET /api/results/:testId/export/csv` — Export CSV

---

## Database Schema

See `prisma/schema.prisma` for the complete schema.

**Tables:**
- `User` — Teachers/admins
- `Session` — JWT refresh tokens
- `Test` — Test metadata + settings (JSON)
- `Question` — Questions with data (JSON)
- `Attempt` — Test attempts with answers (JSON)
- `AntiCheatEvent` — Audit trail
- `EmailWhitelist` — Per-test email whitelist
- `StudentIdWhitelist` — Per-test ID whitelist
- `PasswordResetToken` — Password reset tokens

---

## Design System

### Colors
- **Primary**: `#284B63` (Deep Blue)
- **Accent**: `#3C6E71` (Teal)
- **Light Mode**: White background, dark text
- **Dark Mode**: Deep neutral background, light text

### Typography
- **Headings**: Fira Sans (500/600/700)
- **Body**: Fira Sans (400/500)
- **Mono**: JetBrains Mono (400/500)

### Spacing
- 4px/8px grid
- 6px border radius (consistent)
- WCAG AA contrast compliance

---

## Security

- **Password Hashing**: bcrypt (12 rounds)
- **JWT**: Short-lived access tokens (15m) + refresh tokens (7d)
- **Rate Limiting**: 100 req/15min general, 10 req/15min auth
- **CORS**: Configured for frontend origin
- **Helmet**: Security headers
- **Input Validation**: Server-side validation on all endpoints
- **SQL Injection**: Prisma ORM (parameterized queries)
- **XSS**: React escapes by default, DOMPurify for rich content

---

## License

MIT

---

## Support

For issues or questions, please open a GitHub issue.

---

**Built for colleges. Designed for academic rigor.**
