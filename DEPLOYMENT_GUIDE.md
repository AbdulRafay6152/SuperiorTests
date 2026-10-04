# SuperiorTests - Firestore Setup & GitHub Deployment Guide

## Overview

This guide will help you:
1. Set up Firebase Firestore database
2. Deploy your SuperiorTests application to GitHub Pages

---

## Part 1: Firebase Firestore Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `superiortests` (or your preferred name)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Firestore Database

1. In Firebase Console, click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in production mode"
4. Choose your preferred location (closest to your users)
5. Click "Enable"

### Step 3: Configure Firestore Security Rules

Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Tests - owners can manage, anyone can read published tests
    match /tests/{testId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && resource.data.ownerId == request.auth.uid;
      
      // Attempts - anyone can create, only owners can read their test's attempts
      match /attempts/{attemptId} {
        allow create: if true;
        allow read: if true;
        allow update: if true;
      }
    }
    
    // Attempts collection at root level
    match /attempts/{attemptId} {
      allow create: if true;
      allow read, update: if true;
    }
  }
}
```

### Step 4: Enable Authentication

1. In Firebase Console, click "Authentication" in the left sidebar
2. Click "Get started"
3. Enable "Email/Password" provider
4. Click "Save"

### Step 5: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ → "Project settings"
2. Scroll down to "Your apps" section
3. Click the web icon `</>`
4. Register app name: `superiortests-web`
5. Copy the configuration object

It will look like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 6: Update Your Code

Replace the placeholder config in `src/firebase.ts` with your actual configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## Part 2: Component Migration (Required)

**Important:** The current components use synchronous localStorage calls. You need to update them to use async Firestore calls.

### Example Migration Pattern

**Before (localStorage):**
```typescript
const tests = getUserTests(userId);
setTests(tests);
```

**After (Firestore):**
```typescript
const tests = await getUserTests(userId);
setTests(tests);
```

### Files That Need Updates

All page components need to be updated to handle async operations:

1. `src/pages/Dashboard.tsx`
2. `src/pages/Login.tsx`
3. `src/pages/Signup.tsx`
4. `src/pages/TestEditor.tsx`
5. `src/pages/TestSettings.tsx`
6. `src/pages/TestTake.tsx`
7. `src/pages/Results.tsx`
8. `src/pages/ResultDetail.tsx`
9. `src/pages/Profile.tsx`

### Quick Migration Example

**Dashboard.tsx:**
```typescript
// Change this:
useEffect(() => {
  if (user) {
    setTests(getUserTests(user.id));
  }
}, [user]);

// To this:
useEffect(() => {
  async function loadTests() {
    if (user) {
      const tests = await getUserTests(user.id);
      setTests(tests);
    }
  }
  loadTests();
}, [user]);
```

---

## Part 3: GitHub Deployment

### Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com/)
2. Click "New repository"
3. Repository name: `superiortests`
4. Make it public or private (your choice)
5. **Don't** initialize with README
6. Click "Create repository"

### Step 2: Initialize Git and Push

Open terminal in your project directory:

```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: SuperiorTests with Firestore"

# Add GitHub remote (replace with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/superiortests.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Configure for GitHub Pages

Create a file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 4: Add Firebase Config as GitHub Secrets

1. Go to your GitHub repository
2. Click "Settings" → "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add each Firebase config value:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

### Step 5: Enable GitHub Pages

1. Go to repository "Settings" → "Pages"
2. Under "Build and deployment", select "GitHub Actions" as source
3. The workflow will automatically deploy on every push to main

### Step 6: Access Your Deployed Site

After the workflow completes (2-3 minutes), your site will be available at:
```
https://YOUR_USERNAME.github.io/superiortests/
```

---

## Part 4: Environment Variables for Development

Create a `.env` file in your project root (add to `.gitignore`):

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## Part 5: Testing Your Deployment

### Local Testing

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### Production Testing

After GitHub Actions deploys:
1. Visit your GitHub Pages URL
2. Test creating an account
3. Test creating a test
4. Test taking the test
5. Verify data is saved in Firestore

---

## Troubleshooting

### Issue: Firebase permission errors

**Solution:** Check Firestore security rules in Firebase Console

### Issue: GitHub Pages shows 404

**Solution:** 
1. Check that GitHub Actions workflow completed successfully
2. Verify the workflow file is in `.github/workflows/deploy.yml`
3. Check that "GitHub Actions" is selected as the source in Pages settings

### Issue: Firebase config not loading

**Solution:**
1. Verify environment variables are set correctly
2. Check that variable names start with `VITE_`
3. Rebuild the project after changing environment variables

### Issue: Authentication not working

**Solution:**
1. Verify "Email/Password" is enabled in Firebase Authentication
2. Check Firebase Console → Authentication → Users to see if users are being created

---

## Security Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Use GitHub Secrets** for Firebase config in production
3. **Set strict Firestore rules** - Only allow authenticated users to write
4. **Enable Firebase App Check** (optional but recommended)
5. **Monitor Firestore usage** in Firebase Console

---

## Next Steps

1. ✅ Complete component migration to async Firestore calls
2. ✅ Test locally with Firestore
3. ✅ Push to GitHub
4. ✅ Configure GitHub Secrets
5. ✅ Deploy to GitHub Pages
6. ✅ Test production deployment
7. ✅ Share your test links!

---

## Support

- Firebase Documentation: https://firebase.google.com/docs
- GitHub Pages Documentation: https://docs.github.com/en/pages
- Vite Documentation: https://vitejs.dev/

---

**Your SuperiorTests platform is ready for deployment!** 🚀
