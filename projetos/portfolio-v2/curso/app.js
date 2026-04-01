const STORAGE_KEY = "portfolio.curso.leads.v2";
const SUBMISSION_GUARD_KEY = "portfolio.curso.submit.guard.v1";
const STATUS_FLOW = ["Novo", "Contato", "Qualificado", "Proposta", "Matriculado"];
const LOST_REASONS = [
  "Sem orçamento",
  "Sem tempo",
  "Escolheu concorrente",
  "Não respondeu",
];

const leadForm = document.getElementById("leadForm");
const leadNameInput = document.getElementById("leadName");
const leadEmailInput = document.getElementById("leadEmail");
const leadPhoneInput = document.getElementById("leadPhone");
const leadSourceInput = document.getElementById("leadSource");
const leadLevelInput = document.getElementById("leadLevel");
const leadShiftInput = document.getElementById("leadShift");
const leadWebsiteInput = document.getElementById("leadWebsite");
const leadGoalInput = document.getElementById("leadGoal");
const leadTermsInput = document.getElementById("leadTerms");
const leadFeedback = document.getElementById("leadFeedback");

const statusFilter = document.getElementById("statusFilter");
const leadsBody = document.getElementById("leadsBody");
const emptyLeads = document.getElementById("emptyLeads");
const loadDemoBtn = document.getElementById("loadDemoBtn");

const statLeads = document.getElementById("statLeads");
const statQualified = document.getElementById("statQualified");
const statProposal = document.getElementById("statProposal");
const statEnrolled = document.getElementById("statEnrolled");
const statConversion = document.getElementById("statConversion");

const sourceCards = document.getElementById("sourceCards");
const emptySources = document.getElementById("emptySources");

let leads = loadState();
if (leads.length === 0) {
  leads = createSeedLeads();
  saveState();
}

render();

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (leadWebsiteInput.value.trim()) {
    setFeedback("Não foi possível registrar a inscrição agora.", true);
    return;
  }

  if (!leadTermsInput.checked) {
    setFeedback("Você precisa autorizar o contato para enviar a inscrição.", true);
    return;
  }

  if (!canSubmitNow()) {
    setFeedback("Muitas tentativas seguidas. Aguarde alguns segundos.", true);
    return;
  }

  const lead = {
    id: createId(),
    name: leadNameInput.value.trim(),
    email: leadEmailInput.value.trim().toLowerCase(),
    phone: leadPhoneInput.value.trim(),
    source: leadSourceInput.value,
    level: leadLevelInput.value,
    shift: leadShiftInput.value,
    goal: leadGoalInput.value.trim(),
    status: "Novo",
    lostReason: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{ status: "Novo", at: new Date().toISOString() }],
  };

  if (!lead.name || !lead.email || !lead.phone || !lead.source || !lead.level || !lead.shift || !lead.goal) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  if (!isValidEmail(lead.email)) {
    setFeedback("Informe um e-mail válido.", true);
    return;
  }

  if (!isValidPhone(lead.phone)) {
    setFeedback("Informe um WhatsApp válido com DDD.", true);
    return;
  }

  const hasDuplicateEmail = leads.some((item) => item.email === lead.email);
  if (hasDuplicateEmail) {
    setFeedback("Este e-mail já está no funil.", true);
    return;
  }

  registerSubmitAttempt();
  leads.unshift(lead);
  saveState();
  render();
  leadForm.reset();
  setFeedback("Inscrição recebida e salva no pipeline.");
});

leadsBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  const selected = leads.find((item) => item.id === id);
  if (!selected) return;

  if (action === "advance") {
    if (selected.status === "Perdido" || selected.status === "Matriculado") return;
    const currentIndex = STATUS_FLOW.indexOf(selected.status);
    const nextIndex = Math.min(currentIndex + 1, STATUS_FLOW.length - 1);
    const nextStatus = STATUS_FLOW[nextIndex];
    updateLeadStatus(selected, nextStatus);
    saveState();
    render();
    setFeedback(`Lead ${selected.name} movido para ${nextStatus}.`);
  }

  if (action === "lose") {
    if (selected.status === "Matriculado" || selected.status === "Perdido") return;
    const row = target.closest("tr");
    if (!row) return;
    const reasonSelect = row.querySelector(`[data-reason-id="${id}"]`);
    const reason = reasonSelect instanceof HTMLSelectElement ? reasonSelect.value : "";
    if (!reason) {
      setFeedback("Selecione um motivo para marcar como perdido.", true);
      return;
    }

    selected.lostReason = reason;
    updateLeadStatus(selected, "Perdido");
    saveState();
    render();
    setFeedback(`Lead ${selected.name} marcado como perdido.`);
  }

  if (action === "restore") {
    if (selected.status !== "Perdido") return;
    selected.lostReason = "";
    updateLeadStatus(selected, "Contato");
    saveState();
    render();
    setFeedback(`Lead ${selected.name} retornou para Contato.`);
  }

  if (action === "delete") {
    const confirmed = window.confirm("Deseja remover este lead?");
    if (!confirmed) return;
    leads = leads.filter((item) => item.id !== id);
    saveState();
    render();
    setFeedback("Lead removido.");
  }
});

statusFilter.addEventListener("change", render);

loadDemoBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Carregar dados demo e substituir os leads atuais?");
  if (!confirmed) return;
  leads = createSeedLeads();
  saveState();
  render();
  setFeedback("Leads demo carregados.");
});

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    if (!item) return;

    const isOpen = item.classList.contains("open");
    document.querySelectorAll(".faq-item").forEach((faq) => faq.classList.remove("open"));
    if (!isOpen) item.classList.add("open");
  });
});

