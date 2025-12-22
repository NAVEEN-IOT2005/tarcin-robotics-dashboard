const cards = document.querySelectorAll(".card");

/* ========= SEND COMMAND TO ESP32 ========= */
function sendState(id, state) {
  fetch(`/toggle?id=${id}&state=${state ? 1 : 0}`)
    .catch(err => console.log("ESP32 not reachable"));
}

/* ========= TOGGLE CLICK ========= */
cards.forEach(card => {
  const toggle = card.querySelector(".toggle");
  const checkbox = toggle.querySelector("input");
  const id = card.dataset.id;

  toggle.addEventListener("click", () => {
    const newState = !checkbox.checked;
    checkbox.checked = newState;

    card.classList.toggle("on", newState);
    toggle.classList.toggle("on", newState);

    sendState(id, newState);
  });
});

/* ========= REAL-TIME STATE SYNC ========= */
function syncState() {
  fetch("/state")
    .then(res => res.json())
    .then(data => {
      cards.forEach(card => {
        const id = card.dataset.id;
        const state = data["d" + id] === 1;

        const toggle = card.querySelector(".toggle");
        const checkbox = toggle.querySelector("input");

        card.classList.toggle("on", state);
        toggle.classList.toggle("on", state);
        checkbox.checked = state;
      });
    })
    .catch(() => {});
}

/* Polling every 200ms (very fast, no delay feeling) */
setInterval(syncState, 200);
