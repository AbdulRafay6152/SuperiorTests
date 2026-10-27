import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUser } from '../firestoreStore';
import { useAuth } from '../AuthContext';
import { UserPlus, ArrowLeft, Users, X, Copy, Check, CheckCircle } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdUser, setCreatedUser] = useState<{ email: string; name: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Only admin can access this page
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (!email || !name || !password) {
      setMessage({ type: 'error', text: 'All fields are required.' });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setLoading(true);
    try {
      const result = await createUser(email, name, password);
      
      if (result.success) {
        // Show credentials popup
        setCreatedUser({ email, name, password });
        setShowCredentials(true);
        // Clear form
        setEmail('');
        setName('');
        setPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to create account.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create account.' });
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (createdUser) {
      const text = `Account Created Successfully!\n\nName: ${createdUser.name}\nEmail: ${createdUser.email}\nPassword: ${createdUser.password}\n\nLogin at: ${window.location.origin}/login`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 rounded border-none cursor-pointer"
              style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              title="Back to Dashboard"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                <Users size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
                  Admin Panel
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Create and manage user accounts
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Info Card */}
        <div className="mb-6 p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
            About Admin Panel
          </h2>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Use this panel to create user accounts. Created accounts are pre-verified and ready to use.
            Users can change their email and password after their first login.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className="mb-4 p-3 rounded text-xs border"
            style={{
              backgroundColor: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              borderColor: message.type === 'success' ? '#BBF7D0' : '#FECACA',
              color: message.type === 'success' ? '#166534' : '#991B1B',
            }}>
            {message.text}
          </div>
        )}

        {/* Create User Form */}
        <div className="p-6 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={18} style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
              Create New User Account
            </h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Full Name <span style={{ color: 'var(--error)' }}>*</span>
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
                  placeholder="e.g., Dr. Jane Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Email Address <span style={{ color: 'var(--error)' }}>*</span>
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
                  placeholder="e.g., jane.smith@college.edu"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Password <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                  Confirm Password <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Re-enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-2.5 rounded text-sm font-semibold border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
            >
              <UserPlus size={16} />
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 rounded border" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h3 className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>
            Instructions:
          </h3>
          <ul className="text-xs space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
            <li>• Enter the user's full name, email, and a temporary password</li>
            <li>• Share the credentials with the user securely</li>
            <li>• Users can change their email and password from their profile page</li>
            <li>• Each email can only be used once</li>
            <li>• Password must be at least 6 characters long</li>
          </ul>
        </div>
      </main>

      {/* Credentials Modal */}
      {showCredentials && createdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="w-full max-w-md rounded border shadow-lg" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} style={{ color: 'var(--success)' }} />
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  Account Created Successfully!
                </h2>
              </div>
              <button
                onClick={() => setShowCredentials(false)}
                className="p-1 rounded border-none cursor-pointer"
                style={{ backgroundColor: 'transparent', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                Share these credentials with the user via WhatsApp or any secure method:
              </p>

              <div className="space-y-3 mb-4">
                <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Name
                  </label>
                  <p className="text-sm font-mono" style={{ color: 'var(--text)' }}>
                    {createdUser.name}
                  </p>
                </div>

                <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Email
                  </label>
                  <p className="text-sm font-mono" style={{ color: 'var(--text)' }}>
                    {createdUser.email}
                  </p>
                </div>

                <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <label className="text-xs font-medium block mb-1" style={{ color: 'var(--text-muted)' }}>
                    Password
                  </label>
                  <p className="text-sm font-mono" style={{ color: 'var(--text)' }}>
                    {createdUser.password}
                  </p>
                </div>
              </div>

              <button
                onClick={copyCredentials}
                className="w-full py-2 rounded text-xs font-semibold border-none cursor-pointer flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy All Credentials'}
              </button>

              <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-muted)' }}>
                Login URL: {window.location.origin}/login
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setShowCredentials(false)}
                className="w-full py-2 rounded text-xs font-medium border cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
