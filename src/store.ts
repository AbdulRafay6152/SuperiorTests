// Synchronous wrapper around Firestore for backward compatibility
// This caches data locally and syncs with Firestore in the background

import * as firestoreStore from './firestoreStore';
import type { User, Test, Attempt } from './types';

// Local cache
let cachedUser: User | null = null;
let cachedTests: Test[] = [];
let cachedAttempts: Map<string, Attempt[]> = new Map();
let currentTheme: 'light' | 'dark' = 
  (localStorage.getItem('theme') as 'light' | 'dark') || 'light';

// Initialize from localStorage
const savedUser = localStorage.getItem('currentUser');
if (savedUser) {
  cachedUser = JSON.parse(savedUser);
}

// ============================================
// AUTH FUNCTIONS (synchronous wrappers)
// ============================================

export async function signup(email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> {
  const result = await firestoreStore.signup(email, name, password);
  if (result.success) {
    const user = firestoreStore.getCurrentUser();
    if (user) {
      cachedUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }
  return result;
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const result = await firestoreStore.login(email, password);
  if (result.success) {
    const user = firestoreStore.getCurrentUser();
    if (user) {
      cachedUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }
  return result;
}

export async function logout(): Promise<void> {
  await firestoreStore.logout();
  cachedUser = null;
  localStorage.removeItem('currentUser');
}

export function getCurrentUser(): User | null {
  return cachedUser;
}

export async function updateProfile(name: string, email: string): Promise<{ success: boolean; error?: string }> {
  const result = await firestoreStore.updateProfile(name, email);
  if (result.success && cachedUser) {
    cachedUser = { ...cachedUser, name, email };
    localStorage.setItem('currentUser', JSON.stringify(cachedUser));
  }
  return result;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  return firestoreStore.changePassword(currentPassword, newPassword);
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  return firestoreStore.resetPassword(email);
}

// ============================================
// TEST FUNCTIONS (synchronous wrappers)
// ============================================

export async function createTest(name: string): Promise<Test> {
  const test = await firestoreStore.createTest(name);
  cachedTests = [test, ...cachedTests];
  return test;
}

export async function getTest(id: string): Promise<Test | null> {
  // Try cache first
  const cached = cachedTests.find(t => t.id === id);
  if (cached) return cached;
  
  // Fetch from Firestore
  const test = await firestoreStore.getTest(id);
  if (test) {
    const idx = cachedTests.findIndex(t => t.id === id);
    if (idx >= 0) {
      cachedTests[idx] = test;
    } else {
      cachedTests.push(test);
    }
  }
  return test;
}

export async function getTestBySlug(slug: string): Promise<Test | null> {
  // Try cache first
  const cached = cachedTests.find(t => t.slug === slug);
  if (cached) return cached;
  
  // Fetch from Firestore
  return firestoreStore.getTestBySlug(slug);
}

export async function getUserTests(userId: string): Promise<Test[]> {
  const tests = await firestoreStore.getUserTests();
  cachedTests = tests;
  return tests;
}

export async function updateTest(test: Test): Promise<void> {
  await firestoreStore.updateTest(test);
  const idx = cachedTests.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    cachedTests[idx] = test;
  }
}

export async function deleteTest(id: string): Promise<void> {
  await firestoreStore.deleteTest(id);
  cachedTests = cachedTests.filter(t => t.id !== id);
}

export async function publishTest(id: string): Promise<void> {
  await firestoreStore.publishTest(id);
  const test = cachedTests.find(t => t.id === id);
  if (test) {
    test.published = true;
  }
}

export async function unpublishTest(id: string): Promise<void> {
  await firestoreStore.unpublishTest(id);
  const test = cachedTests.find(t => t.id === id);
  if (test) {
    test.published = false;
  }
}

// ============================================
// ATTEMPT FUNCTIONS (synchronous wrappers)
// ============================================

export async function createAttempt(
  testId: string,
  takerName: string,
  takerFatherName: string,
  takerEmail: string,
  takerStudentId: string
): Promise<Attempt> {
  const attempt = await firestoreStore.createAttempt(testId, takerName, takerFatherName, takerEmail, takerStudentId);
  const attempts = cachedAttempts.get(testId) || [];
  attempts.unshift(attempt);
  cachedAttempts.set(testId, attempts);
  return attempt;
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  // Try cache first
  for (const attempts of cachedAttempts.values()) {
    const cached = attempts.find(a => a.id === id);
    if (cached) return cached;
  }
  
  // Fetch from Firestore
  return firestoreStore.getAttempt(id);
}

export async function getTestAttempts(testId: string): Promise<Attempt[]> {
  const attempts = await firestoreStore.getTestAttempts(testId);
  cachedAttempts.set(testId, attempts);
  return attempts;
}

export async function updateAttempt(attempt: Attempt): Promise<void> {
  await firestoreStore.updateAttempt(attempt);
  const attempts = cachedAttempts.get(attempt.testId) || [];
  const idx = attempts.findIndex(a => a.id === attempt.id);
  if (idx >= 0) {
    attempts[idx] = attempt;
  }
}

export async function submitAttempt(attemptId: string): Promise<Attempt | null> {
  const attempt = await firestoreStore.submitAttempt(attemptId);
  if (attempt) {
    const attempts = cachedAttempts.get(attempt.testId) || [];
    const idx = attempts.findIndex(a => a.id === attempt.id);
    if (idx >= 0) {
      attempts[idx] = attempt;
    }
  }
  return attempt;
}

// ============================================
// THEME FUNCTIONS
// ============================================

export function getTheme(): 'light' | 'dark' {
  return currentTheme;
}

export function setTheme(theme: 'light' | 'dark'): void {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

export function toggleTheme(): void {
  setTheme(currentTheme === 'light' ? 'dark' : 'light');
}

// ============================================
// STATISTICS FUNCTIONS
// ============================================

export function getTestStats(testId: string, attempts: Attempt[]) {
  return firestoreStore.getTestStats(testId, attempts);
}
