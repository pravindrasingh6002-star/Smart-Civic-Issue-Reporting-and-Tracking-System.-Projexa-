import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../i18n';
import {
  getIssueByTrackingId,
  getIssuesByPhone,
  upvoteIssue,
  hasUpvotedLocally
} from '../db';
import { getCategoryMeta, formatDateTime } from '../helper';

export default function Track() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const isNewlyCreated = searchParams.get('new') === '1';

  const [mode, setMode] = useState('id'); // 'id' or 'phone'
  const [query, setQuery] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (initialCode) {
      handleLookup(initialCode, 'id');
    }
  }, [initialCode]);

  const handleLookup = async (qVal = query, lookupMode = mode) => {
    const clean = String(qVal || '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      if (lookupMode === 'id') {
        const issue = await getIssueByTrackingId(clean);
        setResults(issue ? [issue] : []);
      } else {
        const list = await getIssuesByPhone(clean);
        setResults(list);
        if (list.length === 0) {
          setError('No reports found linked to that phone number.');
        }
      }
    } catch (err) {
      setResults([]);
      setError(err.message || 'Could not find matching complaint.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (issueId) => {
    try {
      const updated = await upvoteIssue(issueId);
      setResults((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="card no-print">
        <h2>🔍 {t('trackTitle')}</h2>
        <p style={{ color: 'var(--muted)', marginBottom: '1rem' }}>{t('trackSub')}</p>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.9rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'id' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setMode('id');
              setQuery('');
            }}
          >
            {t('trackById')}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'phone' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => {
              setMode('phone');
              setQuery('');
            }}
          >
            {t('trackByPhone')}
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLookup();
          }}
          style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}
        >
          <input
            type="text"
            className="input"
            style={{ flex: 1, minWidth: '220px' }}
            placeholder={
              mode === 'id'
                ? 'Enter Tracking ID (e.g. CVC-8F3A21B9)'
                : 'Enter 10-digit Mobile Number (e.g. 9811122233)'
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Searching...' : t('searchBtn')}
          </button>
        </form>
      </div>

      {isNewlyCreated && results.length > 0 && (
        <div className="alert-success no-print">
          🎉 <strong>Complaint Registered Successfully!</strong> Save or print your Tracking ID{' '}
          <strong>{results[0].tracking_id}</strong> below.
        </div>
      )}

      {error && <div className="alert-error no-print">⚠️ {error}</div>}

      {results.map((issue) => {
        const cat = getCategoryMeta(issue.category);
        const badgeClass =
          issue.status === 'Resolved'
            ? 'badge-resolved'
            : issue.status === 'Under Review'
            ? 'badge-review'
            : 'badge-reported';

        const whatsappText = encodeURIComponent(
          `Gram Suvidha Complaint Receipt\nTracking ID: ${issue.tracking_id}\nCategory: ${cat.label}\nStatus: ${issue.status}\nLocation: ${issue.address}\nAssigned To: ${issue.assigned_member_name}`
        );

        return (
          <div key={issue.id} className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '0.75rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.9rem',
                marginBottom: '1rem'
              }}
            >
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>
                  {t('receiptTitle')}
                </div>
                <h3 style={{ fontSize: '1.35rem', marginTop: '0.15rem' }}>
                  {cat.icon} {issue.tracking_id} — {cat.label}
                </h3>
                <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                  📍 {issue.address} ({issue.ward})
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${badgeClass}`}>{issue.status}</span>
                {issue.sla_overdue && <span className="badge badge-sla">⚠️ {t('slaOverdue')}</span>}
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: '1rem' }}>
              <div>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>Description:</strong> {issue.description}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                  <strong>Assigned Panchayat Official:</strong> {issue.assigned_member_name}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                  <strong>Reported On:</strong> {formatDateTime(issue.created_at)}
                </p>
                {issue.resolution_note && (
                  <p
                    style={{
                      marginTop: '0.6rem',
                      padding: '0.6rem',
                      background: 'var(--success-bg)',
                      borderRadius: '8px',
                      fontSize: '0.9rem'
                    }}
                  >
                    <strong>Resolution Note:</strong> {issue.resolution_note}
                  </p>
                )}
              </div>

              <div
                className="no-print"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  alignItems: 'flex-start'
                }}
              >
                <button
                  type="button"
                  disabled={hasUpvotedLocally(issue.id)}
                  onClick={() => handleUpvote(issue.id)}
                  className="btn btn-sm btn-accent"
                >
                  👍 {hasUpvotedLocally(issue.id) ? t('upvotedBtn') : t('upvoteBtn')} ({issue.upvotes || 1} villagers)
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn btn-sm btn-outline"
                >
                  🖨️ {t('printReceipt')}
                </button>

                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-whatsapp"
                >
                  💬 {t('shareWhatsApp')}
                </a>
              </div>
            </div>

            {/* Side-by-Side Before & After Photos */}
            {(issue.photo_path || issue.resolved_photo_path) && (
              <div className="photo-compare-grid">
                {issue.photo_path && (
                  <div className="photo-frame">
                    <div className="photo-frame-header">
                      <span>📷 {t('beforePhoto')}</span>
                      <span>Reported</span>
                    </div>
                    <img src={issue.photo_path} alt="Reported issue" />
                  </div>
                )}

                {issue.resolved_photo_path && (
                  <div className="photo-frame" style={{ borderColor: 'var(--success)' }}>
                    <div
                      className="photo-frame-header"
                      style={{ background: '#c6f6d5', color: '#22543d' }}
                    >
                      <span>✅ {t('afterPhoto')}</span>
                      <span>Verified Resolved</span>
                    </div>
                    <img src={issue.resolved_photo_path} alt="Resolution proof" />
                  </div>
                )}
              </div>
            )}

            {/* Activity Log Timeline */}
            {Array.isArray(issue.log) && issue.log.length > 0 && (
              <div style={{ marginTop: '1.25rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Transparent Governance Timeline</h4>
                <div className="timeline">
                  {issue.log.map((entry, idx) => (
                    <div key={idx} className="timeline-item">
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{entry.action}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        By {entry.by_name} • {formatDateTime(entry.created_at)}
                      </div>
                      {entry.note && (
                        <div style={{ fontSize: '0.86rem', marginTop: '0.15rem' }}>{entry.note}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
