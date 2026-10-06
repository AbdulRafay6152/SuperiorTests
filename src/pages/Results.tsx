import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTest, getTestAttempts, getTestStats, updateAttempt } from '../firestoreStore';
import { Test, Attempt } from '../types';
import { Download, Search, Play, Pause } from 'lucide-react';
import { format } from 'date-fns';
import { generatePDFReport, generateBulkPDFReport, exportCSV } from '../utils/pdf';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [pausedAttempts, setPausedAttempts] = useState<Attempt[]>([]);
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
          setPausedAttempts(a.filter(x => x.status === 'paused'));
        }
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  const handleResumeAttempt = async (attemptId: string) => {
    const attempt = pausedAttempts.find(a => a.id === attemptId);
    if (attempt) {
      const updated = { ...attempt, status: 'in-progress' as const };
      await updateAttempt(updated);
      setPausedAttempts(pausedAttempts.filter(a => a.id !== attemptId));
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex flex-wrap items-center gap-1.5">
          <Link to="/dashboard" className="text-xs no-underline" style={{ color: 'var(--text-muted)' }}>← Tests</Link>
          <span className="text-xs" style={{ color: 'var(--border-strong)' }}>/</span>
          <span className="text-sm font-semibold break-all" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {test.settings.name}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Results</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV(test, attempts)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Download size={12} /> CSV
          </button>
          <button onClick={() => generateBulkPDFReport(test, attempts)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Download size={12} /> PDF
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-4">
          <StatBox label="Submissions" value={stats.totalAttempts.toString()} />
          <StatBox label="Average" value={`${stats.averageScore}%`} />
          <StatBox label="Highest" value={`${stats.highestScore}%`} />
          <StatBox label="Lowest" value={`${stats.lowestScore}%`} />
          <StatBox label="Pass rate" value={`${stats.passRate}%`} />
        </div>
      )}

      {/* Paused Attempts Section */}
      {pausedAttempts.length > 0 && (
        <div className="mb-4 p-3 rounded border" style={{ backgroundColor: 'var(--warning)' + '08', borderColor: 'var(--warning)' + '40' }}>
          <div className="flex items-center gap-2 mb-2">
            <Pause size={14} style={{ color: 'var(--warning)' }} />
            <h3 className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
              Paused Attempts ({pausedAttempts.length})
            </h3>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            These attempts were paused due to anti-cheat detection. Resume to allow students to continue.
          </p>
          <div className="space-y-2">
            {pausedAttempts.map((attempt: Attempt) => (
              <div key={attempt.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex-1">
                  <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>{attempt.takerName}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {attempt.takerEmail} {attempt.takerStudentId && `· ${attempt.takerStudentId}`}
                  </div>
                  {attempt.antiCheatEvents.length > 0 && (
                    <div className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
                      {attempt.antiCheatEvents.length} anti-cheat event{attempt.antiCheatEvents.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleResumeAttempt(attempt.id)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border cursor-pointer"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--success)', color: '#fff' }}
                >
                  <Play size={10} /> Resume
                </button>
              </div>
            ))}
          </div>
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
        <div className="border rounded overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full min-w-[600px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="text-left px-3 py-2.5 text-xs font-semibold cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-muted)' }}
                  onClick={() => toggleSort('name')}>
                  Taker {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold cursor-pointer whitespace-nowrap" style={{ color: 'var(--text-muted)' }}
                  onClick={() => toggleSort('score')}>
                  Score {sortField === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold whitespace-nowrap hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Time</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold whitespace-nowrap hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Flags</th>
                <th className="text-right px-3 py-2.5 text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((attempt: Attempt) => (
                <tr key={attempt.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-3 py-3">
                    <div className="text-xs sm:text-sm font-medium break-words" style={{ color: 'var(--text)' }}>{attempt.takerName}</div>
                    {attempt.takerFatherName && (
                      <div className="text-xs break-words" style={{ color: 'var(--text-muted)' }}>S/O {attempt.takerFatherName}</div>
                    )}
                    <div className="text-xs text-mono break-all" style={{ color: 'var(--text-muted)' }}>
                      {attempt.takerEmail}{attempt.takerStudentId && ` · ${attempt.takerStudentId}`}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs sm:text-sm font-semibold" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
                      {attempt.percentage}%
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                      ({attempt.score}/{attempt.maxScore})
                    </span>
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell text-xs sm:text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {attempt.timeTakenSeconds ? formatDuration(attempt.timeTakenSeconds) : '—'}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {attempt.antiCheatEvents.length > 0 ? (
                      <span className="badge" style={{ backgroundColor: 'var(--warning)' + '15', color: 'var(--warning)' }}>
                        {attempt.antiCheatEvents.length}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <Link to={`/test/${test.id}/results/${attempt.id}`}
                      className="inline-block px-3 py-1.5 text-xs no-underline font-medium rounded border"
                      style={{ color: 'var(--accent)', borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
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
    <div className="p-3 sm:p-4 rounded border flex flex-col items-center justify-center text-center min-h-[70px] sm:min-h-[80px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-lg sm:text-xl font-bold mb-1" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
