import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { getTheme, initializeAdminAccount } from './firestoreStore';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminPanel from './pages/AdminPanel';
import Dashboard from './pages/Dashboard';
import TestEditor from './pages/TestEditor';
import TestSettings from './pages/TestSettings';
import TestTake from './pages/TestTake';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import AdminSetup from './pages/AdminSetup';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
  </div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg)' }}>
    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
  </div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  // Initialize theme and admin account
  React.useEffect(() => {
    document.documentElement.className = getTheme();
    initializeAdminAccount();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin-setup" element={<AdminSetup />} />
        <Route path="/take/:slug" element={<TestTake />} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="test/new" element={<TestEditor />} />
          <Route path="test/:id/edit" element={<TestEditor />} />
          <Route path="test/:id/settings" element={<TestSettings />} />
          <Route path="test/:id/results" element={<Results />} />
          <Route path="test/:id/results/:attemptId" element={<ResultDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
