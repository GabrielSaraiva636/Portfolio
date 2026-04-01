const STORAGE_KEY = "portfolio.project.logisticaGo.v2";
const STATUS_FLOW = ["route", "done"];
const WS_URL = "ws://localhost:8080/ws/events";

const eventForm = document.getElementById("eventForm");
const driverInput = document.getElementById("driverInput");
const vehicleInput = document.getElementById("vehicleInput");
const originInput = document.getElementById("originInput");
const destinationInput = document.getElementById("destinationInput");
const etaInput = document.getElementById("etaInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const timeline = document.getElementById("timeline");
const emptyState = document.getElementById("emptyState");
const mapBoard = document.getElementById("mapBoard");
const slaAlerts = document.getElementById("slaAlerts");
const emptyAlerts = document.getElementById("emptyAlerts");
const wsStatus = document.getElementById("wsStatus");
const lastHeartbeat = document.getElementById("lastHeartbeat");

const kpiRoute = document.getElementById("kpiRoute");
const kpiDelay = document.getElementById("kpiDelay");
const kpiDone = document.getElementById("kpiDone");
const kpiEta = document.getElementById("kpiEta");

let socket = null;
let reconnectAttempt = 0;
let events = loadEvents();

if (events.length === 0) {
  events = createSeed();
  saveEvents();
}

connectWebSocket();
render();

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const delivery = {
    id: createId(),
    driver: driverInput.value.trim(),
    vehicle: vehicleInput.value.trim(),
    origin: originInput.value.trim(),
    destination: destinationInput.value.trim(),
    eta: Number(etaInput.value),
    status: "route",
    updatedAt: new Date().toISOString(),
  };

  if (!delivery.driver || !delivery.vehicle || !delivery.origin || !delivery.destination || !delivery.eta) {
    setFeedback("Preencha todos os campos.", true);
    return;
  }

  events.unshift(delivery);
  saveEvents();
  render();
  eventForm.reset();
  setFeedback("Evento criado.");
});

timeline.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;

  const selected = events.find((item) => item.id === id);
  if (!selected) return;

  if (action === "next") {
    const current = STATUS_FLOW.indexOf(selected.status);
    selected.status = STATUS_FLOW[Math.min(current + 1, STATUS_FLOW.length - 1)];
    selected.eta = selected.status === "done" ? 0 : selected.eta;
    selected.updatedAt = new Date().toISOString();
  }

  if (action === "delay") {
    selected.status = "delayed";
    selected.eta += 15;
    selected.updatedAt = new Date().toISOString();
  }

  if (action === "delete") {
    events = events.filter((item) => item.id !== id);
  }

  saveEvents();
  render();
});

seedBtn.addEventListener("click", () => {
  events = createSeed();
  saveEvents();
  render();
  setFeedback("Dados demo carregados.");
});

function render() {
  const sorted = [...events].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  timeline.innerHTML = sorted
    .map((event) => {
      const statusText = statusLabel(event.status);
      const disableNext = event.status === "done" ? "disabled" : "";
      return `
        <article class="event-item">
          <div class="event-head">
            <strong>${escapeHtml(event.driver)} · ${escapeHtml(event.vehicle)}</strong>
            <span class="status ${event.status}">${statusText}</span>
          </div>
          <p>${escapeHtml(event.origin)} → ${escapeHtml(event.destination)}</p>
          <p>ETA estimado: ${event.eta} min</p>
          <div class="event-actions">
            <button class="action next" data-id="${event.id}" data-action="next" ${disableNext}>Avancar</button>
            <button class="action delay" data-id="${event.id}" data-action="delay">Atraso +15min</button>
            <button class="action delete" data-id="${event.id}" data-action="delete">Remover</button>
          </div>
        </article>
      `;
    })
    .join("");

  emptyState.style.display = sorted.length === 0 ? "block" : "none";
  updateKpi();
  renderMap(sorted);
  renderSlaAlerts(sorted);
}

function renderMap(list) {
  const activeRoutes = list.filter((item) => item.status !== "done");
  mapBoard.innerHTML = activeRoutes
    .slice(0, 8)
    .map((item, index) => {
      const progress = Math.max(5, Math.min(95, 100 - item.eta));
      return `
        <article class="map-card" style="--delay:${index * 40}ms">
          <strong>${escapeHtml(item.vehicle)}</strong>
          <p>${escapeHtml(item.origin)} → ${escapeHtml(item.destination)}</p>
          <div class="map-progress"><span style="width:${progress}%"></span></div>
        </article>
      `;
    })
    .join("");
}

