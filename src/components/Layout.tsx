import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logout, toggleTheme, getTheme } from '../store';
import { Sun, Moon, LogOut, FileText, User, ClipboardList } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const theme = getTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header 
        className="border-b sticky top-0 z-50"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 no-underline">
              <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                <ClipboardList size={16} color="#fff" strokeWidth={2} />
              </div>
              <span className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
                SuperiorTests
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                to="/dashboard"
                className="px-3 py-1.5 rounded text-sm font-medium no-underline transition-colors"
                style={{
                  color: location.pathname === '/dashboard' ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: location.pathname === '/dashboard' ? 'var(--bg-secondary)' : 'transparent',
                }}
              >
                My Tests
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <Link
              to="/profile"
              className="p-2 rounded no-underline flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)' }}
              title="Profile"
            >
              <User size={16} />
              <span className="hidden sm:inline text-sm">{user?.name?.split(' ')[0]}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
