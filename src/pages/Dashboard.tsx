import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserTests, deleteTest, getTestStats, publishTest, unpublishTest } from '../store';
import { Test } from '../types';
import { Plus, MoreVertical, Eye, EyeOff, Trash2, Settings, BarChart3, Copy, Check, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    if (user) {
      setTests(getUserTests(user.id));
    }
  }, [user]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  if (!user) return null;

  const handleDelete = (id: string) => {
    if (confirm('Delete this test and all its results? This cannot be undone.')) {
      deleteTest(id);
      setTests(getUserTests(user.id));
    }
  };

  const handleTogglePublish = (test: Test) => {
    if (test.published) {
      unpublishTest(test.id);
    } else {
      publishTest(test.id);
    }
    setTests(getUserTests(user.id));
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/take/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            My Tests
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {tests.length === 0 ? 'Create your first test to get started.' : `${tests.length} test${tests.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          to="/test/new"
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold no-underline"
          style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
        >
          <Plus size={16} />
          New Test
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="text-center py-16 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-lg mb-2" style={{ color: 'var(--text)' }}>No tests yet.</p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Create your first assessment to start testing students.
          </p>
          <Link
            to="/test/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold no-underline"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            <Plus size={16} />
            Create Test
          </Link>
        </div>
      ) : (
        <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Test Name</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Questions</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Attempts</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Updated</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map(test => {
                const stats = getTestStats(test.id);
                return (
                  <tr key={test.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-4 py-3">
                      <Link
                        to={`/test/${test.id}/edit`}
                        className="font-medium no-underline"
                        style={{ color: 'var(--text)' }}
                      >
                        {test.settings.name || 'Untitled Test'}
                      </Link>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {test.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {test.questions.length}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {stats?.totalAttempts || 0}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: test.published ? 'var(--success)' + '20' : 'var(--bg-tertiary)',
                          color: test.published ? 'var(--success)' : 'var(--text-muted)',
                        }}
                      >
                        {test.published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>
                      {format(new Date(test.updatedAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {test.published && (
                          <button
                            onClick={() => copyLink(test.slug)}
                            className="p-1.5 rounded border-none cursor-pointer"
                            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                            title="Copy test link"
                          >
                            {copiedSlug === test.slug ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        )}
                        <Link
                          to={`/test/${test.id}/edit`}
                          className="p-1.5 rounded no-underline"
                          style={{ color: 'var(--text-muted)' }}
                          title="Edit"
                        >
                          <Settings size={14} />
                        </Link>
                        {test.published && (
                          <Link
                            to={`/test/${test.id}/results`}
                            className="p-1.5 rounded no-underline"
                            style={{ color: 'var(--text-muted)' }}
                            title="Results"
                          >
                            <BarChart3 size={14} />
                          </Link>
                        )}
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === test.id ? null : test.id)}
                            className="p-1.5 rounded border-none cursor-pointer"
                            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                          >
                            <MoreVertical size={14} />
                          </button>
                          {menuOpen === test.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                              <div
                                className="absolute right-0 top-8 z-20 w-44 rounded border py-1 shadow-lg"
                                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                              >
                                <button
                                  onClick={() => { handleTogglePublish(test); setMenuOpen(null); }}
                                  className="w-full text-left px-3 py-2 text-sm border-none cursor-pointer flex items-center gap-2"
                                  style={{ backgroundColor: 'transparent', color: 'var(--text)' }}
                                >
                                  {test.published ? <><EyeOff size={14} /> Unpublish</> : <><Eye size={14} /> Publish</>}
                                </button>
                                {test.published && (
                                  <Link
                                    to={`/take/${test.slug}`}
                                    className="block px-3 py-2 text-sm no-underline flex items-center gap-2"
                                    style={{ color: 'var(--text)' }}
                                    onClick={() => setMenuOpen(null)}
                                  >
                                    <ExternalLink size={14} /> Preview Test
                                  </Link>
                                )}
                                <button
                                  onClick={() => { handleDelete(test.id); setMenuOpen(null); }}
                                  className="w-full text-left px-3 py-2 text-sm border-none cursor-pointer flex items-center gap-2"
                                  style={{ backgroundColor: 'transparent', color: 'var(--error)' }}
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
