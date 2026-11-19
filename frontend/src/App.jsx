import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import Navbar from './components/Navbar';
import Report from './pages/Report';
import Track from './pages/Track';
import PublicMap from './pages/PublicMap';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IssueDetail from './pages/IssueDetail';
import Members from './pages/Members';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gram_suvidha_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    localStorage.setItem('gram_suvidha_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gram_suvidha_user');
    localStorage.removeItem('gram_suvidha_token');
  };

  return (
    <LanguageProvider>
      <div className="app-shell">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="container">
          <Routes>
            <Route path="/" element={<Report />} />
            <Route path="/report" element={<Report />} />
            <Route path="/track" element={<Track />} />
            <Route path="/map" element={<PublicMap />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route
              path="/dashboard"
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/issues/:id"
              element={user ? <IssueDetail user={user} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/members"
              element={
                user && user.role === 'super_admin' ? (
                  <Members />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LanguageProvider>
  );
}
