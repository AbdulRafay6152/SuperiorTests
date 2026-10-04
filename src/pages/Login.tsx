import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, getTheme, toggleTheme } from '../store';
import { Sun, Moon, ClipboardList } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const theme = getTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const result = login(email, password);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-xs">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-6 h-6 flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <ClipboardList size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              SuperiorTests
            </span>
          </Link>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded border-none cursor-pointer"
            style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>

        <h1 className="text-base font-semibold mb-1 tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
          Log in
        </h1>

        {error && (
          <div className="my-3 px-3 py-2 text-xs rounded border" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
              }}
              placeholder="you@university.edu"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ 
                backgroundColor: 'var(--surface)', 
                borderColor: 'var(--border)', 
                color: 'var(--text)',
              }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-1.5 rounded text-xs font-semibold border-none cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-3 text-xs text-center">
          <Link to="/reset-password" style={{ color: 'var(--accent)' }} className="no-underline">
            Forgot password?
          </Link>
        </p>

        <p className="mt-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          No account?{' '}
          <Link to="/signup" style={{ color: 'var(--accent)' }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
