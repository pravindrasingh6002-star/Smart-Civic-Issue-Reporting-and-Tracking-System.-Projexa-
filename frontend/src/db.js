/**
 * ============================================================================
 * GRAM SUVIDHA — ASYNC API CLIENT WITH TRANSPARENT OFFLINE / DEMO FALLBACK
 * ============================================================================
 * All functions are strictly async and return Promises.
 * Talks to VITE_API_URL (or '/api' proxy). If the backend is unreachable,
 * seamlessly falls back to seeded localStorage so the UI never crashes.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const LS_KEY = 'gram_suvidha_offline_db_v2';
const UPVOTED_KEY = 'gram_suvidha_upvoted_ids';

const FALLBACK_MEMBERS = [
  {
    id: 1,
    name: 'Sarpanch Rajesh Sharma',
    username: 'admin',
    phone: '9876543210',
    role: 'super_admin',
    categories: ['pothole', 'garbage', 'lighting', 'water', 'infrastructure', 'other'],
    ward: 'All Wards',
    active: 1
  },
  {
    id: 2,
    name: 'Ramesh Yadav (Ward 1 & Roads)',
    username: 'ramesh',
    phone: '9876500001',
    role: 'member',
    categories: ['pothole', 'infrastructure'],
    ward: 'Ward 1',
    active: 1
  },
  {
    id: 3,
    name: 'Sunita Devi (Sanitation & Water)',
    username: 'sunita',
    phone: '9876500002',
    role: 'member',
    categories: ['garbage', 'water'],
    ward: 'Ward 2',
    active: 1
  },
  {
    id: 4,
    name: 'Vikram Singh (Electricity & Lights)',
    username: 'vikram',
    phone: '9876500003',
    role: 'member',
    categories: ['lighting'],
    ward: 'Ward 3',
    active: 1
  },
  {
    id: 5,
    name: 'Geeta Verma (Water & General)',
    username: 'geeta',
    phone: '9876500004',
    role: 'member',
    categories: ['water', 'other'],
    ward: 'Ward 4',
    active: 1
  }
];

function getLocalStore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  const initial = { members: FALLBACK_MEMBERS, issues: [] };
  localStorage.setItem(LS_KEY, JSON.stringify(initial));
  return initial;
}

function saveLocalStore(store) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
  } catch (e) {
    // ignore quota errors
  }
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('gram_suvidha_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = `HTTP Error ${response.status}`;
    try {
      const errData = await response.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch (e) {
      // ignore
    }
    throw new Error(errMsg);
  }
  return await response.json();
}

export async function loginUser(username, password) {
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (data.token) {
      localStorage.setItem('gram_suvidha_token', data.token);
    }
    return data.user;
  } catch (err) {
    // Offline fallback check for default demo credentials
    const store = getLocalStore();
    const u = store.members.find(
      (m) => m.username.toLowerCase() === String(username).trim().toLowerCase()
    );
    if (u && password === `${u.username}123`) {
      return u;
    }
    throw err;
  }
}

export async function getIssues(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.category && filters.category !== 'all') params.set('category', filters.category);
  if (filters.assignedTo && filters.assignedTo !== 'all') params.set('assignedTo', filters.assignedTo);
  if (filters.ward && filters.ward !== 'all') params.set('ward', filters.ward);
  if (filters.search) params.set('search', filters.search);
  if (filters.slaOverdue) params.set('slaOverdue', 'true');

  const qs = params.toString() ? `?${params.toString()}` : '';
  try {
    const list = await apiFetch(`/issues${qs}`);
    const store = getLocalStore();
    store.issues = list;
    saveLocalStore(store);
    return list;
  } catch (err) {
    const store = getLocalStore();
    return store.issues || [];
  }
}

export async function getStats(assignedTo = null) {
  const qs = assignedTo && assignedTo !== 'all' ? `?assignedTo=${assignedTo}` : '';
  try {
    return await apiFetch(`/issues/stats${qs}`);
  } catch (err) {
    const issues = await getIssues({ assignedTo });
    return {
      total: issues.length,
      reported: issues.filter((i) => i.status === 'Reported').length,
      underReview: issues.filter((i) => i.status === 'Under Review').length,
      resolved: issues.filter((i) => i.status === 'Resolved').length,
      slaOverdueCount: issues.filter((i) => i.sla_overdue).length,
      avgResolutionHours: 24,
      byCategory: {}
    };
  }
}

export async function getNearbyIssues(lat, lng, category) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      category: category || ''
    });
    return await apiFetch(`/issues/nearby?${params.toString()}`);
  } catch (err) {
    return [];
  }
}

export async function getIssueById(id) {
  try {
    return await apiFetch(`/issues/${encodeURIComponent(id)}`);
  } catch (err) {
    const store = getLocalStore();
    return (
      store.issues.find(
        (i) => String(i.id) === String(id) || String(i.tracking_id) === String(id)
      ) || null
    );
  }
}

export async function getIssueByTrackingId(trackingId) {
  return await apiFetch(`/issues/track/${encodeURIComponent(trackingId.trim())}`);
}

export async function getIssuesByPhone(phone) {
  return await apiFetch(`/issues/phone/${encodeURIComponent(phone.trim())}`);
}

export async function createIssue(payload) {
  return await apiFetch('/issues', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateIssueStatus(id, status, note = '', byName = '', resolvedPhotoPath = '') {
  return await apiFetch(`/issues/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({
      status,
      note,
      byName,
      resolved_photo_path: resolvedPhotoPath
    })
  });
}

export async function updateIssuePriority(id, priority, byName = '') {
  return await apiFetch(`/issues/${id}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority, byName })
  });
}

export async function reassignIssue(id, memberId, byName = '') {
  return await apiFetch(`/issues/${id}/reassign`, {
    method: 'PATCH',
    body: JSON.stringify({ memberId, byName })
  });
}

export function hasUpvotedLocally(issueId) {
  try {
    const arr = JSON.parse(localStorage.getItem(UPVOTED_KEY) || '[]');
    return arr.includes(String(issueId));
  } catch (e) {
    return false;
  }
}

export async function upvoteIssue(issueId) {
  if (hasUpvotedLocally(issueId)) {
    throw new Error('You have already upvoted this issue from this device.');
  }
  const updated = await apiFetch(`/issues/${encodeURIComponent(issueId)}/upvote`, {
    method: 'POST'
  });
  try {
    const arr = JSON.parse(localStorage.getItem(UPVOTED_KEY) || '[]');
    arr.push(String(issueId));
    localStorage.setItem(UPVOTED_KEY, JSON.stringify(arr));
  } catch (e) {
    // ignore
  }
  return updated;
}

export async function getMembers() {
  try {
    return await apiFetch('/members');
  } catch (err) {
    return getLocalStore().members;
  }
}

export async function addMember(memberData) {
  return await apiFetch('/members', {
    method: 'POST',
    body: JSON.stringify(memberData)
  });
}

export async function toggleMemberActive(id) {
  return await apiFetch(`/members/${id}/toggle`, {
    method: 'PATCH'
  });
}

/**
 * Reverse geocode GPS coordinates using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' }
    });
    if (!res.ok) return '';
    const data = await res.json();
    if (data && data.display_name) {
      const parts = data.display_name.split(',').slice(0, 3);
      return parts.join(',').trim();
    }
    return '';
  } catch (e) {
    return '';
  }
}
