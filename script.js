/* ================= MQTT CONFIG ================= */
const brokerUrl = "wss://broker.hivemq.com:8884/mqtt";
const baseTopic = "tarcin/home"; // MUST match ESP32

/* ================= CONNECT MQTT ================= */
const client = mqtt.connect(brokerUrl);

client.on("connect", () => {
  console.log("✅ MQTT Connected");

  // Subscribe to all device state topics
  document.querySelectorAll(".card").forEach(card => {
    const id = card.dataset.id;
    client.subscribe(`${baseTopic}/state/${id}`);
  });
});

/* ================= HANDLE MQTT MESSAGES ================= */
client.on("message", (topic, payload) => {
  const state = payload.toString(); // "1" or "0"
  const deviceId = topic.split("/").pop();

  const card = document.querySelector(`.card[data-id="${deviceId}"]`);
  if (!card) return;

  const toggle = card.querySelector(".toggle");
  const checkbox = toggle.querySelector("input");

  if (state === "1") {
    card.classList.add("on");
    toggle.classList.add("on");
    checkbox.checked = true;
  } else {
    card.classList.remove("on");
    toggle.classList.remove("on");
    checkbox.checked = false;
  }
});

/* ================= UI → MQTT ================= */
document.querySelectorAll(".card").forEach(card => {
  const deviceId = card.dataset.id;
  const toggle = card.querySelector(".toggle");
  const checkbox = toggle.querySelector("input");

  toggle.addEventListener("click", () => {
    const newState = !checkbox.checked;

    // Publish command instantly
    client.publish(
      `${baseTopic}/cmd/${deviceId}`,
      newState ? "1" : "0"
    );
  });
});

/* ================= OPTIONAL: FILE:// WARNING ================= */
if (location.protocol === "file:") {
  const hint = document.getElementById("server-hint");
  if (hint) hint.classList.remove("hidden");
}
