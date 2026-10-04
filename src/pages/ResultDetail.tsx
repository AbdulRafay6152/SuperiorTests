import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTest, getAttempt } from '../store';
import { Test, Attempt } from '../types';
import { ArrowLeft, Download, Check, X, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { generatePDFReport } from '../utils/pdf';

export default function ResultDetail() {
  const { id, attemptId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    if (id) setTest(getTest(id));
    if (attemptId) setAttempt(getAttempt(attemptId));
  }, [id, attemptId]);

  if (!test || !attempt) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-secondary)' }}>Result not found.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 rounded text-sm font-medium border cursor-pointer"
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
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/test/${test.id}/results`} className="no-underline" style={{ color: 'var(--accent)' }}>
          <ArrowLeft size={16} className="inline" /> Back to Results
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {attempt.takerName}
          </h1>
          {attempt.takerFatherName && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              S/O {attempt.takerFatherName}
            </p>
          )}
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {attempt.takerEmail} {attempt.takerStudentId && `· ID: ${attempt.takerStudentId}`}
          </p>
        </div>
        <button onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border cursor-pointer"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
          <Download size={14} /> Export PDF
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
            {attempt.percentage}%
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Score</div>
        </div>
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{attempt.score}/{attempt.maxScore}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Points</div>
        </div>
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
            {attempt.timeTakenSeconds ? `${Math.floor(attempt.timeTakenSeconds / 60)}m ${attempt.timeTakenSeconds % 60}s` : '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Time Taken</div>
        </div>
        <div className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="text-2xl font-bold" style={{ color: 'var(--text)' }}>#{attempt.attemptNumber}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Attempt</div>
        </div>
      </div>

      {/* Anti-cheat events */}
      {attempt.antiCheatEvents.length > 0 && (
        <div className="mb-6 p-4 rounded border" style={{ backgroundColor: 'var(--warning)' + '08', borderColor: 'var(--warning)' + '40' }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--warning)' }}>
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

      {/* Question Breakdown */}
      <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
        Question Breakdown
      </h2>
      <div className="space-y-3">
        {test.questions.map((q, idx) => {
          const answer = attempt.answers.find(a => a.questionId === q.id);
          const isCorrect = checkCorrectness(q, answer);

          return (
            <div key={q.id} className="p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Q{idx + 1}</span>
                  {isCorrect === true && <Check size={14} style={{ color: 'var(--success)' }} />}
                  {isCorrect === false && <X size={14} style={{ color: 'var(--error)' }} />}
                  {isCorrect === null && <Minus size={14} style={{ color: 'var(--text-muted)' }} />}
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{q.points} pts</span>
                </div>
                {answer?.flagged && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--warning)' + '20', color: 'var(--warning)' }}>
                    Flagged
                  </span>
                )}
              </div>
              <p className="text-sm mb-2" style={{ color: 'var(--text)' }}>{q.text}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Student answer: </span>
                  <span style={{ color: isCorrect === false ? 'var(--error)' : 'var(--text)' }}>
                    {formatAnswer(answer?.answer) || '(no answer)'}
                  </span>
                </div>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

function checkCorrectness(question: any, answer: any): boolean | null {
  if (!answer || !answer.answer || answer.answer === '') return null;
  if (question.type === 'essay') return null; // Manual grading

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
