import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, getTest, createTest, updateTest, publishTest } from '../store';
import { Test, Question, QuestionType, QuestionOption, MatchingPair } from '../types';
import { Plus, Trash2, GripVertical, Settings, Eye, ChevronDown, Import } from 'lucide-react';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'multiple-choice-single', label: 'Multiple Choice (Single)' },
  { value: 'multiple-choice-multi', label: 'Multiple Choice (Multiple)' },
  { value: 'true-false', label: 'True / False' },
  { value: 'fill-blank', label: 'Fill in the Blank' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'numeric', label: 'Numeric (with tolerance)' },
  { value: 'matching', label: 'Matching Pairs' },
];

export default function TestEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [test, setTest] = useState<Test | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<Partial<Question>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!id) {
      const newTest = createTest(user.id, 'Untitled Test');
      navigate(`/test/${newTest.id}/edit`, { replace: true });
    } else {
      const loadedTest = getTest(id);
      if (loadedTest) {
        setTest(loadedTest);
      } else {
        navigate('/dashboard');
      }
    }
  }, [id, user]);

  if (!test || !user) return null;

  const save = () => {
    setSaving(true);
    updateTest(test);
    setTimeout(() => setSaving(false), 500);
  };

  const handlePublish = () => {
    if (test.questions.length === 0) {
      alert('Add at least one question before publishing.');
      return;
    }
    updateTest(test);
    publishTest(test.id);
    navigate('/dashboard');
  };

  const addQuestion = (type: QuestionType = 'multiple-choice-single') => {
    const q: Question = {
      id: generateId(),
      testId: test.id,
      type,
      text: '',
      points: 1,
      order: test.questions.length,
      options: type === 'multiple-choice-single' || type === 'multiple-choice-multi'
        ? [{ id: generateId(), text: 'Option A', isCorrect: true }, { id: generateId(), text: 'Option B', isCorrect: false }]
        : type === 'true-false'
        ? [{ id: generateId(), text: 'True', isCorrect: true }, { id: generateId(), text: 'False', isCorrect: false }]
        : undefined,
      matchingPairs: type === 'matching'
        ? [{ id: generateId(), left: 'Item 1', right: 'Match 1' }, { id: generateId(), left: 'Item 2', right: 'Match 2' }]
        : undefined,
      correctAnswer: type === 'fill-blank' || type === 'short-answer' || type === 'numeric' ? '' : undefined,
      numericTolerance: type === 'numeric' ? 0 : undefined,
    };
    setTest({ ...test, questions: [...test.questions, q] });
  };

  const updateQuestion = (idx: number, updates: Partial<Question>) => {
    const questions = [...test.questions];
    questions[idx] = { ...questions[idx], ...updates };
    setTest({ ...test, questions });
  };

  const removeQuestion = (idx: number) => {
    if (!test) return;
    const questions = test.questions.filter((_: Question, i: number) => i !== idx).map((q: Question, i: number) => ({ ...q, order: i }));
    setTest({ ...test, questions });
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= test.questions.length) return;
    const questions = [...test.questions];
    [questions[idx], questions[newIdx]] = [questions[newIdx], questions[idx]];
    questions.forEach((q, i) => q.order = i);
    setTest({ ...test, questions });
  };

  const parseBulkText = () => {
    const lines = bulkText.trim().split('\n');
    const parsed: Partial<Question>[] = [];
    let current: Partial<Question> | null = null;
    let options: QuestionOption[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match numbered question: "1. What is..." or "1) What is..."
      const qMatch = trimmed.match(/^(\d+)[\.\)]\s*(.+)/);
      if (qMatch) {
        if (current) {
          current.options = options.length > 0 ? options : undefined;
          parsed.push(current);
        }
        current = { type: 'multiple-choice-single', text: qMatch[2], points: 1 };
        options = [];
        continue;
      }

      // Match options: "A. text" or "A) text" or "* text" (correct)
      const optMatch = trimmed.match(/^([A-Ea-e])[\.\)]\s*(.+)/);
      if (optMatch && current) {
        const isCorrect = trimmed.startsWith('*') || trimmed.endsWith('*');
        options.push({
          id: generateId(),
          text: optMatch[2].replace(/\*$/, '').replace(/^\*/, '').trim(),
          isCorrect: false,
        });
        continue;
      }

      // Match answer line
      const ansMatch = trimmed.match(/^(?:Answer|Correct|Ans)[\.:]\s*(.+)/i);
      if (ansMatch && current) {
        const ans = ansMatch[1].trim();
        if (current.type === 'fill-blank' || current.type === 'short-answer') {
          current.correctAnswer = ans;
        } else if (options.length > 0) {
          // Mark matching option as correct
          const optIdx = ans.toUpperCase().charCodeAt(0) - 65;
          if (optIdx >= 0 && optIdx < options.length) {
            options[optIdx].isCorrect = true;
          }
        }
        continue;
      }
    }

    if (current) {
      current.options = options.length > 0 ? options : undefined;
      parsed.push(current);
    }

    setBulkPreview(parsed);
  };

  const importBulk = () => {
    const newQuestions: Question[] = bulkPreview.map((p, i) => ({
      id: generateId(),
      testId: test.id,
      type: p.type || 'multiple-choice-single',
      text: p.text || '',
      points: p.points || 1,
      order: test.questions.length + i,
      options: p.options,
      correctAnswer: p.correctAnswer,
    }));
    setTest({ ...test, questions: [...test.questions, ...newQuestions] });
    setShowBulkImport(false);
    setBulkText('');
    setBulkPreview([]);
  };

  const totalPoints = test?.questions.reduce((sum: number, q: Question) => sum + q.points, 0) || 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="text-sm no-underline" style={{ color: 'var(--accent)' }}>
            ← Back
          </Link>
          <input
            type="text"
            value={test.settings.name}
            onChange={e => setTest({ ...test, settings: { ...test.settings, name: e.target.value } })}
            className="text-xl font-bold border-none bg-transparent outline-none"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)', maxWidth: '400px' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {test.questions.length} questions · {totalPoints} pts
          </span>
          <button
            onClick={save}
            className="px-3 py-1.5 rounded text-sm font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          >
            {saving ? 'Saved ✓' : 'Save'}
          </button>
          <Link
            to={`/test/${test.id}/settings`}
            className="px-3 py-1.5 rounded text-sm font-medium no-underline border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Settings size={14} className="inline mr-1" />
            Settings
          </Link>
          <button
            onClick={handlePublish}
            className="px-4 py-1.5 rounded text-sm font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            <Eye size={14} className="inline mr-1" />
            Publish
          </button>
        </div>
      </div>

      {/* Bulk Import */}
      {showBulkImport && (
        <div className="mb-6 p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Bulk Import</h3>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Paste questions in this format: numbered questions, A/B/C/D options, "Answer:" lines.
          </p>
          <textarea
            value={bulkText}
            onChange={e => { setBulkText(e.target.value); setBulkPreview([]); }}
            className="w-full h-40 p-3 rounded border text-sm font-mono resize-y outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder={`1. What is the capital of France?\nA. London\nB. Paris\nC. Berlin\nD. Madrid\nAnswer: B\n\n2. What is 2 + 2?\nAnswer: 4`}
          />
          <div className="flex gap-2 mt-3">
            <button
              onClick={parseBulkText}
              className="px-3 py-1.5 rounded text-sm font-medium border cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
            >
              Preview
            </button>
            {bulkPreview.length > 0 && (
              <button
                onClick={importBulk}
                className="px-3 py-1.5 rounded text-sm font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Import {bulkPreview.length} Questions
              </button>
            )}
            <button
              onClick={() => { setShowBulkImport(false); setBulkText(''); setBulkPreview([]); }}
              className="px-3 py-1.5 rounded text-sm border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
          {bulkPreview.length > 0 && (
            <div className="mt-3 p-3 rounded border" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>Preview:</p>
              {bulkPreview.map((q, i) => (
                <div key={i} className="mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text)' }}>{i + 1}. {q.text}</span>
                  {q.options && q.options.map((o, j) => (
                    <div key={j} className="ml-4" style={{ color: o.isCorrect ? 'var(--success)' : 'var(--text-muted)' }}>
                      {String.fromCharCode(65 + j)}. {o.text} {o.isCorrect && '✓'}
                    </div>
                  ))}
                  {q.correctAnswer && <div className="ml-4" style={{ color: 'var(--success)' }}>Answer: {q.correctAnswer}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {test!.questions.map((q: Question, idx: number) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            total={test.questions.length}
            onUpdate={(updates) => updateQuestion(idx, updates)}
            onRemove={() => removeQuestion(idx)}
            onMove={(dir) => moveQuestion(idx, dir)}
          />
        ))}
      </div>

      {/* Add Question */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => addQuestion('multiple-choice-single')}
          className="px-3 py-2 rounded text-sm font-medium border cursor-pointer flex items-center gap-1.5"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
        >
          <Plus size={14} /> Add Question
        </button>
        {!showBulkImport && (
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-3 py-2 rounded text-sm font-medium border cursor-pointer flex items-center gap-1.5"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
          >
            <Import size={14} /> Bulk Import
          </button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, index, total, onUpdate, onRemove, onMove }: {
  question: Question;
  index: number;
  total: number;
  onUpdate: (updates: Partial<Question>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const typeLabel = QUESTION_TYPES.find(t => t.value === question.type)?.label || question.type;

  return (
    <div className="p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Q{index + 1}</span>
          <select
            value={question.type}
            onChange={e => onUpdate({ type: e.target.value as QuestionType })}
            className="text-sm border rounded px-2 py-1 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 border-none bg-transparent cursor-pointer disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>↑</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 border-none bg-transparent cursor-pointer disabled:opacity-30" style={{ color: 'var(--text-muted)' }}>↓</button>
          <button onClick={onRemove} className="p-1 border-none bg-transparent cursor-pointer" style={{ color: 'var(--error)' }}><Trash2 size={14} /></button>
        </div>
      </div>

      {/* Question Text */}
      <textarea
        value={question.text}
        onChange={e => onUpdate({ text: e.target.value })}
        className="w-full p-2 rounded border text-sm resize-y outline-none mb-3"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
        placeholder="Enter question text..."
        rows={2}
      />

      {/* Points */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm" style={{ color: 'var(--text-secondary)' }}>Points:</label>
        <input
          type="number"
          value={question.points}
          onChange={e => onUpdate({ points: Math.max(0, parseInt(e.target.value) || 0) })}
          className="w-16 px-2 py-1 rounded border text-sm outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          min={0}
        />
      </div>

      {/* Type-specific fields */}
      {(question.type === 'multiple-choice-single' || question.type === 'multiple-choice-multi' || question.type === 'true-false') && (
        <OptionsEditor question={question} onUpdate={onUpdate} />
      )}

      {question.type === 'fill-blank' || question.type === 'short-answer' ? (
        <div>
          <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Correct Answer:</label>
          <input
            type="text"
            value={question.correctAnswer || ''}
            onChange={e => onUpdate({ correctAnswer: e.target.value })}
            className="w-full px-2 py-1.5 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Enter the correct answer..."
          />
        </div>
      ) : null}

      {question.type === 'numeric' && (
        <div className="space-y-2">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Correct Value:</label>
            <input
              type="number"
              value={question.correctAnswer || ''}
              onChange={e => onUpdate({ correctAnswer: e.target.value })}
              className="w-full px-2 py-1.5 rounded border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="e.g., 42"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Tolerance (±):</label>
            <input
              type="number"
              value={question.numericTolerance || 0}
              onChange={e => onUpdate({ numericTolerance: parseFloat(e.target.value) || 0 })}
              className="w-24 px-2 py-1.5 rounded border text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              min={0}
              step={0.01}
            />
          </div>
        </div>
      )}

      {question.type === 'matching' && (
        <MatchingEditor question={question} onUpdate={onUpdate} />
      )}

      {/* Explanation */}
      <div className="mt-3">
        <label className="text-sm font-medium block mb-1" style={{ color: 'var(--text-secondary)' }}>Explanation (optional):</label>
        <textarea
          value={question.explanation || ''}
          onChange={e => onUpdate({ explanation: e.target.value })}
          className="w-full p-2 rounded border text-sm resize-y outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          placeholder="Explain the correct answer..."
          rows={2}
        />
      </div>
    </div>
  );
}

function OptionsEditor({ question, onUpdate }: { question: Question; onUpdate: (u: Partial<Question>) => void }) {
  const options = question.options || [];
  const isMulti = question.type === 'multiple-choice-multi';

  const updateOption = (idx: number, updates: Partial<QuestionOption>) => {
    const newOptions = [...options];
    newOptions[idx] = { ...newOptions[idx], ...updates };
    if (!isMulti && updates.isCorrect) {
      newOptions.forEach((o, i) => { if (i !== idx) o.isCorrect = false; });
    }
    onUpdate({ options: newOptions });
  };

  const addOption = () => {
    onUpdate({ options: [...options, { id: generateId(), text: '', isCorrect: false }] });
  };

  const removeOption = (idx: number) => {
    if (options.length <= 2) return;
    onUpdate({ options: options.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2">
      {options.map((opt, idx) => (
        <div key={opt.id} className="flex items-center gap-2">
          <input
            type={isMulti ? 'checkbox' : 'radio'}
            checked={opt.isCorrect}
            onChange={() => updateOption(idx, { isCorrect: !opt.isCorrect })}
            className="cursor-pointer"
          />
          <span className="text-sm font-medium w-5" style={{ color: 'var(--text-muted)' }}>
            {String.fromCharCode(65 + idx)}.
          </span>
          <input
            type="text"
            value={opt.text}
            onChange={e => updateOption(idx, { text: e.target.value })}
            className="flex-1 px-2 py-1 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
          />
          {options.length > 2 && (
            <button onClick={() => removeOption(idx)} className="p-1 border-none bg-transparent cursor-pointer" style={{ color: 'var(--error)' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <button onClick={addOption} className="text-sm border-none bg-transparent cursor-pointer flex items-center gap-1" style={{ color: 'var(--accent)' }}>
        <Plus size={12} /> Add option
      </button>
    </div>
  );
}

function MatchingEditor({ question, onUpdate }: { question: Question; onUpdate: (u: Partial<Question>) => void }) {
  const pairs = question.matchingPairs || [];

  const updatePair = (idx: number, updates: Partial<MatchingPair>) => {
    const newPairs = [...pairs];
    newPairs[idx] = { ...newPairs[idx], ...updates };
    onUpdate({ matchingPairs: newPairs });
  };

  const addPair = () => {
    onUpdate({ matchingPairs: [...pairs, { id: generateId(), left: '', right: '' }] });
  };

  const removePair = (idx: number) => {
    if (pairs.length <= 2) return;
    onUpdate({ matchingPairs: pairs.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Match left items to right items:</p>
      {pairs.map((pair, idx) => (
        <div key={pair.id} className="flex items-center gap-2">
          <input
            type="text"
            value={pair.left}
            onChange={e => updatePair(idx, { left: e.target.value })}
            className="flex-1 px-2 py-1 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Left item"
          />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input
            type="text"
            value={pair.right}
            onChange={e => updatePair(idx, { right: e.target.value })}
            className="flex-1 px-2 py-1 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Right match"
          />
          {pairs.length > 2 && (
            <button onClick={() => removePair(idx)} className="p-1 border-none bg-transparent cursor-pointer" style={{ color: 'var(--error)' }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <button onClick={addPair} className="text-sm border-none bg-transparent cursor-pointer flex items-center gap-1" style={{ color: 'var(--accent)' }}>
        <Plus size={12} /> Add pair
      </button>
    </div>
  );
}
