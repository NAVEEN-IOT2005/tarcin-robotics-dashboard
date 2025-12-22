// script.js — REAL-TIME dashboard using Server-Sent Events (NO DELAY)

(async () => {
  const STORAGE_KEY = 'tarcin.iot.states.v1';
  const THEME_KEY = 'tarcin.theme.v1';

  const cards = Array.from(document.querySelectorAll('.card'));
  const btnAllOn = document.getElementById('all-on');
  const btnAllOff = document.getElementById('all-off');
  const themeToggle = document.getElementById('theme-toggle');
  const snackbar = document.getElementById('snackbar');

  let state = await loadState();

  // ---------- INIT ----------
  cards.forEach(initCard);
  attachGlobalControls();
  restoreTheme();

  // ---------- SSE: INSTANT UPDATES ----------
  const evtSource = new EventSource('/api/stream');

  evtSource.onmessage = (event) => {
    const serverState = JSON.parse(event.data);

    for (const card of cards) {
      const id = card.dataset.id;
      const newVal = !!serverState[id];
      const oldVal = !!state[id];

      if (newVal !== oldVal) {
        state[id] = newVal;
        const toggle = card.querySelector('.toggle');
        const input = toggle.querySelector('input');
        updateVisual(card, toggle, input, newVal, true);
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  // ---------- CARD ----------
  function initCard(card) {
    const id = card.dataset.id;
    const toggle = card.querySelector('.toggle');
    const input = toggle.querySelector('input');

    let status = card.querySelector('.status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'status';
      status.textContent = 'ON';
      card.appendChild(status);
    }

    updateVisual(card, toggle, input, !!state[id], false);

    toggle.addEventListener('click', () => {
      const on = !input.checked;
      state[id] = on;
      updateVisual(card, toggle, input, on, true);
      saveState();
      notify(`${card.querySelector('.label').textContent} ${on ? 'on' : 'off'}`);
    });
  }

  // ---------- VISUAL ----------
  function updateVisual(card, toggle, input, on, animate) {
    card.classList.toggle('on', on);
    toggle.classList.toggle('on', on);
    input.checked = on;
    const s = card.querySelector('.status');
    if (s) s.style.display = on ? 'inline-flex' : 'none';
  }

  // ---------- GLOBAL ----------
  function attachGlobalControls() {
    if (btnAllOn) btnAllOn.onclick = () => setAll(true);
    if (btnAllOff) btnAllOff.onclick = () => setAll(false);
    if (themeToggle) themeToggle.onclick = toggleTheme;
  }

  function setAll(on) {
    cards.forEach(card => {
      const id = card.dataset.id;
      const toggle = card.querySelector('.toggle');
      const input = toggle.querySelector('input');
      state[id] = on;
      updateVisual(card, toggle, input, on, true);
    });
    saveState();
  }

  // ---------- SAVE / LOAD ----------
  async function saveState() {
    await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  async function loadState() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {}
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  }

  // ---------- UI ----------
  function notify(msg, ms = 2000) {
    if (!snackbar) return;
    snackbar.textContent = msg;
    snackbar.style.opacity = '1';
    setTimeout(() => snackbar.style.opacity = '0', ms);
  }

  function toggleTheme() {
    const html = document.documentElement;
    const isLight = html.classList.toggle('light-theme');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
  }

  function restoreTheme() {
    if (localStorage.getItem(THEME_KEY) === 'light') {
      document.documentElement.classList.add('light-theme');
    }
  }
})();
