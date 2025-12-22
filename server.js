const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5501;
const DATA_FILE = path.join(__dirname, 'states.json');

/* ================= Middleware ================= */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/* ================= SSE Clients ================= */
let clients = [];

/* ================= Helpers ================= */
function readState() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function writeState(state) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

/* ================= SSE Endpoint ================= */
app.get('/api/stream', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

/* ================= Broadcast ================= */
function broadcastState(state) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  clients.forEach(res => res.write(data));
}

/* ================= API ================= */

// GET full state
app.get('/api/state', (req, res) => {
  res.json(readState());
});

// PUT full state (ESP32 + Web)
app.put('/api/state', (req, res) => {
  if (typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid state' });
  }

  writeState(req.body);
  broadcastState(req.body); // 🔥 INSTANT PUSH
  res.json(req.body);
});

// Health
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// SPA fallback
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ================= Start ================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
