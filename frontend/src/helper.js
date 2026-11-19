export const CATEGORIES = [
  {
    id: 'pothole',
    label: 'Road & Potholes',
    labelHi: 'सड़क एवं गड्ढे',
    icon: '🛣️',
    color: '#8c583a'
  },
  {
    id: 'water',
    label: 'Water & Handpump',
    labelHi: 'पानी एवं हैंडपंप',
    icon: '🚰',
    color: '#2b6cb0'
  },
  {
    id: 'garbage',
    label: 'Garbage & Sanitation',
    labelHi: 'कचरा एवं सफाई',
    icon: '🗑️',
    color: '#b7791f'
  },
  {
    id: 'lighting',
    label: 'Streetlights & Solar',
    labelHi: 'स्ट्रीट लाइट एवं बिजली',
    icon: '💡',
    color: '#d69e2e'
  },
  {
    id: 'infrastructure',
    label: 'Drainage & Public Works',
    labelHi: 'नाली एवं पंचायत भवन',
    icon: '🧱',
    color: '#2f6d4d'
  },
  {
    id: 'other',
    label: 'Other Civic Issue',
    labelHi: 'अन्य ग्राम समस्या',
    icon: '📋',
    color: '#6b7280'
  }
];

export const WARDS = [
  'Ward 1',
  'Ward 2',
  'Ward 3',
  'Ward 4',
  'Other / General'
];

export const STATUS_LIST = ['Reported', 'Under Review', 'Resolved'];

export const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

export function getCategoryMeta(catId) {
  return CATEGORIES.find((c) => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diffMs / (1000 * 3600));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Client-side HTML5 Canvas image compressor for low-bandwidth 2G/3G village networks.
 * Compresses images to maxWidth 1024px at 0.75 JPEG quality.
 */
export function compressImageFile(file, maxWidth = 1024, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Export array of issues to an official CSV spreadsheet for Gram Panchayat records.
 */
export function exportIssuesToCsv(issues = []) {
  const headers = [
    'Tracking ID',
    'Status',
    'SLA Overdue',
    'Priority',
    'Category',
    'Ward',
    'Address / Landmark',
    'Description',
    'Assigned Member',
    'Reporter Name',
    'Reporter Phone',
    'Upvotes',
    'Latitude',
    'Longitude',
    'Created At',
    'Resolved At'
  ];

  const escapeCsv = (val) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = issues.map((iss) => [
    iss.tracking_id,
    iss.status,
    iss.sla_overdue ? 'YES (>72h)' : 'NO',
    iss.priority,
    iss.category,
    iss.ward || '',
    iss.address || '',
    iss.description || '',
    iss.assigned_member_name || '',
    iss.reporter_name || '',
    iss.reporter_phone || '',
    iss.upvotes || 1,
    iss.latitude,
    iss.longitude,
    iss.created_at,
    iss.resolved_at || ''
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `Gram_Suvidha_Report_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
