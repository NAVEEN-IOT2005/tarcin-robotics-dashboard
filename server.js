let clients = [];

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 🔥 MOST IMPORTANT

  res.flushHeaders(); // 🔥 FORCE SEND NOW

  // send current state immediately
  const state = readState();
  res.write(`data: ${JSON.stringify(state)}\n\n`);

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(c => c !== res);
  });
});

function broadcastState(state) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  clients.forEach(res => res.write(data));
}
app.put('/api/state', (req, res) => {
  writeState(req.body);
  broadcastState(req.body); // instant push
  res.json(req.body);
});
