import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';

export default function Navbar({ user, onLogout }) {
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="brand-badge">🌾</span>
          <div>
            <div>{t('appName')}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>
              Gram Panchayat Digital Sewa
            </div>
          </div>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/report" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            📢 {t('navReport')}
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🔍 {t('navTrack')}
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            🗺️ {t('navMap')}
          </NavLink>

          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                📊 {t('navDashboard')}
              </NavLink>
              {user.role === 'super_admin' && (
                <NavLink
                  to="/members"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  👥 {t('navMembers')}
                </NavLink>
              )}
              <button
                type="button"
                onClick={handleLogoutClick}
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                {t('navLogout')} ({user.username})
              </button>
            </>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              🔐 {t('navLogin')}
            </NavLink>
          )}

          <button type="button" onClick={toggleLang} className="lang-btn">
            {lang === 'en' ? 'हिंदी में देखें' : 'English'}
          </button>
        </nav>
      </div>
    </header>
  );
}