function renderSlaAlerts(list) {
  const alerts = list.filter((item) => item.status === "delayed" || (item.status === "route" && item.eta > 60));
  slaAlerts.innerHTML = alerts
    .map((item) => `<li>${escapeHtml(item.vehicle)} em risco de SLA (${item.eta} min para ${escapeHtml(item.destination)}).</li>`)
    .join("");
  emptyAlerts.style.display = alerts.length === 0 ? "block" : "none";
}

function updateKpi() {
  const route = events.filter((item) => item.status === "route").length;
  const delayed = events.filter((item) => item.status === "delayed").length;
  const done = events.filter((item) => item.status === "done").length;
  const etaAvg = events.length ? Math.round(events.reduce((acc, item) => acc + item.eta, 0) / events.length) : 0;

  kpiRoute.textContent = String(route);
  kpiDelay.textContent = String(delayed);
  kpiDone.textContent = String(done);
  kpiEta.textContent = `${etaAvg} min`;
}

function connectWebSocket() {
  try {
    socket = new WebSocket(WS_URL);
  } catch {
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    reconnectAttempt = 0;
    setWsStatus(true);
    setFeedback("Canal websocket conectado.");
  });

  socket.addEventListener("message", (messageEvent) => {
    let payload = null;
    try {
      payload = JSON.parse(messageEvent.data);
    } catch {
      return;
    }

    if (payload.type === "heartbeat") {
      lastHeartbeat.textContent = new Date(payload.at || Date.now()).toLocaleTimeString("pt-BR");
      return;
    }

    const event = normalizeIncomingEvent(payload);
    if (!event) return;
    upsertEvent(event);
    saveEvents();
    render();
  });

  socket.addEventListener("close", () => {
    setWsStatus(false);
    scheduleReconnect();
  });

  socket.addEventListener("error", () => {
    setWsStatus(false);
    socket?.close();
  });
}

function scheduleReconnect() {
  reconnectAttempt += 1;
  const delay = Math.min(15000, 1000 * reconnectAttempt);
  setTimeout(() => connectWebSocket(), delay);
}

function setWsStatus(isOnline) {
  wsStatus.textContent = isOnline ? "WS Online" : "WS Offline";
  wsStatus.classList.toggle("online", isOnline);
  wsStatus.classList.toggle("offline", !isOnline);
}

function normalizeIncomingEvent(payload) {
  if (!payload || typeof payload !== "object") return null;
  if (!payload.id || !payload.driver || !payload.vehicle || !payload.origin || !payload.destination) return null;
  return {
    id: String(payload.id),
    driver: String(payload.driver),
    vehicle: String(payload.vehicle),
    origin: String(payload.origin),
    destination: String(payload.destination),
    eta: Number(payload.eta || 0),
    status: normalizeStatus(String(payload.status || "route")),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStatus(status) {
  if (status === "delayed") return "delayed";
  if (status === "done") return "done";
  return "route";
}

function upsertEvent(incoming) {
  const index = events.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    events.unshift(incoming);
    return;
  }
  events[index] = {
    ...events[index],
    ...incoming,
  };
}

function statusLabel(status) {
  if (status === "delayed") return "Atrasada";
  if (status === "done") return "Concluida";
  return "Em rota";
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#ffb2bd" : "#b2fedd";
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function createSeed() {
  return [
    {
      id: createId(),
      driver: "Rodrigo",
      vehicle: "VAN-2041",
      origin: "CD Porto Alegre",
      destination: "Canoas",
      eta: 45,
      status: "route",
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      driver: "Luana",
      vehicle: "TRK-9910",
      origin: "CD Gravatai",
      destination: "Novo Hamburgo",
      eta: 70,
      status: "delayed",
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      driver: "Marcos",
      vehicle: "VAN-1183",
      origin: "CD Canoas",
      destination: "Sao Leopoldo",
      eta: 0,
      status: "done",
      updatedAt: new Date().toISOString(),
    },
  ];
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
