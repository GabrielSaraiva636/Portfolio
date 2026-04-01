const STORAGE_KEY = "portfolio.dashboard.entries.v2";

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
const rangeStartInput = document.getElementById("rangeStart");
const rangeEndInput = document.getElementById("rangeEnd");
const applyRangeBtn = document.getElementById("applyRangeBtn");
const clearRangeBtn = document.getElementById("clearRangeBtn");

const searchInput = document.getElementById("searchInput");
const entriesBody = document.getElementById("entriesBody");
const emptyEntries = document.getElementById("emptyEntries");
const trendCanvas = document.getElementById("trendCanvas");
const conversionCanvas = document.getElementById("conversionCanvas");
const monthlyCards = document.getElementById("monthlyCards");
const emptySnapshot = document.getElementById("emptySnapshot");

const seedDataBtn = document.getElementById("seedDataBtn");
const resetDataBtn = document.getElementById("resetDataBtn");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let activeChannel = "all";
let activeRange = { start: "", end: "" };
let entries = loadState();

if (entries.length === 0) {
  entries = createSeedEntries();
  saveState();
}
sortEntries();

entryDateInput.value = todayIsoDate();
initializeRange();
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

applyRangeBtn.addEventListener("click", () => {
  const start = rangeStartInput.value;
  const end = rangeEndInput.value;

  if (start && end && start > end) {
    setFeedback("A data inicial não pode ser maior que a data final.", true);
    return;
  }

  activeRange = { start, end };
  render();
  setFeedback("Período aplicado no dashboard.");
});

clearRangeBtn.addEventListener("click", () => {
  activeRange = { start: "", end: "" };
  rangeStartInput.value = "";
  rangeEndInput.value = "";
  render();
  setFeedback("Período removido.");
});

searchInput.addEventListener("input", render);

seedDataBtn.addEventListener("click", () => {
  entries = createSeedEntries();
  sortEntries();
  saveState();
  initializeRange();
  render();
  setFeedback("Dados demo gerados.");
});

resetDataBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Apagar todos os dados do dashboard?");
  if (!confirmed) return;
  entries = [];
  activeRange = { start: "", end: "" };
  rangeStartInput.value = "";
  rangeEndInput.value = "";
  saveState();
  render();
  setFeedback("Dados removidos.");
});

function render() {
  const filteredEntries = getFilteredEntries();
  renderTable(filteredEntries);
  updateMetrics(filteredEntries);
  drawRevenueTrend(filteredEntries);
  drawConversionChart(filteredEntries);
  renderMonthlySnapshot(filteredEntries);
}

