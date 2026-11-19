import React, { useState } from 'react';
import { compressImageFile } from '../helper';

export default function PhotoInput({ value, onChange, label = 'Upload or Capture Photo' }) {
  const [compressing, setCompressing] = useState(false);
  const [sizeInfo, setSizeInfo] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCompressing(true);
    try {
      const originalKb = Math.round(file.size / 1024);
      const compressedDataUrl = await compressImageFile(file, 1024, 0.75);
      const compressedKb = Math.round((compressedDataUrl.length * 3) / 4 / 1024);
      setSizeInfo(`Compressed from ${originalKb} KB → ${compressedKb} KB for fast village network upload`);
      onChange(compressedDataUrl);
    } catch (err) {
      console.error('Image compression error:', err);
    } finally {
      setCompressing(false);
    }
  };

  return (
    <div>
      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '12px',
          padding: '1rem',
          textAlign: 'center',
          background: '#faf8f4'
        }}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="photo-upload-input"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <label
          htmlFor="photo-upload-input"
          className="btn btn-outline"
          style={{ cursor: 'pointer' }}
        >
          📷 {compressing ? 'Compressing Photo...' : label}
        </label>

        {sizeInfo && (
          <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: '0.45rem' }}>
            ⚡ {sizeInfo}
          </div>
        )}

        {value && (
          <div style={{ marginTop: '0.85rem' }}>
            <img
              src={value}
              alt="Preview"
              style={{
                maxHeight: '210px',
                maxWidth: '100%',
                borderRadius: '10px',
                border: '1px solid var(--border)'
              }}
            />
            <div style={{ marginTop: '0.4rem' }}>
              <button
                type="button"
                className="btn btn-sm"
                style={{ background: '#fee2e2', color: '#991b1b' }}
                onClick={() => {
                  onChange('');
                  setSizeInfo('');
                }}
              >
                ✕ Remove Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
