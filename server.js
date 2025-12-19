const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5501;
const DATA_FILE = path.join(__dirname, 'states.json');

// Security middlewares
app.use(helmet());
// CORS: allow all origins by default, can be restricted via ALLOWED_ORIGINS env var
if (process.env.ALLOWED_ORIGINS) {
  const allowed = process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  app.use(cors({ origin: allowed }));
} else {
  app.use(cors());
}

// limit JSON body size to avoid abuse
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname)));

function readState() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to read state file:', e);
    return {};
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to write state file:', e);
    return false;
  }
}

// API: get full state
app.get('/api/state', (req, res) => {
  const state = readState();
  res.json(state);
});

// API: update a single device: { id: "light-1", value: true }
app.post('/api/state', (req, res) => {
  const { id, value } = req.body || {};
  if (typeof id !== 'string' || typeof value === 'undefined') {
    return res.status(400).json({ error: 'Expected { id: string, value: boolean }' });
  }
  const state = readState();
  state[id] = !!value;
  if (!writeState(state)) return res.status(500).json({ error: 'Could not persist state' });
  res.json(state);
});

// API: replace full state with provided object
app.put('/api/state', (req, res) => {
  const newState = req.body || {};
  if (typeof newState !== 'object') return res.status(400).json({ error: 'Expected JSON object' });
  if (!writeState(newState)) return res.status(500).json({ error: 'Could not persist state' });
  res.json(newState);
});

// Health
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TARCIN backend running at http://localhost:${PORT}`);
});