function renderTable(visibleEntries) {
  entriesBody.innerHTML = visibleEntries
    .map((entry) => {
      const conversionRate = entry.leads ? Math.round((entry.sales / entry.leads) * 100) : 0;
      const revenue = entry.sales * entry.ticket;
      return `
        <tr>
          <td>${formatDate(entry.date)}</td>
          <td>${escapeHtml(entry.channel)}</td>
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

  emptyEntries.style.display = visibleEntries.length === 0 ? "block" : "none";
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

function drawRevenueTrend(visibleEntries) {
  const ctx = trendCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);

  if (visibleEntries.length === 0) {
    drawChartEmpty(ctx, trendCanvas, "Sem dados para o período.");
    return;
  }

  const groupedByDate = aggregateByDate(visibleEntries);
  const maxValue = Math.max(...groupedByDate.map((item) => item.revenue), 1);

  const left = 50;
  const bottom = 200;
  const top = 24;
  const right = 20;
  const width = trendCanvas.width - left - right;
  const height = bottom - top;

  drawYAxis(ctx, left, top, width, height, maxValue, "R$");

  ctx.strokeStyle = "#1459f5";
  ctx.lineWidth = 3;
  ctx.beginPath();

  groupedByDate.forEach((item, index) => {
    const x = groupedByDate.length === 1
      ? left + width / 2
      : left + (width / (groupedByDate.length - 1)) * index;
    const y = bottom - (item.revenue / maxValue) * height;

    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  groupedByDate.forEach((item, index) => {
    const x = groupedByDate.length === 1
      ? left + width / 2
      : left + (width / (groupedByDate.length - 1)) * index;
    const y = bottom - (item.revenue / maxValue) * height;
    drawPoint(ctx, x, y, "#1459f5");
    drawXLabel(ctx, x, item.label, 228);
  });
}

function drawConversionChart(visibleEntries) {
  const ctx = conversionCanvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, conversionCanvas.width, conversionCanvas.height);

  const grouped = aggregateByChannel(visibleEntries);
  if (grouped.length === 0) {
    drawChartEmpty(ctx, conversionCanvas, "Sem dados de conversão.");
    return;
  }

  const left = 52;
  const top = 24;
  const bottom = 176;
  const height = bottom - top;
  const chartWidth = conversionCanvas.width - left - 26;
  const barWidth = Math.max(Math.floor(chartWidth / grouped.length) - 18, 26);

  ctx.strokeStyle = "#d5deec";
  for (let i = 0; i <= 4; i += 1) {
    const y = top + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(conversionCanvas.width - 20, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#4e668f";
  ctx.font = "12px DM Sans";
  for (let i = 0; i <= 4; i += 1) {
    const value = 100 - i * 25;
    const y = top + (height / 4) * i + 4;
    ctx.fillText(`${value}%`, 10, y);
  }

  grouped.forEach((item, index) => {
    const x = left + 10 + index * (barWidth + 18);
    const barHeight = Math.round((item.rate / 100) * height);
    const y = bottom - barHeight;

    ctx.fillStyle = "#4f82fb";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#2e4a76";
    ctx.fillText(`${item.rate}%`, x, y - 6);
    drawXLabel(ctx, x + barWidth / 2, item.channel.slice(0, 10), 206);
  });
}

function renderMonthlySnapshot(visibleEntries) {
  const groupedByMonth = aggregateByMonth(visibleEntries);
  if (groupedByMonth.length === 0) {
    monthlyCards.innerHTML = "";
    emptySnapshot.style.display = "block";
    return;
  }

  monthlyCards.innerHTML = groupedByMonth
    .map((month) => {
      const conversion = month.leads === 0 ? 0 : Math.round((month.sales / month.leads) * 100);
      return `
        <article class="month-card">
          <p>${month.label}</p>
          <strong>${currencyFormatter.format(month.revenue)}</strong>
          <span>Leads: ${month.leads}</span>
          <span>Vendas: ${month.sales}</span>
          <span>Conversão: ${conversion}%</span>
        </article>
      `;
    })
    .join("");

  emptySnapshot.style.display = "none";
}

function getFilteredEntries() {
  const query = searchInput.value.trim().toLowerCase();
  return entries.filter((item) => {
    const matchesChannel = activeChannel === "all" || item.channel === activeChannel;
    const matchesSearch = !query || item.channel.toLowerCase().includes(query);
    const matchesRange = isInRange(item.date);
    return matchesChannel && matchesSearch && matchesRange;
  });
}

function isInRange(date) {
  if (activeRange.start && date < activeRange.start) return false;
  if (activeRange.end && date > activeRange.end) return false;
  return true;
}

function aggregateByDate(list) {
  const map = new Map();
  [...list]
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach((item) => {
      const revenue = item.sales * item.ticket;
      map.set(item.date, (map.get(item.date) || 0) + revenue);
    });

  return Array.from(map.entries()).map(([date, revenue]) => ({
    date,
    revenue,
    label: formatDate(date).slice(0, 5),
  }));
}

function aggregateByChannel(list) {
  const map = new Map();
  list.forEach((item) => {
    if (!map.has(item.channel)) {
      map.set(item.channel, { leads: 0, sales: 0 });
    }
    const current = map.get(item.channel);
    current.leads += item.leads;
    current.sales += item.sales;
  });

  return Array.from(map.entries()).map(([channel, data]) => ({
    channel,
    rate: data.leads ? Math.round((data.sales / data.leads) * 100) : 0,
  }));
}

function aggregateByMonth(list) {
  const map = new Map();
  list.forEach((item) => {
    const key = item.date.slice(0, 7);
    if (!map.has(key)) {
      map.set(key, { leads: 0, sales: 0, revenue: 0 });
    }
    const month = map.get(key);
    month.leads += item.leads;
    month.sales += item.sales;
    month.revenue += item.sales * item.ticket;
  });

  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, values]) => ({
      label: formatMonth(monthKey),
      ...values,
    }));
}

function drawChartEmpty(ctx, canvas, message) {
  ctx.fillStyle = "#6d83a8";
  ctx.font = "14px DM Sans";
  ctx.fillText(message, 20, Math.round(canvas.height / 2));
}

function drawYAxis(ctx, left, top, width, height, maxValue, prefix) {
  ctx.strokeStyle = "#ccd8ec";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = top + (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#5372a0";
  ctx.font = "12px DM Sans";
  for (let i = 0; i <= 4; i += 1) {
    const value = Math.round(maxValue - (maxValue / 4) * i);
    const y = top + (height / 4) * i + 4;
    ctx.fillText(`${prefix} ${value}`, 6, y);
  }
}

function drawPoint(ctx, x, y, color) {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawXLabel(ctx, x, label, y) {
  ctx.fillStyle = "#58739b";
  ctx.font = "12px DM Sans";
  ctx.textAlign = "center";
  ctx.fillText(label, x, y);
  ctx.textAlign = "start";
}

function setFeedback(message, isError = false) {
  entryFeedback.textContent = message;
  entryFeedback.style.color = isError ? "#b42345" : "#1f6f4b";
}

function initializeRange() {
  if (entries.length === 0) return;
  const sortedByDate = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const start = sortedByDate[0].date;
  const end = sortedByDate[sortedByDate.length - 1].date;

  rangeStartInput.value = start;
  rangeEndInput.value = end;
  activeRange = { start, end };
}

function sortEntries() {
  entries.sort((a, b) => b.date.localeCompare(a.date));
}

function createSeedEntries() {
  return [
    { id: createId(), date: dateOffsetIso(-62), channel: "Instagram", leads: 62, sales: 13, ticket: 289 },
    { id: createId(), date: dateOffsetIso(-55), channel: "Google Ads", leads: 47, sales: 10, ticket: 321 },
    { id: createId(), date: dateOffsetIso(-45), channel: "Indicacao", leads: 22, sales: 8, ticket: 470 },
    { id: createId(), date: dateOffsetIso(-34), channel: "WhatsApp", leads: 33, sales: 9, ticket: 255 },
    { id: createId(), date: dateOffsetIso(-19), channel: "Instagram", leads: 58, sales: 15, ticket: 305 },
    { id: createId(), date: dateOffsetIso(-13), channel: "Google Ads", leads: 44, sales: 11, ticket: 337 },
    { id: createId(), date: dateOffsetIso(-7), channel: "WhatsApp", leads: 31, sales: 9, ticket: 271 },
    { id: createId(), date: todayIsoDate(), channel: "Indicacao", leads: 19, sales: 7, ticket: 430 },
  ].map((item) => ({
    ...item,
    createdAt: new Date().toISOString(),
  }));
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

function formatMonth(value) {
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return `${month}/${year}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetIso(daysToAdd) {
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
