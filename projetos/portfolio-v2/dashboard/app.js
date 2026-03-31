const STORAGE_KEY = "portfolio.dashboard.entries.v1";

const entryForm = document.getElementById("entryForm");
const entryDateInput = document.getElementById("entryDate");
const entryChannelInput = document.getElementById("entryChannel");
const entryLeadsInput = document.getElementById("entryLeads");
const entrySalesInput = document.getElementById("entrySales");
const entryTicketInput = document.getElementById("entryTicket");
const entryFeedback = document.getElementById("entryFeedback");

const metricLeads = document.getElementById("metricLeads");
const metricSales = document.getElementById("metricSales");
const metricRate = document.getElementById("metricRate");
const metricRevenue = document.getElementById("metricRevenue");

const channelFilters = document.getElementById("channelFilters");
const searchInput = document.getElementById("searchInput");
const entriesBody = document.getElementById("entriesBody");
const emptyEntries = document.getElementById("emptyEntries");
const trendCanvas = document.getElementById("trendCanvas");

const seedDataBtn = document.getElementById("seedDataBtn");
const resetDataBtn = document.getElementById("resetDataBtn");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let activeChannel = "all";
let entries = loadState();

if (entries.length === 0) {
  entries = createSeedEntries();
  saveState();
}

entryDateInput.value = todayIsoDate();
render();

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const leads = Number(entryLeadsInput.value);
  const sales = Number(entrySalesInput.value);
  const ticket = Number(entryTicketInput.value);

  if (sales > leads) {
    setFeedback("Vendas não podem ser maiores que leads.", true);
    return;
  }

  const newEntry = {
    id: createId(),
    date: entryDateInput.value,
    channel: entryChannelInput.value,
    leads,
    sales,
    ticket,
    createdAt: new Date().toISOString(),
  };

  if (!newEntry.date || !newEntry.channel || !newEntry.leads || !newEntry.ticket) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  entries.push(newEntry);
  sortEntries();
  saveState();
  render();

  entryForm.reset();
  entryDateInput.value = todayIsoDate();
  setFeedback("Lançamento registrado no dashboard.");
});

entriesBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  if (!id) return;

  const confirmed = window.confirm("Remover este lançamento?");
  if (!confirmed) return;
  entries = entries.filter((item) => item.id !== id);
  saveState();
  render();
  setFeedback("Lançamento removido.");
});

channelFilters.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const channel = target.dataset.channel;
  if (!channel) return;
  activeChannel = channel;

  channelFilters.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.channel === activeChannel);
  });
  render();
});

searchInput.addEventListener("input", render);

seedDataBtn.addEventListener("click", () => {
  entries = createSeedEntries();
  saveState();
  render();
  setFeedback("Dados demo gerados.");
});

resetDataBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Apagar todos os dados do dashboard?");
  if (!confirmed) return;
  entries = [];
  saveState();
  render();
  setFeedback("Dados removidos.");
});

function render() {
  const filteredEntries = getFilteredEntries();

  entriesBody.innerHTML = filteredEntries
    .map((entry) => {
      const conversionRate = entry.leads ? Math.round((entry.sales / entry.leads) * 100) : 0;
      const revenue = entry.sales * entry.ticket;
      return `
        <tr>
          <td>${formatDate(entry.date)}</td>
          <td>${entry.channel}</td>
          <td>${entry.leads}</td>
          <td>${entry.sales}</td>
          <td>${conversionRate}%</td>
          <td>${currencyFormatter.format(entry.ticket)}</td>
          <td>${currencyFormatter.format(revenue)}</td>
          <td><button type="button" class="table-action delete" data-id="${entry.id}">Excluir</button></td>
        </tr>
      `;
    })
    .join("");

  emptyEntries.style.display = filteredEntries.length === 0 ? "block" : "none";
  updateMetrics(filteredEntries);
  drawTrendChart(filteredEntries);
}

function updateMetrics(visibleEntries) {
  const leads = visibleEntries.reduce((sum, item) => sum + item.leads, 0);
  const sales = visibleEntries.reduce((sum, item) => sum + item.sales, 0);
  const revenue = visibleEntries.reduce((sum, item) => sum + item.sales * item.ticket, 0);
  const rate = leads === 0 ? 0 : Math.round((sales / leads) * 100);

  metricLeads.textContent = String(leads);
  metricSales.textContent = String(sales);
  metricRate.textContent = `${rate}%`;
  metricRevenue.textContent = currencyFormatter.format(revenue);
}

