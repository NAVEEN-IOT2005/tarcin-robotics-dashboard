// script.js — interactive behaviour with LIVE backend sync (ESP32 + Web)

(async () => {
  const STORAGE_KEY = 'tarcin.iot.states.v1';
  const THEME_KEY = 'tarcin.theme.v1';

  const cards = Array.from(document.querySelectorAll('.card'));
  const btnAllOn = document.getElementById('all-on');
  const btnAllOff = document.getElementById('all-off');
  const themeToggle = document.getElementById('theme-toggle');
  const cursorEl = document.getElementById('cursor');
  const snackbar = document.getElementById('snackbar');

  let state = await loadState();

  // ---------------- INIT ----------------
  cards.forEach(initCard);
  attachGlobalControls();
  restoreTheme();
  attachCursorEffects();

  // 🔁 LIVE SYNC (every 1 second)
  setInterval(syncFromServer, 1000);

  // ---------------- CARD INIT ----------------
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
      const turnedOn = !input.checked;
      state[id] = turnedOn;
      updateVisual(card, toggle, input, turnedOn, true);
      saveState();
      notify(`${card.querySelector('.label').textContent} ${turnedOn ? 'on' : 'off'}`);
    });

    toggle.addEventListener('keydown', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        toggle.click();
      }
    });
  }

  // ---------------- VISUAL UPDATE ----------------
  function updateVisual(card, toggle, input, on, animate = true) {
    if (on) {
      card.classList.add('on');
      toggle.classList.add('on');
      input.checked = true;
      const s = card.querySelector('.status');
      if (s) s.style.display = 'inline-flex';
      if (animate) pulse(card);
    } else {
      card.classList.remove('on');
      toggle.classList.remove('on');
      input.checked = false;
      const s = card.querySelector('.status');
      if (s) s.style.display = 'none';
      if (animate) pulse(card, false);
    }
  }

  function pulse(el, positive = true) {
    el.style.transition = 'transform 220ms ease, box-shadow 220ms ease';
    el.style.transform = positive ? 'translateY(-6px)' : 'translateY(0)';
    setTimeout(() => (el.style.transform = ''), 220);
  }

  // ---------------- GLOBAL CONTROLS ----------------
  function attachGlobalControls() {
    if (btnAllOn) btnAllOn.addEventListener('click', () => setAll(true));
    if (btnAllOff) btnAllOff.addEventListener('click', () => setAll(false));
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
  }

  function setAll(turnOn) {
    cards.forEach(card => {
      const id = card.dataset.id;
      const toggle = card.querySelector('.toggle');
      const input = toggle.querySelector('input');
      state[id] = turnOn;
      updateVisual(card, toggle, input, turnOn, true);
    });
    saveState();
    notify(turnOn ? 'All devices turned on' : 'All devices turned off');
  }

  // ---------------- NOTIFY ----------------
  function notify(msg, ms = 2000) {
    if (!snackbar) return;
    snackbar.textContent = msg;
    snackbar.style.opacity = '1';
    snackbar.style.transform = 'translateY(0)';
    setTimeout(() => (snackbar.style.opacity = '0'), ms);
  }

  // ---------------- BACKEND SYNC ----------------
  async function syncFromServer() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (!res.ok) return;

      const serverState = await res.json();

      // Update UI ONLY if something changed
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
    } catch (e) {
      // silent fail (offline)
    }
  }

  // ---------------- SAVE / LOAD ----------------
  async function saveState() {
    try {
      await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }

  async function loadState() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      if (res.ok) {
        const s = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        return s;
      }
    } catch {}
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  }

  // ---------------- THEME ----------------
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

  // ---------------- CURSOR EFFECT ----------------
  function attachCursorEffects() {
    if (!cursorEl) return;
    window.addEventListener('pointermove', (ev) => {
      cursorEl.style.left = ev.clientX + 'px';
      cursorEl.style.top = ev.clientY + 'px';
    });
  }

})();
