import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser, logout, toggleTheme, getTheme } from '../store';
import { Sun, Moon, LogOut, ClipboardList } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header - Testmoz-style minimal */}
      <header 
        className="border-b sticky top-0 z-50"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 no-underline">
              <div className="w-6 h-6 flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                <ClipboardList size={14} color="#fff" strokeWidth={2.5} />
              </div>
              <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
                SuperiorTests
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4">
              <Link
                to="/dashboard"
                className="text-xs font-medium no-underline pb-0.5"
                style={{
                  color: location.pathname === '/dashboard' ? 'var(--text)' : 'var(--text-muted)',
                  borderBottom: location.pathname === '/dashboard' ? '1.5px solid var(--primary)' : '1.5px solid transparent',
                }}
              >
                My Tests
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <Link
              to="/profile"
              className="px-2 py-1.5 text-xs no-underline"
              style={{ color: 'var(--text-secondary)' }}
              title="Profile"
            >
              {user?.name?.split(' ')[0]}
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-5">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-3 mt-auto" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            SuperiorTests
          </span>
        </div>
      </footer>
    </div>
  );
}
