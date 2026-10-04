# PostgreSQL Setup Guide for Windows

Complete step-by-step guide to set up SuperiorTests with PostgreSQL on Windows.

---

## Part 1: Install PostgreSQL

### Step 1: Download PostgreSQL

1. Go to: https://www.postgresql.org/download/windows/
2. Click "Download the installer"
3. You'll be redirected to EnterpriseDB (EDB)
4. Download the latest version (PostgreSQL 16 or 17)
5. Save the `.exe` file (e.g., `postgresql-16.x-windows-x64.exe`)

### Step 2: Run the Installer

1. Double-click the downloaded `.exe` file
2. If prompted by User Account Control, click "Yes"

### Step 3: Installation Wizard

Follow these steps in the installer:

**Welcome Screen**
- Click "Next"

**Installation Directory**
- Keep default: `C:\Program Files\PostgreSQL\16`
- Click "Next"

**Select Components**
- Keep all checked:
  - PostgreSQL Server
  - pgAdmin 4 (GUI tool)
  - Stack Builder (optional, can uncheck)
  - Command Line Tools
- Click "Next"

**Data Directory**
- Keep default: `C:\Program Files\PostgreSQL\16\data`
- Click "Next"

**Password** ⚠️ IMPORTANT
- Enter a password for the `postgres` superuser
- **Remember this password!** You'll need it later
- Example: `MySecurePassword123`
- Click "Next"

**Port**
- Keep default: `5432`
- Click "Next"

**Locale**
- Keep default: `[Default locale]`
- Click "Next"

**Pre Installation Summary**
- Review settings
- Click "Next"

**Installation**
- Wait for installation to complete (2-5 minutes)
- Click "Finish" when done

### Step 4: Verify Installation

Open Command Prompt and test:

```cmd
# Add PostgreSQL to PATH (temporary, for this session)
set PATH=%PATH%;C:\Program Files\PostgreSQL\16\bin

# Test connection
psql -U postgres

# Enter the password you set during installation
# You should see: postgres=#

# Type \q to exit
\q
```

If you see the `postgres=#` prompt, PostgreSQL is installed correctly!

---

## Part 2: Add PostgreSQL to System PATH (Permanent)

To avoid typing the PATH command every time:

### Step 1: Open Environment Variables

1. Press `Windows + R`
2. Type: `sysdm.cpl` and press Enter
3. Click "Advanced" tab
4. Click "Environment Variables" button

### Step 2: Edit PATH

1. Under "System variables", find `Path`
2. Click "Edit"
3. Click "New"
4. Add: `C:\Program Files\PostgreSQL\16\bin`
5. Click "OK" on all dialogs
6. **Close and reopen** Command Prompt

### Step 3: Verify

```cmd
psql --version
# Should show: psql (PostgreSQL) 16.x
```

---

## Part 3: Create Database

### Option A: Using pgAdmin (Recommended for beginners)

1. Open pgAdmin 4 from Start Menu
2. Connect to your server:
   - Expand "Servers"
   - Click "PostgreSQL 16"
   - Enter the password you set during installation
   - Check "Save password" (optional)
   - Click "OK"

3. Create database:
   - Right-click "Databases"
   - Select "Create" → "Database..."
   - Database name: `superiortests`
   - Owner: `postgres`
   - Click "Save"

4. Verify:
   - You should see `superiortests` in the database list

### Option B: Using Command Line

```cmd
# Open Command Prompt

# Create database
createdb -U postgres superiortests

# Enter password when prompted

# Verify database exists
psql -U postgres -l

# You should see "superiortests" in the list
```

---

## Part 4: Configure SuperiorTests Backend

### Step 1: Navigate to Project

```cmd
cd C:\Users\USER\Downloads\workspace
```

### Step 2: Install Backend Dependencies

```cmd
cd server
npm install
```

### Step 3: Create Environment File

```cmd
# Copy the example file
copy .env.example .env

# Or create manually
notepad .env
```

### Step 4: Edit .env File

Open `.env` in a text editor and update these values:

```env
# Database connection
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/superiortests

# Replace YOUR_PASSWORD with the password you set during PostgreSQL installation
# Example: DATABASE_URL=postgresql://postgres:MySecurePassword123@localhost:5432/superiortests

# Server settings
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# JWT Secret (generate a random string)
# Run this in Node: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=paste-your-generated-secret-here

# Email settings (optional - leave blank to disable)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=SuperiorTests <noreply@superiortests.com>
```

**Generate JWT Secret:**

Open a new Command Prompt and run:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` in your `.env` file.

### Step 5: Initialize Prisma

```cmd
# Still in server/ directory

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma migrate dev --name init
```

You should see:
```
✔ Generated Prisma Client
✔ Created migration "init"
✔ Applied migration
```

### Step 6: Start Backend Server

```cmd
npm run dev
```

You should see:
```
✓ SuperiorTests API running on http://localhost:3000
✓ Environment: development
```

**Keep this terminal open!**

---

## Part 5: Connect Frontend to Backend

The frontend currently uses localStorage. To use the real database, you need to update the API calls.

### Step 1: Open New Terminal

Keep the backend running, open a **new** Command Prompt:

```cmd
cd C:\Users\USER\Downloads\workspace
```

### Step 2: Install Frontend Dependencies

```cmd
npm install
```

### Step 3: Create API Client

Create a new file `src/api.ts`:

```typescript
// src/api.ts
const API_URL = 'http://localhost:3000/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