function render() {
  const visibleLeads = getFilteredLeads();
  leadsBody.innerHTML = visibleLeads
    .map((lead) => {
      const statusClass = lead.status.toLowerCase();
      const canAdvance = lead.status !== "Matriculado" && lead.status !== "Perdido";
      const canLose = lead.status !== "Matriculado" && lead.status !== "Perdido";
      const canRestore = lead.status === "Perdido";
      const lossReasonLabel = lead.lostReason || "—";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(lead.name)}</strong><br />
            <small>${escapeHtml(lead.email)}</small>
          </td>
          <td>${escapeHtml(lead.source)}</td>
          <td>${escapeHtml(lead.level)}</td>
          <td>${escapeHtml(lead.shift)}</td>
          <td><span class="status-chip ${statusClass}">${lead.status}</span></td>
          <td>${escapeHtml(lossReasonLabel)}</td>
          <td>${formatDate(lead.createdAt)}</td>
          <td>
            <select class="lost-reason" data-reason-id="${lead.id}" ${canLose ? "" : "disabled"}>
              <option value="">Motivo perda</option>
              ${LOST_REASONS.map((reason) => `<option value="${escapeHtml(reason)}">${escapeHtml(reason)}</option>`).join("")}
            </select>
            <button type="button" class="table-action advance" data-action="advance" data-id="${lead.id}" ${canAdvance ? "" : "disabled"}>Avançar</button>
            <button type="button" class="table-action lose" data-action="lose" data-id="${lead.id}" ${canLose ? "" : "disabled"}>Perder</button>
            <button type="button" class="table-action restore" data-action="restore" data-id="${lead.id}" ${canRestore ? "" : "disabled"}>Reabrir</button>
            <button type="button" class="table-action delete" data-action="delete" data-id="${lead.id}">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyLeads.style.display = visibleLeads.length === 0 ? "block" : "none";
  updateStats();
  renderSourceCards();
}

function updateStats() {
  const total = leads.length;
  const qualified = leads.filter((item) => ["Qualificado", "Proposta", "Matriculado"].includes(item.status)).length;
  const proposal = leads.filter((item) => item.status === "Proposta").length;
  const enrolled = leads.filter((item) => item.status === "Matriculado").length;
  const conversion = total ? Math.round((enrolled / total) * 100) : 0;

  statLeads.textContent = String(total);
  statQualified.textContent = String(qualified);
  statProposal.textContent = String(proposal);
  statEnrolled.textContent = String(enrolled);
  statConversion.textContent = `${conversion}%`;
}

function renderSourceCards() {
  const grouped = new Map();

  leads.forEach((lead) => {
    if (!grouped.has(lead.source)) {
      grouped.set(lead.source, { total: 0, enrolled: 0 });
    }
    const item = grouped.get(lead.source);
    item.total += 1;
    if (lead.status === "Matriculado") item.enrolled += 1;
  });

  const list = Array.from(grouped.entries())
    .map(([source, data]) => ({
      source,
      ...data,
      rate: data.total ? Math.round((data.enrolled / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate);

  if (list.length === 0) {
    sourceCards.innerHTML = "";
    emptySources.style.display = "block";
    return;
  }

  sourceCards.innerHTML = list
    .map((item) => {
      return `
        <article class="source-card">
          <p>${escapeHtml(item.source)}</p>
          <strong>${item.rate}%</strong>
          <span>${item.enrolled} matrículas / ${item.total} leads</span>
        </article>
      `;
    })
    .join("");

  emptySources.style.display = "none";
}

function getFilteredLeads() {
  const status = statusFilter.value;
  const sorted = [...leads].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (status === "all") return sorted;
  return sorted.filter((lead) => lead.status === status);
}

function updateLeadStatus(lead, status) {
  lead.status = status;
  lead.updatedAt = new Date().toISOString();
  if (!Array.isArray(lead.history)) lead.history = [];
  lead.history.push({ status, at: lead.updatedAt });
}

function canSubmitNow() {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const submissions = loadSubmitGuard().filter((item) => item > oneMinuteAgo);
  return submissions.length < 3;
}

function registerSubmitAttempt() {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const submissions = loadSubmitGuard().filter((item) => item > oneMinuteAgo);
  submissions.push(now);
  localStorage.setItem(SUBMISSION_GUARD_KEY, JSON.stringify(submissions));
}

function loadSubmitGuard() {
  try {
    const raw = localStorage.getItem(SUBMISSION_GUARD_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digits = phone.replaceAll(/\D/g, "");
  return digits.length >= 10 && digits.length <= 13;
}

function setFeedback(message, isError = false) {
  leadFeedback.textContent = message;
  leadFeedback.style.color = isError ? "#b33a44" : "#356c42";
}

function createSeedLeads() {
  return [
    {
      id: createId(),
      name: "Marina Alves",
      email: "marina.alves@email.com",
      phone: "(51) 99887-4120",
      source: "Instagram",
      level: "Iniciante",
      shift: "Noite",
      goal: "Quero minha primeira vaga em front-end.",
      status: "Qualificado",
      lostReason: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [{ status: "Novo", at: new Date().toISOString() }, { status: "Qualificado", at: new Date().toISOString() }],
    },
    {
      id: createId(),
      name: "Rafael Braga",
      email: "rafael.braga@email.com",
      phone: "(51) 99544-8834",
      source: "Google Ads",
      level: "Migracao de carreira",
      shift: "Misto",
      goal: "Transição de suporte para desenvolvimento web.",
      status: "Matriculado",
      lostReason: "",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 36000000).toISOString(),
      history: [{ status: "Matriculado", at: new Date(Date.now() - 36000000).toISOString() }],
    },
    {
      id: createId(),
      name: "Camila Nunes",
      email: "camila.nunes@email.com",
      phone: "(51) 99413-2011",
      source: "Indicação",
      level: "Intermediario",
      shift: "Final de semana",
      goal: "Quero dominar JavaScript moderno para freelas.",
      status: "Perdido",
      lostReason: "Sem orçamento",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      history: [{ status: "Perdido", at: new Date(Date.now() - 86400000).toISOString() }],
    },
  ];
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        ...item,
        source: item.source || "Instagram",
        status: normalizeStatus(item.status),
        lostReason: item.lostReason || "",
      }));
  } catch {
    return [];
  }
}

function normalizeStatus(status) {
  const allowed = [...STATUS_FLOW, "Perdido"];
  return allowed.includes(status) ? status : "Novo";
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("pt-BR");
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
