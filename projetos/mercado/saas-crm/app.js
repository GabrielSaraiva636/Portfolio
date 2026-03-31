const STORAGE_KEY = "portfolio.project.saasCrm";
const STAGES = ["lead", "proposal", "won"];

const ticketForm = document.getElementById("ticketForm");
const companyInput = document.getElementById("companyInput");
const ownerInput = document.getElementById("ownerInput");
const sourceInput = document.getElementById("sourceInput");
const valueInput = document.getElementById("valueInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const ticketBody = document.getElementById("ticketBody");
const emptyState = document.getElementById("emptyState");
const kpiLead = document.getElementById("kpiLead");
const kpiProposal = document.getElementById("kpiProposal");
const kpiWon = document.getElementById("kpiWon");
const kpiRevenue = document.getElementById("kpiRevenue");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let tickets = loadTickets();
if (tickets.length === 0) {
  tickets = createSeed();
  saveTickets();
}

render();

ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const ticket = {
    id: createId(),
    company: companyInput.value.trim(),
    owner: ownerInput.value.trim(),
    source: sourceInput.value,
    stage: "lead",
    value: Number(valueInput.value),
    createdAt: new Date().toISOString(),
  };

  if (!ticket.company || !ticket.owner || !ticket.source || !ticket.value) {
    setFeedback("Preencha todos os campos.", true);
    return;
  }

  tickets.unshift(ticket);
  saveTickets();
  render();
  ticketForm.reset();
  setFeedback("Ticket criado.");
});

ticketBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;

  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;

  const selected = tickets.find((item) => item.id === id);
  if (!selected) return;

  if (action === "next") {
    const current = STAGES.indexOf(selected.stage);
    selected.stage = STAGES[Math.min(current + 1, STAGES.length - 1)];
  }

  if (action === "delete") {
    tickets = tickets.filter((item) => item.id !== id);
  }

  saveTickets();
  render();
});

seedBtn.addEventListener("click", () => {
  tickets = createSeed();
  saveTickets();
  render();
  setFeedback("Dados demo carregados.");
});

function render() {
  ticketBody.innerHTML = tickets
    .map((ticket) => {
      const stageLabel = formatStage(ticket.stage);
      const disableNext = ticket.stage === "won" ? "disabled" : "";
      return `
        <tr>
          <td>${escapeHtml(ticket.company)}</td>
          <td>${escapeHtml(ticket.owner)}</td>
          <td>${ticket.source}</td>
          <td><span class="stage ${ticket.stage}">${stageLabel}</span></td>
          <td>${currency.format(ticket.value)}</td>
          <td>
            <button class="action next" data-id="${ticket.id}" data-action="next" ${disableNext}>Avancar</button>
            <button class="action delete" data-id="${ticket.id}" data-action="delete">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyState.style.display = tickets.length === 0 ? "block" : "none";
  updateKpi();
}

function updateKpi() {
  const lead = tickets.filter((item) => item.stage === "lead").length;
  const proposal = tickets.filter((item) => item.stage === "proposal").length;
  const won = tickets.filter((item) => item.stage === "won").length;
  const revenue = tickets.filter((item) => item.stage === "won").reduce((acc, item) => acc + item.value, 0);

  kpiLead.textContent = String(lead);
  kpiProposal.textContent = String(proposal);
  kpiWon.textContent = String(won);
  kpiRevenue.textContent = currency.format(revenue);
}

function formatStage(stage) {
  if (stage === "proposal") return "Proposta";
  if (stage === "won") return "Fechado";
  return "Lead";
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#ffadb8" : "#9ff7c4";
}

function loadTickets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTickets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

function createSeed() {
  return [
    { id: createId(), company: "Nexo Digital", owner: "Gabriel", source: "Inbound", stage: "lead", value: 8200 },
    { id: createId(), company: "Atlas Medical", owner: "Ana", source: "Outbound", stage: "proposal", value: 13400 },
    { id: createId(), company: "Vertice Tech", owner: "Joao", source: "Indicacao", stage: "won", value: 18700 },
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
