// ============================================================
// GGDC Tests — Type Definitions
// ============================================================

export type QuestionType =
  | 'multiple-choice-single'
  | 'multiple-choice-multi'
  | 'true-false'
  | 'fill-blank'
  | 'short-answer'
  | 'essay'
  | 'numeric'
  | 'matching';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface Question {
  id: string;
  testId: string;
  type: QuestionType;
  text: string;
  points: number;
  options?: QuestionOption[];
  matchingPairs?: MatchingPair[];
  correctAnswer?: string;
  correctAnswers?: string[];
  numericTolerance?: number;
  explanation?: string;
  order: number;
}

export interface TestSettings {
  name: string;
  description: string;
  timeLimitMinutes: number | null;
  attemptLimit: number | null;
  passcode: string | null;
  emailWhitelist: string[];
  studentIdList: string[];
  accessMode: 'open' | 'whitelist-email' | 'whitelist-id' | 'passcode';
  startDate: string | null;
  endDate: string | null;
  showResults: boolean;
  showCorrectAnswers: boolean;
  completionMessage: string;
  negativeMarking: boolean;
  negativeMarkingPenalty: number;
  allowBlankSubmissions: boolean;
  onePerPage: boolean;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  // Anti-cheat
  antiCheat: {
    tabSwitchDetection: boolean;
    fullscreenEnforcement: boolean;
    disableCopyPaste: boolean;
    disableRightClick: boolean;
    disableTextSelection: boolean;
    watermark: boolean;
    preventRefresh: boolean;
    resumeControl: boolean;
  };
  notifyOnSubmit: boolean;
}

export interface Test {
  id: string;
  ownerId: string;
  settings: TestSettings;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  published: boolean;
  slug: string;
}

export interface AntiCheatEvent {
  id: string;
  attemptId: string;
  type: 'tab-switch' | 'fullscreen-exit' | 'copy-attempt' | 'right-click' | 'refresh-attempt' | 'paste-attempt' | 'selection-attempt';
  timestamp: string;
  details?: string;
}

export interface Answer {
  questionId: string;
  answer: string | string[] | Record<string, string>;
  flagged: boolean;
  timeSpentSeconds: number;
  essayGrade?: number;
}

export interface Attempt {
  id: string;
  testId: string;
  takerName: string;
  takerFatherName: string;
  takerEmail: string;
  takerStudentId: string;
  answers: Answer[];
  score: number | null;
  maxScore: number;
  percentage: number | null;
  startedAt: string;
  submittedAt: string | null;
  timeTakenSeconds: number | null;
  attemptNumber: number;
  status: 'in-progress' | 'submitted' | 'paused' | 'expired';
  antiCheatEvents: AntiCheatEvent[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface Session {
  userId: string;
  token: string;
  expiresAt: string;
}

export interface AppState {
  users: User[];
  tests: Test[];
  attempts: Attempt[];
  session: Session | null;
  theme: 'light' | 'dark';
}
