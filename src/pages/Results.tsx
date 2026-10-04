import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getTest, getTestAttempts, getTestStats } from '../store';
import { Attempt } from '../types';
import { ArrowLeft, Download, Search, FileText, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { generatePDFReport, generateBulkPDFReport, exportCSV } from '../utils/pdf';

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const test = getTest(id || '');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'name' | 'score' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!test) { navigate('/dashboard'); return null; }

  const attempts = getTestAttempts(test.id).filter(a => a.status === 'submitted');
  const stats = getTestStats(test.id);

  const filtered = useMemo(() => {
    let result = [...attempts];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(a =>
        a.takerName.toLowerCase().includes(s) ||
        a.takerEmail.toLowerCase().includes(s) ||
        a.takerStudentId.toLowerCase().includes(s)
      );
    }
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.takerName.localeCompare(b.takerName);
      else if (sortField === 'score') cmp = (a.percentage || 0) - (b.percentage || 0);
      else cmp = new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [attempts, search, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Per-question stats
  const questionStats = useMemo(() => {
    return test.questions.map(q => {
      let correct = 0;
      let total = 0;
      for (const attempt of attempts) {
        const ans = attempt.answers.find(a => a.questionId === q.id);
        if (!ans) continue;
        total++;
        // Simplified correctness check
        if (q.type === 'multiple-choice-single' || q.type === 'true-false') {
          if (q.options?.some(o => o.isCorrect && o.text === ans.answer)) correct++;
        } else if (q.type === 'fill-blank' || q.type === 'short-answer') {
          if ((ans.answer as string)?.toLowerCase().trim() === (q.correctAnswer || '').toLowerCase().trim()) correct++;
        }
      }
      return { questionId: q.id, text: q.text.substring(0, 50), correct, total, rate: total > 0 ? Math.round((correct / total) * 100) : 0 };
    });
  }, [test.questions, attempts]);

  const handleExportPDF = (attempt: Attempt) => {
    generatePDFReport(test, attempt);
  };

  const handleExportBulkPDF = () => {
    generateBulkPDFReport(test, attempts);
  };

  const handleExportCSV = () => {
    exportCSV(test, attempts);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/dashboard" className="no-underline" style={{ color: 'var(--accent)' }}>
          <ArrowLeft size={16} className="inline" /> Back
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            {test.settings.name} — Results
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {attempts.length} submission{attempts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <Download size={14} /> CSV
          </button>
          <button onClick={handleExportBulkPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border cursor-pointer"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}>
            <FileText size={14} /> Bulk PDF
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Attempts" value={stats.totalAttempts.toString()} />
          <StatCard label="Average Score" value={`${stats.averageScore}%`} />
          <StatCard label="Highest" value={`${stats.highestScore}%`} />
          <StatCard label="Lowest" value={`${stats.lowestScore}%`} />
          <StatCard label="Pass Rate" value={`${stats.passRate}%`} />
        </div>
      )}

      {/* Question Difficulty */}
      {questionStats.some(q => q.total > 0) && (
        <div className="mb-6 p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            <BarChart3 size={14} className="inline mr-1" /> Question Correctness Rate
          </h3>
          <div className="space-y-2">
            {questionStats.filter(q => q.total > 0).map((q, i) => (
              <div key={q.questionId} className="flex items-center gap-3">
                <span className="text-xs w-6 shrink-0" style={{ color: 'var(--text-muted)' }}>Q{i + 1}</span>
                <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{q.text}...</span>
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <div className="h-full rounded-full" style={{ width: `${q.rate}%`, backgroundColor: q.rate > 70 ? 'var(--success)' : q.rate > 40 ? 'var(--warning)' : 'var(--error)' }} />
                </div>
                <span className="text-xs font-mono w-8 text-right" style={{ color: 'var(--text-muted)' }}>{q.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded border text-sm outline-none"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Search by name, email, or student ID..." />
        </div>
      </div>

      {/* Results Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            {attempts.length === 0 ? 'No submissions yet.' : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="text-left px-4 py-2.5 font-medium cursor-pointer" style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('name')}>
                  Taker {sortField === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2.5 font-medium cursor-pointer hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('score')}>
                  Score {sortField === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Time</th>
                <th className="text-left px-4 py-2.5 font-medium cursor-pointer hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}
                  onClick={() => toggleSort('date')}>
                  Submitted {sortField === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left px-4 py-2.5 font-medium hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Flags</th>
                <th className="text-right px-4 py-2.5 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(attempt => (
                <tr key={attempt.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium" style={{ color: 'var(--text)' }}>{attempt.takerName}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {attempt.takerEmail} {attempt.takerStudentId && `· ${attempt.takerStudentId}`}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className="font-medium" style={{ color: (attempt.percentage || 0) >= 50 ? 'var(--success)' : 'var(--error)' }}>
                      {attempt.percentage}%
                    </span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                      ({attempt.score}/{attempt.maxScore})
                    </span>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    {attempt.timeTakenSeconds ? formatDuration(attempt.timeTakenSeconds) : '—'}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                    {attempt.submittedAt ? format(new Date(attempt.submittedAt), 'MMM d, h:mm a') : '—'}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    {attempt.antiCheatEvents.length > 0 ? (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--warning)' + '20', color: 'var(--warning)' }}>
                        {attempt.antiCheatEvents.length} flag{attempt.antiCheatEvents.length !== 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>None</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/test/${test.id}/results/${attempt.id}`}
                        className="px-2 py-1 rounded text-xs font-medium no-underline border"
                        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        View
                      </Link>
                      <button onClick={() => handleExportPDF(attempt)}
                        className="px-2 py-1 rounded text-xs font-medium border-none cursor-pointer"
                        style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}>
                        PDF
                      </button>
                    </div>
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
