import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup, getTheme, toggleTheme } from '../store';
import { Sun, Moon, ClipboardList } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const theme = getTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = signup(email, name, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Signup failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg)' }}>
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

        <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
          Create your account
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Start creating assessments in minutes.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded text-sm border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded border text-sm outline-none"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
              }}
              placeholder="Dr. Jane Smith"
            />
          </div>
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
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
              }}
              placeholder="you@university.edu"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 rounded border text-sm outline-none"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
              }}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text)' }}>
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded border text-sm outline-none"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
              }}
              placeholder="Re-enter password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
