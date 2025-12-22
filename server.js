const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express(); // ✅ app is defined FIRST
const PORT = process.env.PORT || 5501;
const DATA_FILE = path.join(__dirname, 'states.json');

/* ================= Middleware ================= */
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

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

/* ================= SSE ================= */
let clients = [];

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 🔥 disable buffering

  res.flushHeaders(); // 🔥 send headers immediately

  // send current state immediately
  res.write(`data: ${JSON.stringify(readState())}\n\n`);

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcastState(state) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  clients.forEach(res => res.write(data));
}

/* ================= API ================= */

// GET state
app.get('/api/state', (req, res) => {
  res.json(readState());
});

// PUT state (ESP32 + Web)
app.put('/api/state', (req, res) => {
  writeState(req.body);

  // 🔥 push instantly to browsers
  broadcastState(req.body);

  res.json(req.body);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

/* ================= SPA Fallback ================= */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).end();
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ================= Start ================= */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
