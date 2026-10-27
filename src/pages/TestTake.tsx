import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getTestBySlug, createAttempt, updateAttempt, submitAttempt, checkAttemptLimit, getFirstAttemptNames } from '../firestoreStore';
import { Test, Question, Attempt, Answer, AntiCheatEvent } from '../types';
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, Lock } from 'lucide-react';
import katex from 'katex';
import { detectIP } from '../utils/ip';
import PasswordInput from '../components/PasswordInput';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function renderMath(text: string): string {
  return text
    .replace(/\$\$(.+?)\$\$/g, (_, math) => {
      try { return katex.renderToString(math, { displayMode: true, throwOnError: false }); } catch { return math; }
    })
    .replace(/\$(.+?)\$/g, (_, math) => {
      try { return katex.renderToString(math, { displayMode: false, throwOnError: false }); } catch { return math; }
    });
}

export default function TestTake() {
  const { slug } = useParams();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<'gate-access' | 'gate-identity' | 'running' | 'submitting' | 'submitted'>('gate-access');
  const [takerName, setTakerName] = useState('');
  const [takerFatherName, setTakerFatherName] = useState('');
  const [takerEmail, setTakerEmail] = useState('');
  const [takerStudentId, setTakerStudentId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [gateError, setGateError] = useState('');
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [antiCheatEvents, setAntiCheatEvents] = useState<AntiCheatEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [userIP, setUserIP] = useState<string>('');
  const [ipBlocked, setIpBlocked] = useState<string | null>(null);
  const [namesLocked, setNamesLocked] = useState(false);
  const [lockedName, setLockedName] = useState('');
  const [lockedFatherName, setLockedFatherName] = useState('');

  useEffect(() => {
    async function loadTest() {
      if (slug) {
        const t = await getTestBySlug(slug);
        setTest(t);
        
        // Detect IP early and check attempt limits
        if (t) {
          const ip = await detectIP();
          setUserIP(ip);
          
          // Check if this IP has exceeded attempt limits
          if (t.settings.attemptLimit !== null) {
            const limitCheck = await checkAttemptLimit(t.id, ip, t.settings.attemptLimit);
            if (!limitCheck.allowed) {
              setIpBlocked(limitCheck.message || null);
            }
          }
        }
      }
      setLoading(false);
    }
    loadTest();
  }, [slug]);

  // Anti-cheat: blur detection
  useEffect(() => {
    if (phase !== 'running' || !test?.settings.antiCheat.tabSwitchDetection) return;
    const handleBlur = () => {
      logEvent('tab-switch', 'Window lost focus');
      setPaused(true);
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [phase, test?.settings.antiCheat.tabSwitchDetection]);

  // Anti-cheat: prevent refresh
  useEffect(() => {
    if (phase !== 'running' || !test?.settings.antiCheat.preventRefresh) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your test is in progress.';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase, test?.settings.antiCheat.preventRefresh]);

  // Check for previous attempts and lock names if needed
  useEffect(() => {
    async function checkPreviousAttempts() {
      if (userIP && test && phase === 'gate-identity') {
        const previousNames = await getFirstAttemptNames(test.id, userIP);
        if (previousNames) {
          setNamesLocked(true);
          setLockedName(previousNames.takerName);
          setLockedFatherName(previousNames.takerFatherName);
          setTakerName(previousNames.takerName);
          setTakerFatherName(previousNames.takerFatherName);
        }
      }
    }
    checkPreviousAttempts();
  }, [userIP, test, phase]);

  function logEvent(type: AntiCheatEvent['type'], details?: string) {
    if (!attempt) return;
    const event: AntiCheatEvent = { id: generateId(), attemptId: attempt.id, type, timestamp: new Date().toISOString(), details };
    setAntiCheatEvents(prev => [...prev, event]);
  }

  const handleSubmit = useCallback(async () => {
    if (!attempt) return;
    
    // Immediately show submitting screen
    setPhase('submitting');
    if (timerRef.current) clearInterval(timerRef.current);
    
    try {
      const finalAttempt = { ...attempt, answers, antiCheatEvents: [...attempt.antiCheatEvents, ...antiCheatEvents] };
      await updateAttempt(finalAttempt);
      const submitted = await submitAttempt(attempt.id);
      if (submitted) {
        setAttempt(submitted);
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      // Always show submitted screen after attempt
      setPhase('submitted');
    }
  }, [attempt, answers, antiCheatEvents]);

  // Timer
  useEffect(() => {
    if (phase !== 'running' || timeLeft === null || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timeLeft !== null]);

  // Auto-submit on timer expiry
  useEffect(() => {
    if (timeLeft === 0 && phase === 'running' && attempt) {
      handleSubmit();
    }
  }, [timeLeft, phase, attempt, handleSubmit]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading test…</p>
    </div>;
  }

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Not Found</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This test link is invalid or the test has been removed.</p>
        </div>
      </div>
    );
  }

  if (!test.published) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <Lock size={24} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h1 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Not Available</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This test has not been published yet.</p>
        </div>
      </div>
    );
  }

  // IP-based attempt limit block
  if (ipBlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-6 max-w-sm">
          <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--error)' + '20' }}>
            <Lock size={20} style={{ color: 'var(--error)' }} />
          </div>
          <h1 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            Attempt Limit Reached
          </h1>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            {ipBlocked}
          </p>
          {userIP && (
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Device ID: {userIP}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Please contact your instructor if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  const now = new Date();
  if (test.settings.startDate && new Date(test.settings.startDate) > now) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Test Not Yet Open</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Available on {new Date(test.settings.startDate).toLocaleString()}.</p>
        </div>
      </div>
    );
  }
  if (test.settings.endDate && new Date(test.settings.endDate) < now) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Test Has Ended</h1>
        </div>
      </div>
    );
  }

  // Gate Step 1: Access verification
  if (phase === 'gate-access') {
    const needsEmail = test.settings.accessMode === 'whitelist-email';
    const needsStudentId = test.settings.accessMode === 'whitelist-id';
    const needsPasscode = test.settings.accessMode === 'passcode';
    const needsAnyAccessField = needsEmail || needsStudentId || needsPasscode;

    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-sm">
          <div className="mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h1 className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              {test.settings.name}
            </h1>
          </div>
          {test.settings.description && (
            <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{test.settings.description}</p>
          )}
          <div className="text-xs mb-4 p-2.5 rounded border space-y-0.5" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <div>{test.questions.length} questions · {test.questions.reduce((s: number, q: Question) => s + q.points, 0)} points</div>
            {test.settings.timeLimitMinutes && <div>Time limit: {test.settings.timeLimitMinutes} min</div>}
            {test.settings.attemptLimit && <div>Attempts allowed: {test.settings.attemptLimit}</div>}
            {userIP && <div className="text-mono mt-1" style={{ color: 'var(--text-muted)' }}>Device: {userIP}</div>}
          </div>

          {gateError && (
            <div className="mb-3 px-2.5 py-2 rounded text-xs border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              {gateError}
            </div>
          )}

          {needsAnyAccessField ? (
            <>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Please verify your identity to access this test.
              </p>
              <div className="space-y-2.5">
                {needsEmail && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Email address</label>
                    <input type="email" value={takerEmail} onChange={e => setTakerEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      placeholder="you@university.edu" />
                  </div>
                )}
                {needsStudentId && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Student ID</label>
                    <input type="text" value={takerStudentId} onChange={e => setTakerStudentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border text-xs outline-none text-mono"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      placeholder="e.g. STU2024001" />
                  </div>
                )}
                {needsPasscode && (
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Test passcode</label>
                    <PasswordInput
                      value={passcode}
                      onChange={e => setPasscode(e.target.value)}
                      placeholder="Enter passcode"
                      className="text-mono"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setGateError('');
                  if (needsPasscode && passcode !== test.settings.passcode) {
                    setGateError('Incorrect passcode.'); return;
                  }
                  if (test.settings.accessMode === 'whitelist-email' && !test.settings.emailWhitelist.includes(takerEmail.toLowerCase())) {
                    setGateError('This email is not authorized.'); return;
                  }
                  if (test.settings.accessMode === 'whitelist-id' && !test.settings.studentIdList.includes(takerStudentId)) {
                    setGateError('This student ID is not authorized.'); return;
                  }
                  if (needsEmail && !takerEmail.trim()) { setGateError('Email is required.'); return; }
                  if (needsStudentId && !takerStudentId.trim()) { setGateError('Student ID is required.'); return; }
                  setPhase('gate-identity');
                }}
                className="w-full mt-4 py-2 rounded text-xs font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Continue
              </button>
            </>
          ) : (
            <button onClick={() => setPhase('gate-identity')}
              className="w-full py-2 rounded text-xs font-semibold border-none cursor-pointer"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
              Continue
            </button>
          )}
        </div>
      </div>
    );
  }

  // Gate Step 2: Identity collection
  if (phase === 'gate-identity') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-sm">
          <div className="mb-4 pb-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <h1 className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              {test.settings.name}
            </h1>
            <button onClick={() => { setPhase('gate-access'); setGateError(''); }}
              className="text-xs border-none bg-transparent cursor-pointer" style={{ color: 'var(--accent)' }}>
              ← Back
            </button>
          </div>

          {namesLocked ? (
            <>
              <div className="mb-4 p-3 rounded text-xs" style={{ backgroundColor: 'var(--accent)' + '10', color: 'var(--accent)' }}>
                <p className="font-semibold mb-1">Returning Student</p>
                <p>Your identity has been verified from previous attempt. Names are locked for security.</p>
              </div>
              
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Full name</label>
                  <input type="text" value={lockedName} readOnly
                    className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Father's name</label>
                  <input type="text" value={lockedFatherName} readOnly
                    className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Enter your details to begin the test.
              </p>

              {gateError && (
                <div className="mb-3 px-2.5 py-2 rounded text-xs border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
                  {gateError}
                </div>
              )}

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Full name <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="text" value={takerName} onChange={e => setTakerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Father's name <span style={{ color: 'var(--error)' }}>*</span></label>
                  <input type="text" value={takerFatherName} onChange={e => setTakerFatherName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="Your father's full name" />
                </div>
              </div>
            </>
          )}

          <button
            onClick={async () => {
              setGateError('');
              
              // Skip validation if names are locked (returning student)
              if (!namesLocked) {
                // Validate name
                if (!takerName.trim()) { 
                  setGateError('Full name is required.'); 
                  return; 
                }
                
                // Name validation: minimum 3 characters, only letters and spaces
                const nameRegex = /^[a-zA-Z\s]{3,50}$/;
                if (!nameRegex.test(takerName.trim())) {
                  setGateError('Please enter a valid name (3-50 characters, letters only).');
                  return;
                }
                
                // Validate father's name
                if (!takerFatherName.trim()) { 
                  setGateError("Father's name is required."); 
                  return; 
                }
                
                // Father's name validation: minimum 3 characters, only letters and spaces
                if (!nameRegex.test(takerFatherName.trim())) {
                  setGateError("Please enter a valid father's name (3-50 characters, letters only).");
                  return;
                }
              }

              // Detect IP address
              const ip = await detectIP();

              // Check IP-based attempt limit
              const limitCheck = await checkAttemptLimit(test.id, ip, test.settings.attemptLimit);
              if (!limitCheck.allowed) {
                setGateError(limitCheck.message || 'Attempt limit reached from this device.');
                return;
              }

              const newAttempt = await createAttempt(test.id, takerName, takerFatherName, takerEmail, takerStudentId, ip);
              setAttempt(newAttempt);
              
              // Shuffle questions and options ONCE when test starts
              let questions = [...test.questions];
              if (test.settings.shuffleQuestions) {
                questions = questions.sort(() => Math.random() - 0.5);
              }
              if (test.settings.shuffleOptions) {
                questions = questions.map(q => ({
                  ...q,
                  options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : q.options
                }));
              }
              setShuffledQuestions(questions);
              
              setAnswers(questions.map((q: Question) => ({ questionId: q.id, answer: '', flagged: false, timeSpentSeconds: 0 })));
              setTimeLeft(test.settings.timeLimitMinutes ? test.settings.timeLimitMinutes * 60 : null);
              setPhase('running');
            }}
            className="w-full mt-4 py-2 rounded text-xs font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            Begin test
          </button>
        </div>
      </div>
    );
  }

    // Submitting screen - shows immediately when user clicks Submit
  if (phase === 'submitting') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center max-w-sm">
          {/* Animated spinner */}
          <div className="w-12 h-12 mx-auto mb-4 relative">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'var(--border)' }} />
            <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          </div>
          
          <h1 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            Submitting Your Test…
          </h1>
          <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
            Please wait while we save your answers. Do not close this page.
          </p>
          
          {/* Progress indicator */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div className="h-full rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)', width: '70%' }} />
          </div>
        </div>
      </div>
    );
  }

  // Submitted view
  if (phase === 'submitted' && attempt) {
    const questions = shuffledQuestions.length > 0 ? shuffledQuestions : test.questions;
    
    return (
      <div className="min-h-screen px-3 sm:px-4 py-6 sm:py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-3xl mx-auto">
          {/* Header with score */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'var(--success)' + '20' }}>
              <span className="text-xl" style={{ color: 'var(--success)' }}>✓</span>
            </div>
            <h1 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Test Submitted</h1>
            <p className="text-xs mb-4 px-2" style={{ color: 'var(--text-secondary)' }}>{test.settings.completionMessage}</p>
            {test.settings.showResults && attempt.score !== null && (
              <div className="p-3 sm:p-4 rounded border inline-block min-w-[140px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
                  {attempt.percentage}%
                </div>
                <div className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {attempt.score} / {attempt.maxScore} points
                </div>
              </div>
            )}
          </div>

          {/* Detailed results */}
          {test.settings.showResults && (
            <div className="space-y-2 sm:space-y-3">
              <h2 className="text-sm font-semibold mb-2 sm:mb-3" style={{ color: 'var(--text)' }}>Question Breakdown</h2>
              {questions.map((q: Question, idx: number) => {
                const studentAnswer = attempt.answers.find(a => a.questionId === q.id);
                const isCorrect = checkAnswerCorrectness(q, studentAnswer?.answer);
                
                return (
                  <div key={q.id} className="p-2.5 sm:p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {/* Question header */}
                    <div className="mb-2">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                        <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Q{idx + 1}</span>
                        {isCorrect === true && (
                          <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'var(--success)' + '20', color: 'var(--success)' }}>
                            ✓ Correct
                          </span>
                        )}
                        {isCorrect === false && (
                          <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'var(--error)' + '20', color: 'var(--error)' }}>
                            ✗ Incorrect
                          </span>
                        )}
                        {isCorrect === null && (
                          <span className="text-xs px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: 'var(--text-muted)' + '20', color: 'var(--text-muted)' }}>
                            Not answered
                          </span>
                        )}
                        <span className="text-xs ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>{q.points} pts</span>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }}>{q.text}</p>
                    </div>
                    
                    {/* Answer details */}
                    <div className="space-y-1.5 text-xs sm:text-sm mt-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      <div className="break-words">
                        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Your answer: </span>
                        <span className="break-words" style={{ color: isCorrect === false ? 'var(--error)' : 'var(--text)' }}>
                          {formatStudentAnswer(q, studentAnswer?.answer) || '(no answer)'}
                        </span>
                      </div>
                      {test.settings.showCorrectAnswers && (
                        <div className="break-words">
                          <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Correct answer: </span>
                          <span className="break-words" style={{ color: 'var(--success)' }}>
                            {getCorrectAnswerText(q)}
                          </span>
                        </div>
                      )}
                      {test.settings.showCorrectAnswers && q.explanation && (
                        <div className="mt-2 p-2 rounded break-words" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Explanation: </span>
                          <span className="break-words" style={{ color: 'var(--text-secondary)' }}>{q.explanation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Running phase
  const questions = shuffledQuestions.length > 0 ? shuffledQuestions : test.questions;
  const currentQ = questions[currentPage];
  const answeredCount = answers.filter((a: Answer) => a.answer !== '' && a.answer !== null).length;
  const acSettings = test.settings.antiCheat;

  // Generate random text for anti-cheat copy protection
  const generateRandomText = () => {
    const words = ['Lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];
    const randomWords = Array.from({ length: 20 }, () => words[Math.floor(Math.random() * words.length)]);
    return randomWords.join(' ');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}
      onCopy={acSettings.disableCopyPaste ? (e) => {
        e.preventDefault();
        logEvent('copy-attempt', 'Copy blocked - random text inserted');
        // Replace clipboard with random text
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', generateRandomText());
        }
      } : undefined}
      onPaste={acSettings.disableCopyPaste ? (e) => { 
        e.preventDefault(); 
        logEvent('paste-attempt'); 
      } : undefined}
      onContextMenu={acSettings.disableRightClick ? (e) => { e.preventDefault(); logEvent('right-click'); } : undefined}
    >
      {acSettings.watermark && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center opacity-[0.04]" style={{ userSelect: 'none' }}>
          <div className="text-4xl font-bold rotate-[-30deg] whitespace-nowrap" style={{ color: 'var(--text)' }}>
            {takerName} — {takerStudentId}
          </div>
        </div>
      )}

      {acSettings.disableTextSelection && (
        <style>{`.test-content * { user-select: none !important; }`}</style>
      )}

      <header className="border-b sticky top-0 z-40" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 h-10 flex items-center justify-between">
          <span className="font-semibold text-xs truncate" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {test.settings.name}
          </span>
          <div className="flex items-center gap-3">
            {timeLeft !== null && <TimerDisplay seconds={timeLeft} />}
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </header>

      {paused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="text-center p-6 rounded max-w-sm mx-4" style={{ backgroundColor: 'var(--surface)' }}>
            <AlertTriangle size={24} className="mx-auto mb-3" style={{ color: 'var(--warning)' }} />
            <h2 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Test Paused</h2>
            <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
              Suspicious activity detected. Your test has been paused.
            </p>
            <button onClick={() => setPaused(false)}
              className="px-4 py-2 rounded text-xs font-semibold border-none cursor-pointer"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
              Resume
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-40 shrink-0">
          <div className="sticky top-14">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Questions</p>
            <div className="grid grid-cols-5 gap-1">
              {questions.map((_: Question, idx: number) => {
                const isAnswered = answers[idx]?.answer !== '' && answers[idx]?.answer !== null;
                const isFlagged = flagged.has(idx);
                const isCurrent = idx === currentPage;
                return (
                  <button key={idx} onClick={() => setCurrentPage(idx)}
                    className="relative w-7 h-7 rounded text-xs font-medium border cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: isCurrent ? 'var(--primary)' : isAnswered ? 'var(--accent)' + '30' : 'var(--surface)',
                      borderColor: isCurrent ? 'var(--primary)' : isFlagged ? 'var(--warning)' : 'var(--border)',
                      color: isCurrent ? '#fff' : 'var(--text)',
                    }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 test-content min-w-0">
          {currentQ && (
            <QuestionRenderer
              question={currentQ}
              answer={answers[currentPage]?.answer || ''}
              onChange={(answer: any) => {
                const newAnswers = [...answers];
                newAnswers[currentPage] = { ...newAnswers[currentPage], answer };
                setAnswers(newAnswers);
              }}
            />
          )}

          {/* Mobile question navigation */}
          <div className="lg:hidden mt-3 p-2.5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Questions</p>
            <div className="flex flex-wrap gap-1.5">
              {questions.map((_: Question, idx: number) => {
                const isAnswered = answers[idx]?.answer !== '' && answers[idx]?.answer !== null;
                const isCurrent = idx === currentPage;
                const isFlagged = flagged.has(idx);
                return (
                  <button key={idx} onClick={() => setCurrentPage(idx)}
                    className="w-8 h-8 rounded text-xs font-medium border cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: isCurrent ? 'var(--primary)' : isAnswered ? 'var(--accent)' + '30' : 'var(--surface)',
                      borderColor: isCurrent ? 'var(--primary)' : isFlagged ? 'var(--warning)' : 'var(--border)',
                      color: isCurrent ? '#fff' : 'var(--text)',
                    }}>
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t gap-2" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer disabled:opacity-30 shrink-0"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
              <ChevronLeft size={12} /> <span className="hidden sm:inline">Previous</span>
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button onClick={() => {
                const newFlagged = new Set(flagged);
                if (newFlagged.has(currentPage)) newFlagged.delete(currentPage);
                else newFlagged.add(currentPage);
                setFlagged(newFlagged);
              }}
                className="px-2 sm:px-2.5 py-1.5 rounded text-xs border cursor-pointer flex items-center gap-1 shrink-0"
                style={{ borderColor: flagged.has(currentPage) ? 'var(--warning)' : 'var(--border)', backgroundColor: 'var(--surface)', color: flagged.has(currentPage) ? 'var(--warning)' : 'var(--text-muted)' }}>
                <Flag size={12} /> <span className="hidden sm:inline">{flagged.has(currentPage) ? 'Flagged' : 'Flag'}</span>
              </button>
              {currentPage < questions.length - 1 ? (
                <button onClick={() => setCurrentPage(currentPage + 1)}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded text-xs font-medium border-none cursor-pointer shrink-0"
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                  <span className="hidden sm:inline">Next</span> <ChevronRight size={12} />
                </button>
              ) : (
                <button onClick={handleSubmit}
                  className="px-2.5 sm:px-3 py-1.5 rounded text-xs font-semibold border-none cursor-pointer shrink-0"
                  style={{ backgroundColor: 'var(--success)', color: '#fff' }}>
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimerDisplay({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isWarning = seconds < 60;
  const isCritical = seconds < 30;

  return (
    <div className="flex items-center gap-1 text-xs font-mono font-medium"
      style={{ color: isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--text-secondary)' }}>
      <Clock size={12} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}

function QuestionRenderer({ question, answer, onChange }: {
  question: Question;
  answer: string | string[] | Record<string, string>;
  onChange: (answer: any) => void;
}) {
  const options = question.options || [];

  return (
    <div className="p-3 sm:p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          {question.points} pt{question.points !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="text-sm sm:text-base mb-3 leading-relaxed break-words" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderMath(question.text) }} />

      {(question.type === 'multiple-choice-single' || question.type === 'true-false') && (
        <div className="space-y-2">
          {options.map(opt => (
            <label key={opt.id} className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded border cursor-pointer transition-colors"
              style={{ borderColor: answer === opt.text ? 'var(--accent)' : 'var(--border)', backgroundColor: answer === opt.text ? 'var(--accent)' + '10' : 'transparent' }}>
              <input type="radio" name={question.id} checked={answer === opt.text} onChange={() => onChange(opt.text)} className="cursor-pointer mt-0.5 shrink-0" style={{ width: '16px', height: '16px' }} />
              <span className="text-xs sm:text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
            </label>
          ))}
        </div>
      )}

      {question.type === 'multiple-choice-multi' && (
        <div className="space-y-2">
          {options.map(opt => {
            const selected = Array.isArray(answer) ? answer.includes(opt.text) : false;
            return (
              <label key={opt.id} className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded border cursor-pointer transition-colors"
                style={{ borderColor: selected ? 'var(--accent)' : 'var(--border)', backgroundColor: selected ? 'var(--accent)' + '10' : 'transparent' }}>
                <input type="checkbox" checked={selected}
                  onChange={() => {
                    const arr = Array.isArray(answer) ? [...answer] : [];
                    if (selected) onChange(arr.filter((a: string) => a !== opt.text));
                    else onChange([...arr, opt.text]);
                  }} className="cursor-pointer mt-0.5 shrink-0" style={{ width: '16px', height: '16px' }} />
                <span className="text-xs sm:text-sm leading-relaxed break-words" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
              </label>
            );
          })}
        </div>
      )}

      {(question.type === 'fill-blank' || question.type === 'short-answer') && (
        <input type="text" value={(answer as string) || ''} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          placeholder="Type your answer..." />
      )}

      {question.type === 'numeric' && (
        <div>
          <input type="number" value={(answer as string) || ''} onChange={e => onChange(e.target.value)}
            className="w-full sm:w-48 px-3 py-2.5 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Enter a number" step="any" />
          {question.numericTolerance !== undefined && question.numericTolerance > 0 && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>±{question.numericTolerance} tolerance accepted</p>
          )}
        </div>
      )}

      {question.type === 'essay' && (
        <textarea value={(answer as string) || ''} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded border text-sm outline-none resize-y"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          rows={8} placeholder="Write your response..." />
      )}

      {question.type === 'matching' && (
        <div className="space-y-2.5">
          {(question.matchingPairs || []).map(pair => (
            <div key={pair.id} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm font-medium break-words" style={{ color: 'var(--text)' }}>{pair.left}</span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1">
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>→</span>
                <select
                  value={(answer as Record<string, string>)?.[pair.id] || ''}
                  onChange={e => {
                    const obj = { ...(answer as Record<string, string> || {}), [pair.id]: e.target.value };
                    onChange(obj);
                  }}
                  className="flex-1 px-2.5 py-2 rounded border text-xs sm:text-sm outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <option value="">Select...</option>
                  {(question.matchingPairs || []).map(p => (
                    <option key={p.id} value={p.right}>{p.right}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to check if an answer is correct
function checkAnswerCorrectness(question: Question, answer: any): boolean | null {
  if (!answer || answer === '') return null;
  
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
      return (answer as string).toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
    
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
      return null; // Essays require manual grading
    
    default:
      return null;
  }
}

// Helper function to format student's answer for display
function formatStudentAnswer(question: Question, answer: any): string {
  if (!answer || answer === '') return '';
  
  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
    case 'fill-blank':
    case 'short-answer':
    case 'numeric':
      return String(answer);
    
    case 'multiple-choice-multi':
      return Array.isArray(answer) ? answer.join(', ') : '';
    
    case 'matching': {
      const matchAnswers = answer as Record<string, string>;
      const pairs = question.matchingPairs || [];
      return pairs.map(pair => `${pair.left} → ${matchAnswers[pair.id] || '(not matched)'}`).join('; ');
    }
    
    case 'essay':
      return String(answer);
    
    default:
      return String(answer);
  }
}

// Helper function to get the correct answer text
function getCorrectAnswerText(question: Question): string {
  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
      return question.options?.find(o => o.isCorrect)?.text || '';
    
    case 'multiple-choice-multi':
      return question.options?.filter(o => o.isCorrect).map(o => o.text).join(', ') || '';
    
    case 'fill-blank':
    case 'short-answer':
    case 'numeric':
      return question.correctAnswer || '';
    
    case 'matching': {
      const pairs = question.matchingPairs || [];
      return pairs.map(pair => `${pair.left} → ${pair.right}`).join('; ');
    }
    
    case 'essay':
      return '(Requires manual grading)';
    
    default:
      return '';
  }
}
