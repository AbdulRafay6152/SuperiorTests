import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminSetup() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const createAdmin = async () => {
    setStatus('loading');
    setMessage('Creating admin account...');

    try {
      const adminEmail = 'adminSuperior@college.com';
      const adminPassword = 'Admin123#@!4--_qwerty';

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const firebaseUser = userCredential.user;

      // Create user document in Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        email: adminEmail,
        name: 'Superior Admin',
        role: 'admin',
        createdAt: new Date().toISOString()
      });

      // Sign out
      await auth.signOut();

      setStatus('success');
      setMessage('Admin account created successfully! You can now login.');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error: any) {
      setStatus('error');
      if (error.code === 'auth/email-already-in-use') {
        setMessage('Admin account already exists. Please login directly.');
      } else {
        setMessage(`Error: ${error.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="p-6 rounded border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <h1 className="text-base font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text)' }}>
                Admin Account Setup
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                One-time setup for admin account
              </p>
            </div>
          </div>

          {status === 'idle' && (
            <>
              <div className="mb-4 p-3 rounded text-xs" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                <p className="font-medium mb-2" style={{ color: 'var(--text)' }}>Admin Credentials:</p>
                <p><strong>Email:</strong> adminSuperior@college.com</p>
                <p><strong>Password:</strong> Admin123#@!4--_qwerty</p>
              </div>

              <button
                onClick={createAdmin}
                className="w-full py-2.5 rounded text-sm font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
              >
                Create Admin Account
              </button>

              <p className="mt-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Click button above to create admin account. This is a one-time setup.
              </p>
            </>
          )}

          {status === 'loading' && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 mb-3" style={{ borderColor: 'var(--primary)' }}></div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-4">
              <CheckCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--success)' }} />
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{message}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Redirecting to login page...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4">
              <AlertCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--error)' }} />
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{message}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-3 px-4 py-2 rounded text-xs font-medium border cursor-pointer"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
              >
                Go to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
