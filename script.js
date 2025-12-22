/* ======================================================
   REAL-TIME MQTT DASHBOARD SCRIPT (PRODUCTION READY)
====================================================== */

/* ================= MQTT CONFIG ================= */
const brokerUrl = "wss://broker.hivemq.com:8884/mqtt";
const baseTopic = "tarcin/home";   // MUST match ESP32

/* ================= CONNECT ================= */
const client = mqtt.connect(brokerUrl, {
  reconnectPeriod: 1000,   // auto reconnect
  connectTimeout: 4000
});

/* ================= UI STATE LOCK ================= */
const uiLock = {}; // prevents rapid double toggles

/* ================= MQTT CONNECT ================= */
client.on("connect", () => {
  console.log("✅ MQTT Connected");

  document.querySelectorAll(".card").forEach(card => {
    const id = card.dataset.id;
    client.subscribe(`${baseTopic}/state/${id}`);
  });
});

client.on("reconnect", () => {
  console.warn("🔄 MQTT Reconnecting...");
});

client.on("offline", () => {
  console.warn("⚠️ MQTT Offline");
});

/* ================= RECEIVE STATE ================= */
client.on("message", (topic, payload) => {
  const state = payload.toString(); // "1" | "0"
  const deviceId = topic.split("/").pop();

  const card = document.querySelector(`.card[data-id="${deviceId}"]`);
  if (!card) return;

  const toggle = card.querySelector(".toggle");
  const checkbox = toggle.querySelector("input");

  // Apply state
  if (state === "1") {
    card.classList.add("on");
    toggle.classList.add("on");
    checkbox.checked = true;
  } else {
    card.classList.remove("on");
    toggle.classList.remove("on");
    checkbox.checked = false;
  }

  // Unlock UI for this device
  uiLock[deviceId] = false;
});

/* ================= UI → MQTT COMMAND ================= */
document.querySelectorAll(".card").forEach(card => {
  const deviceId = card.dataset.id;
  const toggle = card.querySelector(".toggle");
  const checkbox = toggle.querySelector("input");

  // Prevent checkbox default behavior
  checkbox.addEventListener("click", e => e.preventDefault());

  toggle.addEventListener("click", () => {
    if (uiLock[deviceId]) return; // prevent spam

    const nextState = !checkbox.checked;

    uiLock[deviceId] = true; // lock until MQTT confirms

    client.publish(
      `${baseTopic}/cmd/${deviceId}`,
      nextState ? "1" : "0",
      { qos: 1 }   // reliable delivery
    );
  });
});

/* ================= FILE:// WARNING ================= */
if (location.protocol === "file:") {
  const hint = document.getElementById("server-hint");
  if (hint) hint.classList.remove("hidden");
}
