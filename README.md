# SuperiorTests

Professional online testing platform for colleges. Create secure assessments, enforce academic integrity, and generate detailed reports.

## Features

- **8 Question Types**: Multiple choice (single/multi), true/false, fill-blank, short answer, essay, numeric with tolerance, matching pairs
- **Anti-Cheat Controls**: Tab-switch detection, fullscreen enforcement, copy/paste blocking, watermarking, audit trails
- **Access Control**: Open access, passcode protection, email whitelisting, student ID verification
- **Detailed Reports**: Per-student breakdowns, question-level analytics, pass rates, PDF/CSV export
- **Bulk Import**: Paste plain text to auto-parse questions with preview
- **Math Support**: KaTeX rendering for LaTeX in questions and answers
- **Dark/Light Mode**: Seamless theme toggle with WCAG-compliant contrast

## Tech Stack

**Frontend:**
- React 18 + TypeScript + Vite
- Tailwind CSS v4 (design tokens)
- React Router v6
- Lucide React (icons)
- KaTeX (math rendering)
- jsPDF (PDF generation)

**Backend (Reference Implementation):**
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- Nodemailer (transactional emails)

## Project Structure

```
superiortests/
├── src/                    # Frontend (React + Vite)
│   ├── components/         # Reusable UI components
│   ├── pages/              # Page components
│   ├── utils/              # Utilities (PDF export)
│   ├── store.ts            # Data layer (localStorage for demo)
│   ├── types.ts            # TypeScript types
│   ├── App.tsx             # Main app with routing
│   └── index.css           # Design tokens + Tailwind
├── server/                 # Backend (Express + Prisma)
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth, error handling
│   │   ├── utils/          # Email utility
│   │   └── index.ts        # Server entry
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml      # Docker setup
├── .env.example            # Environment template
└── README.md
```

## Quick Start (Frontend Only — Demo Mode)

The frontend works standalone with localStorage for immediate testing:

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 to use the app. Data persists in localStorage.

## Full Stack Setup (Production)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or Docker)
- SMTP server (optional, for emails)

### 1. Database Setup

**Option A: Docker (Recommended)**

```bash
docker-compose up -d postgres
```

**Option B: Local PostgreSQL**

```bash
createdb superiortests
# Or use pgAdmin / your preferred tool
```

### 2. Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random string for JWT signing
- `SMTP_*` — Email configuration (optional)

### 3. Backend Setup

```bash
cd server

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Start dev server
npm run dev
```

API runs on http://localhost:3000

### 4. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

Frontend runs on http://localhost:5173

### 5. Docker (Full Stack)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Services:
- Frontend: http://localhost:4173
- API: http://localhost:3000
- PostgreSQL: localhost:5432

## API Endpoints

### Authentication

```
POST   /api/auth/signup          # Create account
POST   /api/auth/login           # Login
GET    /api/auth/me              # Get current user
PUT    /api/auth/profile         # Update profile
PUT    /api/auth/password        # Change password
POST   /api/auth/reset-request   # Request password reset
POST   /api/auth/reset-confirm   # Confirm password reset
```

### Tests

```
GET    /api/tests                # List user's tests
POST   /api/tests                # Create test
GET    /api/tests/:id            # Get test (owner)
GET    /api/tests/slug/:slug     # Get test by slug (public)
PUT    /api/tests/:id            # Update test
PATCH  /api/tests/:id/publish    # Publish test
PATCH  /api/tests/:id/unpublish  # Unpublish test
DELETE /api/tests/:id            # Delete test
GET    /api/tests/:id/results    # Get test results
```

### Attempts

```
POST   /api/attempts/start       # Start attempt (guest)
POST   /api/attempts/progress    # Save progress
POST   /api/attempts/anti-cheat  # Log anti-cheat event
POST   /api/attempts/submit      # Submit attempt
PATCH  /api/attempts/:id/resume  # Resume paused attempt
```

## Database Schema

See `server/prisma/schema.prisma` for the complete schema.

**Key tables:**
- `users` — Test owners (instructors)
- `sessions` — JWT sessions
- `tests` — Test definitions with settings (JSON)
- `questions` — Questions with content (JSON)
- `attempts` — Test attempts with answers (JSON)
- `answers` — Individual question responses
- `anti_cheat_events` — Audit trail

## Design System

**Colors:**
- Primary: `#284B63` (Deep Blue)
- Accent: `#3C6E71` (Teal)
- Light mode: White background, dark text
- Dark mode: Deep neutral background, light text

**Typography:**
- Headings: Fira Sans (Medium, Semibold, Bold)
- Body: Fira Sans (Regular, Medium)
- Mono: JetBrains Mono (IDs, codes)

**Spacing:** 4px/8px grid
**Border Radius:** 6px (consistent)
**Icons:** Lucide React (stroke style)

## Feature-to-Code Index

| Feature | Location |
|---------|----------|
| Landing page | `src/pages/Landing.tsx` |
| Signup / Login | `src/pages/Signup.tsx`, `src/pages/Login.tsx` |
| Dashboard | `src/pages/Dashboard.tsx` |
| Test editor | `src/pages/TestEditor.tsx` |
| Test settings | `src/pages/TestSettings.tsx` |
| Test taking | `src/pages/TestTake.tsx` |
| Results table | `src/pages/Results.tsx` |
| Result detail | `src/pages/ResultDetail.tsx` |
| Profile | `src/pages/Profile.tsx` |
| Data layer | `src/store.ts` |
| Types | `src/types.ts` |
| PDF export | `src/utils/pdf.ts` |
| Design tokens | `src/index.css` |
| Backend server | `server/src/index.ts` |
| Auth routes | `server/src/routes/auth.ts` |
| Test routes | `server/src/routes/tests.ts` |
| Attempt routes | `server/src/routes/attempts.ts` |
| Email utility | `server/src/utils/email.ts` |
| Database schema | `server/prisma/schema.prisma` |
| Docker setup | `docker-compose.yml` |

## Anti-Cheat Implementation

**Tab-switch detection:**
```typescript
// src/pages/TestTake.tsx
window.addEventListener('blur', () => {
  logEvent('tab-switch', 'Window lost focus');
  setPaused(true);
});
```

**Fullscreen enforcement:**
```typescript
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    logEvent('fullscreen-exit', 'Exited fullscreen');
    setPaused(true);
  }
});
document.documentElement.requestFullscreen();
```

**Copy/paste blocking:**
```tsx
<div onCopy={e => { e.preventDefault(); logEvent('copy-attempt'); }}>
```

**Watermark:**
```tsx
{settings.watermark && (
  <div className="fixed inset-0 pointer-events-none opacity-[0.04]">
    {takerName} — {takerStudentId}
  </div>
)}
```

**Prevent refresh:**
```typescript
window.addEventListener('beforeunload', e => {
  e.preventDefault();
  e.returnValue = '';
});
```

## PDF Reports

**Single student report:**
```typescript
// src/utils/pdf.ts
generatePDFReport(test, attempt);
```

**Bulk report:**
```typescript
generateBulkPDFReport(test, attempts);
```

**CSV export:**
```typescript
exportCSV(test, attempts);
```

## Deployment

### Vercel (Frontend)

```bash
npm run build
# Deploy dist/ folder
```

### Railway / Render (Backend)

```bash
cd server
# Set environment variables in dashboard
# Deploy from server/ directory
```

### Docker (Full Stack)

```bash
docker-compose up -d
```

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 7 days
- CORS configured for frontend origin
- Input validation with Zod
- SQL injection protection via Prisma
- XSS protection via React's default escaping

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

**Built for colleges that need reliability, not gimmicks.**
