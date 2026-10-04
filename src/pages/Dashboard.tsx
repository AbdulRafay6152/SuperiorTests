import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserTests, deleteTest, getTestStats, publishTest, unpublishTest } from '../store';
import { Test } from '../types';
import { Plus, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [tests, setTests] = useState<Test[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setTests(getUserTests(user.id));
    }
  }, [user]);

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
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-base font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
            My Tests
          </h1>
        </div>
        <Link
          to="/test/new"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium no-underline rounded"
          style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
        >
          <Plus size={12} strokeWidth={2.5} />
          New test
        </Link>
      </div>

      {tests.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>You have no tests yet.</p>
          <Link
            to="/test/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium no-underline rounded"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            <Plus size={12} strokeWidth={2.5} />
            Create your first test
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            {tests.length} test{tests.length !== 1 ? 's' : ''}
          </p>
          <div className="border rounded overflow-hidden" style={{ borderColor: 'var(--border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Name</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold hidden sm:table-cell" style={{ color: 'var(--text-muted)' }}>Questions</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold hidden md:table-cell" style={{ color: 'var(--text-muted)' }}>Submissions</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Status</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>Modified</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(test => {
                  const stats = getTestStats(test.id);
                  return (
                    <tr key={test.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-3 py-2">
                        <Link
                          to={`/test/${test.id}/edit`}
                          className="text-sm font-medium no-underline"
                          style={{ color: 'var(--text)' }}
                        >
                          {test.settings.name || 'Untitled'}
                        </Link>
                        <div className="text-xs mt-0.5 text-mono" style={{ color: 'var(--text-muted)' }}>
                          {test.slug}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {test.questions.length}
                      </td>
                      <td className="px-3 py-2 text-xs hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {stats?.totalAttempts || 0}
                      </td>
                      <td className="px-3 py-2 hidden lg:table-cell">
                        <span className="badge" style={{
                          backgroundColor: test.published ? 'var(--success)' + '15' : 'var(--bg-tertiary)',
                          color: test.published ? 'var(--success)' : 'var(--text-muted)',
                        }}>
                          {test.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs hidden lg:table-cell" style={{ color: 'var(--text-muted)' }}>
                        {format(new Date(test.updatedAt), 'MMM d')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {test.published && (
                            <button
                              onClick={() => copyLink(test.slug)}
                              className="p-1 rounded border-none cursor-pointer"
                              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                              title="Copy link"
                            >
                              {copiedSlug === test.slug ? <Check size={12} /> : <Copy size={12} />}
                            </button>
                          )}
                          <Link
                            to={`/test/${test.id}/edit`}
                            className="px-1.5 py-0.5 text-xs no-underline rounded"
                            style={{ color: 'var(--accent)' }}
                          >
                            Edit
                          </Link>
                          {test.published && (
                            <Link
                              to={`/test/${test.id}/results`}
                              className="px-1.5 py-0.5 text-xs no-underline rounded"
                              style={{ color: 'var(--accent)' }}
                            >
                              Results
                            </Link>
                          )}
                          <button
                            onClick={() => handleTogglePublish(test)}
                            className="px-1.5 py-0.5 text-xs border-none bg-transparent cursor-pointer rounded"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {test.published ? 'Unpublish' : 'Publish'}
                          </button>
                          <button
                            onClick={() => handleDelete(test.id)}
                            className="p-1 rounded border-none cursor-pointer"
                            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
