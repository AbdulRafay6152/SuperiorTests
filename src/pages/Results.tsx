import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTest, getTestAttempts, getTestStats } from '../firestoreStore';
import { Test, Attempt } from '../types';
import { Download, Search } from 'lucide-react';
import { format } from 'date-fns';
import { generatePDFReport, generateBulkPDFReport, exportCSV } from '../utils/pdf';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'score' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function loadData() {
      if (id) {
        const t = await getTest(id);
        if (t) {
          setTest(t);
          const a = await getTestAttempts(id);
          setAttempts(a.filter(x => x.status === 'submitted'));
        }
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  // All hooks must be called before any conditional returns
  const stats = useMemo(() => {
    if (!test) return null;
    return getTestStats(test.id, attempts);
  }, [test, attempts]);

  const filtered = useMemo(() => {
    let result = [...attempts];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((a: Attempt) =>
        a.takerName.toLowerCase().includes(s) ||
        a.takerEmail.toLowerCase().includes(s) ||
        a.takerStudentId.toLowerCase().includes(s)
      );
    }
    result.sort((a: Attempt, b: Attempt) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.takerName.localeCompare(b.takerName);
      else if (sortField === 'score') cmp = (a.percentage || 0) - (b.percentage || 0);
      else cmp = new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [attempts, search, sortField, sortDir]);

  const questionStats = useMemo(() => {
    if (!test) return [];
    return test.questions.map((q: any) => {
      let correct = 0;
      let total = 0;
      for (const attempt of attempts) {
        const ans = attempt.answers.find((a: any) => a.questionId === q.id);
        if (!ans) continue;
        total++;
        if (q.type === 'multiple-choice-single' || q.type === 'true-false') {
          if (q.options?.some((o: any) => o.isCorrect && o.text === ans.answer)) correct++;
        } else if (q.type === 'fill-blank' || q.type === 'short-answer') {
          if ((ans.answer as string)?.toLowerCase().trim() === (q.correctAnswer || '').toLowerCase().trim()) correct++;
        }
      }
      return { questionId: q.id, text: q.text.substring(0, 40), correct, total, rate: total > 0 ? Math.round((correct / total) * 100) : 0 };
    });
  }, [test?.questions, attempts]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Now we can do conditional rendering after all hooks
  if (loading) {
    return <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading results…</div>;
  }

  if (!test) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Test not found.</p>
        <button onClick={() => navigate('/dashboard')} className="mt-3 px-3 py-1.5 text-xs font-medium border cursor-pointer rounded"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
          Back to tests
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <Link to="/dashboard" className="text-xs no-underline" style={{ color: 'var(--text-muted)' }}>← Tests</Link>
          <span className="text-xs mx-1.5" style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {test.settings.name}
          </span>
          <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>Results</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => exportCSV(test, attempts)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Download size={10} /> CSV
          </button>
          <button onClick={() => generateBulkPDFReport(test, attempts)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Download size={10} /> PDF
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-2 mb-4">
          <StatBox label="Submissions" value={stats.totalAttempts.toString()} />
          <StatBox label="Average" value={`${stats.averageScore}%`} />
          <StatBox label="Highest" value={`${stats.highestScore}%`} />
          <StatBox label="Lowest" value={`${stats.lowestScore}%`} />
          <StatBox label="Pass rate" value={`${stats.passRate}%`} />
        </div>
      )}

      {questionStats.some((q: any) => q.total > 0) && (
        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Question correctness
          </p>
          <div className="space-y-1">
            {questionStats.filter((q: any) => q.total > 0).map((q: any, i: number) => (
              <div key={q.questionId} className="flex items-center gap-2">
                <span className="text-xs w-5 text-mono" style={{ color: 'var(--text-muted)' }}>Q{i + 1}</span>
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{q.text}…</span>
                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${q.rate}%`, backgroundColor: q.rate > 70 ? 'var(--success)' : q.rate > 40 ? 'var(--warning)' : 'var(--error)' }} />
                </div>
                <span className="text-xs font-mono w-7 text-right" style={{ color: 'var(--text-muted)' }}>{q.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 rounded border text-xs outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Search by name, email, or ID..." />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {attempts.length === 0 ? 'No submissions yet.' : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="text-left px-3 py-2 text-xs font-semibold cursor-pointer" style={{ color: 'var(--text-muted)' }}
                  onClick={() => toggleSort('name')}>
                  Taker {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold cursor-pointer hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}
                  onClick={() => toggleSort('score')}>
                  Score {sortField === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Time</th>
                <th className="text-left px-3 py-2 text-xs font-semibold hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Flags</th>
                <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((attempt: Attempt) => (
                <tr key={attempt.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-2">
                    <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{attempt.takerName}</div>
                    {attempt.takerFatherName && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>S/O {attempt.takerFatherName}</div>
                    )}
                    <div className="text-xs text-mono" style={{ color: 'var(--text-muted)' }}>
                      {attempt.takerEmail}{attempt.takerStudentId && ` · ${attempt.takerStudentId}`}
                    </div>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell">
                    <span className="text-xs font-semibold" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
                      {attempt.percentage}%
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                      ({attempt.score}/{attempt.maxScore})
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {attempt.timeTakenSeconds ? formatDuration(attempt.timeTakenSeconds) : '—'}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    {attempt.antiCheatEvents.length > 0 ? (
                      <span className="badge" style={{ backgroundColor: 'var(--warning)' + '15', color: 'var(--warning)' }}>
                        {attempt.antiCheatEvents.length}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/test/${test.id}/results/${attempt.id}`}
                      className="text-xs no-underline font-medium"
                      style={{ color: 'var(--accent)' }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
