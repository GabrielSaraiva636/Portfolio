const STORAGE_KEY = "portfolio.project.logisticaGo";
const STATUS_FLOW = ["route", "done"];

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
const kpiRoute = document.getElementById("kpiRoute");
const kpiDelay = document.getElementById("kpiDelay");
const kpiDone = document.getElementById("kpiDone");
const kpiEta = document.getElementById("kpiEta");

let events = loadEvents();
if (events.length === 0) {
  events = createSeed();
  saveEvents();
}

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
  }

  if (action === "delay") {
    selected.status = "delayed";
    selected.eta += 15;
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
  timeline.innerHTML = events
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

  emptyState.style.display = events.length === 0 ? "block" : "none";
  updateKpi();
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
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function createSeed() {
  return [
    { id: createId(), driver: "Rodrigo", vehicle: "VAN-2041", origin: "CD Porto Alegre", destination: "Canoas", eta: 45, status: "route" },
    { id: createId(), driver: "Luana", vehicle: "TRK-9910", origin: "CD Gravatai", destination: "Novo Hamburgo", eta: 70, status: "delayed" },
    { id: createId(), driver: "Marcos", vehicle: "VAN-1183", origin: "CD Canoas", destination: "Sao Leopoldo", eta: 0, status: "done" },
  ];
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
