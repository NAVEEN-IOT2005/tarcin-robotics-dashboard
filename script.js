// script.js — interactive behaviour for the dashboard with HTTP backend sync and local fallback
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

  // Initialize UI
  cards.forEach(initCard);
  attachGlobalControls();
  restoreTheme();
  attachCursorEffects();

  // ----------------------
  function initCard(card) {
    const id = card.dataset.id;
    const toggle = card.querySelector('.toggle');
    const input = toggle.querySelector('input');

    // Ensure there's a status chip (accessible and visible when ON)
    let status = card.querySelector('.status');
    if(!status){
      status = document.createElement('div');
      status.className = 'status';
      status.textContent = 'ON';
      card.appendChild(status);
    }

    const isOn = !!state[id];
    updateVisual(card, toggle, input, isOn, false);

    // Click handler
    toggle.addEventListener('click', () => {
      const turnedOn = !input.checked;
      input.checked = turnedOn;
      state[id] = turnedOn;
      updateVisual(card, toggle, input, turnedOn, true);
      saveState(); // async but fire-and-forget; fallback to localStorage handled inside
      notify(`${card.querySelector('.label').textContent} ${turnedOn ? 'on' : 'off'}`);
    });

    // Keyboard accessibility
    toggle.addEventListener('keydown', (ev) => {
      if(ev.key === ' ' || ev.key === 'Enter'){
        ev.preventDefault();
        toggle.click();
      }
    });
  }

  function updateVisual(card, toggle, input, on, animate = true){
    if(on){
      card.classList.add('on');
      toggle.classList.add('on');
      input.checked = true;
      const s = card.querySelector('.status'); if(s) s.style.display = 'inline-flex';
      if(animate) pulse(card);
    } else {
      card.classList.remove('on');
      toggle.classList.remove('on');
      input.checked = false;
      const s = card.querySelector('.status'); if(s) s.style.display = 'none';
      if(animate) pulse(card, false);
    }
  }

  function pulse(el, positive = true){
    el.style.transition = 'transform 220ms ease, box-shadow 220ms ease';
    el.style.transform = positive ? 'translateY(-6px)' : 'translateY(0)';
    setTimeout(()=>{ el.style.transform = ''; }, 220);
  }

  function attachGlobalControls(){
    if(btnAllOn) btnAllOn.addEventListener('click', () => setAll(true));
    if(btnAllOff) btnAllOff.addEventListener('click', () => setAll(false));
    if(themeToggle) themeToggle.addEventListener('click', toggleTheme);

    // keyboard shortcuts
    window.addEventListener('keydown', (ev) => {
      if(ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      if(ev.key === 'A' || ev.key === 'a') setAll(true);
      if(ev.key === 'O' || ev.key === 'o') setAll(false);
      if(ev.key === 'T' || ev.key === 't') toggleTheme();
    });
  }

  function setAll(turnOn){
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

  function notify(msg, ms = 2200){
    if(!snackbar) return console.log(msg);
    snackbar.textContent = msg;
    snackbar.style.transition = 'opacity 220ms ease, transform 220ms ease';
    snackbar.style.opacity = '1';
    snackbar.style.transform = 'translateY(0)';
    setTimeout(()=>{ snackbar.style.opacity = '0'; }, ms);
  }

  // Attempt to save state to server (PUT full state). Fallback: persist to localStorage.
  async function saveState(){
    try{
      const res = await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      if(!res.ok) throw new Error('Server error');
      // keep a local copy as cache
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){}
    }catch(e){
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){
        console.warn('Could not save state locally', e);
      }
    }
  }

  // Load state: try server first, then localStorage, otherwise empty object
  async function loadState(){
    try{
      const res = await fetch('/api/state', { cache: 'no-store' });
      if(res.ok){
        const srv = await res.json();
        // cache locally
        try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(srv)); }catch(e){}
        return srv || {};
      }
      throw new Error('No server');
    }catch(e){
      try{
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
      }catch(e){
        return {};
      }
    }
  }

  // ---------------------- Theme handling ----------------------
  function toggleTheme(){
    const html = document.documentElement;
    const isLight = html.classList.toggle('light-theme');
    try{ localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark'); }
    catch(e){}
    notify(isLight ? 'Light theme enabled' : 'Dark theme enabled');
  }

  function restoreTheme(){
    try{
      const t = localStorage.getItem(THEME_KEY);
      if(t === 'light') document.documentElement.classList.add('light-theme');
    }catch(e){}
  }

  // ---------------------- cursor follow + click effect ----------------------
  function attachCursorEffects(){
    if(!cursorEl) return;
    window.addEventListener('pointermove', (ev) => {
      cursorEl.style.setProperty('--cursor-x', ev.clientX + 'px');
      cursorEl.style.setProperty('--cursor-y', ev.clientY + 'px');
      cursorEl.style.left = ev.clientX + 'px';
      cursorEl.style.top = ev.clientY + 'px';
    });
    window.addEventListener('pointerdown', () => {
      cursorEl.classList.add('click');
      setTimeout(()=> cursorEl.classList.remove('click'), 150);
    });
  }

  // Expose a minimal API for debugging/testing
  window.TarcinDashboard = {
    getState: async () => {
      try{
        const res = await fetch('/api/state', { cache: 'no-store' });
        if(res.ok) return await res.json();
      }catch(e){}
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    },
    setState: async (s) => { state = s || {}; await saveState(); location.reload(); },
    toggleTheme
  };

})();

// End of file
