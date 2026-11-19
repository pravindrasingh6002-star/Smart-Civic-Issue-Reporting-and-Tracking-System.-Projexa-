/**
 * ============================================================================
 * GRAM SUVIDHA — FULL-STACK MONOREPO GENERATOR
 * ============================================================================
 * Usage:
 *   node build-gram-suvidha.js
 *
 * Generates:
 *   - package.json (root monorepo runner)
 *   - .gitignore
 *   - render.yaml & Procfile (Cloud deployment)
 *   - backend/ (Express + Dual MongoDB / Transactional Local JSON DB + JWT Auth)
 *   - frontend/ (React 18 + Vite + React Router v6 + React-Leaflet + Offline Sync)
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const files = {
  // ==========================================================================
  // ROOT MONOREPO FILES
  // ==========================================================================
  'package.json': JSON.stringify(
    {
      name: 'gram-suvidha-monorepo',
      version: '2.0.0',
      private: true,
      description: 'Gram Suvidha - Rural Civic Issue Reporting & Gram Panchayat Governance Platform',
      scripts: {
        setup: 'npm install && npm --prefix backend install && npm --prefix frontend install',
        dev: 'concurrently -n "BACKEND,FRONTEND" -c "green,cyan" "npm --prefix backend run dev" "npm --prefix frontend run dev"',
        'build:frontend': 'npm --prefix frontend run build',
        build: 'npm --prefix backend install && npm --prefix frontend install && npm --prefix frontend run build',
        start: 'npm --prefix backend start'
      },
      devDependencies: {
        concurrently: '^8.2.2'
      }
    },
    null,
    2
  ),

  '.gitignore': `node_modules/
backend/node_modules/
frontend/node_modules/
frontend/dist/
.env
backend/.env
frontend/.env
.DS_Store
`,

  'Procfile': `web: npm --prefix backend start\n`,

  'render.yaml': `services:
  - type: web
    name: gram-suvidha-api
    env: node
    rootDir: backend
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: JWT_SECRET
        generateValue: true
`,

  // ==========================================================================
  // BACKEND FILES
  // ==========================================================================
  'backend/package.json': JSON.stringify(
    {
      name: 'gram-suvidha-backend',
      version: '2.0.0',
      description: 'Express REST API for Gram Suvidha with Dual MongoDB / Local JSON Storage',
      main: 'server.js',
      scripts: {
        start: 'node server.js',
        dev: 'node --watch server.js'
      },
      dependencies: {
        cors: '^2.8.5',
        dotenv: '^16.4.5',
        express: '^4.19.2',
        jsonwebtoken: '^9.0.2',
        mongoose: '^8.3.1'
      }
    },
    null,
    2
  ),

  'backend/.env.example': `PORT=5000
NODE_ENV=development
JWT_SECRET=gram-suvidha-super-secret-jwt-key-2026
FRONTEND_URL=http://localhost:5173

# Optional: Provide MONGODB_URI to use MongoDB Atlas/Local instead of the zero-config JSON database
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/gram_suvidha

# Optional: Cloudinary configuration for cloud photo uploads
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=
`,

  'backend/render.yaml': `services:
  - type: web
    name: gram-suvidha-backend
    env: node
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
`,

  'backend/storage.js': `const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'gram_suvidha_db.json');

function hashPassword(plain) {
  return crypto.createHash('sha256').update(String(plain) + '_gram_salt').digest('hex');
}

function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (stored === plain) return true;
  return hashPassword(plain) === stored;
}

const DEFAULT_MEMBERS = [
  {
    id: 1,
    name: 'Sarpanch Rajesh Sharma',
    username: 'admin',
    password_hash: hashPassword('admin123'),
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
    password_hash: hashPassword('ramesh123'),
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
    password_hash: hashPassword('sunita123'),
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
    password_hash: hashPassword('vikram123'),
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
    password_hash: hashPassword('geeta123'),
    phone: '9876500004',
    role: 'member',
    categories: ['water', 'other'],
    ward: 'Ward 4',
    active: 1
  }
];

function createSampleSvgDataUrl(bgColor, label, sublabel) {
  const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="100%" height="100%" fill="\${bgColor}"/>
    <circle cx="540" cy="80" r="45" fill="rgba(255,255,255,0.18)"/>
    <rect x="36" y="250" width="568" height="134" rx="14" fill="rgba(0,0,0,0.28)"/>
    <text x="58" y="305" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">\${label}</text>
    <text x="58" y="345" font-family="sans-serif" font-size="18" fill="#f0e6d2">\${sublabel}</text>
  </svg>\`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const now = Date.now();
const HOUR = 3600 * 1000;

const DEFAULT_ISSUES = [
  {
    id: 101,
    tracking_id: 'CVC-8F3A21B9',
    category: 'water',
    description: 'Main handpump near Primary School is drawing muddy water and handle chain is broken.',
    ward: 'Ward 2',
    address: 'Ward 2, Near Govt Primary School',
    latitude: 28.4595,
    longitude: 77.0266,
    photo_path: createSampleSvgDataUrl('#2d6a8e', 'Handpump Broken - Ward 2', 'Geotagged: 28.4595, 77.0266'),
    resolved_photo_path: '',
    resolution_note: '',
    reporter_name: 'Kishan Lal',
    reporter_phone: '9811122233',
    status: 'Under Review',
    priority: 'High',
    assigned_to: 3,
    upvotes: 14,
    created_at: new Date(now - 84 * HOUR).toISOString(),
    updated_at: new Date(now - 20 * HOUR).toISOString(),
    resolved_at: null,
    log: [
      {
        action: 'Reported by citizen',
        by_name: 'Kishan Lal',
        note: 'Initial report submitted with geotag.',
        created_at: new Date(now - 84 * HOUR).toISOString()
      },
      {
        action: 'Auto-assigned to Sunita Devi (Sanitation & Water)',
        by_name: 'System Router',
        note: 'Matched category: water & Ward 2',
        created_at: new Date(now - 84 * HOUR).toISOString()
      },
      {
        action: 'Status changed to Under Review',
        by_name: 'Sunita Devi (Sanitation & Water)',
        note: 'Mechanic summoned from block office; spare chain ordered.',
        created_at: new Date(now - 20 * HOUR).toISOString()
      }
    ]
  },
  {
    id: 102,
    tracking_id: 'CVC-4D9E10C2',
    category: 'pothole',
    description: 'Deep waterlogged pothole on the main mandi approach road causing tractor trolley accidents.',
    ward: 'Ward 1',
    address: 'Ward 1, Mandi Link Road near Banyan Tree',
    latitude: 28.4621,
    longitude: 77.0312,
    photo_path: createSampleSvgDataUrl('#7c5836', 'Deep Pothole - Mandi Road', 'Geotagged: 28.4621, 77.0312'),
    resolved_photo_path: '',
    resolution_note: '',
    reporter_name: 'Mahendra Singh',
    reporter_phone: '9811122244',
    status: 'Reported',
    priority: 'Urgent',
    assigned_to: 2,
    upvotes: 22,
    created_at: new Date(now - 96 * HOUR).toISOString(),
    updated_at: new Date(now - 96 * HOUR).toISOString(),
    resolved_at: null,
    log: [
      {
        action: 'Reported by citizen',
        by_name: 'Mahendra Singh',
        note: 'Urgent hazard for farm vehicles.',
        created_at: new Date(now - 96 * HOUR).toISOString()
      },
      {
        action: 'Auto-assigned to Ramesh Yadav (Ward 1 & Roads)',
        by_name: 'System Router',
        note: 'Matched category: pothole & Ward 1',
        created_at: new Date(now - 96 * HOUR).toISOString()
      }
    ]
  },
  {
    id: 103,
    tracking_id: 'CVC-7B2C99A4',
    category: 'lighting',
    description: 'Solar streetlight pole #14 near Chaupal chowk has stopped working at night.',
    ward: 'Ward 3',
    address: 'Ward 3, Gram Chaupal Chowk',
    latitude: 28.4568,
    longitude: 77.0225,
    photo_path: createSampleSvgDataUrl('#3a4856', 'Before: Dark Streetlight Pole #14', 'Battery controller fault'),
    resolved_photo_path: createSampleSvgDataUrl('#2f6d4d', 'After: Solar Light Repaired & Lit', 'Verified working at 7:30 PM'),
    resolution_note: 'Replaced faulty charge controller fuse and cleaned solar panel.',
    reporter_name: 'Anita Kumari',
    reporter_phone: '9811122255',
    status: 'Resolved',
    priority: 'Normal',
    assigned_to: 4,
    upvotes: 9,
    created_at: new Date(now - 48 * HOUR).toISOString(),
    updated_at: new Date(now - 12 * HOUR).toISOString(),
    resolved_at: new Date(now - 12 * HOUR).toISOString(),
    log: [
      {
        action: 'Reported by citizen',
        by_name: 'Anita Kumari',
        note: 'Complete darkness near chaupal intersection.',
        created_at: new Date(now - 48 * HOUR).toISOString()
      },
      {
        action: 'Auto-assigned to Vikram Singh (Electricity & Lights)',
        by_name: 'System Router',
        note: 'Matched category: lighting & Ward 3',
        created_at: new Date(now - 48 * HOUR).toISOString()
      },
      {
        action: 'Status changed to Resolved',
        by_name: 'Vikram Singh (Electricity & Lights)',
        note: 'Replaced faulty charge controller fuse and cleaned solar panel.',
        created_at: new Date(now - 12 * HOUR).toISOString()
      }
    ]
  },
  {
    id: 104,
    tracking_id: 'CVC-9A1F55E8',
    category: 'garbage',
    description: 'Overflowing waste dump near the pond embankment causing foul smell and mosquito breeding.',
    ward: 'Ward 2',
    address: 'Ward 2, Village Pond East Bank',
    latitude: 28.4609,
    longitude: 77.0241,
    photo_path: createSampleSvgDataUrl('#6e5b3b', 'Garbage Overflow - Pond Bank', 'Needs sanitation tractor clearance'),
    resolved_photo_path: '',
    resolution_note: '',
    reporter_name: 'Suresh Prajapati',
    reporter_phone: '9811122266',
    status: 'Reported',
    priority: 'Normal',
    assigned_to: 3,
    upvotes: 7,
    created_at: new Date(now - 18 * HOUR).toISOString(),
    updated_at: new Date(now - 18 * HOUR).toISOString(),
    resolved_at: null,
    log: [
      {
        action: 'Reported by citizen',
        by_name: 'Suresh Prajapati',
        note: 'Submitted with location coordinates.',
        created_at: new Date(now - 18 * HOUR).toISOString()
      },
      {
        action: 'Auto-assigned to Sunita Devi (Sanitation & Water)',
        by_name: 'System Router',
        note: 'Matched category: garbage & Ward 2',
        created_at: new Date(now - 18 * HOUR).toISOString()
      }
    ]
  }
];

// Mongoose Schemas (used when MONGODB_URI is configured)
let MemberModel = null;
let IssueModel = null;
let isMongoConnected = false;

const memberSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: String,
  username: { type: String, required: true, unique: true },
  password_hash: String,
  phone: String,
  role: { type: String, default: 'member' },
  categories: [String],
  ward: { type: String, default: 'All Wards' },
  active: { type: Number, default: 1 }
});

const issueSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  tracking_id: { type: String, required: true, unique: true },
  category: String,
  description: String,
  ward: String,
  address: String,
  latitude: Number,
  longitude: Number,
  photo_path: String,
  resolved_photo_path: String,
  resolution_note: String,
  reporter_name: String,
  reporter_phone: String,
  status: { type: String, default: 'Reported' },
  priority: { type: String, default: 'Normal' },
  assigned_to: Number,
  upvotes: { type: Number, default: 1 },
  created_at: String,
  updated_at: String,
  resolved_at: String,
  log: [
    {
      action: String,
      by_name: String,
      note: String,
      created_at: String
    }
  ]
});

function ensureLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      members: DEFAULT_MEMBERS,
      issues: DEFAULT_ISSUES
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

function readLocalDb() {
  ensureLocalDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return { members: [...DEFAULT_MEMBERS], issues: [...DEFAULT_ISSUES] };
  }
}

function writeLocalDb(data) {
  ensureLocalDb();
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

async function initStorage() {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.trim().length > 0) {
    try {
      await mongoose.connect(mongoUri);
      MemberModel = mongoose.models.Member || mongoose.model('Member', memberSchema);
      IssueModel = mongoose.models.Issue || mongoose.model('Issue', issueSchema);
      isMongoConnected = true;

      const memberCount = await MemberModel.countDocuments();
      if (memberCount === 0) {
        await MemberModel.insertMany(DEFAULT_MEMBERS);
      }
      const issueCount = await IssueModel.countDocuments();
      if (issueCount === 0) {
        await IssueModel.insertMany(DEFAULT_ISSUES);
      }
      console.log('✅ Connected to MongoDB storage engine');
      return 'mongodb';
    } catch (err) {
      console.warn('⚠️ MongoDB connection failed, falling back to persistent local JSON database:', err.message);
      isMongoConnected = false;
    }
  }
  ensureLocalDb();
  console.log('✅ Using Zero-Config Persistent JSON Database at backend/data/gram_suvidha_db.json');
  return 'json';
}

function getStorageMode() {
  return isMongoConnected ? 'mongodb' : 'local-json';
}

async function getMembers() {
  if (isMongoConnected) {
    return await MemberModel.find().lean();
  }
  return readLocalDb().members;
}

async function getIssuesRaw() {
  if (isMongoConnected) {
    return await IssueModel.find().lean();
  }
  return readLocalDb().issues;
}

async function saveIssue(issueObj) {
  if (isMongoConnected) {
    await IssueModel.findOneAndUpdate({ id: issueObj.id }, issueObj, { upsert: true, new: true });
    return issueObj;
  }
  const db = readLocalDb();
  const idx = db.issues.findIndex((i) => Number(i.id) === Number(issueObj.id));
  if (idx >= 0) {
    db.issues[idx] = issueObj;
  } else {
    db.issues.unshift(issueObj);
  }
  writeLocalDb(db);
  return issueObj;
}

async function saveMember(memberObj) {
  if (isMongoConnected) {
    await MemberModel.findOneAndUpdate({ id: memberObj.id }, memberObj, { upsert: true, new: true });
    return memberObj;
  }
  const db = readLocalDb();
  const idx = db.members.findIndex((m) => Number(m.id) === Number(memberObj.id));
  if (idx >= 0) {
    db.members[idx] = memberObj;
  } else {
    db.members.push(memberObj);
  }
  writeLocalDb(db);
  return memberObj;
}

// Haversine formula in meters
function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Automated Smart Routing: Active + Category + Ward Match + Least Loaded
function pickAssignee(members, issues, category, addressOrWard = '') {
  const activeMembers = members.filter((m) => Number(m.active) === 1 && m.role !== 'super_admin');
  let candidates = activeMembers.filter(
    (m) => Array.isArray(m.categories) && m.categories.includes(category)
  );

  // Check Ward match if multiple candidates exist
  const textToMatch = String(addressOrWard || '').toLowerCase();
  const wardMatches = candidates.filter((m) => {
    if (!m.ward || m.ward === 'All Wards') return false;
    return textToMatch.includes(m.ward.toLowerCase());
  });

  if (wardMatches.length > 0) {
    candidates = wardMatches;
  }

  if (candidates.length === 0) {
    const superAdmin = members.find((m) => m.role === 'super_admin') || members[0];
    return superAdmin ? superAdmin.id : 1;
  }

  // Least-loaded assignment among candidates
  let bestCandidate = candidates[0];
  let minOpenCount = Infinity;

  for (const candidate of candidates) {
    const openCount = issues.filter(
      (iss) => Number(iss.assigned_to) === Number(candidate.id) && iss.status !== 'Resolved'
    ).length;
    if (openCount < minOpenCount) {
      minOpenCount = openCount;
      bestCandidate = candidate;
    }
  }

  return bestCandidate.id;
}

module.exports = {
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
};
`,

  'backend/server.js': `require('dotenv').config();
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
  return \`CVC-\${hex}\`;
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
    const cleanPhone = String(req.params.phone || '').replace(/\\D/g, '');
    const issues = await getIssuesRaw();
    const members = await getMembers();
    const matches = issues
      .filter((i) => String(i.reporter_phone || '').replace(/\\D/g, '').includes(cleanPhone))
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
      ? \`\${ward}\${address ? ', ' + address : ''}\`
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
          note: \`Reported from \${combinedAddress || 'GPS coordinates'}\`,
          created_at: nowIso
        },
        {
          action: \`Auto-assigned to \${assignedMember ? assignedMember.name : 'Panchayat Admin'}\`,
          by_name: 'Smart Routing Engine',
          note: \`Category: \${category} | Ward: \${ward || 'Auto'}\`,
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
      action: \`Status changed to \${found.status}\`,
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
      action: \`Priority updated to \${found.priority}\`,
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
      action: \`Reassigned to \${targetMember.name}\`,
      by_name: byName || 'Sarpanch / Super Admin',
      note: \`Assigned for \${targetMember.ward || 'village'} action\`,
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
    console.log(\`🚀 Gram Suvidha Backend API running at http://localhost:\${PORT}\`);
  });
});
`,

  // ==========================================================================
  // FRONTEND CONFIG & ROOT FILES
  // ==========================================================================
  'frontend/package.json': JSON.stringify(
    {
      name: 'gram-suvidha-frontend',
      private: true,
      version: '2.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      },
      dependencies: {
        leaflet: '^1.9.4',
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-leaflet': '^4.2.1',
        'react-router-dom': '^6.22.3'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.2.1',
        vite: '^5.1.6'
      }
    },
    null,
    2
  ),

  'frontend/.env.example': `# Leave empty in local development to use Vite's /api proxy to http://localhost:5000
# For Vercel production deployment, set VITE_API_URL to your Render backend URL (e.g. https://gram-suvidha-api.onrender.com/api)
VITE_API_URL=
`,

  'frontend/vercel.json': JSON.stringify(
    {
      rewrites: [
        {
          source: '/(.*)',
          destination: '/index.html'
        }
      ]
    },
    null,
    2
  ),

  'frontend/vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
`,

  'frontend/index.html': `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gram Suvidha | ग्राम सुविधा — Rural Civic Governance Platform</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,

  'frontend/public/favicon.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2f6d4d"/>
  <path d="M32 12L12 28h6v22h28V28h6L32 12z" fill="#f6f1e8"/>
  <circle cx="32" cy="36" r="6" fill="#d79a3a"/>
</svg>
`,

  // ==========================================================================
  // FRONTEND CORE MODULES (src/i18n.js, src/helper.js, src/db.js, src/index.css)
  // ==========================================================================
  'frontend/src/i18n.js': `import React, { createContext, useContext, useState, useEffect } from 'react';

const translations = {
  en: {
    appName: 'Gram Suvidha',
    tagline: 'Gram Panchayat Civic Issue Reporting & Governance',
    navReport: 'Report Issue',
    navTrack: 'Track Status',
    navMap: 'Village Map',
    navDashboard: 'Panchayat Dashboard',
    navMembers: 'Members',
    navLogin: 'Panchayat Login',
    navLogout: 'Logout',
    heroTitle: 'Raise Your Voice for a Better Village',
    heroSub: 'Snap a geotagged photo, drop a map pin, and route civic issues directly to your Ward Panchayat member.',
    selectCategory: '1. Select Issue Category',
    uploadPhoto: '2. Photo Evidence (Auto-Compressed for 2G/3G)',
    pinLocation: '3. Pin Exact Location & Ward',
    selectWard: 'Select Ward / Area',
    addressPlaceholder: 'Landmark (e.g. Near Primary School, Handpump #2)',
    describeIssue: '4. Describe the Problem',
    voiceBtn: 'Speak (Voice-to-Text)',
    voiceListening: 'Listening... Speak now',
    yourDetails: '5. Your Contact Details (For Status Updates)',
    namePlaceholder: 'Your Name (Optional)',
    phonePlaceholder: '10-digit Mobile Number',
    submitReport: 'Submit Civic Report',
    submitting: 'Submitting Report...',
    nearbyAlertTitle: 'Similar Issue Already Reported Nearby!',
    nearbyAlertSub: 'An unresolved issue in this category exists within 200 meters. You can upvote it or still submit a new report.',
    upvoteBtn: 'Affects Me Too',
    upvotedBtn: 'Upvoted',
    trackTitle: 'Track Your Complaint',
    trackSub: 'Enter your Tracking ID (e.g. CVC-8F3A21B9) or your 10-digit phone number.',
    trackById: 'By Tracking ID',
    trackByPhone: 'By Phone Number',
    searchBtn: 'Check Status',
    receiptTitle: 'Official Gram Panchayat Complaint Receipt',
    printReceipt: 'Print / Save PDF Receipt',
    shareWhatsApp: 'Share on WhatsApp',
    beforePhoto: 'Before (Reported Photo)',
    afterPhoto: 'After (Resolution Proof)',
    slaOverdue: 'SLA Overdue (>72h)',
    avgResolution: 'Avg Resolution Time',
    exportCsv: 'Export CSV Report',
    notifyCitizenWhatsApp: 'Notify Citizen on WhatsApp'
  },
  hi: {
    appName: 'ग्राम सुविधा',
    tagline: 'ग्राम पंचायत नागरिक समस्या निवारण एवं सुशासन मंच',
    navReport: 'समस्या दर्ज करें',
    navTrack: 'स्थिति जानें',
    navMap: 'गाँव का नक्शा',
    navDashboard: 'पंचायत डैशबोर्ड',
    navMembers: 'सदस्य सूची',
    navLogin: 'पंचायत लॉगिन',
    navLogout: 'लॉगआउट',
    heroTitle: 'अपने गाँव के विकास के लिए आवाज़ उठाएँ',
    heroSub: 'फोटो लें, नक्शे पर स्थान चुनें और अपनी समस्या सीधे संबंधित वार्ड पंचायत सदस्य तक पहुँचाएँ।',
    selectCategory: '1. समस्या की श्रेणी चुनें',
    uploadPhoto: '2. फोटो अपलोड करें (2G/3G नेटवर्क के लिए स्वतः कम्प्रेस)',
    pinLocation: '3. सही स्थान और वार्ड चुनें',
    selectWard: 'वार्ड / क्षेत्र चुनें',
    addressPlaceholder: 'पहचान चिन्ह (जैसे: प्राथमिक विद्यालय के पास)',
    describeIssue: '4. समस्या का विवरण लिखें या बोलें',
    voiceBtn: 'बोलकर लिखें (माइक)',
    voiceListening: 'सुन रहे हैं... कृपया बोलें',
    yourDetails: '5. आपका संपर्क विवरण (अपडेट पाने के लिए)',
    namePlaceholder: 'आपका नाम (वैकल्पिक)',
    phonePlaceholder: '10 अंकों का मोबाइल नंबर',
    submitReport: 'शिकायत दर्ज करें',
    submitting: 'दर्ज हो रहा है...',
    nearbyAlertTitle: 'पास में ऐसी ही समस्या पहले से दर्ज है!',
    nearbyAlertSub: '200 मीटर के दायरे में इस श्रेणी की शिकायत पहले से मौजूद है। आप उसे समर्थन (+1) दे सकते हैं या नई शिकायत दर्ज कर सकते हैं।',
    upvoteBtn: 'मुझे भी समस्या है',
    upvotedBtn: 'समर्थन दिया गया',
    trackTitle: 'अपनी शिकायत की स्थिति जानें',
    trackSub: 'अपनी ट्रैकिंग आईडी (जैसे CVC-8F3A21B9) या मोबाइल नंबर दर्ज करें।',
    trackById: 'ट्रैकिंग आईडी से',
    trackByPhone: 'मोबाइल नंबर से',
    searchBtn: 'स्थिति देखें',
    receiptTitle: 'ग्राम पंचायत शिकायत पावती रसीद',
    printReceipt: 'रसीद प्रिंट / डाउनलोड करें',
    shareWhatsApp: 'व्हाट्सएप पर साझा करें',
    beforePhoto: 'पहले (शिकायत की फोटो)',
    afterPhoto: 'बाद में (समाधान का प्रमाण)',
    slaOverdue: 'समय सीमा समाप्त (>72 घंटे)',
    avgResolution: 'औसत समाधान समय',
    exportCsv: 'CSV रिपोर्ट डाउनलोड करें',
    notifyCitizenWhatsApp: 'नागरिक को व्हाट्सएप सूचना भेजें'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('gram_suvidha_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('gram_suvidha_lang', lang);
  }, [lang]);

  const t = (key) => {
    return (translations[lang] && translations[lang][key]) || translations.en[key] || key;
  };

  const toggleLang = () => {
    setLang((prev) => (prev === 'en' ? 'hi' : 'en'));
  };

  return React.createElement(
    LanguageContext.Provider,
    { value: { lang, setLang, toggleLang, t } },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
`,

  'frontend/src/helper.js': `export const CATEGORIES = [
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
  if (hours < 24) return \`\${hours}h ago\`;
  const days = Math.floor(hours / 24);
  return \`\${days}d ago\`;
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
    return \`"\${str}"\`;
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
    '\\uFEFF' +
    [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    \`Gram_Suvidha_Report_\${new Date().toISOString().slice(0, 10)}.csv\`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
`,

  'frontend/src/db.js': `/**
 * ============================================================================
 * GRAM SUVIDHA — ASYNC API CLIENT WITH TRANSPARENT OFFLINE / DEMO FALLBACK
 * ============================================================================
 * All functions are strictly async and return Promises.
 * Talks to VITE_API_URL (or '/api' proxy). If the backend is unreachable,
 * seamlessly falls back to seeded localStorage so the UI never crashes.
 */

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\\/$/, '');
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
    ...(token ? { Authorization: \`Bearer \${token}\` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(\`\${API_BASE}\${endpoint}\`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMsg = \`HTTP Error \${response.status}\`;
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
    if (u && password === \`\${u.username}123\`) {
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

  const qs = params.toString() ? \`?\${params.toString()}\` : '';
  try {
    const list = await apiFetch(\`/issues\${qs}\`);
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
  const qs = assignedTo && assignedTo !== 'all' ? \`?assignedTo=\${assignedTo}\` : '';
  try {
    return await apiFetch(\`/issues/stats\${qs}\`);
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
    return await apiFetch(\`/issues/nearby?\${params.toString()}\`);
  } catch (err) {
    return [];
  }
}

export async function getIssueById(id) {
  try {
    return await apiFetch(\`/issues/\${encodeURIComponent(id)}\`);
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
  return await apiFetch(\`/issues/track/\${encodeURIComponent(trackingId.trim())}\`);
}

export async function getIssuesByPhone(phone) {
  return await apiFetch(\`/issues/phone/\${encodeURIComponent(phone.trim())}\`);
}

export async function createIssue(payload) {
  return await apiFetch('/issues', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateIssueStatus(id, status, note = '', byName = '', resolvedPhotoPath = '') {
  return await apiFetch(\`/issues/\${id}/status\`, {
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
  return await apiFetch(\`/issues/\${id}/priority\`, {
    method: 'PATCH',
    body: JSON.stringify({ priority, byName })
  });
}

export async function reassignIssue(id, memberId, byName = '') {
  return await apiFetch(\`/issues/\${id}/reassign\`, {
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
  const updated = await apiFetch(\`/issues/\${encodeURIComponent(issueId)}/upvote\`, {
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
  return await apiFetch(\`/members/\${id}/toggle\`, {
    method: 'PATCH'
  });
}

/**
 * Reverse geocode GPS coordinates using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&zoom=18&addressdetails=1\`;
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
`,

  'frontend/src/index.css': `:root {
  --primary: #2f6d4d;
  --primary-dark: #215038;
  --primary-light: #e5f0ea;
  --accent: #d79a3a;
  --accent-dark: #b87f26;
  --bg: #f6f1e8;
  --card: #ffffff;
  --text: #1f2933;
  --muted: #616e7c;
  --border: #e2d9c8;
  --danger: #c53030;
  --danger-bg: #fff5f5;
  --warning: #b7791f;
  --warning-bg: #fefcbf;
  --success: #2f855a;
  --success-bg: #f0fff4;
  --shadow: 0 4px 16px rgba(31, 41, 51, 0.07);
  --radius: 14px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4 {
  font-family: 'Poppins', sans-serif;
  color: var(--text);
  line-height: 1.25;
}

a {
  color: var(--primary);
  text-decoration: none;
}

.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.container {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem;
  flex: 1;
}

/* Navbar */
.navbar {
  background: var(--primary);
  color: #ffffff;
  padding: 0.85rem 1.25rem;
  position: sticky;
  top: 0;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

.navbar-inner {
  max-width: 1180px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: #ffffff;
  font-family: 'Poppins', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
}

.brand-badge {
  background: var(--accent);
  color: #1f2933;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.nav-link {
  color: rgba(255, 255, 255, 0.9);
  padding: 0.45rem 0.85rem;
  border-radius: 8px;
  font-size: 0.92rem;
  font-weight: 500;
  transition: all 0.18s ease;
}

.nav-link:hover,
.nav-link.active {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

.lang-btn {
  background: var(--accent);
  color: #1f2933;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Cards & Grids */
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.4rem;
  box-shadow: var(--shadow);
  margin-bottom: 1.25rem;
}

.hero-banner {
  background: linear-gradient(135deg, var(--primary) 0%, #1d4a33 100%);
  color: #ffffff;
  border-radius: var(--radius);
  padding: 1.75rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}

.hero-banner h1 {
  color: #ffffff;
  font-size: 1.65rem;
  margin-bottom: 0.4rem;
}

.hero-banner p {
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.98rem;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.25rem;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.1rem;
  box-shadow: var(--shadow);
}

.stat-label {
  font-size: 0.82rem;
  color: var(--muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.stat-value {
  font-size: 1.85rem;
  font-weight: 700;
  font-family: 'Poppins', sans-serif;
  margin-top: 0.25rem;
}

/* Category Selector Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
  gap: 0.75rem;
  margin-top: 0.6rem;
}

.category-tile {
  border: 2px solid var(--border);
  background: #fdfbf7;
  border-radius: 12px;
  padding: 0.9rem 0.65rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.16s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.category-tile:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}

.category-tile.selected {
  border-color: var(--primary);
  background: var(--primary-light);
  box-shadow: 0 0 0 3px rgba(47, 109, 77, 0.18);
}

.category-icon {
  font-size: 1.75rem;
}

.category-name {
  font-weight: 600;
  font-size: 0.9rem;
}

/* Forms & Buttons */
.form-group {
  margin-bottom: 1.15rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.45rem;
  font-size: 0.95rem;
}

.input,
.select,
.textarea {
  width: 100%;
  padding: 0.72rem 0.9rem;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: inherit;
  background: #ffffff;
  color: var(--text);
  transition: border-color 0.15s ease;
}

.input:focus,
.select:focus,
.textarea:focus {
  outline: none;
  border-color: var(--primary);
}

.textarea {
  min-height: 105px;
  resize: vertical;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.72rem 1.25rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.94rem;
  border: none;
  cursor: pointer;
  transition: all 0.16s ease;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-accent {
  background: var(--accent);
  color: #1f2933;
}

.btn-accent:hover:not(:disabled) {
  background: var(--accent-dark);
  color: #ffffff;
}

.btn-outline {
  background: transparent;
  border: 1.5px solid var(--primary);
  color: var(--primary);
}

.btn-outline:hover:not(:disabled) {
  background: var(--primary-light);
}

.btn-whatsapp {
  background: #25d366;
  color: #ffffff;
}

.btn-whatsapp:hover {
  background: #1ebe5b;
}

.btn-sm {
  padding: 0.42rem 0.8rem;
  font-size: 0.84rem;
  border-radius: 8px;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
}

.badge-reported {
  background: #feebc8;
  color: #9c4221;
}

.badge-review {
  background: #bee3f8;
  color: #2c5282;
}

.badge-resolved {
  background: #c6f6d5;
  color: #22543d;
}

.badge-sla {
  background: #fed7d7;
  color: #9b2c2c;
  border: 1px solid #feb2b2;
}

.badge-priority-Urgent {
  background: #9b2c2c;
  color: #ffffff;
}

.badge-priority-High {
  background: #dd6b20;
  color: #ffffff;
}

.badge-priority-Normal {
  background: #edf2f7;
  color: #4a5568;
}

.badge-priority-Low {
  background: #e6fffa;
  color: #234e52;
}

/* Alerts & Banners */
.alert-warning {
  background: #fffaf0;
  border: 1.5px solid #dd6b20;
  color: #7b341e;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.alert-success {
  background: var(--success-bg);
  border: 1.5px solid var(--success);
  color: #22543d;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 1rem;
}

.alert-error {
  background: var(--danger-bg);
  border: 1.5px solid var(--danger);
  color: var(--danger);
  padding: 0.9rem;
  border-radius: 10px;
  margin-bottom: 1rem;
}

/* Before / After Photo Comparison */
.photo-compare-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-top: 0.75rem;
}

.photo-frame {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #faf8f5;
}

.photo-frame-header {
  padding: 0.5rem 0.85rem;
  font-weight: 600;
  font-size: 0.85rem;
  background: #efe9dc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.photo-frame img {
  width: 100%;
  height: 230px;
  object-fit: cover;
  display: block;
}

/* Map Containers */
.leaflet-container {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  z-index: 1;
}

/* Timeline */
.timeline {
  border-left: 2px solid var(--primary);
  margin-left: 0.6rem;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.timeline-item {
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -1.45rem;
  top: 0.3rem;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--primary);
  border: 2px solid #ffffff;
}

/* Printable Receipt Styles */
@media print {
  .navbar,
  .no-print {
    display: none !important;
  }
  body {
    background: #ffffff;
  }
  .card {
    box-shadow: none;
    border: 2px solid #000000;
  }
}
`,

  // ==========================================================================
  // FRONTEND COMPONENTS (src/components/Navbar.jsx, src/components/PhotoInput.jsx)
  // ==========================================================================
  'frontend/src/components/Navbar.jsx': `import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLanguage } from '../i18n';

export default function Navbar({ user, onLogout }) {
  const { lang, toggleLang, t } = useLanguage();
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    onLogout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand">
          <span className="brand-badge">🌾</span>
          <div>
            <div>{t('appName')}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: 400, opacity: 0.85 }}>
              Gram Panchayat Digital Sewa
            </div>
          </div>
        </NavLink>

        <nav className="nav-links">
          <NavLink to="/report" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            📢 {t('navReport')}
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            🔍 {t('navTrack')}
          </NavLink>
          <NavLink to="/map" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
            🗺️ {t('navMap')}
          </NavLink>

          {user ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}
              >
                📊 {t('navDashboard')}
              </NavLink>
              {user.role === 'super_admin' && (
                <NavLink
                  to="/members"
                  className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}
                >
                  👥 {t('navMembers')}
                </NavLink>
              )}
              <button
                type="button"
                onClick={handleLogoutClick}
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                {t('navLogout')} ({user.username})
              </button>
            </>
          ) : (
            <NavLink to="/login" className={({ isActive }) => \`nav-link \${isActive ? 'active' : ''}\`}>
              🔐 {t('navLogin')}
            </NavLink>
          )}

          <button type="button" onClick={toggleLang} className="lang-btn">
            {lang === 'en' ? 'हिंदी में देखें' : 'English'}
          </button>
        </nav>
      </div>
    </header>
  );
}
`,

  'frontend/src/components/PhotoInput.jsx': `import React, { useState } from 'react';
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
      setSizeInfo(\`Compressed from \${originalKb} KB → \${compressedKb} KB for fast village network upload\`);
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
`,

  // ==========================================================================
  // FRONTEND PAGES (Report, Track, PublicMap, Login, Dashboard, IssueDetail, Members)
  // ==========================================================================
  'frontend/src/pages/Report.jsx': `import React, { useState, useEffect } from 'react';
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
    setGpsStatus(\`Location pinned (\${roundedLat}, \${roundedLng})\`);

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
      setDescription((prev) => (prev ? \`\${prev} \${transcript}\` : transcript));
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
      navigate(\`/track?code=\${encodeURIComponent(created.tracking_id)}&new=1\`);
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
                className={\`category-tile \${category === cat.id ? 'selected' : ''}\`}
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
                    <Link to={\`/track?code=\${dup.tracking_id}\`} className="btn btn-sm btn-outline">
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
              className={\`btn btn-sm \${isListening ? 'btn-accent' : 'btn-outline'}\`}
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
`,

  'frontend/src/pages/Track.jsx': `import React, { useState, useEffect } from 'react';
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
            className={\`btn btn-sm \${mode === 'id' ? 'btn-primary' : 'btn-outline'}\`}
            onClick={() => {
              setMode('id');
              setQuery('');
            }}
          >
            {t('trackById')}
          </button>
          <button
            type="button"
            className={\`btn btn-sm \${mode === 'phone' ? 'btn-primary' : 'btn-outline'}\`}
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
          \`Gram Suvidha Complaint Receipt\\nTracking ID: \${issue.tracking_id}\\nCategory: \${cat.label}\\nStatus: \${issue.status}\\nLocation: \${issue.address}\\nAssigned To: \${issue.assigned_member_name}\`
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
                <span className={\`badge \${badgeClass}\`}>{issue.status}</span>
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
                  href={\`https://wa.me/?text=\${whatsappText}\`}
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
`,

  'frontend/src/pages/PublicMap.jsx': `import React, { useState, useEffect } from 'react';
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
                          to={\`/track?code=\${issue.tracking_id}\`}
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
`,

  'frontend/src/pages/Login.jsx': `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../db';

const DEMO_ACCOUNTS = [
  { label: 'Sarpanch Super Admin', user: 'admin', pass: 'admin123', role: 'All Wards & Categories' },
  { label: 'Ramesh Yadav (Member)', user: 'ramesh', pass: 'ramesh123', role: 'Ward 1 • Roads & Infra' },
  { label: 'Sunita Devi (Member)', user: 'sunita', pass: 'sunita123', role: 'Ward 2 • Water & Garbage' },
  { label: 'Vikram Singh (Member)', user: 'vikram', pass: 'vikram123', role: 'Ward 3 • Streetlights' },
  { label: 'Geeta Verma (Member)', user: 'geeta', pass: 'geeta123', role: 'Ward 4 • Water & General' }
];

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await loginUser(username, password);
      onLogin(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div style={{ maxWidth: '520px', margin: '1.5rem auto' }}>
      <div className="card">
        <h2 style={{ marginBottom: '0.35rem' }}>🔐 Gram Panchayat Official Login</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.92rem', marginBottom: '1.2rem' }}>
          Sign in to manage assigned ward complaints, upload resolution photos, and notify citizens.
        </p>

        {error && <div className="alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Login to Panchayat Portal'}
          </button>
        </form>
      </div>

      <div className="card">
        <h4 style={{ marginBottom: '0.65rem' }}>⚡ Quick Demo Accounts (Click to Autofill)</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.user}
              type="button"
              onClick={() => fillDemo(acc.user, acc.pass)}
              className="btn btn-sm btn-outline"
              style={{ justifyContent: 'space-between', textAlign: 'left' }}
            >
              <span>
                <strong>{acc.label}</strong> ({acc.user} / {acc.pass})
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{acc.role}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
`,

  'frontend/src/pages/Dashboard.jsx': `import React, { useState, useEffect } from 'react';
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
                  title={\`\${cat.label}: \${count} (\${pct}%)\`}
                  style={{ width: \`\${pct}%\`, background: cat.color }}
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
                    <span className={\`badge \${badgeClass}\`}>{issue.status}</span>
                    <span className={\`badge badge-priority-\${issue.priority}\`}>
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
                  <Link to={\`/issues/\${issue.id}\`} className="btn btn-sm btn-primary">
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
`,

  'frontend/src/pages/IssueDetail.jsx': `import React, { useState, useEffect } from 'react';
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

  const cleanReporterPhone = String(issue.reporter_phone || '').replace(/\\D/g, '');
  const whatsappNotifyMsg = encodeURIComponent(
    \`Namaste \${issue.reporter_name || 'Citizen'},\\nYour Gram Suvidha complaint (\${issue.tracking_id} - \${cat.label}) status is now: *\${issue.status}*.\\n\${issue.resolution_note ? 'Note: ' + issue.resolution_note : ''}\\n— Gram Panchayat \${user?.name || ''}\`
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-sm btn-outline">
          ← Back to Dashboard
        </button>

        {cleanReporterPhone && (
          <a
            href={\`https://wa.me/91\${cleanReporterPhone}?text=\${whatsappNotifyMsg}\`}
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
`,

  'frontend/src/pages/Members.jsx': `import React, { useState, useEffect } from 'react';
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
                    className={\`btn btn-sm \${selectedCats.includes(c.id) ? 'btn-primary' : 'btn-outline'}\`}
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
                        className={\`badge \${Number(m.active) === 1 ? 'badge-resolved' : 'badge-sla'}\`}
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
`,

  // ==========================================================================
  // FRONTEND ENTRY POINTS (src/App.jsx, src/main.jsx)
  // ==========================================================================
  'frontend/src/App.jsx': `import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import Navbar from './components/Navbar';
import Report from './pages/Report';
import Track from './pages/Track';
import PublicMap from './pages/PublicMap';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IssueDetail from './pages/IssueDetail';
import Members from './pages/Members';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gram_suvidha_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    localStorage.setItem('gram_suvidha_user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gram_suvidha_user');
    localStorage.removeItem('gram_suvidha_token');
  };

  return (
    <LanguageProvider>
      <div className="app-shell">
        <Navbar user={user} onLogout={handleLogout} />
        <main className="container">
          <Routes>
            <Route path="/" element={<Report />} />
            <Route path="/report" element={<Report />} />
            <Route path="/track" element={<Track />} />
            <Route path="/map" element={<PublicMap />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route
              path="/dashboard"
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/issues/:id"
              element={user ? <IssueDetail user={user} /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/members"
              element={
                user && user.role === 'super_admin' ? (
                  <Members />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </LanguageProvider>
  );
}
`,

  'frontend/src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
`
};

// Write all files to disk
console.log('🌾 Extracting Gram Suvidha Full-Stack Monorepo...');
for (const [relativePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  ✔ Created ${relativePath}`);
}

console.log('\n✅ Gram Suvidha repository generated successfully!');
console.log('👉 Run the following commands to start locally:');
console.log('   npm run setup');
console.log('   npm run dev\n');