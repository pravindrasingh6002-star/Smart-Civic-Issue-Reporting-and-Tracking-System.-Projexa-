const fs = require('fs');
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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="100%" height="100%" fill="${bgColor}"/>
    <circle cx="540" cy="80" r="45" fill="rgba(255,255,255,0.18)"/>
    <rect x="36" y="250" width="568" height="134" rx="14" fill="rgba(0,0,0,0.28)"/>
    <text x="58" y="305" font-family="sans-serif" font-size="28" font-weight="bold" fill="#ffffff">${label}</text>
    <text x="58" y="345" font-family="sans-serif" font-size="18" fill="#f0e6d2">${sublabel}</text>
  </svg>`;
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
