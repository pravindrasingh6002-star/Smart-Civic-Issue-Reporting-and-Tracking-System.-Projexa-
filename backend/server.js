require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const {
  initStorage,
  getStorageMode,
  hashPassword,
  verifyPassword,
  getMembers,
  getIssuesRaw,
  saveIssue,
  saveMember,
  haversineMeters,
  pickAssignee
} = require('./storage');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'gram-suvidha-jwt-secret-key-2026';

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow local Vite, production frontend, and direct browser/Postman calls
      callback(null, true);
    },
    credentials: true
  })
);

// Support 15MB JSON payload for Base64 compressed photos
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

function sanitizeMember(m) {
  if (!m) return null;
  const { password_hash, _id, __v, ...rest } = m;
  return rest;
}

async function enrichIssue(issue, membersList = null) {
  if (!issue) return null;
  const members = membersList || (await getMembers());
  const assignedMember = members.find((m) => Number(m.id) === Number(issue.assigned_to));
  const createdMs = new Date(issue.created_at).getTime();
  const ageHours = Math.max(0, Math.round((Date.now() - createdMs) / (3600 * 1000)));
  const isSlaOverdue = issue.status !== 'Resolved' && ageHours > 72;

  return {
    ...issue,
    assigned_member_name: assignedMember ? assignedMember.name : 'Unassigned',
    assigned_member_phone: assignedMember ? assignedMember.phone : '',
    assigned_member_ward: assignedMember ? assignedMember.ward || '' : '',
    age_hours: ageHours,
    sla_overdue: isSlaOverdue
  };
}

function generateTrackingId() {
  const hex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `CVC-${hex}`;
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'Gram Suvidha API',
    storage: getStorageMode(),
    timestamp: new Date().toISOString()
  });
});

