import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getTest, getAttempt, getTestAttempts, updateAttempt } from '../firestoreStore';
import { Test, Attempt, Question } from '../types';
import { ArrowLeft, Download, Check, X, Minus, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { generatePDFReport } from '../utils/pdf';

export default function ResultDetail() {
  const { id, attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [allAttempts, setAllAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [essayGrades, setEssayGrades] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [showAntiCheat, setShowAntiCheat] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (id) {
        const t = await getTest(id);
        setTest(t);
        
        // Load all attempts for this test
        const allTestAttempts = await getTestAttempts(id);
        setAllAttempts(allTestAttempts.filter(a => a.status === 'submitted'));
      }
      if (attemptId) {
        const a = await getAttempt(attemptId);
        setAttempt(a);
      }
      setLoading(false);
    }
    loadData();
  }, [id, attemptId]);
  
  // Get all attempts for the same student
  const studentAttempts = attempt ? allAttempts.filter(a => 
    a.takerEmail === attempt.takerEmail || 
    (a.takerName === attempt.takerName && a.takerFatherName === attempt.takerFatherName)
  ).sort((a, b) => b.attemptNumber - a.attemptNumber) : [];

  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading result…</div>;
  }

  if (!test || !attempt) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Result not found.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 px-3 py-1.5 text-xs font-medium border cursor-pointer rounded"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const handleExportPDF = () => {
    generatePDFReport(test, attempt);
  };

  return (
    <div className="max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6 pb-4">
        <Link to={`/test/${test.id}/results`} className="text-xs no-underline flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={12} /> Back to Results
        </Link>
      </div>

      {/* Student Info Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              {attempt.takerName}
            </h1>
            {attempt.takerFatherName && (
              <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                S/O {attempt.takerFatherName}
              </p>
            )}
            <div className="flex flex-wrap gap-3 mt-2">
              {attempt.takerEmail && (
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  {attempt.takerEmail}
                </span>
              )}
              {attempt.takerStudentId && (
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  ID: {attempt.takerStudentId}
                </span>
              )}
              {attempt.takerIP && (
                <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  IP: {attempt.takerIP}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Download size={14} /> Export PDF
          </button>
        </div>
        
        {/* Attempt Switcher */}
        {studentAttempts.length > 1 && (
          <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
              View Different Attempts ({studentAttempts.length} total)
            </p>
            <div className="flex flex-wrap gap-2">
              {studentAttempts.map(a => (
                <Link
                  key={a.id}
                  to={`/test/${test!.id}/results/${a.id}`}
                  className="px-3 py-1.5 text-xs font-medium no-underline rounded"
                  style={{
                    backgroundColor: a.id === attempt.id ? 'var(--primary)' : 'var(--surface)',
                    color: a.id === attempt.id ? '#fff' : 'var(--text)',
                    border: a.id === attempt.id ? 'none' : '1px solid var(--border)'
                  }}
                >
                  Attempt #{a.attemptNumber} — {a.percentage}%
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
            {attempt.percentage}%
          </div>
          <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Score</div>
        </div>
        <div className="p-4 rounded" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>{attempt.score}/{attempt.maxScore}</div>
          <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Points</div>
        </div>
        <div className="p-4 rounded" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>
            {attempt.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${attempt.timeTakenSeconds % 60}s` : '—'}
          </div>
          <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Time Taken</div>
        </div>
        <div className="p-4 rounded" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text)' }}>#{attempt.attemptNumber}</div>
          <div className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Attempt</div>
        </div>
      </div>

      {/* Anti-Cheat Events */}
      {attempt.antiCheatEvents.length > 0 && (
        <div className="mb-6 rounded" style={{ backgroundColor: 'var(--warning)' + '08' }}>
          <button
            onClick={() => setShowAntiCheat(!showAntiCheat)}
            className="w-full p-3 flex items-center justify-between cursor-pointer border-none"
            style={{ backgroundColor: 'transparent' }}
          >
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--warning)' }}>
              <span className="text-lg">⚠</span>
              Anti-Cheat Events ({attempt.antiCheatEvents.length})
            </h3>
            {showAntiCheat ? <ChevronUp size={16} style={{ color: 'var(--warning)' }} /> : <ChevronDown size={16} style={{ color: 'var(--warning)' }} />}
          </button>
          {showAntiCheat && (
            <div className="px-3 pb-3 space-y-2">
              {attempt.antiCheatEvents.map(event => (
                <div key={event.id} className="flex items-start gap-3 text-xs p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                  <span className="font-mono font-medium" style={{ color: 'var(--text-muted)' }}>
                    {format(new Date(event.timestamp), 'HH:mm:ss')}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--text)' }}>{event.type}</span>
                  {event.details && <span style={{ color: 'var(--text-secondary)' }}>— {event.details}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Essay Grading Section */}
      {test.questions.some((q: Question) => q.type === 'essay') && (
        <div className="mb-6 p-4 rounded" style={{ backgroundColor: 'var(--surface)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Manual Grading Required
            </h3>
            <button
              onClick={async () => {
                setSaving(true);
                const updatedAttempt = { ...attempt };
                let totalScore = updatedAttempt.score || 0;
                
                test.questions.forEach((q: Question) => {
                  if (q.type === 'essay' && essayGrades[q.id] !== undefined) {
                    const answer = updatedAttempt.answers.find(a => a.questionId === q.id);
                    if (answer) {
                      answer.essayGrade = essayGrades[q.id];
                      totalScore += essayGrades[q.id];
                    }
                  }
                });
                
                updatedAttempt.score = totalScore;
                updatedAttempt.percentage = Math.round((totalScore / updatedAttempt.maxScore) * 100);
                
                await updateAttempt(updatedAttempt);
                setAttempt(updatedAttempt);
                setSaving(false);
              }}
              disabled={saving}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold border cursor-pointer disabled:opacity-50"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              <Save size={12} /> {saving ? 'Saving...' : 'Save Grades'}
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Grade essay questions manually. Points will be added to the total score.
          </p>
        </div>
      )}

      {/* Question Breakdown Header */}
      <div className="mb-4 pb-3">
        <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
          Question Breakdown
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {test.questions.length} questions · Detailed review of each question
        </p>
      </div>

      {/* Questions List */}
      <div className="space-y-2">
        {test.questions.map((q: Question, idx: number) => {
          const answer = attempt.answers.find(a => a.questionId === q.id);
          const isCorrect = checkCorrectness(q, answer);
          const isEssay = q.type === 'essay';
          const essayGrade = answer?.essayGrade ?? essayGrades[q.id];

          return (
            <div key={q.id} className="p-3 rounded" style={{ backgroundColor: 'var(--surface)' }}>
              {/* Question Header */}
              <div className="flex items-start justify-between mb-2 pb-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-7 h-7 rounded font-bold text-xs" 
                    style={{ 
                      backgroundColor: isCorrect === true ? 'var(--success)' + '15' : isCorrect === false ? 'var(--error)' + '15' : 'var(--bg-secondary)',
                      color: isCorrect === true ? 'var(--success)' : isCorrect === false ? 'var(--error)' : 'var(--text-muted)'
                    }}>
                    {idx + 1}
                  </div>
                  <div>
                    {isEssay ? (
                      <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent)' + '20', color: 'var(--accent)' }}>
                        Essay - Manual Grading
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isCorrect === true && <Check size={16} strokeWidth={2.5} style={{ color: 'var(--success)' }} />}
                        {isCorrect === false && <X size={16} strokeWidth={2.5} style={{ color: 'var(--error)' }} />}
                        {isCorrect === null && <Minus size={16} style={{ color: 'var(--text-muted)' }} />}
                        <span className="text-xs font-medium" style={{ color: isCorrect === true ? 'var(--success)' : isCorrect === false ? 'var(--error)' : 'var(--text-muted)' }}>
                          {isCorrect === true ? 'Correct' : isCorrect === false ? 'Incorrect' : 'Not answered'}
                        </span>
                      </div>
                    )}
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{q.points} points</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEssay && essayGrade !== undefined && (
                    <span className="text-sm font-bold px-3 py-1 rounded" style={{ backgroundColor: 'var(--success)' + '15', color: 'var(--success)' }}>
                      Graded: {essayGrade}/{q.points}
                    </span>
                  )}
                  {answer?.flagged && (
                    <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: 'var(--warning)' + '20', color: 'var(--warning)' }}>
                      ⚑ Flagged
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="mb-2">
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{q.text}</p>
              </div>

              {/* Student Answer */}
              <div className="mb-2">
                <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Student's Answer
                </label>
                <div className="px-2.5 py-1.5 rounded" style={{ 
                  backgroundColor: 'var(--bg-secondary)'
                }}>
                  {isEssay ? (
                    <div className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text)' }}>
                      {formatAnswer(answer?.answer) || '(no answer)'}
                    </div>
                  ) : (
                    <span className="text-xs" style={{ color: isCorrect === false ? 'var(--error)' : isCorrect === true ? 'var(--success)' : 'var(--text)' }}>
                      {formatAnswer(answer?.answer) || '(no answer)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Essay Grading Input */}
              {isEssay && (
                <div className="mb-2 p-2.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text)' }}>
                    Assign Points (0-{q.points}):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={q.points}
                    value={essayGrades[q.id] ?? ''}
                    onChange={(e) => {
                      const value = Math.min(q.points, Math.max(0, parseFloat(e.target.value) || 0));
                      setEssayGrades({ ...essayGrades, [q.id]: value });
                    }}
                    className="w-24 px-3 py-2 rounded border text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Correct Answer & Explanation */}
              {!isEssay && test.settings.showCorrectAnswers && (
                <div className="space-y-1.5">
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                      Correct Answer
                    </label>
                    <div className="px-2.5 py-1.5 rounded" style={{ backgroundColor: 'var(--success)' + '08' }}>
                      <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                        {getCorrectAnswer(q)}
                      </span>
                    </div>
                  </div>
                  
                  {q.explanation && (
                    <div>
                      <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-muted)' }}>
                        Explanation
                      </label>
                      <div className="px-2.5 py-1.5 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {q.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function checkCorrectness(question: any, answer: any): boolean | null {
  if (!answer || !answer.answer || answer.answer === '') return null;
  if (question.type === 'essay') return null;

  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
      return question.options?.some((o: any) => o.isCorrect && o.text === answer.answer) || false;
    case 'multiple-choice-multi': {
      const correct = question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text) || [];
      const selected = Array.isArray(answer.answer) ? answer.answer : [];
      return correct.length === selected.length && correct.every((c: string) => selected.includes(c));
    }
    case 'fill-blank':
    case 'short-answer':
      return (answer.answer as string).toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
    case 'numeric': {
      const numAns = parseFloat(answer.answer as string);
      const numCorrect = parseFloat(question.correctAnswer || '0');
      const tol = question.numericTolerance || 0;
      return Math.abs(numAns - numCorrect) <= tol;
    }
    case 'matching': {
      const pairs = question.matchingPairs || [];
      const matchAns = answer.answer as Record<string, string>;
      return pairs.every((p: any) => matchAns[p.id] === p.right);
    }
    default:
      return null;
  }
}

function formatAnswer(answer: any): string {
  if (!answer) return '';
  if (Array.isArray(answer)) return answer.join(', ');
  if (typeof answer === 'object') return Object.values(answer).join(', ');
  return String(answer);
}

function getCorrectAnswer(question: any): string {
  switch (question.type) {
    case 'multiple-choice-single':
    case 'true-false':
      return question.options?.find((o: any) => o.isCorrect)?.text || '—';
    case 'multiple-choice-multi':
      return question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.text).join(', ') || '—';
    case 'fill-blank':
    case 'short-answer':
    case 'numeric':
      return question.correctAnswer || '—';
    case 'matching':
      return question.matchingPairs?.map((p: any) => `${p.left} → ${p.right}`).join('; ') || '—';
    default:
      return '—';
  }
}
