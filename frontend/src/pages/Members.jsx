import React, { useState, useEffect } from 'react';
import { getMembers, addMember, toggleMemberActive } from '../db';
import { CATEGORIES, WARDS } from '../helper';

export default function Members() {
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('Ward 1');
  const [selectedCats, setSelectedCats] = useState(['water']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMembers = async () => {
    setLoading(true);
    try {
      const list = await getMembers();
      setMembers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const toggleCat = (catId) => {
    setSelectedCats((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addMember({
        name,
        username,
        password,
        phone,
        ward,
        categories: selectedCats
      });
      setName('');
      setUsername('');
      setPassword('');
      setPhone('');
      await loadMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await toggleMemberActive(id);
      await loadMembers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>👥 Gram Panchayat Members & Smart Routing Directory</h2>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '0.85rem' }}>➕ Register New Ward Member</h3>
          {error && <div className="alert-error">⚠️ {error}</div>}
          <form onSubmit={handleAddMember}>
            <div className="form-group">
              <label className="form-label">Full Name & Designation *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Mahesh Kumar (Ward 2 Panch)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Login Username *</label>
                <input
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Login Password *</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">WhatsApp / Mobile Number</label>
                <input
                  type="tel"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Assigned Ward</label>
                <select className="select" value={ward} onChange={(e) => setWard(e.target.value)}>
                  <option value="All Wards">All Wards</option>
                  {WARDS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Auto-Routing Categories Handled</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCat(c.id)}
                    className={`btn btn-sm ${selectedCats.includes(c.id) ? 'btn-primary' : 'btn-outline'}`}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Add Panchayat Member
            </button>
          </form>
        </div>

        <div>
          {loading ? (
            <div className="card">Loading members...</div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <h4>
                      {m.name}{' '}
                      <span
                        className={`badge ${Number(m.active) === 1 ? 'badge-resolved' : 'badge-sla'}`}
                      >
                        {Number(m.active) === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      Username: <strong>{m.username}</strong> • Ward: <strong>{m.ward || 'All'}</strong> • Phone: {m.phone || '—'}
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: '0.4rem' }}>
                      <strong>Categories:</strong> {(m.categories || []).join(', ')}
                    </div>
                    <div style={{ fontSize: '0.84rem', marginTop: '0.25rem', color: 'var(--primary)' }}>
                      Open Load: <strong>{m.open_issues || 0}</strong> • Resolved: <strong>{m.resolved_issues || 0}</strong>
                    </div>
                  </div>

                  {m.role !== 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m.id)}
                      className="btn btn-sm btn-outline"
                    >
                      {Number(m.active) === 1 ? 'Deactivate' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
