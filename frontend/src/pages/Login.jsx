import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../db';

const DEMO_ACCOUNTS = [
  { label: 'Sarpanch Super Admin', user: 'admin', pass: 'admin123', role: 'All Wards & Categories' },
  { label: 'Ramesh Yadav (Member)', user: 'ramesh', pass: 'ramesh123', role: 'Ward 1 • Roads & Infra' },
  { label: 'Sunita Devi (Member)', user: 'sunita', pass: 'sunita123', role: 'Ward 2 • Water & Garbage' },
  { label: 'Vikram Singh (Member)', user: 'vikram', pass: 'vikram123', role: 'Ward 3 • Streetlights' },
  { label: 'Geeta Verma (Member)', user: 'geeta', pass: 'geeta123', role: 'Ward 4 • Water & General' }
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(username, password);
      onLogin(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{ maxWidth: '520px', margin: '1.5rem auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>🔐 Gram Panchayat Official Login</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
          Sign in to manage assigned ward complaints, upload resolution photos, and notify citizens.
        </p>

        {error && <div className="alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Login to Panchayat Portal'}
          </button>
        </form>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '0.65rem' }}>⚡ Quick Demo Accounts (Click to Autofill)</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.user}
              type="button"
              onClick={() => fillDemo(acc.user, acc.pass)}
              className="btn btn-sm btn-outline"
              style={{ justifyContent: 'space-between', textAlign: 'left' }}
            >
              <span>
                <strong>{acc.label}</strong> ({acc.user} / {acc.pass})
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{acc.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
