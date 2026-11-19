import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../i18n';
import {
  getIssueById,
  getMembers,
  updateIssueStatus,
  updateIssuePriority,
  reassignIssue
} from '../db';
import { STATUS_LIST, PRIORITIES, getCategoryMeta, formatDateTime } from '../helper';
import PhotoInput from '../components/PhotoInput';

const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function IssueDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [issue, setIssue] = useState(null);
  const [members, setMembers] = useState([]);
  const [status, setStatus] = useState('Reported');
  const [note, setNote] = useState('');
  const [resolvedPhoto, setResolvedPhoto] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [iss, mems] = await Promise.all([getIssueById(id), getMembers()]);
        if (active && iss) {
          setIssue(iss);
          setStatus(iss.status);
          setResolvedPhoto(iss.resolved_photo_path || '');
          setNote(iss.resolution_note || '');
          setMembers(mems);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="card">Loading complaint details...</div>;
  }

  if (!issue) {
    return <div className="card">Issue not found.</div>;
  }

  const cat = getCategoryMeta(issue.category);

  const handleStatusSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    try {
      const updated = await updateIssueStatus(
        issue.id,
        status,
        note,
        user?.name || 'Panchayat Member',
        resolvedPhoto
      );
      setIssue(updated);
      setFeedback('Status and resolution proof saved successfully!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = async (newPriority) => {
    try {
      const updated = await updateIssuePriority(issue.id, newPriority, user?.name);
      setIssue(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReassignChange = async (newMemberId) => {
    try {
      const updated = await reassignIssue(issue.id, newMemberId, user?.name);
      setIssue(updated);
    } catch (err) {
      alert(err.message);
    }
  };

  const cleanReporterPhone = String(issue.reporter_phone || '').replace(/\D/g, '');
  const whatsappNotifyMsg = encodeURIComponent(
    `Namaste ${issue.reporter_name || 'Citizen'},\nYour Gram Suvidha complaint (${issue.tracking_id} - ${cat.label}) status is now: *${issue.status}*.\n${issue.resolution_note ? 'Note: ' + issue.resolution_note : ''}\n— Gram Panchayat ${user?.name || ''}`
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-sm btn-outline">
          ← Back to Dashboard
        </button>

        {cleanReporterPhone && (
          <a
            href={`https://wa.me/91${cleanReporterPhone}?text=${whatsappNotifyMsg}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm btn-whatsapp"
          >
            💬 {t('notifyCitizenWhatsApp')} ({issue.reporter_phone})
          </a>
        )}
      </div>

      {feedback && <div className="alert-success">✅ {feedback}</div>}

      <div className="grid-2">
        {/* Left Column: Issue Metadata & Map */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <h2>
              {cat.icon} {issue.tracking_id}
            </h2>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <span className="badge badge-review">{issue.status}</span>
              {issue.sla_overdue && <span className="badge badge-sla">⚠️ SLA Overdue</span>}
            </div>
          </div>

          <p style={{ fontSize: '1.02rem', marginBottom: '0.85rem' }}>{issue.description}</p>

          <div style={{ fontSize: '0.9rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '1rem' }}>
            <div><strong>Category:</strong> {cat.label}</div>
            <div><strong>Ward & Landmark:</strong> {issue.address} ({issue.ward})</div>
            <div><strong>Reporter:</strong> {issue.reporter_name} ({issue.reporter_phone || 'No phone'})</div>
            <div><strong>Community Upvotes:</strong> 👍 {issue.upvotes || 1} villagers affected</div>
            <div><strong>Assigned Member:</strong> {issue.assigned_member_name}</div>
            <div><strong>Logged On:</strong> {formatDateTime(issue.created_at)}</div>
          </div>

          <div style={{ height: '210px', marginBottom: '1rem' }}>
            <MapContainer center={[issue.latitude || 28.4595, issue.longitude || 77.0266]} zoom={15}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[issue.latitude || 28.4595, issue.longitude || 77.0266]} icon={pinIcon} />
            </MapContainer>
          </div>

          {/* Priority & Reassignment Controls */}
          <div className="grid-2">
            <div>
              <label className="form-label">Priority Level</label>
              <select
                className="select"
                value={issue.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {user?.role === 'super_admin' && (
              <div>
                <label className="form-label">Reassign Member (Sarpanch)</label>
                <select
                  className="select"
                  value={issue.assigned_to}
                  onChange={(e) => handleReassignChange(e.target.value)}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.ward})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Update Status & Upload Before/After Proof */}
        <div className="card">
          <h3 style={{ marginBottom: '0.75rem' }}>🛠️ Update Resolution Status & Proof</h3>
          <form onSubmit={handleStatusSave}>
            <div className="form-group">
              <label className="form-label">Current Status</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Action / Resolution Note</label>
              <textarea
                className="textarea"
                placeholder="Enter action taken (e.g. Repaired handpump chain and tested water quality)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Upload "After" Resolution Photo Proof (Recommended when marking Resolved)
              </label>
              <PhotoInput
                value={resolvedPhoto}
                onChange={setResolvedPhoto}
                label="Upload Resolution Proof Photo"
              />
            </div>

            <button type="submit" disabled={saving} className="btn btn-primary" style={{ width: '100%' }}>
              💾 {saving ? 'Saving Update...' : 'Save Status & Resolution Proof'}
            </button>
          </form>
        </div>
      </div>

      {/* Side-by-Side Before & After Comparison */}
      <div className="card">
        <h3>📷 Before & After Visual Verification</h3>
        <div className="photo-compare-grid">
          <div className="photo-frame">
            <div className="photo-frame-header">
              <span>{t('beforePhoto')}</span>
              <span>Citizen Submission</span>
            </div>
            {issue.photo_path ? (
              <img src={issue.photo_path} alt="Before" />
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                No photo uploaded by citizen
              </div>
            )}
          </div>

          <div className="photo-frame" style={{ borderColor: issue.resolved_photo_path ? 'var(--success)' : undefined }}>
            <div
              className="photo-frame-header"
              style={{
                background: issue.resolved_photo_path ? '#c6f6d5' : undefined,
                color: issue.resolved_photo_path ? '#22543d' : undefined
              }}
            >
              <span>{t('afterPhoto')}</span>
              <span>Panchayat Verification</span>
            </div>
            {issue.resolved_photo_path ? (
              <img src={issue.resolved_photo_path} alt="After resolution" />
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)' }}>
                Upload an "After" photo above when the issue is fixed
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Activity Timeline */}
      <div className="card">
        <h3 style={{ marginBottom: '0.85rem' }}>📜 Audit Log</h3>
        <div className="timeline">
          {(issue.log || []).map((entry, idx) => (
            <div key={idx} className="timeline-item">
              <div style={{ fontWeight: 600 }}>{entry.action}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                {entry.by_name} • {formatDateTime(entry.created_at)}
              </div>
              {entry.note && <div style={{ fontSize: '0.88rem', marginTop: '0.2rem' }}>{entry.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
