import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser, getTheme } from './store';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import TestEditor from './pages/TestEditor';
import TestSettings from './pages/TestSettings';
import TestTake from './pages/TestTake';
import Results from './pages/Results';
import ResultDetail from './pages/ResultDetail';
import Profile from './pages/Profile';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [, setTick] = useState(0);

  useEffect(() => {
    document.documentElement.className = getTheme();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/take/:slug" element={<TestTake />} />
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
