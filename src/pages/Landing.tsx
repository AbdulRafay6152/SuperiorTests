import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, getTheme, toggleTheme } from '../store';
import { Sun, Moon, ClipboardList, Shield, BarChart3, Clock, FileText, Lock } from 'lucide-react';

export default function Landing() {
  const user = getCurrentUser();
  const theme = getTheme();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <ClipboardList size={16} color="#fff" strokeWidth={2} />
            </div>
            <span className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              SuperiorTests
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {user ? (
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded text-sm font-medium no-underline"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded text-sm font-medium no-underline"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded text-sm font-medium no-underline"
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <h1 
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)', lineHeight: 1.2 }}
          >
            Online testing built for academic rigor.
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Create secure assessments, enforce academic integrity, and generate detailed reports. 
            Designed for colleges that need reliability, not gimmicks.
          </p>
          {!user && (
            <div className="flex gap-3">
              <Link
                to="/signup"
                className="px-6 py-3 rounded text-sm font-semibold no-underline"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded text-sm font-semibold no-underline border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Log In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<FileText size={20} />}
            title="8 Question Types"
            description="Multiple choice, true/false, fill-in-blank, short answer, essay, numeric with tolerance, matching pairs, and multi-select."
          />
          <FeatureCard
            icon={<Shield size={20} />}
            title="Anti-Cheat Controls"
            description="Tab-switch detection, fullscreen enforcement, copy/paste blocking, watermarking, and full audit trails."
          />
          <FeatureCard
            icon={<Clock size={20} />}
            title="Timed Assessments"
            description="Set time limits, attempt restrictions, availability windows, and auto-submit on expiry."
          />
          <FeatureCard
            icon={<Lock size={20} />}
            title="Access Control"
            description="Passcode protection, email whitelisting, student ID verification, or open access — your choice."
          />
          <FeatureCard
            icon={<BarChart3 size={20} />}
            title="Detailed Reports"
            description="Per-student breakdowns, question-level analytics, pass rates, and PDF/CSV export."
          />
          <FeatureCard
            icon={<ClipboardList size={20} />}
            title="Bulk Import"
            description="Paste plain text to auto-parse questions. Preview before importing. Supports standard formats."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8" style={{ borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            SuperiorTests — Online Testing Platform
          </span>
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Built for colleges
          </span>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-5 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="mb-3" style={{ color: 'var(--accent)' }}>{icon}</div>
      <h3 className="font-semibold text-base mb-1.5" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
        {title}
      </h3>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}
