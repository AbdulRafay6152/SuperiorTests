import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTestBySlug, createAttempt, updateAttempt, submitAttempt } from '../store';
import { Test, Question, Attempt, Answer, AntiCheatEvent } from '../types';
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, Lock } from 'lucide-react';
import katex from 'katex';

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
  const navigate = useNavigate();
  const test = getTestBySlug(slug || '');

  const [phase, setPhase] = useState<'gate' | 'running' | 'submitted'>('gate');
  const [takerName, setTakerName] = useState('');
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
      e.returnValue = 'Your test is in progress. Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase, test?.settings.antiCheat.preventRefresh]);

  // Anti-cheat: fullscreen enforcement
  useEffect(() => {
    if (phase !== 'running' || !test?.settings.antiCheat.fullscreenEnforcement) return;
    const check = () => {
      if (!document.fullscreenElement) {
        logEvent('fullscreen-exit', 'Exited fullscreen mode');
        setPaused(true);
      }
    };
    document.addEventListener('fullscreenchange', check);
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => document.removeEventListener('fullscreenchange', check);
  }, [phase, test?.settings.antiCheat.fullscreenEnforcement]);

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
  }, [timeLeft, phase]);

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Not Found</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This test link is invalid or the test has been removed.</p>
        </div>
      </div>
    );
  }

  if (!test.published) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <Lock size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Not Available</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This test has not been published yet.</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  if (test.settings.startDate && new Date(test.settings.startDate) > now) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Not Yet Open</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This test becomes available on {new Date(test.settings.startDate).toLocaleString()}.</p>
        </div>
      </div>
    );
  }
  if (test.settings.endDate && new Date(test.settings.endDate) < now) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Has Ended</h1>
          <p style={{ color: 'var(--text-secondary)' }}>This test is no longer accepting submissions.</p>
        </div>
      </div>
    );
  }

  function logEvent(type: AntiCheatEvent['type'], details?: string) {
    if (!attempt) return;
    const event: AntiCheatEvent = { id: generateId(), attemptId: attempt.id, type, timestamp: new Date().toISOString(), details };
    setAntiCheatEvents(prev => [...prev, event]);
  }

  function handleSubmit() {
    if (!attempt) return;
    const finalAttempt = { ...attempt, answers, antiCheatEvents: [...attempt.antiCheatEvents, ...antiCheatEvents] };
    updateAttempt(finalAttempt);
    const submitted = submitAttempt(attempt.id);
    if (submitted) {
      setAttempt(submitted);
      setPhase('submitted');
    }
    if (timerRef.current) clearInterval(timerRef.current);
  }

  // Gate phase
  if (phase === 'gate') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {test.settings.name}
          </h1>
          {test.settings.description && (
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{test.settings.description}</p>
          )}
          <div className="text-sm mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <div>{test.questions.length} questions · {test.questions.reduce((s, q) => s + q.points, 0)} total points</div>
            {test.settings.timeLimitMinutes && <div>Time limit: {test.settings.timeLimitMinutes} minutes</div>}
            {test.settings.attemptLimit && <div>Attempt limit: {test.settings.attemptLimit}</div>}
          </div>

          {gateError && (
            <div className="mb-4 p-3 rounded text-sm border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              {gateError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Full Name *</label>
              <input type="text" value={takerName} onChange={e => setTakerName(e.target.value)}
                className="w-full px-3 py-2 rounded border text-sm outline-none"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
            </div>
            {test.settings.accessMode !== 'whitelist-id' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Email *</label>
                <input type="email" value={takerEmail} onChange={e => setTakerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
            )}
            {test.settings.accessMode !== 'whitelist-email' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Student ID *</label>
                <input type="text" value={takerStudentId} onChange={e => setTakerStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded border text-sm outline-none font-mono"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
            )}
            {test.settings.accessMode === 'passcode' && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>Passcode *</label>
                <input type="password" value={passcode} onChange={e => setPasscode(e.target.value)}
                  className="w-full px-3 py-2 rounded border text-sm outline-none font-mono"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }} />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setGateError('');
              if (!takerName.trim()) { setGateError('Name is required.'); return; }
              if (test.settings.accessMode === 'passcode' && passcode !== test.settings.passcode) {
                setGateError('Incorrect passcode.'); return;
              }
              if (test.settings.accessMode === 'whitelist-email' && !test.settings.emailWhitelist.includes(takerEmail.toLowerCase())) {
                setGateError('Your email is not authorized to take this test.'); return;
              }
              if (test.settings.accessMode === 'whitelist-id' && !test.settings.studentIdList.includes(takerStudentId)) {
                setGateError('Your student ID is not authorized to take this test.'); return;
              }

              const newAttempt = createAttempt(test.id, takerName, takerEmail, takerStudentId);
              setAttempt(newAttempt);
              setAnswers(test.questions.map(q => ({ questionId: q.id, answer: '', flagged: false, timeSpentSeconds: 0 })));
              setTimeLeft(test.settings.timeLimitMinutes ? test.settings.timeLimitMinutes * 60 : null);
              setPhase('running');
            }}
            className="w-full mt-4 py-2.5 rounded text-sm font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            Begin Test
          </button>
        </div>
      </div>
    );
  }

  // Submitted
  if (phase === 'submitted' && attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--success)' + '20' }}>
            <span className="text-2xl" style={{ color: 'var(--success)' }}>✓</span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>Test Submitted</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{test.settings.completionMessage}</p>
          {test.settings.showResults && attempt.score !== null && (
            <div className="p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text)' }}>{attempt.percentage}%</div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{attempt.score} / {attempt.maxScore} points</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Running phase
  const questions = test.questions;
  const currentQ = questions[currentPage];
  const answeredCount = answers.filter(a => a.answer !== '' && a.answer !== null).length;

  const acSettings = test.settings.antiCheat;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}
      onCopy={acSettings.disableCopyPaste ? (e) => { e.preventDefault(); logEvent('copy-attempt'); } : undefined}
      onPaste={acSettings.disableCopyPaste ? (e) => { e.preventDefault(); logEvent('paste-attempt'); } : undefined}
      onContextMenu={acSettings.disableRightClick ? (e) => { e.preventDefault(); logEvent('right-click'); } : undefined}
    >
      {/* Watermark */}
      {acSettings.watermark && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center opacity-[0.04]" style={{ userSelect: 'none' }}>
          <div className="text-6xl font-bold rotate-[-30deg] whitespace-nowrap" style={{ color: 'var(--text)' }}>
            {takerName} — {takerStudentId}
          </div>
        </div>
      )}

      {/* Disable text selection */}
      {acSettings.disableTextSelection && (
        <style>{`.test-content * { user-select: none !important; }`}</style>
      )}

      {/* Header */}
      <header className="border-b sticky top-0 z-40" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-semibold text-sm truncate" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {test.settings.name}
          </span>
          <div className="flex items-center gap-4">
            {timeLeft !== null && <TimerDisplay seconds={timeLeft} />}
            <span className="text-sm hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
              {answeredCount}/{questions.length} answered
            </span>
          </div>
        </div>
      </header>

      {/* Pause overlay */}
      {paused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <div className="text-center p-8 rounded max-w-sm mx-4" style={{ backgroundColor: 'var(--surface)' }}>
            <AlertTriangle size={32} className="mx-auto mb-3" style={{ color: 'var(--warning)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text)' }}>Test Paused</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Suspicious activity was detected. Your test has been paused.
            </p>
            <button onClick={() => setPaused(false)}
              className="px-6 py-2 rounded text-sm font-semibold border-none cursor-pointer"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
              Resume
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex gap-6">
        {/* Question Navigator */}
        <div className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-16">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Questions</p>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((_, idx) => {
                const isAnswered = answers[idx]?.answer !== '' && answers[idx]?.answer !== null;
                const isFlagged = flagged.has(idx);
                const isCurrent = idx === currentPage;
                return (
                  <button key={idx} onClick={() => setCurrentPage(idx)}
                    className="relative w-8 h-8 rounded text-xs font-medium border cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: isCurrent ? 'var(--primary)' : isAnswered ? 'var(--accent)' + '30' : 'var(--surface)',
                      borderColor: isCurrent ? 'var(--primary)' : isFlagged ? 'var(--warning)' : 'var(--border)',
                      color: isCurrent ? '#fff' : 'var(--text)',
                    }}>
                    {idx + 1}
                    {isFlagged && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--warning)' }} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--primary)' }} /> Current</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded" style={{ backgroundColor: 'var(--accent)' + '30' }} /> Answered</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border" style={{ borderColor: 'var(--warning)' }} /> Flagged</div>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 test-content">
          {currentQ && (
            <QuestionRenderer
              question={currentQ}
              answer={answers[currentPage]?.answer || ''}
              onChange={(answer) => {
                const newAnswers = [...answers];
                newAnswers[currentPage] = { ...newAnswers[currentPage], answer };
                setAnswers(newAnswers);
              }}
              shuffleOptions={test.settings.shuffleOptions}
            />
          )}

          {/* Mobile question nav */}
          <div className="lg:hidden mt-4 flex flex-wrap gap-1.5">
            {questions.map((_, idx) => {
              const isAnswered = answers[idx]?.answer !== '' && answers[idx]?.answer !== null;
              const isCurrent = idx === currentPage;
              return (
                <button key={idx} onClick={() => setCurrentPage(idx)}
                  className="w-7 h-7 rounded text-xs font-medium border cursor-pointer"
                  style={{
                    backgroundColor: isCurrent ? 'var(--primary)' : isAnswered ? 'var(--accent)' + '30' : 'var(--surface)',
                    borderColor: isCurrent ? 'var(--primary)' : 'var(--border)',
                    color: isCurrent ? '#fff' : 'var(--text)',
                  }}>
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
              className="flex items-center gap-1 px-3 py-2 rounded text-sm font-medium border cursor-pointer disabled:opacity-30"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
              <ChevronLeft size={14} /> Previous
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                const newFlagged = new Set(flagged);
                if (newFlagged.has(currentPage)) newFlagged.delete(currentPage);
                else newFlagged.add(currentPage);
                setFlagged(newFlagged);
              }}
                className="px-3 py-2 rounded text-sm border cursor-pointer flex items-center gap-1"
                style={{ borderColor: flagged.has(currentPage) ? 'var(--warning)' : 'var(--border)', backgroundColor: 'var(--surface)', color: flagged.has(currentPage) ? 'var(--warning)' : 'var(--text-muted)' }}>
                <Flag size={14} /> {flagged.has(currentPage) ? 'Flagged' : 'Flag'}
              </button>
              {currentPage < questions.length - 1 ? (
                <button onClick={() => setCurrentPage(currentPage + 1)}
                  className="flex items-center gap-1 px-3 py-2 rounded text-sm font-medium border-none cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit}
                  className="px-4 py-2 rounded text-sm font-semibold border-none cursor-pointer"
                  style={{ backgroundColor: 'var(--success)', color: '#fff' }}>
                  Submit Test
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
    <div className="flex items-center gap-1.5 text-sm font-mono font-medium"
      style={{ color: isCritical ? 'var(--error)' : isWarning ? 'var(--warning)' : 'var(--text-secondary)' }}>
      <Clock size={14} />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}

function QuestionRenderer({ question, answer, onChange, shuffleOptions }: {
  question: Question;
  answer: string | string[] | Record<string, string>;
  onChange: (answer: any) => void;
  shuffleOptions: boolean;
}) {
  const options = question.options && shuffleOptions
    ? [...question.options].sort(() => Math.random() - 0.5)
    : question.options || [];

  return (
    <div className="p-5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
          {question.points} pt{question.points !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="text-base mb-4" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderMath(question.text) }} />

      {(question.type === 'multiple-choice-single' || question.type === 'true-false') && (
        <div className="space-y-2">
          {options.map(opt => (
            <label key={opt.id} className="flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-colors"
              style={{ borderColor: answer === opt.text ? 'var(--accent)' : 'var(--border)', backgroundColor: answer === opt.text ? 'var(--accent)' + '10' : 'transparent' }}>
              <input type="radio" name={question.id} checked={answer === opt.text} onChange={() => onChange(opt.text)} className="cursor-pointer" />
              <span className="text-sm" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
            </label>
          ))}
        </div>
      )}

      {question.type === 'multiple-choice-multi' && (
        <div className="space-y-2">
          {options.map(opt => {
            const selected = Array.isArray(answer) ? answer.includes(opt.text) : false;
            return (
              <label key={opt.id} className="flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-colors"
                style={{ borderColor: selected ? 'var(--accent)' : 'var(--border)', backgroundColor: selected ? 'var(--accent)' + '10' : 'transparent' }}>
                <input type="checkbox" checked={selected}
                  onChange={() => {
                    const arr = Array.isArray(answer) ? [...answer] : [];
                    if (selected) onChange(arr.filter(a => a !== opt.text));
                    else onChange([...arr, opt.text]);
                  }} className="cursor-pointer" />
                <span className="text-sm" style={{ color: 'var(--text)' }} dangerouslySetInnerHTML={{ __html: renderMath(opt.text) }} />
              </label>
            );
          })}
        </div>
      )}

      {(question.type === 'fill-blank' || question.type === 'short-answer') && (
        <input type="text" value={(answer as string) || ''} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          placeholder="Type your answer..." />
      )}

      {question.type === 'numeric' && (
        <div>
          <input type="number" value={(answer as string) || ''} onChange={e => onChange(e.target.value)}
            className="w-48 px-3 py-2 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Enter a number" step="any" />
          {question.numericTolerance !== undefined && question.numericTolerance > 0 && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>±{question.numericTolerance} tolerance accepted</p>
          )}
        </div>
      )}

      {question.type === 'essay' && (
        <textarea value={(answer as string) || ''} onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 rounded border text-sm outline-none resize-y"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          rows={8} placeholder="Write your response..." />
      )}

      {question.type === 'matching' && (
        <div className="space-y-3">
          {(question.matchingPairs || []).map(pair => (
            <div key={pair.id} className="flex items-center gap-3">
              <span className="text-sm font-medium w-32 shrink-0" style={{ color: 'var(--text)' }}>{pair.left}</span>
              <span style={{ color: 'var(--text-muted)' }}>→</span>
              <select
                value={(answer as Record<string, string>)?.[pair.id] || ''}
                onChange={e => {
                  const obj = { ...(answer as Record<string, string> || {}), [pair.id]: e.target.value };
                  onChange(obj);
                }}
                className="flex-1 px-3 py-2 rounded border text-sm outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                <option value="">Select...</option>
                {(question.matchingPairs || []).map(p => (
                  <option key={p.id} value={p.right}>{p.right}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
