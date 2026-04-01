const TICKET_STORAGE_KEY = "portfolio.project.saasCrm.tickets.v2";
const HISTORY_STORAGE_KEY = "portfolio.project.saasCrm.history.v2";
const SESSION_STORAGE_KEY = "portfolio.project.saasCrm.session.v1";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "proposal", label: "Proposta" },
  { id: "negotiation", label: "Negociação" },
  { id: "won", label: "Fechado" },
  { id: "lost", label: "Perdido" },
];

const ROLE_PERMISSIONS = {
  sdr: ["lead", "proposal"],
  closer: ["lead", "proposal", "negotiation", "won", "lost"],
  manager: ["lead", "proposal", "negotiation", "won", "lost"],
};

const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginRoleInput = document.getElementById("loginRole");
const sessionInfo = document.getElementById("sessionInfo");
const logoutBtn = document.getElementById("logoutBtn");

const ticketForm = document.getElementById("ticketForm");
const companyInput = document.getElementById("companyInput");
const ownerInput = document.getElementById("ownerInput");
const sourceInput = document.getElementById("sourceInput");
const valueInput = document.getElementById("valueInput");
const targetDateInput = document.getElementById("targetDateInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const pipelineBoard = document.getElementById("pipelineBoard");
const historyList = document.getElementById("historyList");
const emptyState = document.getElementById("emptyState");
const emptyHistory = document.getElementById("emptyHistory");
const kpiLead = document.getElementById("kpiLead");
const kpiProposal = document.getElementById("kpiProposal");
const kpiWon = document.getElementById("kpiWon");
const kpiRevenue = document.getElementById("kpiRevenue");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let tickets = loadTickets();
let movementHistory = loadHistory();
let session = loadSession();
let draggedTicketId = "";

if (tickets.length === 0) {
  tickets = createSeed();
  movementHistory = createSeedHistory(tickets);
  saveTickets();
  saveHistory();
}

targetDateInput.value = nextIsoDate(15);
applySessionState();
render();

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = loginEmailInput.value.trim().toLowerCase();
  const password = loginPasswordInput.value.trim();
  const role = loginRoleInput.value;

  if (!email || !password || !role) {
    setFeedback("Informe e-mail, senha e perfil.", true);
    return;
  }

  session = {
    id: createId(),
    email,
    name: email.split("@")[0],
    role,
    loggedAt: new Date().toISOString(),
  };
  saveSession();
  applySessionState();
  render();
  loginForm.reset();
  setFeedback(`Sessão iniciada como ${role.toUpperCase()}.`);
});

logoutBtn.addEventListener("click", () => {
  session = null;
  clearSession();
  applySessionState();
  render();
  setFeedback("Sessão encerrada.");
});

ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!session) {
    setFeedback("Faça login para criar tickets.", true);
    return;
  }

  const ticket = {
    id: createId(),
    company: companyInput.value.trim(),
    owner: ownerInput.value.trim(),
    source: sourceInput.value,
    stage: "lead",
    value: Number(valueInput.value),
    targetDate: targetDateInput.value,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!ticket.company || !ticket.owner || !ticket.source || !ticket.value || !ticket.targetDate) {
    setFeedback("Preencha todos os campos.", true);
    return;
  }

  tickets.unshift(ticket);
  registerHistory(ticket, "created", "lead", "Ticket criado");
  saveTickets();
  saveHistory();
  render();
  ticketForm.reset();
  targetDateInput.value = nextIsoDate(15);
  setFeedback("Ticket criado.");
});

pipelineBoard.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;

  const selected = tickets.find((item) => item.id === id);
  if (!selected) return;

  if (action === "next") {
    const nextStage = getNextStage(selected.stage);
    if (!nextStage) return;
    moveTicket(selected, nextStage, "Avanço rápido");
    return;
  }

  if (action === "lost") {
    moveTicket(selected, "lost", "Perda manual");
    return;
  }

  if (action === "delete") {
    if (!session || session.role !== "manager") {
      setFeedback("Somente manager pode excluir ticket.", true);
      return;
    }
    tickets = tickets.filter((item) => item.id !== id);
    registerHistory(selected, selected.stage, "deleted", "Ticket excluído");
    saveTickets();
    saveHistory();
    render();
  }
});

seedBtn.addEventListener("click", () => {
  tickets = createSeed();
  movementHistory = createSeedHistory(tickets);
  saveTickets();
  saveHistory();
  render();
  setFeedback("Dados demo carregados.");
});

