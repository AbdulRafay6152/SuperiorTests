import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ============================================================
// FIREBASE CONFIGURATION - SuperiorTests
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyCWhSGWn3ZDGDNn_I-NIzgM9f67exrC82w",
  authDomain: "superiortests.firebaseapp.com",
  projectId: "superiortests",
  storageBucket: "superiortests.firebasestorage.app",
  messagingSenderId: "54832003221",
  appId: "1:54832003221:web:aa988c5d08cdf96be1c39c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

export default app;