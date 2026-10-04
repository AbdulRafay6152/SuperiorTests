import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
// Replace these values with your Firebase project config.
// Get them from: Firebase Console → Project Settings → Your apps
// 
// For production, use environment variables (see .env.example):
//   apiKey: import.meta.env.VITE_FIREBASE_API_KEY
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX", // ← Replace with your API key
  authDomain: "superiortests-xxxxx.firebaseapp.com", // ← Replace with your auth domain
  projectId: "superiortests-xxxxx", // ← Replace with your project ID
  storageBucket: "superiortests-xxxxx.appspot.com", // ← Replace with your storage bucket
  messagingSenderId: "123456789012", // ← Replace with your sender ID
  appId: "1:123456789012:web:abcdef1234567890" // ← Replace with your app ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

export default app;