function render() {
  renderBoard();
  renderHistory();
  updateKpi();
  emptyState.style.display = tickets.length === 0 ? "block" : "none";
}

function renderBoard() {
  pipelineBoard.innerHTML = STAGES
    .map((stage) => {
      const stageTickets = tickets.filter((ticket) => ticket.stage === stage.id);
      const stageTotal = stageTickets.reduce((acc, item) => acc + item.value, 0);
      return `
        <section class="kanban-column" data-stage="${stage.id}">
          <header>
            <h3>${stage.label}</h3>
            <small>${stageTickets.length} tickets • ${currency.format(stageTotal)}</small>
          </header>
          <div class="column-body">
            ${stageTickets.map((ticket) => renderTicketCard(ticket)).join("")}
          </div>
        </section>
      `;
    })
    .join("");

  pipelineBoard.querySelectorAll(".ticket-card").forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    card.addEventListener("dragstart", onCardDragStart);
    card.addEventListener("dragend", onCardDragEnd);
  });

  pipelineBoard.querySelectorAll(".kanban-column").forEach((column) => {
    if (!(column instanceof HTMLElement)) return;
    column.addEventListener("dragover", onColumnDragOver);
    column.addEventListener("drop", onColumnDrop);
    column.addEventListener("dragleave", onColumnDragLeave);
  });
}

function renderTicketCard(ticket) {
  const canDrag = Boolean(session);
  const canNext = Boolean(getNextStage(ticket.stage));
  const canLose = ticket.stage !== "won" && ticket.stage !== "lost";
  return `
    <article class="ticket-card" draggable="${canDrag}" data-id="${ticket.id}">
      <strong>${escapeHtml(ticket.company)}</strong>
      <p>Owner: ${escapeHtml(ticket.owner)}</p>
      <p>Origem: ${escapeHtml(ticket.source)}</p>
      <p>Valor: ${currency.format(ticket.value)}</p>
      <p>Meta: ${formatDate(ticket.targetDate)}</p>
      <footer>
        <button class="action next" data-id="${ticket.id}" data-action="next" ${canNext ? "" : "disabled"}>Avançar</button>
        <button class="action lost" data-id="${ticket.id}" data-action="lost" ${canLose ? "" : "disabled"}>Perdido</button>
        <button class="action delete" data-id="${ticket.id}" data-action="delete">Excluir</button>
      </footer>
    </article>
  `;
}

function renderHistory() {
  const sorted = [...movementHistory].sort((a, b) => new Date(b.at) - new Date(a.at));
  historyList.innerHTML = sorted
    .slice(0, 30)
    .map((item) => {
      return `<li>${formatDateTime(item.at)} · ${escapeHtml(item.actor)} · ${escapeHtml(item.company)}: ${formatStage(item.from)} → ${formatStage(item.to)} (${escapeHtml(item.note)})</li>`;
    })
    .join("");

  emptyHistory.style.display = sorted.length === 0 ? "block" : "none";
}

function updateKpi() {
  const lead = tickets.filter((item) => item.stage === "lead").length;
  const negotiation = tickets.filter((item) => item.stage === "negotiation").length;
  const won = tickets.filter((item) => item.stage === "won").length;
  const revenue = tickets.filter((item) => item.stage !== "lost").reduce((acc, item) => acc + item.value, 0);

  kpiLead.textContent = String(lead);
  kpiProposal.textContent = String(negotiation);
  kpiWon.textContent = String(won);
  kpiRevenue.textContent = currency.format(revenue);
}

function onCardDragStart(event) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;
  if (!session) {
    event.preventDefault();
    return;
  }
  draggedTicketId = target.dataset.id || "";
  event.dataTransfer?.setData("text/plain", draggedTicketId);
  target.classList.add("dragging");
}

function onCardDragEnd(event) {
  const target = event.currentTarget;
  if (target instanceof HTMLElement) target.classList.remove("dragging");
  draggedTicketId = "";
  pipelineBoard.querySelectorAll(".kanban-column").forEach((column) => column.classList.remove("drag-over"));
}

function onColumnDragOver(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (target instanceof HTMLElement) target.classList.add("drag-over");
}

function onColumnDragLeave(event) {
  const target = event.currentTarget;
  if (target instanceof HTMLElement) target.classList.remove("drag-over");
}

