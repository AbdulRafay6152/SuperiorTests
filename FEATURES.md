# GGDC Tests — Feature-to-Code Index

This document maps every feature to its implementation location in the codebase.

---

## A. Test Authoring

| Feature | Frontend | Backend |
|---------|----------|---------|
| 8 Question Types | `src/pages/TestEditor.tsx` (QuestionCard, OptionsEditor, MatchingEditor) | `prisma/schema.prisma` (Question model, type field) |
| Bulk Import (plain text parse) | `src/pages/TestEditor.tsx` (parseBulkText function) | N/A (client-side) |
| Points per question | `src/pages/TestEditor.tsx` (points input) | `prisma/schema.prisma` (Question.points) |
| Explanations per question | `src/pages/TestEditor.tsx` (explanation textarea) | `prisma/schema.prisma` (Question.dataJson → explanation) |
| Shuffle questions toggle | `src/pages/TestSettings.tsx` (Toggle) | `server/routes/tests.ts` (settingsJson) |
| Shuffle options toggle | `src/pages/TestSettings.tsx` (Toggle) | Applied in `src/pages/TestTake.tsx` (QuestionRenderer) |

---

## B. Test Settings

| Feature | Frontend | Backend |
|---------|----------|---------|
| Test name & description | `src/pages/TestSettings.tsx` (General section) | `prisma/schema.prisma` (Test.settingsJson) |
| Time limit | `src/pages/TestSettings.tsx` (Timing section) | `server/routes/attempts.ts` (timer validation) |
| Attempt limit | `src/pages/TestSettings.tsx` (Timing section) | `server/routes/attempts.ts` (POST /start — check count) |
| Passcode protection | `src/pages/TestSettings.tsx` (Access Control) | `server/routes/attempts.ts` (passcode validation) |
| Email whitelist | `src/pages/TestSettings.tsx` (Access Control) | `prisma/schema.prisma` (EmailWhitelist model) |
| Student ID whitelist | `src/pages/TestSettings.tsx` (Access Control) | `prisma/schema.prisma` (StudentIdWhitelist model) |
| Open mode | `src/pages/TestSettings.tsx` (accessMode select) | `server/routes/tests.ts` (slug route) |
| Start/end date | `src/pages/TestSettings.tsx` (datetime-local inputs) | `server/routes/tests.ts` (availability check) |
| Show results toggle | `src/pages/TestSettings.tsx` (Display section) | Used in `src/pages/TestTake.tsx` (SubmittedView) |
| Show correct answers | `src/pages/TestSettings.tsx` (Display section) | Used in `src/pages/ResultDetail.tsx` |
| Completion message | `src/pages/TestSettings.tsx` (General section) | Used in `src/pages/TestTake.tsx` (SubmittedView) |
| Negative marking | `src/pages/TestSettings.tsx` (Scoring section) | `server/routes/attempts.ts` (submit scoring logic) |
| Allow blank submissions | `src/pages/TestSettings.tsx` (Display section) | Client-side validation in TestTake |
| One-per-page pagination | `src/pages/TestSettings.tsx` (Display section) | Would affect TestTake navigation |

---

## C. Anti-Cheat

| Feature | Frontend | Backend |
|---------|----------|---------|
| Tab-switch detection | `src/pages/TestTake.tsx` (useEffect blur listener) | `server/routes/attempts.ts` (POST /anti-cheat) |
| Fullscreen enforcement | `src/pages/TestTake.tsx` (fullscreenchange listener) | `server/routes/attempts.ts` (event logging) |
| Disable copy/paste | `src/pages/TestTake.tsx` (onCopy/onPaste handlers) | `server/routes/attempts.ts` (event logging) |
| Disable right-click | `src/pages/TestTake.tsx` (onContextMenu handler) | `server/routes/attempts.ts` (event logging) |
| Disable text selection | `src/pages/TestTake.tsx` (CSS injection) | N/A (client-side) |
| Watermark overlay | `src/pages/TestTake.tsx` (watermark div) | N/A (client-side) |
| Prevent refresh | `src/pages/TestTake.tsx` (beforeunload listener) | `server/routes/attempts.ts` (event logging) |
| Resume control | `src/pages/TestTake.tsx` (pause overlay) | `server/routes/attempts.ts` (POST /resume) |
| Audit trail | `src/pages/TestTake.tsx` (antiCheatEvents state) | `prisma/schema.prisma` (AntiCheatEvent model) |

---

## D. Test Taking

| Feature | Frontend | Backend |
|---------|----------|---------|
| Guest access (no account) | `src/pages/TestTake.tsx` (gate phase) | `server/routes/attempts.ts` (POST /start) |
| Question navigator | `src/pages/TestTake.tsx` (sidebar grid) | N/A (client-side) |
| Flag for review | `src/pages/TestTake.tsx` (flagged Set) | Stored in answers JSON |
| Countdown timer | `src/pages/TestTake.tsx` (TimerDisplay) | Auto-submit via useEffect |
| Auto-submit on expiry | `src/pages/TestTake.tsx` (timeLeft === 0 effect) | `server/routes/attempts.ts` (POST /submit) |
| Progress auto-save | `src/pages/TestTake.tsx` (answers state) | `server/routes/attempts.ts` (PUT /progress) |
| LaTeX/Math rendering | `src/pages/TestTake.tsx` (renderMath + KaTeX) | N/A (client-side) |
| Passcode entry | `src/pages/TestTake.tsx` (gate phase) | `server/routes/attempts.ts` (validation) |
| Email/ID verification | `src/pages/TestTake.tsx` (gate phase) | `server/routes/attempts.ts` (whitelist check) |

