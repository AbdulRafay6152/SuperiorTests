import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getTheme, toggleTheme, resetPassword } from '../store';
import { Sun, Moon, ClipboardList, ArrowLeft } from 'lucide-react';

export default function ResetPassword() {
  const theme = getTheme();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const handleRequestReset = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // In production, this calls the API
    // For demo, we simulate success
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      setMessage({ type: 'success', text: 'If an account with that email exists, a reset link has been sent.' });
    }, 1000);
  };

  const handleConfirmReset = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }

    setLoading(true);
    // In production, this calls the API with the token
    setTimeout(() => {
      setLoading(false);
      setMessage({ type: 'success', text: 'Password reset successfully. You can now log in.' });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <ClipboardList size={16} color="#fff" strokeWidth={2} />
            </div>
            <span className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              SuperiorTests
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-2 rounded border-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        {!token ? (
          <>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              Reset Password
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {message && (
              <div className="mb-4 p-3 rounded text-sm border"
                style={{
                  backgroundColor: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  borderColor: message.type === 'success' ? '#BBF7D0' : '#FECACA',
                  color: message.type === 'success' ? '#166534' : '#991B1B',
                }}>
                {message.text}
              </div>
            )}

            {!sent ? (
              <form onSubmit={handleRequestReset}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded border text-sm outline-none"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="you@university.edu"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            ) : null}

            <p className="mt-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
              <Link to="/login" className="no-underline flex items-center justify-center gap-1" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                <ArrowLeft size={14} /> Back to login
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              Set New Password
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Enter your new password below.
            </p>

            {message && (
              <div className="mb-4 p-3 rounded text-sm border"
                style={{
                  backgroundColor: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                  borderColor: message.type === 'success' ? '#BBF7D0' : '#FECACA',
                  color: message.type === 'success' ? '#166534' : '#991B1B',
                }}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleConfirmReset}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded border text-sm outline-none"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Re-enter password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