function drawTrendChart(visibleEntries) {
  const ctx = trendCanvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);

  if (visibleEntries.length === 0) {
    ctx.fillStyle = "#6d83a8";
    ctx.font = "14px DM Sans";
    ctx.fillText("Sem dados para o gráfico neste filtro.", 20, 40);
    return;
  }

  const groupedByDate = aggregateByDate(visibleEntries);
  const chartValues = groupedByDate.map((item) => item.revenue);
  const maxValue = Math.max(...chartValues, 1);
  const left = 52;
  const bottom = 210;
  const top = 28;
  const right = 22;
  const chartWidth = trendCanvas.width - left - right;
  const chartHeight = bottom - top;

  ctx.strokeStyle = "#ccd8ec";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(trendCanvas.width - right, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#5372a0";
  ctx.font = "12px DM Sans";
  for (let i = 0; i <= 4; i += 1) {
    const value = Math.round(maxValue - (maxValue / 4) * i);
    const y = top + (chartHeight / 4) * i + 4;
    ctx.fillText(`R$ ${value}`, 6, y);
  }

  if (groupedByDate.length === 1) {
    const singleX = left + chartWidth / 2;
    const singleY = bottom - (groupedByDate[0].revenue / maxValue) * chartHeight;
    drawDataPoint(ctx, singleX, singleY);
    drawXLabel(ctx, singleX, groupedByDate[0].label);
    return;
  }

  ctx.strokeStyle = "#1459f5";
  ctx.lineWidth = 3;
  ctx.beginPath();

  groupedByDate.forEach((item, index) => {
    const x = left + (chartWidth / (groupedByDate.length - 1)) * index;
    const y = bottom - (item.revenue / maxValue) * chartHeight;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  groupedByDate.forEach((item, index) => {
    const x = left + (chartWidth / (groupedByDate.length - 1)) * index;
    const y = bottom - (item.revenue / maxValue) * chartHeight;
    drawDataPoint(ctx, x, y);
    drawXLabel(ctx, x, item.label);
  });
}

function drawDataPoint(ctx, x, y) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#1459f5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawXLabel(ctx, x, label) {
  ctx.fillStyle = "#58739b";
  ctx.font = "12px DM Sans";
  ctx.textAlign = "center";
  ctx.fillText(label, x, 234);
  ctx.textAlign = "start";
}

function getFilteredEntries() {
  const query = searchInput.value.trim().toLowerCase();
  return entries.filter((item) => {
    const matchesChannel = activeChannel === "all" || item.channel === activeChannel;
    const matchesSearch = !query || item.channel.toLowerCase().includes(query);
    return matchesChannel && matchesSearch;
  });
}

function aggregateByDate(list) {
  const map = new Map();
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));

  sorted.forEach((item) => {
    const revenue = item.sales * item.ticket;
    if (!map.has(item.date)) {
      map.set(item.date, revenue);
    } else {
      map.set(item.date, map.get(item.date) + revenue);
    }
  });

  return Array.from(map.entries()).map(([date, revenue]) => ({
    date,
    revenue,
    label: formatDate(date).slice(0, 5),
  }));
}

function setFeedback(message, isError = false) {
  entryFeedback.textContent = message;
  entryFeedback.style.color = isError ? "#b42345" : "#1f6f4b";
}

function sortEntries() {
  entries.sort((a, b) => b.date.localeCompare(a.date));
}

function createSeedEntries() {
  return [
    {
      id: createId(),
      date: nextIsoDate(-2),
      channel: "Instagram",
      leads: 54,
      sales: 12,
      ticket: 297,
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      date: nextIsoDate(-1),
      channel: "Google Ads",
      leads: 39,
      sales: 8,
      ticket: 330,
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      date: todayIsoDate(),
      channel: "WhatsApp",
      leads: 28,
      sales: 7,
      ticket: 260,
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      date: todayIsoDate(),
      channel: "Indicacao",
      leads: 17,
      sales: 6,
      ticket: 410,
      createdAt: new Date().toISOString(),
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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
