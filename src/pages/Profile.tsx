import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { updateProfile, changePassword } from '../firestoreStore';
import { Save } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await updateProfile(name, email);
      if (result.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to update profile.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setMessage({ type: 'success', text: 'Password changed successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to change password.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to change password.' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-base font-semibold mb-4 tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
        Profile
      </h1>

      {message && (
        <div className="mb-4 px-2.5 py-2 rounded text-xs border"
          style={{
            backgroundColor: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            borderColor: message.type === 'success' ? '#BBF7D0' : '#FECACA',
            color: message.type === 'success' ? '#166534' : '#991B1B',
          }}>
          {message.text}
        </div>
      )}

      <div className="p-4 rounded border mb-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
          Account Information
        </h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <button type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            <Save size={12} /> Save Changes
          </button>
        </form>
      </div>

      <div className="p-4 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h2 className="text-xs font-semibold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
          Change Password
        </h2>
        <form onSubmit={handleChangePassword}>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8}
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text)' }}>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
              className="w-full px-2.5 py-1.5 rounded border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text)' }} />
          </div>
          <button type="submit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--primary)', color: '#fff' }}>
            <Save size={12} /> Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
