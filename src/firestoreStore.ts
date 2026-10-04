import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile as firebaseUpdateProfile,
  updatePassword as firebaseUpdatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from './firebase';
import type { User, Test, Attempt, TestSettings, Question, Answer } from './types';

// Helper to generate unique IDs
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Helper to generate test slug
const generateSlug = () => {
  return Math.random().toString(36).substring(2, 10);
};

// Current user state
let currentUser: User | null = null;
let currentTheme: 'light' | 'dark' = 
  (localStorage.getItem('theme') as 'light' | 'dark') || 'light';

// Allow AuthContext to sync the current user
export function setCurrentUser(user: User | null): void {
  currentUser = user;
}

// ============================================
// AUTH FUNCTIONS
// ============================================

export async function signup(email: string, name: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Update profile with name
    await firebaseUpdateProfile(firebaseUser, { displayName: name });
    
    // Create user document in Firestore
    const userData: Omit<User, 'id'> = {
      email,
      name,
      createdAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    
    currentUser = {
      id: firebaseUser.uid,
      ...userData
    };
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    const userData = userDoc.data();
    
    currentUser = {
      id: firebaseUser.uid,
      email: userData?.email || email,
      name: userData?.name || firebaseUser.displayName || '',
      createdAt: userData?.createdAt || new Date().toISOString()
    };
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
  currentUser = null;
}

export function getCurrentUser(): User | null {
  return currentUser;
}

export async function updateProfile(name: string, email: string): Promise<{ success: boolean; error?: string }> {
  if (!currentUser) {
    return { success: false, error: 'No user logged in' };
  }
  
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { success: false, error: 'No user logged in' };
    }
    
    // Update Firebase Auth profile
    await firebaseUpdateProfile(firebaseUser, { displayName: name });
    
    // Update Firestore document
    await updateDoc(doc(db, 'users', currentUser.id), {
      name,
      email
    });
    
    currentUser = {
      ...currentUser,
      name,
      email
    };
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  if (!currentUser) {
    return { success: false, error: 'No user logged in' };
  }
  
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, error: 'No user logged in' };
    }
    
    // Reauthenticate user
    const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
    await reauthenticateWithCredential(firebaseUser, credential);
    
    // Update password
    await firebaseUpdatePassword(firebaseUser, newPassword);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// TEST FUNCTIONS
// ============================================

export async function createTest(name: string): Promise<Test> {
  // Use currentUser from store, or fall back to Firebase auth
  const userId = currentUser?.id || auth.currentUser?.uid;
  if (!userId) {
    throw new Error('No user logged in');
  }
  
  const testId = generateId();
  const slug = generateSlug();
  
  const defaultSettings: TestSettings = {
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
    completionMessage: 'Thank you for completing the test!',
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
      resumeControl: false
    },
    notifyOnSubmit: false
  };
  
  const testData: Omit<Test, 'id'> = {
    ownerId: userId,
    slug,
    settings: defaultSettings,
    questions: [],
    published: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await setDoc(doc(db, 'tests', testId), testData);
  
  return {
    id: testId,
    ...testData
  };
}

export async function getTest(id: string): Promise<Test | null> {
  try {
    const testDoc = await getDoc(doc(db, 'tests', id));
    if (!testDoc.exists()) {
      return null;
    }
    
    const data = testDoc.data();
    return {
      id: testDoc.id,
      ...data
    } as Test;
  } catch (error) {
    console.error('Error getting test:', error);
    return null;
  }
}

export async function getTestBySlug(slug: string): Promise<Test | null> {
  try {
    const q = query(collection(db, 'tests'), where('slug', '==', slug));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const testDoc = querySnapshot.docs[0];
    const data = testDoc.data();
    
    return {
      id: testDoc.id,
      ...data
    } as Test;
  } catch (error) {
    console.error('Error getting test by slug:', error);
    return null;
  }
}

export async function getUserTests(userId?: string): Promise<Test[]> {
  const uid = userId || currentUser?.id;
  if (!uid) {
    return [];
  }
  
  try {
    // Query without orderBy to avoid needing a composite index
    const q = query(
      collection(db, 'tests'),
      where('ownerId', '==', uid)
    );
    
    const querySnapshot = await getDocs(q);
    
    const tests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Test));
    
    // Sort client-side by updatedAt descending
    return tests.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error('Error getting user tests:', error);
    return [];
  }
}

// Helper to remove undefined values (Firestore doesn't accept undefined)
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

export async function updateTest(test: Test): Promise<void> {
  try {
    const { id, ...testData } = test;
    const cleanedData = removeUndefined(testData);
    await updateDoc(doc(db, 'tests', id), {
      ...cleanedData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating test:', error);
    throw error;
  }
}

export async function deleteTest(id: string): Promise<void> {
  try {
    // Delete all attempts for this test
    const attemptsQuery = query(collection(db, 'attempts'), where('testId', '==', id));
    const attemptsSnapshot = await getDocs(attemptsQuery);
    
    const deletePromises = attemptsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    // Delete the test
    await deleteDoc(doc(db, 'tests', id));
  } catch (error) {
    console.error('Error deleting test:', error);
    throw error;
  }
}

export async function publishTest(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'tests', id), {
      published: true,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error publishing test:', error);
    throw error;
  }
}

export async function unpublishTest(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'tests', id), {
      published: false,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error unpublishing test:', error);
    throw error;
  }
}

// ============================================
// ATTEMPT FUNCTIONS
// ============================================