// Auth API
export const authAPI = {
  signup: (email: string, name: string, password: string) =>
    fetchAPI('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, name, password }),
    }),

  login: (email: string, password: string) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => fetchAPI('/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchAPI('/auth/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// Tests API
export const testsAPI = {
  list: () => fetchAPI('/tests'),

  create: (name: string) =>
    fetchAPI('/tests', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  get: (id: string) => fetchAPI(`/tests/${id}`),

  getBySlug: (slug: string) => fetchAPI(`/tests/slug/${slug}`),

  update: (id: string, data: any) =>
    fetchAPI(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  publish: (id: string) =>
    fetchAPI(`/tests/${id}/publish`, { method: 'PATCH' }),

  unpublish: (id: string) =>
    fetchAPI(`/tests/${id}/unpublish`, { method: 'PATCH' }),

  delete: (id: string) =>
    fetchAPI(`/tests/${id}`, { method: 'DELETE' }),

  getResults: (id: string) => fetchAPI(`/tests/${id}/results`),
};

// Attempts API
export const attemptsAPI = {
  start: (data: {
    testSlug: string;
    takerName: string;
    takerFatherName: string;
    takerEmail?: string;
    takerStudentId?: string;
    passcode?: string;
  }) =>
    fetchAPI('/attempts/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  saveProgress: (attemptId: string, answers: any[]) =>
    fetchAPI('/attempts/progress', {
      method: 'POST',
      body: JSON.stringify({ attemptId, answers }),
    }),

  submit: (data: {
    attemptId: string;
    answers: any[];
    antiCheatEvents?: any[];
  }) =>
    fetchAPI('/attempts/submit', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logAntiCheat: (attemptId: string, type: string, details?: string) =>
    fetchAPI('/attempts/anti-cheat', {
      method: 'POST',
      body: JSON.stringify({ attemptId, type, details }),
    }),
};
```

### Step 4: Start Frontend

```cmd
npm run dev
```

Open http://localhost:5173

---

## Part 6: Test the Setup

### Test 1: Create Account

1. Open http://localhost:5173
2. Click "Create Account"
3. Fill in:
   - Name: "Dr. John Smith"
   - Email: "john@university.edu"
   - Password: "password123"
4. Click "Create Account"

**Expected:** You should be logged in and see the dashboard.

### Test 2: Create a Test

1. Click "New Test"
2. Enter name: "Math Quiz"
3. Add a question:
   - Type: Multiple Choice (Single)
   - Question: "What is 2 + 2?"
   - Options: 3, 4 (mark as correct), 5, 6
   - Points: 1
4. Click "Save"
5. Click "Publish"

**Expected:** Test appears in dashboard with "Published" status.

### Test 3: Take the Test

1. Click the copy icon next to your test
2. Open incognito/private window
3. Paste the link
4. Enter:
   - Email: "student@university.edu"
   - Student ID: "STU001"
   - Continue
   - Name: "Alice Johnson"
   - Father's Name: "Robert Johnson"
5. Answer the question
6. Submit

**Expected:** See score after submission.

### Test 4: View Results

1. Go back to dashboard
2. Click "Results" for your test
3. You should see Alice's submission

**Expected:** Results table shows name, father's name, score, etc.

---

## Troubleshooting

### Error: "connection refused"

**Cause:** PostgreSQL is not running

**Fix:**
```cmd
# Check if PostgreSQL service is running
# Open Services (services.msc)
# Find "postgresql-x64-16"
# Right-click → Start
```

### Error: "password authentication failed"

**Cause:** Wrong password in DATABASE_URL

**Fix:**
- Open `.env` file
- Verify the password matches what you set during PostgreSQL installation
- Format: `postgresql://postgres:PASSWORD@localhost:5432/superiortests`

### Error: "database does not exist"

**Cause:** Database not created

**Fix:**
```cmd
createdb -U postgres superiortests
```

### Error: "relation does not exist"

**Cause:** Migrations not run

**Fix:**
```cmd
cd server
npx prisma migrate dev
```

### Error: "EADDRINUSE: port 3000 already in use"

**Cause:** Another process using port 3000

**Fix:**
```cmd
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the actual process ID)
taskkill /PID <PID> /F
```

### Frontend not connecting to backend

**Cause:** CORS or wrong URL

**Fix:**
- Check backend is running on port 3000
- Check `FRONTEND_URL` in `.env` is `http://localhost:5173`
- Restart backend after changing `.env`

---

## Quick Reference Commands

```cmd
# Start PostgreSQL service
net start postgresql-x64-16

# Stop PostgreSQL service
net stop postgresql-x64-16

# Open psql
psql -U postgres

# Create database
createdb -U postgres superiortests

# List databases
psql -U postgres -l

# Start backend
cd server
npm run dev

# Start frontend
npm run dev

# Run migrations
cd server
npx prisma migrate dev

# Open Prisma Studio (database GUI)
cd server
npx prisma studio
```

---

## Next Steps

Once everything is working:

1. **Update frontend to use API** - Replace localStorage calls with API calls from `src/api.ts`
2. **Test all features** - Create tests, take tests, view results
3. **Deploy to production** - See README.md for deployment options

---

## Summary

✅ PostgreSQL installed
✅ Database created
✅ Backend configured and running
✅ Frontend connected
✅ Full stack working

You now have a complete SuperiorTests setup with a real database!