// 2. Auth Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const members = await getMembers();
    const user = members.find(
      (m) => m.username.toLowerCase() === String(username).trim().toLowerCase()
    );
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (Number(user.active) !== 1) {
      return res.status(403).json({ error: 'This Panchayat account is currently deactivated' });
    }
    const cleanUser = sanitizeMember(user);
    const token = jwt.sign(
      { id: cleanUser.id, username: cleanUser.username, role: cleanUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ user: cleanUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Stats & SLA Metrics
app.get('/api/issues/stats', async (req, res) => {
  try {
    const { assignedTo } = req.query;
    let issues = await getIssuesRaw();

    if (assignedTo && assignedTo !== 'all') {
      issues = issues.filter((i) => Number(i.assigned_to) === Number(assignedTo));
    }

    const total = issues.length;
    const reported = issues.filter((i) => i.status === 'Reported').length;
    const underReview = issues.filter((i) => i.status === 'Under Review').length;
    const resolved = issues.filter((i) => i.status === 'Resolved').length;

    const byCategory = {
      pothole: 0,
      garbage: 0,
      lighting: 0,
      water: 0,
      infrastructure: 0,
      other: 0
    };

    let slaOverdueCount = 0;
    let resolvedDurationSumHours = 0;
    let resolvedWithDatesCount = 0;

    for (const iss of issues) {
      const cat = iss.category || 'other';
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      const createdMs = new Date(iss.created_at).getTime();
      const ageHours = (Date.now() - createdMs) / (3600 * 1000);
      if (iss.status !== 'Resolved' && ageHours > 72) {
        slaOverdueCount++;
      }

      if (iss.status === 'Resolved') {
        const endMs = new Date(iss.resolved_at || iss.updated_at).getTime();
        if (endMs >= createdMs) {
          resolvedDurationSumHours += (endMs - createdMs) / (3600 * 1000);
          resolvedWithDatesCount++;
        }
      }
    }

    const avgResolutionHours =
      resolvedWithDatesCount > 0
        ? Math.round((resolvedDurationSumHours / resolvedWithDatesCount) * 10) / 10
        : 0;

    res.json({
      total,
      reported,
      underReview,
      resolved,
      slaOverdueCount,
      avgResolutionHours,
      byCategory
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Nearby Duplicate Issue Detection (within ~200m)
app.get('/api/issues/nearby', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const category = req.query.category;
    const radiusMeters = parseFloat(req.query.radius) || 200;

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.json([]);
    }

    const issues = await getIssuesRaw();
    const members = await getMembers();

    const matches = [];
    for (const iss of issues) {
      if (iss.status === 'Resolved') continue;
      if (category && iss.category !== category) continue;
      if (typeof iss.latitude !== 'number' || typeof iss.longitude !== 'number') continue;

      const dist = haversineMeters(lat, lng, iss.latitude, iss.longitude);
      if (dist <= radiusMeters) {
        const enriched = await enrichIssue(iss, members);
        matches.push({ ...enriched, distance_meters: Math.round(dist) });
      }
    }

    matches.sort((a, b) => a.distance_meters - b.distance_meters);
    res.json(matches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Track by Tracking ID
app.get('/api/issues/track/:trackingId', async (req, res) => {
  try {
    const code = String(req.params.trackingId || '').trim().toUpperCase();
    const issues = await getIssuesRaw();
    const found = issues.find((i) => String(i.tracking_id).toUpperCase() === code);
    if (!found) {
      return res.status(404).json({ error: 'No issue found with that Tracking ID' });
    }
    const enriched = await enrichIssue(found);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Track by Reporter Phone
app.get('/api/issues/phone/:phone', async (req, res) => {
  try {
    const cleanPhone = String(req.params.phone || '').replace(/\D/g, '');
    const issues = await getIssuesRaw();
    const members = await getMembers();
    const matches = issues
      .filter((i) => String(i.reporter_phone || '').replace(/\D/g, '').includes(cleanPhone))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const enriched = await Promise.all(matches.map((i) => enrichIssue(i, members)));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. List Issues with Filtering
app.get('/api/issues', async (req, res) => {
  try {
    const { status, category, assignedTo, ward, search, slaOverdue } = req.query;
    let issues = await getIssuesRaw();
    const members = await getMembers();

    if (status && status !== 'all') {
      issues = issues.filter((i) => i.status === status);
    }
    if (category && category !== 'all') {
      issues = issues.filter((i) => i.category === category);
    }
    if (assignedTo && assignedTo !== 'all') {
      issues = issues.filter((i) => Number(i.assigned_to) === Number(assignedTo));
    }
    if (ward && ward !== 'all') {
      issues = issues.filter(
        (i) =>
          (i.ward && i.ward.toLowerCase() === ward.toLowerCase()) ||
          (i.address && i.address.toLowerCase().includes(ward.toLowerCase()))
      );
    }
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      issues = issues.filter(
        (i) =>
          String(i.tracking_id || '').toLowerCase().includes(q) ||
          String(i.description || '').toLowerCase().includes(q) ||
          String(i.address || '').toLowerCase().includes(q) ||
          String(i.reporter_name || '').toLowerCase().includes(q) ||
          String(i.reporter_phone || '').toLowerCase().includes(q)
      );
    }

    issues.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    let enriched = await Promise.all(issues.map((i) => enrichIssue(i, members)));

    if (slaOverdue === 'true') {
      enriched = enriched.filter((i) => i.sla_overdue);
    }

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Get Single Issue Detail
app.get('/api/issues/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const issues = await getIssuesRaw();
    const found = issues.find(
      (i) =>
        String(i.id) === String(param) ||
        String(i.tracking_id).toUpperCase() === String(param).toUpperCase()
    );
    if (!found) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    const enriched = await enrichIssue(found);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Create New Issue with Smart Routing
app.post('/api/issues', async (req, res) => {
  try {
    const {
      category = 'other',
      description = '',
      ward = 'Ward 1',
      address = '',
      latitude = 28.4595,
      longitude = 77.0266,
      photo_path = '',
      reporter_name = 'Anonymous Villager',
      reporter_phone = ''
    } = req.body || {};

    const members = await getMembers();
    const issues = await getIssuesRaw();

    const combinedAddress = ward && !address.toLowerCase().includes(ward.toLowerCase())
      ? `${ward}${address ? ', ' + address : ''}`
      : address || ward;

    const assignedToId = pickAssignee(members, issues, category, combinedAddress);
    const assignedMember = members.find((m) => Number(m.id) === Number(assignedToId));

    const maxId = issues.reduce((acc, item) => Math.max(acc, Number(item.id) || 100), 100);
    const newId = maxId + 1;
    const trackingId = generateTrackingId();
    const nowIso = new Date().toISOString();

    const newIssue = {
      id: newId,
      tracking_id: trackingId,
      category,
      description: description.trim(),
      ward: ward || 'General',
      address: combinedAddress,
      latitude: Number(latitude) || 28.4595,
      longitude: Number(longitude) || 77.0266,
      photo_path: photo_path || '',
      resolved_photo_path: '',
      resolution_note: '',
      reporter_name: reporter_name.trim() || 'Anonymous Villager',
      reporter_phone: reporter_phone.trim(),
      status: 'Reported',
      priority: 'Normal',
      assigned_to: assignedToId,
      upvotes: 1,
      created_at: nowIso,
      updated_at: nowIso,
      resolved_at: null,
      log: [
        {
          action: 'Reported by citizen',
          by_name: reporter_name.trim() || 'Anonymous Villager',
          note: `Reported from ${combinedAddress || 'GPS coordinates'}`,
          created_at: nowIso
        },
        {
          action: `Auto-assigned to ${assignedMember ? assignedMember.name : 'Panchayat Admin'}`,
          by_name: 'Smart Routing Engine',
          note: `Category: ${category} | Ward: ${ward || 'Auto'}`,
          created_at: nowIso
        }
      ]
    };

    await saveIssue(newIssue);
    const enriched = await enrichIssue(newIssue, members);
    res.status(201).json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Update Issue Status + Optional Resolution Photo ("After" proof)
app.patch('/api/issues/:id/status', async (req, res) => {
  try {
    const { status, note, byName, resolved_photo_path } = req.body || {};
    const issues = await getIssuesRaw();
    const found = issues.find((i) => String(i.id) === String(req.params.id));
    if (!found) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const nowIso = new Date().toISOString();
    found.status = status || found.status;
    found.updated_at = nowIso;

    if (resolved_photo_path) {
      found.resolved_photo_path = resolved_photo_path;
    }
    if (note) {
      found.resolution_note = note;
    }
    if (status === 'Resolved') {
      found.resolved_at = nowIso;
    }

    found.log = Array.isArray(found.log) ? found.log : [];
    found.log.push({
      action: `Status changed to ${found.status}`,
      by_name: byName || 'Panchayat Member',
      note: note || (resolved_photo_path ? 'Uploaded resolution proof photo' : ''),
      created_at: nowIso
    });

    await saveIssue(found);
    const enriched = await enrichIssue(found);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Update Issue Priority
app.patch('/api/issues/:id/priority', async (req, res) => {
  try {
    const { priority, byName } = req.body || {};
    const issues = await getIssuesRaw();
    const found = issues.find((i) => String(i.id) === String(req.params.id));
    if (!found) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const nowIso = new Date().toISOString();
    found.priority = priority || found.priority;
    found.updated_at = nowIso;
    found.log = Array.isArray(found.log) ? found.log : [];
    found.log.push({
      action: `Priority updated to ${found.priority}`,
      by_name: byName || 'Panchayat Official',
      note: '',
      created_at: nowIso
    });

    await saveIssue(found);
    const enriched = await enrichIssue(found);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Reassign Issue to another Panchayat Member
app.patch('/api/issues/:id/reassign', async (req, res) => {
  try {
    const { memberId, byName } = req.body || {};
    const issues = await getIssuesRaw();
    const members = await getMembers();
    const found = issues.find((i) => String(i.id) === String(req.params.id));
    if (!found) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    const targetMember = members.find((m) => Number(m.id) === Number(memberId));
    if (!targetMember) {
      return res.status(400).json({ error: 'Target Panchayat member not found' });
    }

    const nowIso = new Date().toISOString();
    found.assigned_to = Number(targetMember.id);
    found.updated_at = nowIso;
    found.log = Array.isArray(found.log) ? found.log : [];
    found.log.push({
      action: `Reassigned to ${targetMember.name}`,
      by_name: byName || 'Sarpanch / Super Admin',
      note: `Assigned for ${targetMember.ward || 'village'} action`,
      created_at: nowIso
    });

    await saveIssue(found);
    const enriched = await enrichIssue(found, members);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Community Upvote ("Affects Me Too / +1")
app.post('/api/issues/:id/upvote', async (req, res) => {
  try {
    const issues = await getIssuesRaw();
    const found = issues.find(
      (i) =>
        String(i.id) === String(req.params.id) ||
        String(i.tracking_id).toUpperCase() === String(req.params.id).toUpperCase()
    );
    if (!found) {
      return res.status(404).json({ error: 'Issue not found' });
    }

    found.upvotes = (Number(found.upvotes) || 1) + 1;
    found.updated_at = new Date().toISOString();

    await saveIssue(found);
    const enriched = await enrichIssue(found);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. List Panchayat Members with Open/Resolved Issue Counts
app.get('/api/members', async (req, res) => {
  try {
    const members = await getMembers();
    const issues = await getIssuesRaw();

    const result = members.map((m) => {
      const clean = sanitizeMember(m);
      const memberIssues = issues.filter((i) => Number(i.assigned_to) === Number(m.id));
      const openCount = memberIssues.filter((i) => i.status !== 'Resolved').length;
      const resolvedCount = memberIssues.filter((i) => i.status === 'Resolved').length;
      return {
        ...clean,
        open_issues: openCount,
        resolved_issues: resolvedCount,
        total_issues: memberIssues.length
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Add New Panchayat Member
app.post('/api/members', async (req, res) => {
  try {
    const {
      name,
      username,
      password,
      phone = '',
      categories = ['other'],
      ward = 'All Wards',
      role = 'member'
    } = req.body || {};

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Name, username, and password are required' });
    }

    const members = await getMembers();
    if (members.some((m) => m.username.toLowerCase() === String(username).trim().toLowerCase())) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const maxId = members.reduce((acc, m) => Math.max(acc, Number(m.id) || 0), 0);
    const newMember = {
      id: maxId + 1,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password_hash: hashPassword(password),
      phone: phone.trim(),
      role: role === 'super_admin' ? 'super_admin' : 'member',
      categories: Array.isArray(categories) && categories.length > 0 ? categories : ['other'],
      ward: ward || 'All Wards',
      active: 1
    };

    await saveMember(newMember);
    res.status(201).json(sanitizeMember(newMember));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Toggle Member Active Status
app.patch('/api/members/:id/toggle', async (req, res) => {
  try {
    const members = await getMembers();
    const found = members.find((m) => String(m.id) === String(req.params.id));
    if (!found) {
      return res.status(404).json({ error: 'Member not found' });
    }
    found.active = Number(found.active) === 1 ? 0 : 1;
    await saveMember(found);
    res.json(sanitizeMember(found));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Monorepo production static serving (if frontend/dist exists)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

initStorage().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Gram Suvidha Backend API running at http://localhost:${PORT}`);
  });
});
