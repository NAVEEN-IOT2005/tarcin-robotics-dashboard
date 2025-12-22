const evtSource = new EventSource('/api/stream');

evtSource.onmessage = (event) => {
  const serverState = JSON.parse(event.data);

  document.querySelectorAll('.card').forEach(card => {
    const id = card.dataset.id;
    const on = !!serverState[id];

    card.classList.toggle('on', on);
    card.querySelector('input').checked = on;
  });
};