---

## E. Results & Reporting

| Feature | Frontend | Backend |
|---------|----------|---------|
| Results table | `src/pages/Results.tsx` (table) | `server/routes/results.ts` (GET /:testId) |
| Search & filter | `src/pages/Results.tsx` (useMemo filtered) | N/A (client-side) |
| Sortable columns | `src/pages/Results.tsx` (toggleSort) | N/A (client-side) |
| Per-student detail | `src/pages/ResultDetail.tsx` | `server/routes/results.ts` (GET /attempts/:id) |
| Question-by-question breakdown | `src/pages/ResultDetail.tsx` (checkCorrectness) | N/A (client-side) |
| Stats (avg/high/low/pass) | `src/pages/Results.tsx` (StatCard) | `server/routes/results.ts` (stats calculation) |
| Per-question correctness | `src/pages/Results.tsx` (questionStats) | `server/routes/results.ts` (GET /question-stats) |
| PDF single-student | `src/utils/pdf.ts` (generatePDFReport) | N/A (client-side jsPDF) |
| PDF bulk report | `src/utils/pdf.ts` (generateBulkPDFReport) | N/A (client-side jsPDF) |
| CSV export | `src/utils/pdf.ts` (exportCSV) | `server/routes/results.ts` (GET /export/csv) |
| Anti-cheat flags display | `src/pages/Results.tsx` (flags column) | `prisma/schema.prisma` (AntiCheatEvent) |

---

## F. Accounts & Auth

| Feature | Frontend | Backend |
|---------|----------|---------|
| Email + password signup | `src/pages/Signup.tsx` | `server/routes/auth.ts` (POST /signup) |
| Login | `src/pages/Login.tsx` | `server/routes/auth.ts` (POST /login) |
| Password hashing | `src/store.ts` (simpleHash — demo) | `server/routes/auth.ts` (bcrypt) |
| Session management | `src/store.ts` (session state) | `server/routes/auth.ts` (JWT + refresh) |
| JWT access token | N/A (frontend stores in memory) | `server/middleware/auth.ts` |
| Refresh token | N/A | `server/routes/auth.ts` (POST /refresh) |
| Password reset email | N/A | `server/routes/auth.ts` (POST /password-reset) |
| Password reset confirm | N/A | `server/routes/auth.ts` (POST /password-reset/confirm) |
| Profile page | `src/pages/Profile.tsx` | `server/routes/auth.ts` (GET /me, PUT /profile) |
| Change password | `src/pages/Profile.tsx` | `server/routes/auth.ts` (PUT /password) |

---

## G. Backend & Data

| Feature | Location |
|---------|----------|
| PostgreSQL schema | `prisma/schema.prisma` |
| Prisma ORM | `server/**/*.ts` (all routes use PrismaClient) |
| REST API | `server/routes/*.ts` |
| Auth middleware | `server/middleware/auth.ts` |
| Rate limiting | `server/index.ts` (express-rate-limit) |
| CORS | `server/index.ts` |
| Security headers | `server/index.ts` (helmet) |
| Docker setup | `docker-compose.yml` |
| Environment config | `.env.example`, `server/config.ts` |

---

## H. Emails (Transactional)

| Email | Trigger | Location |
|-------|---------|----------|
| Welcome on signup | POST /auth/signup | `server/routes/auth.ts` |
| Password reset | POST /auth/password-reset | `server/routes/auth.ts` |
| Suspicious activity alert | Anti-cheat event + resume control | `server/routes/attempts.ts` |
| New submission notification | POST /attempts/:id/submit | `server/routes/attempts.ts` |
| Email utility | All above | `server/utils/email.ts` (Nodemailer) |

---

## I. Design System

| Element | Location |
|---------|----------|
| Color tokens (CSS variables) | `src/index.css` (:root, html.light, html.dark) |
| Primary: #284B63 | `src/index.css` (--primary) |
| Accent: #3C6E71 | `src/index.css` (--accent) |
| Font: Fira Sans | `index.html` (Google Fonts link), `src/index.css` (--font-heading, --font-body) |
| Font: JetBrains Mono | `index.html` (Google Fonts link), `src/index.css` (--font-mono) |
| Border radius: 6px | `src/index.css` (--radius) |
| Icon set: Lucide | All pages import from 'lucide-react' |
| Theme toggle | `src/store.ts` (toggleTheme), used in Layout, Landing, Login, Signup |
| Dark mode | `src/index.css` (html.dark variables) |
| Spacing (4/8px grid) | Tailwind utility classes throughout |

---

## J. PDF Report Templates

| Template | Location |
|----------|----------|
| Single-student report | `src/utils/pdf.ts` → `generatePDFReport()` |
| Bulk multi-student report | `src/utils/pdf.ts` → `generateBulkPDFReport()` |
| Branded header | `src/utils/pdf.ts` → `addHeader()` (Primary color bar + GGDC Tests wordmark) |
| Score summary box | `src/utils/pdf.ts` (rounded rect with score) |
| Question breakdown table | `src/utils/pdf.ts` (loop with ✓/✗ indicators) |
| Anti-cheat flags section | `src/utils/pdf.ts` (warning-colored events) |
| Footer with timestamp | `src/utils/pdf.ts` (page footer loop) |

---

*This index covers all features specified in the product requirements. Each feature has both a frontend implementation (for the current localStorage-backed demo) and a backend implementation (for production deployment with PostgreSQL).*
