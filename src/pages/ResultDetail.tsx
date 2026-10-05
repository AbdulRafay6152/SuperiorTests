import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTest, getAttempt, updateAttempt } from '../firestoreStore';
import { Test, Attempt, Question } from '../types';
import { ArrowLeft, Download, Check, X, Minus, Save } from 'lucide-react';
import { format } from 'date-fns';
import { generatePDFReport } from '../utils/pdf';

export default function ResultDetail() {
  const { id, attemptId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [essayGrades, setEssayGrades] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (id) {
        const t = await getTest(id);
        setTest(t);
      }
      if (attemptId) {
        const a = await getAttempt(attemptId);
        setAttempt(a);
      }
      setLoading(false);
    }
    loadData();
  }, [id, attemptId]);

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
      <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <Link to={`/test/${test.id}/results`} className="text-xs no-underline" style={{ color: 'var(--text-muted)' }}>
          ← Back to Results
        </Link>
      </div>

      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {attempt.takerName}
          </h1>
          {attempt.takerFatherName && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              S/O {attempt.takerFatherName}
            </p>
          )}
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {attempt.takerEmail} {attempt.takerStudentId && `· ID: ${attempt.takerStudentId}`}
          </p>
        </div>
        <button onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
          <Download size={12} /> Export PDF
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-lg font-bold" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
            {attempt.percentage}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Score</div>
        </div>
        <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{attempt.score}/{attempt.maxScore}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Points</div>
        </div>
        <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>
            {attempt.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${attempt.timeTakenSeconds % 60}s` : '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Time Taken</div>
        </div>
        <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>#{attempt.attemptNumber}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Attempt</div>
        </div>
      </div>

      {attempt.antiCheatEvents.length > 0 && (
        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--warning)' + '08', borderColor: 'var(--warning)' + '40' }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--warning)' }}>
            Anti-Cheat Events ({attempt.antiCheatEvents.length})
          </h3>
          <div className="space-y-1">
            {attempt.antiCheatEvents.map(event => (
              <div key={event.id} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                  {format(new Date(event.timestamp), 'HH:mm:ss')}
                </span>
                <span>{event.type}</span>
                {event.details && <span style={{ color: 'var(--text-muted)' }}>— {event.details}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-xs font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
        Question Breakdown
      </h2>
      {/* Essay Grading Section */}
      {test.questions.some((q: Question) => q.type === 'essay') && (
        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
              Manual Grading Required
            </h3>
            <button
              onClick={async () => {
                setSaving(true);
                // Update attempt with essay grades
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
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border cursor-pointer disabled:opacity-50"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              <Save size={10} /> {saving ? 'Saving...' : 'Save Grades'}
            </button>
          </div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
            Grade essay questions manually. Points will be added to the total score.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {test.questions.map((q: Question, idx: number) => {
          const answer = attempt.answers.find(a => a.questionId === q.id);
          const isCorrect = checkCorrectness(q, answer);
          const isEssay = q.type === 'essay';
          const essayGrade = answer?.essayGrade ?? essayGrades[q.id];

          return (
            <div key={q.id} className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Q{idx + 1}</span>
                  {isEssay ? (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--accent)' + '20', color: 'var(--accent)' }}>
                      Essay - Manual Grading
                    </span>
                  ) : (
                    <>
                      {isCorrect === true && <Check size={12} style={{ color: 'var(--success)' }} />}
                      {isCorrect === false && <X size={12} style={{ color: 'var(--error)' }} />}
                      {isCorrect === null && <Minus size={12} style={{ color: 'var(--text-muted)' }} />}
                    </>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.points} pts</span>
                  {isEssay && essayGrade !== undefined && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                      Graded: {essayGrade}/{q.points}
                    </span>
                  )}
                </div>
                {answer?.flagged && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--warning)' + '20', color: 'var(--warning)' }}>
                    Flagged
                  </span>
                )}
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--text)' }}>{q.text}</p>
              
              {/* Student Answer */}
              <div className="mb-2">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Student answer: </span>
                <div className="mt-1 p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text)' }}>
                  {isEssay ? (
                    <div className="whitespace-pre-wrap">{formatAnswer(answer?.answer) || '(no answer)'}</div>
                  ) : (
                    <span style={{ color: isCorrect === false ? 'var(--error)' : 'var(--text)' }}>
                      {formatAnswer(answer?.answer) || '(no answer)'}
                    </span>
                  )}
                </div>
              </div>

              {/* Essay Grading Input */}
              {isEssay && (
                <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text)' }}>
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
                    className="w-20 px-2 py-1 rounded border text-xs outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="0"
                  />
                </div>
              )}

              {/* Correct Answer & Explanation */}
              {!isEssay && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {test.settings.showCorrectAnswers && (
                      <div>
                        <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Correct answer: </span>
                        <span style={{ color: 'var(--success)' }}>{getCorrectAnswer(q)}</span>
                      </div>
                    )}
                  </div>
                  {test.settings.showCorrectAnswers && q.explanation && (
                    <p className="text-xs mt-2 p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      {q.explanation}
                    </p>
                  )}
                </>
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
