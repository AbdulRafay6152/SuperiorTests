// ============================================================
// SuperiorTests — Data Store (localStorage-backed, structured for backend swap)
// ============================================================

import { AppState, User, Test, Attempt, Session } from './types';

const STORAGE_KEY = 'superiortests_data';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function generateSlug(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

function getDefaultState(): AppState {
  return {
    users: [],
    tests: [],
    attempts: [],
    session: null,
    theme: 'light',
  };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load state:', e);
  }
  return getDefaultState();
}

function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state: AppState = loadState();

// Simple hash for demo (in production, use bcrypt on server)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
}

// ============================================================
// Auth
// ============================================================

export function signup(email: string, name: string, password: string): { success: boolean; error?: string } {
  if (!email || !name || !password) {
    return { success: false, error: 'All fields are required.' };
  }
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  const existing = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { success: false, error: 'An account with this email already exists.' };
  }

  const user: User = {
    id: generateId(),
    email: email.toLowerCase(),
    name,
    passwordHash: simpleHash(password),
    createdAt: new Date().toISOString(),
  };
  state.users.push(user);

  const session: Session = {
    userId: user.id,
    token: generateId() + generateId(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  state.session = session;
  saveState(state);
  return { success: true };
}

export function login(email: string, password: string): { success: boolean; error?: string } {
  const user = state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { success: false, error: 'Invalid email or password.' };
  }
  if (user.passwordHash !== simpleHash(password)) {
    return { success: false, error: 'Invalid email or password.' };
  }

  const session: Session = {
    userId: user.id,
    token: generateId() + generateId(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  state.session = session;
  saveState(state);
  return { success: true };
}

export function logout(): void {
  state.session = null;
  saveState(state);
}

export function getCurrentUser(): User | null {
  if (!state.session) return null;
  if (new Date(state.session.expiresAt) < new Date()) {
    state.session = null;
    saveState(state);
    return null;
  }
  return state.users.find(u => u.id === state.session!.userId) || null;
}

export function updateProfile(name: string, email: string): { success: boolean; error?: string } {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in.' };
  const existing = state.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== user.id);
  if (existing) return { success: false, error: 'Email already in use.' };
  user.name = name;
  user.email = email.toLowerCase();
  saveState(state);
  return { success: true };
}

export function changePassword(currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not logged in.' };
  if (user.passwordHash !== simpleHash(currentPassword)) {
    return { success: false, error: 'Current password is incorrect.' };
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters.' };
  }
  user.passwordHash = simpleHash(newPassword);
  saveState(state);
  return { success: true };
}

// ============================================================
// Tests
// ============================================================

export function createTest(ownerId: string, name: string): Test {
  const test: Test = {
    id: generateId(),
    ownerId,
    slug: generateSlug(),
    published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: {
      name,
      description: '',
      timeLimitMinutes: null,
      attemptLimit: null,
      passcode: null,
      emailWhitelist: [],
      studentIdList: [],
      accessMode: 'open',
      startDate: null,
      endDate: null,
      showResults: true,
      showCorrectAnswers: true,
      completionMessage: 'Thank you. Your responses have been recorded.',
      negativeMarking: false,
      negativeMarkingPenalty: 0.25,
      allowBlankSubmissions: true,
      onePerPage: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      antiCheat: {
        tabSwitchDetection: false,
        fullscreenEnforcement: false,
        disableCopyPaste: false,
        disableRightClick: false,
        disableTextSelection: false,
        watermark: false,
        preventRefresh: false,
        resumeControl: false,
      },
      notifyOnSubmit: false,
    },
    questions: [],
  };
  state.tests.push(test);
  saveState(state);
  return test;
}

export function getTest(id: string): Test | null {
  return state.tests.find(t => t.id === id) || null;
}

export function getTestBySlug(slug: string): Test | null {
  return state.tests.find(t => t.slug === slug) || null;
}

export function getUserTests(userId: string): Test[] {
  return state.tests.filter(t => t.ownerId === userId).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function updateTest(test: Test): void {
  const idx = state.tests.findIndex(t => t.id === test.id);
  if (idx >= 0) {
    test.updatedAt = new Date().toISOString();
    state.tests[idx] = test;
    saveState(state);
  }
}

export function deleteTest(id: string): void {
  state.tests = state.tests.filter(t => t.id !== id);
  state.attempts = state.attempts.filter(a => a.testId !== id);
  saveState(state);
}

export function publishTest(id: string): void {
  const test = getTest(id);
  if (test) {
    test.published = true;
    test.updatedAt = new Date().toISOString();
    saveState(state);
  }
}

export function unpublishTest(id: string): void {
  const test = getTest(id);
  if (test) {
    test.published = false;
    test.updatedAt = new Date().toISOString();
    saveState(state);
  }
}

// ============================================================
// Attempts
// ============================================================

export function createAttempt(testId: string, takerName: string, takerEmail: string, takerStudentId: string): Attempt {
  const existingAttempts = state.attempts.filter(a => a.testId === testId && 
    (a.takerEmail === takerEmail || a.takerStudentId === takerStudentId));
  
  const attempt: Attempt = {
    id: generateId(),
    testId,
    takerName,
    takerEmail,
    takerStudentId,
    answers: [],
    score: null,
    maxScore: 0,
    percentage: null,
    startedAt: new Date().toISOString(),
    submittedAt: null,
    timeTakenSeconds: null,
    attemptNumber: existingAttempts.length + 1,
    status: 'in-progress',
    antiCheatEvents: [],
  };
  state.attempts.push(attempt);
  saveState(state);
  return attempt;
}

export function getAttempt(id: string): Attempt | null {
  return state.attempts.find(a => a.id === id) || null;
}

export function getTestAttempts(testId: string): Attempt[] {
  return state.attempts.filter(a => a.testId === testId).sort((a, b) =>
    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export function updateAttempt(attempt: Attempt): void {
  const idx = state.attempts.findIndex(a => a.id === attempt.id);
  if (idx >= 0) {
    state.attempts[idx] = attempt;
    saveState(state);
  }
}

export function submitAttempt(attemptId: string): Attempt | null {
  const attempt = getAttempt(attemptId);
  if (!attempt) return null;
  
  const test = getTest(attempt.testId);
  if (!test) return null;

  attempt.submittedAt = new Date().toISOString();
  attempt.status = 'submitted';
  
  const startMs = new Date(attempt.startedAt).getTime();
  const endMs = new Date(attempt.submittedAt).getTime();
  attempt.timeTakenSeconds = Math.floor((endMs - startMs) / 1000);

  // Calculate score
  let totalScore = 0;
  let maxScore = 0;

  for (const question of test.questions) {
    maxScore += question.points;
    const answer = attempt.answers.find(a => a.questionId === question.id);
    if (!answer) continue;

    let isCorrect = false;
    switch (question.type) {
      case 'multiple-choice-single':
      case 'true-false':
        isCorrect = question.options?.some(o => o.isCorrect && o.text === answer.answer) || false;
        break;
      case 'multiple-choice-multi': {
        const correctOptions = question.options?.filter(o => o.isCorrect).map(o => o.text) || [];
        const selectedAnswers = Array.isArray(answer.answer) ? answer.answer : [];
        isCorrect = correctOptions.length === selectedAnswers.length &&
          correctOptions.every(c => selectedAnswers.includes(c));
        break;
      }
      case 'fill-blank':
      case 'short-answer':
        isCorrect = (answer.answer as string).toLowerCase().trim() === 
          (question.correctAnswer || '').toLowerCase().trim();
        break;
      case 'numeric': {
        const numAnswer = parseFloat(answer.answer as string);
        const numCorrect = parseFloat(question.correctAnswer || '0');
        const tolerance = question.numericTolerance || 0;
        isCorrect = Math.abs(numAnswer - numCorrect) <= tolerance;
        break;
      }
      case 'matching': {
        const pairs = question.matchingPairs || [];
        const matchAnswers = answer.answer as Record<string, string>;
        isCorrect = pairs.every(p => matchAnswers[p.id] === p.right);
        break;
      }
      case 'essay':
        isCorrect = false; // Requires manual grading
        break;
    }

    if (isCorrect) {
      totalScore += question.points;
    } else if (test.settings.negativeMarking && question.type !== 'essay') {
      const penalty = question.points * test.settings.negativeMarkingPenalty;
      totalScore -= penalty;
    }
  }

  attempt.score = Math.max(0, totalScore);
  attempt.maxScore = maxScore;
  attempt.percentage = maxScore > 0 ? Math.round((attempt.score / maxScore) * 100) : 0;

  saveState(state);
  return attempt;
}

// ============================================================
// Theme
// ============================================================

export function getTheme(): 'light' | 'dark' {
  return state.theme;
}

export function setTheme(theme: 'light' | 'dark'): void {
  state.theme = theme;
  saveState(state);
  document.documentElement.className = theme;
}

export function toggleTheme(): void {
  const newTheme = state.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

// ============================================================
// Stats
// ============================================================

export function getTestStats(testId: string) {
  const attempts = state.attempts.filter(a => a.testId === testId && a.status === 'submitted');
  if (attempts.length === 0) return null;

  const scores = attempts.map(a => a.percentage || 0);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const highest = Math.max(...scores);
  const lowest = Math.min(...scores);
  const passRate = (scores.filter(s => s >= 50).length / scores.length) * 100;

  return {
    totalAttempts: attempts.length,
    averageScore: Math.round(avg),
    highestScore: highest,
    lowestScore: lowest,
    passRate: Math.round(passRate),
  };
}

// Initialize theme on load
document.documentElement.className = state.theme;
