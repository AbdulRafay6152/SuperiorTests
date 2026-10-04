import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { getTheme, toggleTheme } from '../firestoreStore';
import { Sun, Moon, ClipboardList } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();
  const theme = getTheme();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      <header className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <ClipboardList size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <span className="font-semibold text-sm tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              SuperiorTests
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            {user ? (
              <Link
                to="/dashboard"
                className="px-3 py-1.5 text-xs font-medium no-underline rounded"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-medium no-underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="px-3 py-1.5 text-xs font-medium no-underline rounded"
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-16 w-full">
          <div className="max-w-xl">
            <h1 
              className="text-2xl font-bold mb-3 tracking-tight"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)', lineHeight: 1.3 }}
            >
              Online testing for higher education.
            </h1>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Create assessments, enforce academic integrity, and generate detailed reports. 
              Built for colleges that need a reliable, no-frills testing platform.
            </p>
            {!user && (
              <div className="flex gap-2">
                <Link
                  to="/signup"
                  className="px-4 py-2 text-xs font-semibold no-underline rounded"
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  Create free account
                </Link>
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-medium no-underline rounded border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Log in
                </Link>
              </div>
            )}
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            <FeatureItem title="8 question types" description="Multiple choice, true/false, fill-blank, short answer, essay, numeric, matching, multi-select." />
            <FeatureItem title="Anti-cheat controls" description="Tab detection, fullscreen enforcement, copy blocking, watermarking, audit trails." />
            <FeatureItem title="Flexible access" description="Open links, passcodes, email whitelists, or student ID verification." />
            <FeatureItem title="Time limits & attempts" description="Set availability windows, time limits, attempt restrictions, and auto-submit." />
            <FeatureItem title="Detailed reports" description="Per-student breakdowns, question analytics, pass rates, PDF and CSV export." />
            <FeatureItem title="Bulk import" description="Paste formatted text to auto-parse questions. Preview before importing." />
          </div>
        </div>
      </div>

      <footer className="border-t py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SuperiorTests</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>For colleges and universities</span>
        </div>
      </footer>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold mb-1 tracking-tight" style={{ color: 'var(--text)' }}>{title}</h3>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{description}</p>
    </div>
  );
}
