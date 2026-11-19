import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useLanguage } from '../i18n';
import { CATEGORIES, WARDS } from '../helper';
import { createIssue, getNearbyIssues, reverseGeocode, upvoteIssue, hasUpvotedLocally } from '../db';
import PhotoInput from '../components/PhotoInput';

// Fix default Leaflet marker icon
const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function LocationPickerMarker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return position ? <Marker position={[position.lat, position.lng]} icon={pinIcon} /> : null;
}

export default function Report() {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();

  const [category, setCategory] = useState('water');
  const [photo, setPhoto] = useState('');
  const [ward, setWard] = useState('Ward 1');
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState({ lat: 28.4595, lng: 77.0266 });
  const [gpsStatus, setGpsStatus] = useState('');
  const [description, setDescription] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [nearbyDuplicates, setNearbyDuplicates] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check for nearby duplicate open issues within ~200m whenever location or category changes
  useEffect(() => {
    let active = true;
    async function checkDuplicates() {
      if (!position || !category) return;
      const matches = await getNearbyIssues(position.lat, position.lng, category);
      if (active) {
        setNearbyDuplicates(matches);
      }
    }
    checkDuplicates();
    return () => {
      active = false;
    };
  }, [position.lat, position.lng, category]);

  const handlePinPick = async (lat, lng) => {
    const roundedLat = Number(lat.toFixed(5));
    const roundedLng = Number(lng.toFixed(5));
    setPosition({ lat: roundedLat, lng: roundedLng });
    setGpsStatus(`Location pinned (${roundedLat}, ${roundedLng})`);

    const geoAddr = await reverseGeocode(roundedLat, roundedLng);
    if (geoAddr && !address) {
      setAddress(geoAddr);
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation is not supported by your browser');
      return;
    }
    setGpsStatus('Detecting GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await handlePinPick(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setGpsStatus('Could not auto-detect GPS. Please tap on the map to drop a pin.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Voice-to-Text (Hindi & English) using browser Web Speech API
  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is supported in Chrome / Edge mobile and desktop browsers.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const handleQuickUpvote = async (issueId) => {
    try {
      await upvoteIssue(issueId);
      const refreshed = await getNearbyIssues(position.lat, position.lng, category);
      setNearbyDuplicates(refreshed);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) {
      setError('Please describe the civic issue so the Panchayat member can take action.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createIssue({
        category,
        description,
        ward,
        address,
        latitude: position.lat,
        longitude: position.lng,
        photo_path: photo,
        reporter_name: reporterName || 'Villager',
        reporter_phone: reporterPhone
      });
      navigate(`/track?code=${encodeURIComponent(created.tracking_id)}&new=1`);
    } catch (err) {
      setError(err.message || 'Failed to submit issue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="hero-banner">
        <h1>{t('heroTitle')}</h1>
        <p>{t('heroSub')}</p>
      </div>

      {error && <div className="alert-error">⚠️ {error}</div>}

      <form onSubmit={handleSubmit}>
        {/* 1. Category Selector */}
        <div className="card">
          <label className="form-label">{t('selectCategory')}</label>
          <div className="category-grid">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`category-tile ${category === cat.id ? 'selected' : ''}`}
              >
                <span className="category-icon">{cat.icon}</span>
                <span className="category-name">
                  {lang === 'hi' ? cat.labelHi : cat.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Photo Upload with Auto Compression */}
        <div className="card">
          <label className="form-label">{t('uploadPhoto')}</label>
          <PhotoInput value={photo} onChange={setPhoto} />
        </div>

        {/* 3. Geolocation Map + Explicit Ward Selector */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
              marginBottom: '0.75rem'
            }}
          >
            <label className="form-label" style={{ margin: 0 }}>
              {t('pinLocation')}
            </label>
            <button type="button" onClick={handleDetectGps} className="btn btn-sm btn-outline">
              📍 Use My Current GPS
            </button>
          </div>

          {gpsStatus && (
            <div style={{ fontSize: '0.84rem', color: 'var(--primary)', marginBottom: '0.6rem' }}>
              {gpsStatus}
            </div>
          )}

          <div style={{ height: '270px', marginBottom: '1rem' }}>
            <MapContainer center={[position.lat, position.lng]} zoom={15}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPickerMarker position={position} onPick={handlePinPick} />
            </MapContainer>
          </div>

          {/* Nearby Duplicate Alert Banner */}
          {nearbyDuplicates.length > 0 && (
            <div className="alert-warning">
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                ⚠️ {t('nearbyAlertTitle')}
              </div>
              <div style={{ fontSize: '0.88rem', marginBottom: '0.65rem' }}>
                {t('nearbyAlertSub')}
              </div>
              {nearbyDuplicates.slice(0, 2).map((dup) => (
                <div
                  key={dup.id}
                  style={{
                    background: '#ffffff',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    marginBottom: '0.45rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}
                >
                  <div>
                    <strong>{dup.tracking_id}</strong> ({dup.distance_meters}m away) —{' '}
                    {dup.description.slice(0, 70)}
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      disabled={hasUpvotedLocally(dup.id)}
                      onClick={() => handleQuickUpvote(dup.id)}
                      className="btn btn-sm btn-accent"
                    >
                      👍 {hasUpvotedLocally(dup.id) ? t('upvotedBtn') : t('upvoteBtn')} ({dup.upvotes || 1})
                    </button>
                    <Link to={`/track?code=${dup.tracking_id}`} className="btn btn-sm btn-outline">
                      Track
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid-2">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{t('selectWard')}</label>
              <select className="select" value={ward} onChange={(e) => setWard(e.target.value)}>
                {WARDS.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Landmark / Street Address</label>
              <input
                type="text"
                className="input"
                placeholder={t('addressPlaceholder')}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. Description + Voice-to-Text */}
        <div className="card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <label className="form-label" style={{ margin: 0 }}>
              {t('describeIssue')} *
            </label>
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`btn btn-sm ${isListening ? 'btn-accent' : 'btn-outline'}`}
            >
              🎤 {isListening ? t('voiceListening') : t('voiceBtn')}
            </button>
          </div>
          <textarea
            className="textarea"
            placeholder="Describe the issue clearly (e.g. Handpump broken since 4 days, school children affected)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* 5. Reporter Contact Info */}
        <div className="card">
          <label className="form-label">{t('yourDetails')}</label>
          <div className="grid-2">
            <input
              type="text"
              className="input"
              placeholder={t('namePlaceholder')}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
            />
            <input
              type="tel"
              className="input"
              placeholder={t('phonePlaceholder')}
              value={reporterPhone}
              onChange={(e) => setReporterPhone(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
              ✅ {submitting ? t('submitting') : t('submitReport')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
