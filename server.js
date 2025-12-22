const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5501;
const DATA_FILE = path.join(__dirname, 'states.json');

/* -------------------- DEFAULT DEVICE STATE -------------------- */
const DEFAULT_STATE = {
  "light-1": false,
  "light-2": false,
  "light-3": false,
  "light-4": false,
  "fan-1": false,
  "fan-2": false,
  "plug-1": false
};

/* -------------------- MIDDLEWARE -------------------- */

// Allow access from browser + ESP32
app.use(cors());

// Parse JSON body
app.use(express.json({ limit: '100kb' }));

// Serve frontend files
app.use(express.static(__dirname));

/* -------------------- HELPERS -------------------- */

function readState() {
  try {
    // If file does not exist → create with defaults
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
      return { ...DEFAULT_STATE };
    }

    const raw = fs.readFileSync(DATA_FILE, 'utf8').trim();

    // If file is empty → reset to defaults
    if (!raw) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STATE, null, 2));
      return { ...DEFAULT_STATE };
    }

    const parsed = JSON.parse(raw);

    // Merge defaults with saved state (prevents missing keys)
    return { ...DEFAULT_STATE, ...parsed };

  } catch (err) {
    console.error('Read error:', err);
    return { ...DEFAULT_STATE };
  }
}

function writeState(state) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
    return true;
  } catch (err) {
    console.error('Write error:', err);
    return false;
  }
}

/* -------------------- API ROUTES -------------------- */

// Get full state (ESP32 + Web)
app.get('/api/state', (req, res) => {
  res.json(readState());
});

// Update full state (Web UI)
app.put('/api/state', (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid state object' });
  }

  const newState = { ...DEFAULT_STATE, ...req.body };

  if (!writeState(newState)) {
    return res.status(500).json({ error: 'Failed to save state' });
  }

  res.json(newState);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/* -------------------- SPA FALLBACK -------------------- */

// Must be last
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).end();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* -------------------- START SERVER -------------------- */

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running');
  console.log(`http://localhost:${PORT}`);
});
