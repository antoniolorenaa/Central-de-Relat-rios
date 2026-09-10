/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Imports } from './pages/Imports';
import { Academic } from './pages/Academic';
import { Matrices } from './pages/Matrices';
import { ClassEvaluation } from './pages/ClassEvaluation';
import { AppShell } from './components/AppShell';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando...</div>;
  }
  
  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Carregando...</div>;
  }
  
  if (user && profile) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="usuarios" element={<Users />} />
            <Route path="imports" element={<Imports />} />
            <Route path="academic" element={<Academic />} />
            <Route path="academic/:classId/evaluate" element={<ClassEvaluation />} />
            <Route path="matrices" element={<Matrices />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
