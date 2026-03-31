const STORAGE_KEY = "portfolio.curso.leads.v1";
const STATUS_FLOW = ["Novo", "Contato", "Matriculado"];

const leadForm = document.getElementById("leadForm");
const leadNameInput = document.getElementById("leadName");
const leadEmailInput = document.getElementById("leadEmail");
const leadPhoneInput = document.getElementById("leadPhone");
const leadLevelInput = document.getElementById("leadLevel");
const leadShiftInput = document.getElementById("leadShift");
const leadGoalInput = document.getElementById("leadGoal");
const leadTermsInput = document.getElementById("leadTerms");
const leadFeedback = document.getElementById("leadFeedback");

const statusFilter = document.getElementById("statusFilter");
const leadsBody = document.getElementById("leadsBody");
const emptyLeads = document.getElementById("emptyLeads");
const loadDemoBtn = document.getElementById("loadDemoBtn");

const statLeads = document.getElementById("statLeads");
const statContact = document.getElementById("statContact");
const statEnrolled = document.getElementById("statEnrolled");
const statConversion = document.getElementById("statConversion");

let leads = loadState();
if (leads.length === 0) {
  leads = createSeedLeads();
  saveState();
}

render();

leadForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!leadTermsInput.checked) {
    setFeedback("Você precisa autorizar o contato para enviar a inscrição.", true);
    return;
  }

  const lead = {
    id: createId(),
    name: leadNameInput.value.trim(),
    email: leadEmailInput.value.trim().toLowerCase(),
    phone: leadPhoneInput.value.trim(),
    level: leadLevelInput.value,
    shift: leadShiftInput.value,
    goal: leadGoalInput.value.trim(),
    status: "Novo",
    createdAt: new Date().toISOString(),
  };

  if (!lead.name || !lead.email || !lead.phone || !lead.level || !lead.shift || !lead.goal) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  const hasDuplicateEmail = leads.some((item) => item.email === lead.email);
  if (hasDuplicateEmail) {
    setFeedback("Este e-mail já está em seu funil. Use outro para teste.", true);
    return;
  }

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
    const currentIndex = STATUS_FLOW.indexOf(selected.status);
    const nextIndex = Math.min(currentIndex + 1, STATUS_FLOW.length - 1);
    selected.status = STATUS_FLOW[nextIndex];
    saveState();
    render();
    setFeedback(`Lead ${selected.name} movido para ${selected.status}.`);
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
      const canAdvance = lead.status !== "Matriculado";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(lead.name)}</strong><br />
            <small>${escapeHtml(lead.email)}</small>
          </td>
          <td>${lead.level}</td>
          <td>${lead.shift}</td>
          <td><span class="status-chip ${statusClass}">${lead.status}</span></td>
          <td>${formatDate(lead.createdAt)}</td>
          <td>
            <button type="button" class="table-action advance" data-action="advance" data-id="${lead.id}" ${canAdvance ? "" : "disabled"}>Avançar</button>
            <button type="button" class="table-action delete" data-action="delete" data-id="${lead.id}">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyLeads.style.display = visibleLeads.length === 0 ? "block" : "none";
  updateStats();
}

function updateStats() {
  const total = leads.length;
  const inContact = leads.filter((item) => item.status === "Contato").length;
  const enrolled = leads.filter((item) => item.status === "Matriculado").length;
  const conversion = total ? Math.round((enrolled / total) * 100) : 0;

  statLeads.textContent = String(total);
  statContact.textContent = String(inContact);
  statEnrolled.textContent = String(enrolled);
  statConversion.textContent = `${conversion}%`;
}

function getFilteredLeads() {
  const status = statusFilter.value;
  if (status === "all") return leads;
  return leads.filter((lead) => lead.status === status);
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
      level: "Iniciante",
      shift: "Noite",
      goal: "Quero minha primeira vaga em front-end.",
      status: "Contato",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      name: "Rafael Braga",
      email: "rafael.braga@email.com",
      phone: "(51) 99544-8834",
      level: "Migracao de carreira",
      shift: "Misto",
      goal: "Transição de suporte para desenvolvimento web.",
      status: "Matriculado",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: createId(),
      name: "Camila Nunes",
      email: "camila.nunes@email.com",
      phone: "(51) 99413-2011",
      level: "Intermediario",
      shift: "Final de semana",
      goal: "Quero dominar JavaScript moderno para freelas.",
      status: "Novo",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];
}

function loadState() {
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
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