export async function createAttempt(
  testId: string,
  takerName: string,
  takerFatherName: string,
  takerEmail: string,
  takerStudentId: string
): Promise<Attempt> {
  try {
    // Count existing attempts for this test+email+studentId
    const q = query(
      collection(db, 'attempts'),
      where('testId', '==', testId),
      where('takerEmail', '==', takerEmail),
      where('takerStudentId', '==', takerStudentId)
    );
    
    const querySnapshot = await getDocs(q);
    const attemptNumber = querySnapshot.size + 1;
    
    const attemptId = generateId();
    
    const attemptData: Omit<Attempt, 'id'> = {
      testId,
      takerName,
      takerFatherName,
      takerEmail,
      takerStudentId,
      attemptNumber,
      answers: [],
      score: null,
      maxScore: 0,
      percentage: null,
      startedAt: new Date().toISOString(),
      submittedAt: null,
      timeTakenSeconds: null,
      status: 'in-progress',
      antiCheatEvents: []
    };
    
    await setDoc(doc(db, 'attempts', attemptId), attemptData);
    
    return {
      id: attemptId,
      ...attemptData
    };
  } catch (error) {
    console.error('Error creating attempt:', error);
    throw error;
  }
}

export async function getAttempt(id: string): Promise<Attempt | null> {
  try {
    const attemptDoc = await getDoc(doc(db, 'attempts', id));
    if (!attemptDoc.exists()) {
      return null;
    }
    
    const data = attemptDoc.data();
    return {
      id: attemptDoc.id,
      ...data
    } as Attempt;
  } catch (error) {
    console.error('Error getting attempt:', error);
    return null;
  }
}

export async function getTestAttempts(testId: string): Promise<Attempt[]> {
  try {
    // Query without orderBy to avoid needing a composite index
    const q = query(
      collection(db, 'attempts'),
      where('testId', '==', testId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const attempts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Attempt));
    
    // Sort client-side by startedAt descending
    return attempts.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  } catch (error) {
    console.error('Error getting test attempts:', error);
    return [];
  }
}

export async function updateAttempt(attempt: Attempt): Promise<void> {
  try {
    const { id, ...attemptData } = attempt;
    await updateDoc(doc(db, 'attempts', id), attemptData);
  } catch (error) {
    console.error('Error updating attempt:', error);
    throw error;
  }
}

export async function submitAttempt(attemptId: string): Promise<Attempt | null> {
  try {
    const attempt = await getAttempt(attemptId);
    if (!attempt) {
      return null;
    }
    
    const test = await getTest(attempt.testId);
    if (!test) {
      return null;
    }
    
    // Calculate score
    let score = 0;
    let maxScore = 0;
    
    for (const question of test.questions) {
      maxScore += question.points;
      
      const answer = attempt.answers.find(a => a.questionId === question.id);
      if (!answer) continue;
      
      const isCorrect = checkAnswer(question, answer.answer);
      
      if (isCorrect) {
        score += question.points;
      } else if (test.settings.negativeMarking) {
        score -= question.points * test.settings.negativeMarkingPenalty;
      }
    }
    
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const timeTakenSeconds = Math.floor(
      (new Date().getTime() - new Date(attempt.startedAt).getTime()) / 1000
    );
    
    const updatedAttempt: Attempt = {
      ...attempt,
      score,
      maxScore,
      percentage,
      timeTakenSeconds,
      status: 'submitted',
      submittedAt: new Date().toISOString()
    };
    
    await updateAttempt(updatedAttempt);
    
    return updatedAttempt;
  } catch (error) {
    console.error('Error submitting attempt:', error);
    return null;
  }
}

// Helper function to check if an answer is correct
function checkAnswer(question: Question, answer: any): boolean {
  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
      return question.options?.some(o => o.isCorrect && o.text === answer) || false;
    
    case 'multiple-choice-multi': {
      const correctOptions = question.options?.filter(o => o.isCorrect).map(o => o.text) || [];
      const selectedAnswers = Array.isArray(answer) ? answer : [];
      return correctOptions.length === selectedAnswers.length &&
        correctOptions.every(opt => selectedAnswers.includes(opt));
    }
    
    case 'fill-blank':
    case 'short-answer':
      return (answer as string)?.toLowerCase().trim() === 
        question.correctAnswer?.toLowerCase().trim();
    
    case 'numeric': {
      const numAnswer = parseFloat(answer as string);
      const numCorrect = parseFloat(question.correctAnswer || '0');
      const tolerance = question.numericTolerance || 0;
      return Math.abs(numAnswer - numCorrect) <= tolerance;
    }
    
    case 'matching': {
      const pairs = question.matchingPairs || [];
      const matchAnswers = answer as Record<string, string>;
      return pairs.every(pair => matchAnswers[pair.id] === pair.right);
    }
    
    case 'essay':
      return false; // Essays require manual grading
    
    default:
      return false;
  }
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
  const submittedAttempts = attempts.filter(a => a.status === 'submitted');
  
  if (submittedAttempts.length === 0) {
    return null;
  }
  
  const scores = submittedAttempts.map(a => a.percentage || 0);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const passRate = Math.round(
    (submittedAttempts.filter(a => (a.percentage || 0) >= 50).length / submittedAttempts.length) * 100
  );
  
  return {
    totalAttempts: submittedAttempts.length,
    averageScore,
    highestScore,
    lowestScore,
    passRate
  };
}
