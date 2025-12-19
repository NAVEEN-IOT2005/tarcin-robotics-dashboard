const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5501;
const DATA_FILE = path.join(__dirname, 'states.json');

/* -------------------- Middleware -------------------- */

// Allow mobile + LAN access
app.use(cors());

// JSON body
app.use(express.json({ limit: '100kb' }));

// Serve frontend
app.use(express.static(__dirname));

/* -------------------- Helpers -------------------- */

function readState() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('Read error:', e);
    return {};
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (e) {
    console.error('Write error:', e);
    return false;
  }
}

/* -------------------- API -------------------- */

// GET full state
app.get('/api/state', (req, res) => {
  res.json(readState());
});

// PUT full state
app.put('/api/state', (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid state object' });
  }
  if (!writeState(req.body)) {
    return res.status(500).json({ error: 'Failed to save state' });
  }
  res.json(req.body);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/* -------------------- SPA Fallback -------------------- */

// ⚠️ MUST be last and MUST ignore /api
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).end();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* -------------------- Start Server -------------------- */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at:`);
  console.log(`http://localhost:${PORT}`);
});