function onColumnDrop(event) {
  event.preventDefault();
  const target = event.currentTarget;
  if (!(target instanceof HTMLElement)) return;

  const stage = target.dataset.stage;
  const ticketId = event.dataTransfer?.getData("text/plain") || draggedTicketId;
  if (!stage || !ticketId) return;

  const selected = tickets.find((item) => item.id === ticketId);
  if (!selected) return;

  moveTicket(selected, stage, "Movido por drag-and-drop");
  target.classList.remove("drag-over");
}

function moveTicket(ticket, targetStage, note) {
  if (!session) {
    setFeedback("Faça login para mover tickets.", true);
    return;
  }

  if (!canMoveToStage(session.role, targetStage)) {
    setFeedback(`Perfil ${session.role.toUpperCase()} sem permissão para ${formatStage(targetStage)}.`, true);
    return;
  }

  if (ticket.stage === targetStage) return;

  const fromStage = ticket.stage;
  ticket.stage = targetStage;
  ticket.updatedAt = new Date().toISOString();
  registerHistory(ticket, fromStage, targetStage, note);
  saveTickets();
  saveHistory();
  render();
  setFeedback(`${ticket.company} movida para ${formatStage(targetStage)}.`);
}

function canMoveToStage(role, stage) {
  const allowed = ROLE_PERMISSIONS[role] || [];
  return allowed.includes(stage);
}

function registerHistory(ticket, from, to, note) {
  movementHistory.push({
    id: createId(),
    ticketId: ticket.id,
    company: ticket.company,
    from,
    to,
    note,
    actor: session ? `${session.name} (${session.role})` : "system",
    at: new Date().toISOString(),
  });
}

function getNextStage(stage) {
  if (stage === "lead") return "proposal";
  if (stage === "proposal") return "negotiation";
  if (stage === "negotiation") return "won";
  return "";
}

function applySessionState() {
  if (!session) {
    sessionInfo.innerHTML = "<p>Sem sessão ativa.</p>";
    logoutBtn.disabled = true;
    ticketForm.querySelectorAll("input, select, button").forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      if (element.id === "feedback") return;
      if (element.getAttribute("type") === "submit") element.disabled = true;
      else element.disabled = true;
    });
    return;
  }

  sessionInfo.innerHTML = `
    <p><strong>${escapeHtml(session.name)}</strong></p>
    <p>${escapeHtml(session.email)}</p>
    <p>Role: ${session.role.toUpperCase()}</p>
  `;
  logoutBtn.disabled = false;
  ticketForm.querySelectorAll("input, select, button").forEach((element) => {
    if (element instanceof HTMLButtonElement && element.type !== "submit") return;
    if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLButtonElement) {
      element.disabled = false;
    }
  });
}

function formatStage(stage) {
  const found = STAGES.find((item) => item.id === stage);
  if (found) return found.label;
  if (stage === "created") return "Criado";
  if (stage === "deleted") return "Excluído";
  return stage;
}

function formatDate(value) {
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString("pt-BR");
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#ffadb8" : "#9ff7c4";
}

function loadTickets() {
  try {
    const raw = localStorage.getItem(TICKET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.id !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveTickets() {
  localStorage.setItem(TICKET_STORAGE_KEY, JSON.stringify(tickets));
}

function saveHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(movementHistory));
}

function saveSession() {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function createSeed() {
  return [
    {
      id: createId(),
      company: "Nexo Digital",
      owner: "Gabriel",
      source: "Inbound",
      stage: "lead",
      value: 8200,
      targetDate: nextIsoDate(18),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      company: "Atlas Medical",
      owner: "Ana",
      source: "Outbound",
      stage: "negotiation",
      value: 13400,
      targetDate: nextIsoDate(10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      company: "Vertice Tech",
      owner: "Joao",
      source: "Indicacao",
      stage: "won",
      value: 18700,
      targetDate: nextIsoDate(6),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      company: "Prime Log",
      owner: "Lara",
      source: "Evento",
      stage: "proposal",
      value: 9800,
      targetDate: nextIsoDate(21),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function createSeedHistory(seedTickets) {
  return seedTickets.map((ticket) => ({
    id: createId(),
    ticketId: ticket.id,
    company: ticket.company,
    from: "created",
    to: ticket.stage,
    note: "Carga inicial demo",
    actor: "system",
    at: new Date().toISOString(),
  }));
}

function nextIsoDate(daysToAdd) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
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
