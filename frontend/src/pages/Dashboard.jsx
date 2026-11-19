import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { getIssues, getStats } from '../db';
import {
  CATEGORIES,
  STATUS_LIST,
  WARDS,
  getCategoryMeta,
  formatRelativeTime,
  exportIssuesToCsv
} from '../helper';

export default function Dashboard({ user }) {
  const { t } = useLanguage();
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    reported: 0,
    underReview: 0,
    resolved: 0,
    slaOverdueCount: 0,
    avgResolutionHours: 0,
    byCategory: {}
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('all');
  const [onlyMyIssues, setOnlyMyIssues] = useState(user?.role !== 'super_admin');
  const [onlySlaOverdue, setOnlySlaOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const assignedTo = onlyMyIssues && user ? user.id : 'all';
      const [issuesData, statsData] = await Promise.all([
        getIssues({
          status: statusFilter,
          category: categoryFilter,
          ward: wardFilter,
          assignedTo,
          search,
          slaOverdue: onlySlaOverdue
        }),
        getStats(assignedTo)
      ]);
      setIssues(issuesData);
      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [statusFilter, categoryFilter, wardFilter, onlyMyIssues, onlySlaOverdue, search]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <h2>📊 Gram Panchayat Governance Dashboard</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
            Logged in as <strong>{user?.name}</strong> ({user?.ward || 'All Wards'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => exportIssuesToCsv(issues)}
            className="btn btn-sm btn-accent"
          >
            📥 {t('exportCsv')} ({issues.length})
          </button>
          <button type="button" onClick={loadDashboardData} className="btn btn-sm btn-outline">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* KPI & SLA Analytics Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Complaints</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Reported (New)</div>
          <div className="stat-value" style={{ color: '#dd6b20' }}>
            {stats.reported}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Under Review</div>
          <div className="stat-value" style={{ color: '#2b6cb0' }}>
            {stats.underReview}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Resolved</div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {stats.resolved}
          </div>
        </div>
        <div className="stat-card" style={{ borderColor: stats.slaOverdueCount > 0 ? '#feb2b2' : undefined }}>
          <div className="stat-label">⚠️ {t('slaOverdue')}</div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {stats.slaOverdueCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">⏱️ {t('avgResolution')}</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            {stats.avgResolutionHours}h
          </div>
        </div>
      </div>

      {/* Visual Category Breakdown Bar */}
      {stats.total > 0 && (
        <div className="card">
          <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.55rem' }}>
            Issues Breakdown by Category
          </div>
          <div
            style={{
              display: 'flex',
              height: '14px',
              borderRadius: '999px',
              overflow: 'hidden',
              background: '#eee'
            }}
          >
            {CATEGORIES.map((cat) => {
              const count = (stats.byCategory && stats.byCategory[cat.id]) || 0;
              if (count === 0) return null;
              const pct = Math.round((count / stats.total) * 100);
              return (
                <div
                  key={cat.id}
                  title={`${cat.label}: ${count} (${pct}%)`}
                  style={{ width: `${pct}%`, background: cat.color }}
                />
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.85rem',
              marginTop: '0.6rem',
              fontSize: '0.82rem'
            }}
          >
            {CATEGORIES.map((cat) => (
              <span key={cat.id}>
                {cat.icon} <strong>{cat.label}:</strong> {(stats.byCategory && stats.byCategory[cat.id]) || 0}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card">
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            style={{ flex: 1, minWidth: '200px' }}
            placeholder="Search ID, landmark, villager name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="select"
            style={{ width: 'auto' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {STATUS_LIST.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>

          <select
            className="select"
            style={{ width: 'auto' }}
            value={wardFilter}
            onChange={(e) => setWardFilter(e.target.value)}
          >
            <option value="all">All Wards</option>
            {WARDS.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.88rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyMyIssues}
              onChange={(e) => setOnlyMyIssues(e.target.checked)}
            />
            Assigned to Me
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.88rem', cursor: 'pointer', color: 'var(--danger)', fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={onlySlaOverdue}
              onChange={(e) => setOnlySlaOverdue(e.target.checked)}
            />
            SLA Overdue Only
          </label>
        </div>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          Loading complaints...
        </div>
      ) : issues.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
          No civic complaints match the selected filters.
        </div>
      ) : (
        issues.map((issue) => {
          const cat = getCategoryMeta(issue.category);
          const badgeClass =
            issue.status === 'Resolved'
              ? 'badge-resolved'
              : issue.status === 'Under Review'
              ? 'badge-review'
              : 'badge-reported';

          return (
            <div key={issue.id} className="card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}
              >
                <div style={{ flex: 1, minWidth: '250px' }}>
                  <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      {cat.icon} {issue.tracking_id}
                    </span>
                    <span className={`badge ${badgeClass}`}>{issue.status}</span>
                    <span className={`badge badge-priority-${issue.priority}`}>
                      {issue.priority}
                    </span>
                    {issue.sla_overdue && (
                      <span className="badge badge-sla">⚠️ SLA Overdue ({issue.age_hours}h)</span>
                    )}
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                      👍 {issue.upvotes || 1}
                    </span>
                  </div>

                  <p style={{ fontWeight: 500, marginBottom: '0.35rem' }}>{issue.description}</p>

                  <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>
                    📍 {issue.address} • 👤 Reported by {issue.reporter_name} ({formatRelativeTime(issue.created_at)}) • 🛠️ Assigned: <strong>{issue.assigned_member_name}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {issue.resolved_photo_path && (
                    <span className="badge badge-resolved" title="Resolution photo uploaded">
                      📷 Proof Attached
                    </span>
                  )}
                  <Link to={`/issues/${issue.id}`} className="btn btn-sm btn-primary">
                    Manage & Resolve →
                  </Link>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
