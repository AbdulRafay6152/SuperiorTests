import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getTest, createTest, updateTest, publishTest } from '../firestoreStore';
import { Test, Question, QuestionType, QuestionOption, MatchingPair } from '../types';
import { Plus, Trash2, Settings, Eye, Import } from 'lucide-react';

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
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState<Partial<Question>[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadTest() {
      if (!user) {
        navigate('/login');
        return;
      }
      if (!id) {
        const newTest = await createTest('Untitled Test');
        navigate(`/test/${newTest.id}/edit`, { replace: true });
      } else {
        const loadedTest = await getTest(id);
        if (loadedTest) {
          setTest(loadedTest);
        } else {
          navigate('/dashboard');
        }
      }
      setLoading(false);
    }
    loadTest();
  }, [id, user]);

  if (loading || !test || !user) return <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>;

  const save = async () => {
    setSaving(true);
    await updateTest(test);
    setTimeout(() => setSaving(false), 500);
  };

  const handlePublish = async () => {
    if (test.questions.length === 0) {
      alert('Add at least one question before publishing.');
      return;
    }
    await updateTest(test);
    await publishTest(test.id);
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

      const optMatch = trimmed.match(/^([A-Ea-e])[\.\)]\s*(.+)/);
      if (optMatch && current) {
        options.push({
          id: generateId(),
          text: optMatch[2].trim(),
          isCorrect: false,
        });
        continue;
      }

      const ansMatch = trimmed.match(/^(?:Answer|Correct|Ans)[\.:]\s*(.+)/i);
      if (ansMatch && current) {
        const ans = ansMatch[1].trim();
        if (current.type === 'fill-blank' || current.type === 'short-answer') {
          current.correctAnswer = ans;
        } else if (options.length > 0) {
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

  const totalPoints = test.questions.reduce((sum: number, q: Question) => sum + q.points, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-3 border-b flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="text-xs no-underline" style={{ color: 'var(--text-muted)' }}>
            ← Tests
          </Link>
          <span className="text-xs" style={{ color: 'var(--border-strong)' }}>/</span>
          <input
            type="text"
            value={test.settings.name}
            onChange={e => setTest({ ...test, settings: { ...test.settings, name: e.target.value } })}
            className="text-sm font-semibold border-none bg-transparent outline-none"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)', maxWidth: '300px' }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {test.questions.length} q · {totalPoints} pts
          </span>
          <button
            onClick={save}
            className="px-2.5 py-1 rounded text-xs font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
          >
            {saving ? 'Saved' : 'Save'}
          </button>
          <Link
            to={`/test/${test.id}/settings`}
            className="px-2.5 py-1 rounded text-xs font-medium no-underline border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Settings
          </Link>
          <button
            onClick={handlePublish}
            className="px-2.5 py-1 rounded text-xs font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            Publish
          </button>
        </div>
      </div>

      {showBulkImport && (
        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Bulk Import</h3>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            Paste questions: numbered questions, A/B/C/D options, "Answer:" lines.
          </p>
          <textarea
            value={bulkText}
            onChange={e => { setBulkText(e.target.value); setBulkPreview([]); }}
            className="w-full h-32 p-2 rounded border text-xs font-mono resize-y outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder={`1. What is the capital of France?\nA. London\nB. Paris\nC. Berlin\nD. Madrid\nAnswer: B`}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={parseBulkText}
              className="px-2.5 py-1 rounded text-xs font-medium border cursor-pointer"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
            >
              Preview
            </button>
            {bulkPreview.length > 0 && (
              <button
                onClick={importBulk}
                className="px-2.5 py-1 rounded text-xs font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Import {bulkPreview.length} Questions
              </button>
            )}
            <button
              onClick={() => { setShowBulkImport(false); setBulkText(''); setBulkPreview([]); }}
              className="px-2.5 py-1 rounded text-xs border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {test.questions.map((q: Question, idx: number) => (
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

      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => addQuestion('multiple-choice-single')}
          className="px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer flex items-center gap-1"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
        >
          <Plus size={12} strokeWidth={2.5} /> Add question
        </button>
        {!showBulkImport && (
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-2.5 py-1.5 rounded text-xs font-medium border cursor-pointer flex items-center gap-1"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}
          >
            <Import size={12} /> Bulk import
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
  return (
    <div className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-mono" style={{ color: 'var(--text-muted)' }}>Q{index + 1}</span>
          <select
            value={question.type}
            onChange={e => onUpdate({ type: e.target.value as QuestionType })}
            className="text-xs border rounded px-1.5 py-0.5 outline-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {QUESTION_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-0.5 border-none bg-transparent cursor-pointer disabled:opacity-30 text-xs" style={{ color: 'var(--text-muted)' }}>↑</button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-0.5 border-none bg-transparent cursor-pointer disabled:opacity-30 text-xs" style={{ color: 'var(--text-muted)' }}>↓</button>
          <button onClick={onRemove} className="p-0.5 border-none bg-transparent cursor-pointer" style={{ color: 'var(--text-muted)' }}><Trash2 size={11} /></button>
        </div>
      </div>

      <textarea
        value={question.text}
        onChange={e => onUpdate({ text: e.target.value })}
        className="w-full p-2 rounded border text-xs resize-y outline-none mb-2"
        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
        placeholder="Question text..."
        rows={2}
      />

      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Points:</label>
        <input
          type="number"
          value={question.points}
          onChange={e => onUpdate({ points: Math.max(0, parseInt(e.target.value) || 0) })}
          className="w-14 px-1.5 py-0.5 rounded border text-xs outline-none"
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
          min={0}
        />
      </div>

      {(question.type === 'multiple-choice-single' || question.type === 'multiple-choice-multi' || question.type === 'true-false') && (
        <OptionsEditor question={question} onUpdate={onUpdate} />
      )}

      {(question.type === 'fill-blank' || question.type === 'short-answer') && (
        <div>
          <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Correct answer</label>
          <input
            type="text"
            value={question.correctAnswer || ''}
            onChange={e => onUpdate({ correctAnswer: e.target.value })}
            className="w-full px-2 py-1 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Correct answer..."
          />
        </div>
      )}

      {question.type === 'numeric' && (
        <div className="space-y-1.5">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Correct value</label>
            <input
              type="number"
              value={question.correctAnswer || ''}
              onChange={e => onUpdate({ correctAnswer: e.target.value })}
              className="w-full px-2 py-1 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="e.g., 42"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Tolerance (±)</label>
            <input
              type="number"
              value={question.numericTolerance || 0}
              onChange={e => onUpdate({ numericTolerance: parseFloat(e.target.value) || 0 })}
              className="w-20 px-1.5 py-0.5 rounded border text-xs outline-none"
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

      <div className="mt-2">
        <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>Explanation (optional)</label>
        <textarea
          value={question.explanation || ''}
          onChange={e => onUpdate({ explanation: e.target.value })}
          className="w-full p-1.5 rounded border text-xs resize-y outline-none"
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
    <div className="space-y-1">
      {options.map((opt, idx) => (
        <div key={opt.id} className="flex items-center gap-1.5">
          <input
            type={isMulti ? 'checkbox' : 'radio'}
            checked={opt.isCorrect}
            onChange={() => updateOption(idx, { isCorrect: !opt.isCorrect })}
            className="cursor-pointer"
            style={{ width: '12px', height: '12px' }}
          />
          <span className="text-xs font-medium w-4 text-mono" style={{ color: 'var(--text-muted)' }}>
            {String.fromCharCode(65 + idx)}
          </span>
          <input
            type="text"
            value={opt.text}
            onChange={e => updateOption(idx, { text: e.target.value })}
            className="flex-1 px-1.5 py-0.5 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
          />
          {options.length > 2 && (
            <button onClick={() => removeOption(idx)} className="p-0.5 border-none bg-transparent cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}
      <button onClick={addOption} className="text-xs border-none bg-transparent cursor-pointer flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
        <Plus size={10} strokeWidth={2.5} /> Add option
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
    <div className="space-y-1">
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Match items:</p>
      {pairs.map((pair, idx) => (
        <div key={pair.id} className="flex items-center gap-1.5">
          <input
            type="text"
            value={pair.left}
            onChange={e => updatePair(idx, { left: e.target.value })}
            className="flex-1 px-1.5 py-0.5 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Item"
          />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
          <input
            type="text"
            value={pair.right}
            onChange={e => updatePair(idx, { right: e.target.value })}
            className="flex-1 px-1.5 py-0.5 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Match"
          />
          {pairs.length > 2 && (
            <button onClick={() => removePair(idx)} className="p-0.5 border-none bg-transparent cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <Trash2 size={10} />
            </button>
          )}
        </div>
      ))}
      <button onClick={addPair} className="text-xs border-none bg-transparent cursor-pointer flex items-center gap-0.5" style={{ color: 'var(--accent)' }}>
        <Plus size={10} strokeWidth={2.5} /> Add pair
      </button>
    </div>
  );
}
