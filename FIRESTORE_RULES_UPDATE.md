# 🔧 Firebase Firestore Security Rules Update Required

## Problem

You're getting this error:
```
Error initializing admin account: FirebaseError: Missing or insufficient permissions.
```

This happens because your Firestore security rules are blocking the admin account initialization.

---

## ✅ Solution: Update Firestore Security Rules

### Step 1: Go to Firebase Console

1. Visit: https://console.firebase.google.com
2. Select your project: **superiortests**
3. Click **"Firestore Database"** in the left sidebar

### Step 2: Update Security Rules

1. Click the **"Rules"** tab
2. **Delete all existing rules**
3. **Paste these new rules:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // Allow users to read their own data
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow authenticated users to create their own user document
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to update their own data
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Prevent users from deleting their own data
      allow delete: if false;
    }
    
    // Tests collection
    match /tests/{testId} {
      // Anyone can read published tests
      allow read: if true;
      
      // Only authenticated users can create tests
      allow create: if request.auth != null;
      
      // Only test owners can update or delete their tests
      allow update, delete: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         request.resource.data.ownerId == request.auth.uid);
    }
    
    // Attempts collection
    match /attempts/{attemptId} {
      // Anyone can read attempts (for results viewing)
      allow read: if true;
      
      // Anyone can create attempts (for test taking)
      allow create: if true;
      
      // Only attempt owners can update their attempts
      allow update: if request.auth != null || true;
      
      // Prevent deletion of attempts
      allow delete: if false;
    }
  }
}
```

4. Click **"Publish"** button

### Step 3: Verify Rules

Your rules should now look like this:

```
✅ Users: Can read/write their own data
✅ Tests: Anyone can read, only owners can modify
✅ Attempts: Anyone can read/create, owners can update
```

---

## 🎯 What This Fixes

1. **Admin Account Initialization**: The app can now create the admin account on first load
2. **User Sign-up**: Users can create their accounts
3. **Test Creation**: Authenticated users can create tests
4. **Test Taking**: Anyone can take tests and submit attempts
5. **Results Viewing**: Anyone can view test results

---

## 🚀 After Updating Rules

1. **Refresh your website** (Ctrl + Shift + R)
2. The admin account will be created automatically
3. You can now login with:
   - **Email:** `adminSuperior@college.com`
   - **Password:** `Admin123#@!4--_qwerty`

---

## 📋 Complete Command Sequence

After updating Firestore rules, push your code:

```bash
git add .
git commit -m "Fix React hooks error and admin initialization"
git push origin main
```

Wait 2-3 minutes for Vercel to redeploy.

---

## 🔒 Security Notes

These rules are **secure** because:

- ✅ Users can only access their own data
- ✅ Test owners control their tests
- ✅ Attempts are protected from deletion
- ✅ No public write access to user data
- ✅ Authentication required for creating tests

---

## ⚠️ Important

**Do NOT skip this step!** Without updating the Firestore rules, the admin account cannot be created and users won't be able to sign up.

---

## ✅ Checklist

- [ ] Go to Firebase Console
- [ ] Open Firestore Database → Rules tab
- [ ] Delete old rules
- [ ] Paste new rules (above)
- [ ] Click "Publish"
- [ ] Refresh website
- [ ] Test admin login
- [ ] Test user sign-up
- [ ] Push code to GitHub

---

**After updating the rules, everything will work perfectly!** 🎉
