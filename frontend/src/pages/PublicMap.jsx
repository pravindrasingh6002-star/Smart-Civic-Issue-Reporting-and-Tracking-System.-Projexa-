import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { getIssues, upvoteIssue, hasUpvotedLocally } from '../db';
import { CATEGORIES, STATUS_LIST, getCategoryMeta } from '../helper';

export default function PublicMap() {
  const [issues, setIssues] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const data = await getIssues({
        status: statusFilter,
        category: categoryFilter
      });
      setIssues(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, [statusFilter, categoryFilter]);

  const handleUpvote = async (id) => {
    try {
      const updated = await upvoteIssue(id);
      setIssues((prev) => prev.map((iss) => (iss.id === updated.id ? updated : iss)));
    } catch (err) {
      alert(err.message);
    }
  };

  const getMarkerColor = (status) => {
    if (status === 'Resolved') return '#2f855a';
    if (status === 'Under Review') return '#2b6cb0';
    return '#dd6b20';
  };

  return (
    <div>
      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div>
            <h2>🗺️ Live Village Civic Issue Map</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>
              Click any pin to inspect photo evidence, upvote community impact, or track progress.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
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
          </div>
        </div>
      </div>

      <div className="card" style={{ height: '540px', padding: '0.75rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading village map pins...</div>
        ) : (
          <MapContainer center={[28.4595, 77.0266]} zoom={14}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {issues.map((issue) => {
              const cat = getCategoryMeta(issue.category);
              const color = getMarkerColor(issue.status);
              return (
                <CircleMarker
                  key={issue.id}
                  center={[issue.latitude || 28.4595, issue.longitude || 77.0266]}
                  radius={11}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.92
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: '220px' }}>
                      <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                        {cat.icon} {cat.label} ({issue.tracking_id})
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#4a5568', marginBottom: '0.35rem' }}>
                        📍 {issue.address} • <strong>{issue.status}</strong>
                      </div>
                      <p style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                        {issue.description.slice(0, 100)}
                      </p>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          disabled={hasUpvotedLocally(issue.id)}
                          onClick={() => handleUpvote(issue.id)}
                          className="btn btn-sm btn-accent"
                        >
                          👍 +1 ({issue.upvotes || 1})
                        </button>
                        <Link
                          to={`/track?code=${issue.tracking_id}`}
                          className="btn btn-sm btn-outline"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
