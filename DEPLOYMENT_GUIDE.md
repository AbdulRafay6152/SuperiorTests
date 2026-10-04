# SuperiorTests — Setup & Deployment Guide

## Quick Start

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** → Name it (e.g., `superiortests`)
3. Disable Google Analytics (optional) → **Create project**

### 2. Enable Authentication

1. In Firebase Console → **Authentication** → **Get started**
2. Enable **Email/Password** provider → **Save**

### 3. Create Firestore Database

1. In Firebase Console → **Firestore Database** → **Create database**
2. Select **"Start in production mode"**
3. Choose location closest to your users → **Enable**

### 4. Set Firestore Security Rules

Go to **Firestore Database** → **Rules** tab → Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
      allow update: if request.auth != null && request.auth.uid == userId;
    }
    
    match /tests/{testId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         request.resource.data.ownerId == request.auth.uid);
    }
    
    match /attempts/{attemptId} {
      allow read, create, update: if true;
    }
  }
}
```

### 5. Get Your Firebase Config

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **"Your apps"** → Click web icon `</>`
3. Register app name: `superiortests-web`
4. Copy the config values

### 6. Add Config to Your Code

Open `src/firebase.ts` and replace the placeholder values:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← Your API key
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

### 7. Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

---

## Deploy to GitHub Pages

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "SuperiorTests - production ready"
git remote add origin https://github.com/YOUR_USERNAME/superiortests.git
git branch -M main
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **GitHub Actions**

### 3. Create Workflow File

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 4. Push the Workflow

```bash
git add .github/workflows/deploy.yml
git commit -m "Add deployment workflow"
git push
```

Your site will be live at: `https://YOUR_USERNAME.github.io/superiortests/`

---

## Deploy to Firebase Hosting (Alternative)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Set public directory: dist
# Configure as single-page app: Yes
# Don't overwrite index.html: No

npm run build
firebase deploy
```

---

## Deploy to Vercel (Easiest)

1. Go to [vercel.com](https://vercel.com) → Sign in with GitHub
2. Click **"New Project"** → Import your repo
3. Framework: **Vite**
4. Click **Deploy**

Done! Vercel auto-deploys on every push.

---

## Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) → Sign in with GitHub
2. Click **"Add new site"** → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy**

---

## Environment Variables (Optional)

For production, use environment variables instead of hardcoding Firebase config.

Create `.env` (add to `.gitignore`):

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender
VITE_FIREBASE_APP_ID=your_app_id
```

The app already reads from these via `import.meta.env.VITE_*`.

---

## Architecture

```
superiortests/
├── src/
│   ├── firebase.ts          # Firebase config
│   ├── firestoreStore.ts    # All database operations
│   ├── AuthContext.tsx       # Auth state management
│   ├── types.ts             # TypeScript types
│   ├── App.tsx              # Routing + auth guards
│   ├── index.css            # Design tokens + Tailwind
│   ├── components/
│   │   └── Layout.tsx       # App shell (header, nav)
│   ├── pages/
│   │   ├── Landing.tsx      # Public landing page
│   │   ├── Login.tsx        # Email/password login
│   │   ├── Signup.tsx       # Account creation
│   │   ├── Dashboard.tsx    # Test list (teacher view)
│   │   ├── TestEditor.tsx   # Create/edit tests
│   │   ├── TestSettings.tsx # Test configuration
│   │   ├── TestTake.tsx     # Test-taking interface
│   │   ├── Results.tsx      # Results table
│   │   ├── ResultDetail.tsx # Per-student breakdown
│   │   ├── Profile.tsx      # Account settings
│   │   └── ResetPassword.tsx
│   └── utils/
│       └── pdf.ts           # PDF/CSV export
├── index.html
├── package.json
└── vite.config.ts
```

## Data Model (Firestore Collections)

| Collection | Description |
|---|---|
| `users/{uid}` | Teacher accounts (name, email) |
| `tests/{testId}` | Test definitions + settings + questions |
| `attempts/{attemptId}` | Student submissions + answers + scores |

## Features

- ✅ 8 question types (MC single/multi, T/F, fill-blank, short answer, essay, numeric, matching)
- ✅ Two-step test access (verification → identity)
- ✅ Father's name collection
- ✅ Anti-cheat controls (8 independently toggleable)
- ✅ Timed assessments with auto-submit
- ✅ Passcode / email whitelist / student ID access modes
- ✅ PDF and CSV result exports
- ✅ Dark/light theme
- ✅ KaTeX math rendering
- ✅ Bulk question import
- ✅ Real-time cloud sync via Firestore

## Troubleshooting

| Issue | Fix |
|---|---|
| "Missing or insufficient permissions" | Check Firestore security rules |
| Blank page after deploy | Ensure SPA routing is configured |
| Login not working | Verify Email/Password auth is enabled |
| Tests not loading | Check browser console for Firestore errors |
| Build fails | Run `npm install` then `npm run build` |
