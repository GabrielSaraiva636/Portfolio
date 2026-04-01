const ENTRY_STORAGE_KEY = "portfolio.project.finopsPython.entries.v2";
const BUDGET_STORAGE_KEY = "portfolio.project.finopsPython.budget.v1";

const entryForm = document.getElementById("entryForm");
const dateInput = document.getElementById("dateInput");
const categoryInput = document.getElementById("categoryInput");
const typeInput = document.getElementById("typeInput");
const amountInput = document.getElementById("amountInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const currentMonthInput = document.getElementById("currentMonth");
const compareMonthInput = document.getElementById("compareMonth");
const applyCompareBtn = document.getElementById("applyCompareBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const exportXlsxBtn = document.getElementById("exportXlsxBtn");

const budgetCategoryInput = document.getElementById("budgetCategoryInput");
const budgetLimitInput = document.getElementById("budgetLimitInput");
const saveBudgetBtn = document.getElementById("saveBudgetBtn");
const budgetAlerts = document.getElementById("budgetAlerts");
const emptyAlerts = document.getElementById("emptyAlerts");

const entryBody = document.getElementById("entryBody");
const emptyState = document.getElementById("emptyState");
const chart = document.getElementById("chart");
const kpiIncome = document.getElementById("kpiIncome");
const kpiExpense = document.getElementById("kpiExpense");
const kpiBalance = document.getElementById("kpiBalance");
const kpiMargin = document.getElementById("kpiMargin");

const deltaIncome = document.getElementById("deltaIncome");
const deltaExpense = document.getElementById("deltaExpense");
const deltaBalance = document.getElementById("deltaBalance");
const deltaMargin = document.getElementById("deltaMargin");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let entries = loadEntries();
let budgets = loadBudgets();
let currentMonth = "";
let compareMonth = "";

if (entries.length === 0) {
  entries = createSeed();
  saveEntries();
}

initializePeriod();
dateInput.value = todayIsoDate();
render();

entryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const entry = {
    id: createId(),
    date: dateInput.value,
    category: categoryInput.value,
    type: typeInput.value,
    amount: Number(amountInput.value),
  };

  if (!entry.date || !entry.category || !entry.type || !entry.amount) {
    setFeedback("Preencha todos os campos.", true);
    return;
  }

  entries.unshift(entry);
  saveEntries();
  render();
  entryForm.reset();
  dateInput.value = todayIsoDate();
  typeInput.value = "income";
  setFeedback("Lançamento salvo.");
});

entryBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  if (!id) return;
  entries = entries.filter((item) => item.id !== id);
  saveEntries();
  render();
});

seedBtn.addEventListener("click", () => {
  entries = createSeed();
  budgets = createSeedBudgets();
  saveEntries();
  saveBudgets();
  initializePeriod();
  render();
  setFeedback("Dados demo carregados.");
});

applyCompareBtn.addEventListener("click", () => {
  if (!currentMonthInput.value || !compareMonthInput.value) {
    setFeedback("Selecione os dois meses para comparar.", true);
    return;
  }
  currentMonth = currentMonthInput.value;
  compareMonth = compareMonthInput.value;
  render();
  setFeedback("Comparação aplicada.");
});

saveBudgetBtn.addEventListener("click", () => {
  const category = budgetCategoryInput.value;
  const limit = Number(budgetLimitInput.value);
  if (!category || !limit) {
    setFeedback("Informe categoria e limite para orçamento.", true);
    return;
  }
  budgets[category] = limit;
  saveBudgets();
  renderBudgetAlerts(getEntriesByMonth(currentMonth));
  setFeedback(`Limite de ${category} salvo.`);
});

exportCsvBtn.addEventListener("click", () => {
  downloadFile(buildCsv(entries), `finops-${todayIsoDate()}.csv`, "text/csv;charset=utf-8;");
  setFeedback("Arquivo CSV exportado.");
});

exportXlsxBtn.addEventListener("click", () => {
  const worksheet = buildSpreadsheetXml(entries);
  downloadFile(
    worksheet,
    `finops-${todayIsoDate()}.xlsx`,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  setFeedback("Arquivo XLSX exportado.");
});

function render() {
  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  entryBody.innerHTML = sortedEntries
    .map((entry) => {
      const typeLabel = entry.type === "income" ? "Receita" : "Despesa";
      return `
        <tr>
          <td>${formatDate(entry.date)}</td>
          <td>${entry.category}</td>
          <td><span class="type ${entry.type}">${typeLabel}</span></td>
          <td>${currency.format(entry.amount)}</td>
          <td><button class="action" data-id="${entry.id}">Excluir</button></td>
        </tr>
      `;
    })
    .join("");

  emptyState.style.display = sortedEntries.length === 0 ? "block" : "none";

  const currentEntries = getEntriesByMonth(currentMonth);
  const compareEntries = getEntriesByMonth(compareMonth);

  updateKpi(currentEntries, compareEntries);
  drawChart(currentEntries);
  renderBudgetAlerts(currentEntries);
}

function updateKpi(currentEntries, compareEntries) {
  const currentTotals = summarize(currentEntries);
  const compareTotals = summarize(compareEntries);

  kpiIncome.textContent = currency.format(currentTotals.income);
  kpiExpense.textContent = currency.format(currentTotals.expense);
  kpiBalance.textContent = currency.format(currentTotals.balance);
  kpiMargin.textContent = `${currentTotals.margin}%`;

  deltaIncome.textContent = `Δ ${formatDelta(currentTotals.income, compareTotals.income)}`;
  deltaExpense.textContent = `Δ ${formatDelta(currentTotals.expense, compareTotals.expense)}`;
  deltaBalance.textContent = `Δ ${formatDelta(currentTotals.balance, compareTotals.balance)}`;
  deltaMargin.textContent = `Δ ${formatDelta(currentTotals.margin, compareTotals.margin)}`;
}

function drawChart(monthEntries) {
  const context = chart.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, chart.width, chart.height);

  const grouped = aggregateByCategory(monthEntries);
  const categories = Object.keys(grouped);
  if (categories.length === 0) {
    context.fillStyle = "#6f7f9f";
    context.font = "13px DM Sans";
    context.fillText("Sem dados no período selecionado.", 20, 34);
    return;
  }

  const maxValue = Math.max(...Object.values(grouped).map((value) => Math.max(value, 0)), 1);
  const barWidth = Math.floor((chart.width - 80) / categories.length);
  const baseY = 210;

  context.font = "12px DM Sans";
  context.fillStyle = "#6f7f9f";
  context.fillText(`Resultado líquido por categoria (${currentMonth || "mês atual"})`, 20, 24);

  categories.forEach((category, index) => {
    const value = grouped[category];
    const safeValue = value < 0 ? 0 : value;
    const barHeight = Math.round((safeValue / maxValue) * 140);
    const x = 40 + index * barWidth;
    const y = baseY - barHeight;

    context.fillStyle = value >= 0 ? "#2a6af3" : "#bf4c64";
    context.fillRect(x, y, Math.max(barWidth - 16, 18), barHeight);

    context.fillStyle = "#4d6088";
    context.fillText(category.slice(0, 12), x, 226);
    context.fillText(`R$${Math.round(value)}`, x, y - 6);
  });
}

function renderBudgetAlerts(monthEntries) {
  const spentByCategory = {};
  monthEntries.forEach((entry) => {
    if (entry.type !== "expense") return;
    if (!spentByCategory[entry.category]) spentByCategory[entry.category] = 0;
    spentByCategory[entry.category] += entry.amount;
  });

  const alerts = Object.entries(spentByCategory)
    .map(([category, spent]) => {
      const budget = Number(budgets[category] || 0);
      if (!budget || spent <= budget) return null;
      const overflow = spent - budget;
      const rate = Math.round((spent / budget) * 100);
      return { category, spent, budget, overflow, rate };
    })
    .filter(Boolean);

  budgetAlerts.innerHTML = alerts
    .map((alert) => {
      return `<li><strong>${alert.category}</strong> excedeu ${currency.format(alert.overflow)} (${alert.rate}% do limite de ${currency.format(alert.budget)}).</li>`;
    })
    .join("");

  emptyAlerts.style.display = alerts.length === 0 ? "block" : "none";
}

function summarize(list) {
  const income = list.filter((item) => item.type === "income").reduce((acc, item) => acc + item.amount, 0);
  const expense = list.filter((item) => item.type === "expense").reduce((acc, item) => acc + item.amount, 0);
  const balance = income - expense;
  const margin = income > 0 ? Math.round((balance / income) * 100) : 0;
  return { income, expense, balance, margin };
}

function getEntriesByMonth(month) {
  if (!month) return [];
  return entries.filter((item) => item.date.slice(0, 7) === month);
}

function aggregateByCategory(list) {
  const map = {};
  list.forEach((entry) => {
    if (!map[entry.category]) map[entry.category] = 0;
    map[entry.category] += entry.type === "income" ? entry.amount : -entry.amount;
  });
  return map;
}

function formatDelta(current, previous) {
  if (previous === 0 && current === 0) return "0%";
  if (previous === 0) return "+100%";
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const signal = delta > 0 ? "+" : "";
  return `${signal}${Math.round(delta)}%`;
}

function buildCsv(list) {
  const header = "data,categoria,tipo,valor";
  const rows = list.map((item) => `${item.date},${item.category},${item.type},${item.amount}`);
  return [header, ...rows].join("\n");
}

function buildSpreadsheetXml(list) {
  const rows = list
    .map((item) => `<Row><Cell><Data ss:Type="String">${item.date}</Data></Cell><Cell><Data ss:Type="String">${item.category}</Data></Cell><Cell><Data ss:Type="String">${item.type}</Data></Cell><Cell><Data ss:Type="Number">${item.amount}</Data></Cell></Row>`)
    .join("");

  return `<?xml version="1.0"?>
  <?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:x="urn:schemas-microsoft-com:office:excel"
    xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="FinOps">
      <Table>
        <Row>
          <Cell><Data ss:Type="String">Data</Data></Cell>
          <Cell><Data ss:Type="String">Categoria</Data></Cell>
          <Cell><Data ss:Type="String">Tipo</Data></Cell>
          <Cell><Data ss:Type="String">Valor</Data></Cell>
        </Row>
        ${rows}
      </Table>
    </Worksheet>
  </Workbook>`;
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function initializePeriod() {
  const now = new Date();
  const previous = new Date(now);
  previous.setMonth(previous.getMonth() - 1);

  currentMonth = monthIso(now);
  compareMonth = monthIso(previous);

  currentMonthInput.value = currentMonth;
  compareMonthInput.value = compareMonth;
}

function monthIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#b63b4e" : "#2e7343";
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(ENTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function loadBudgets() {
  try {
    const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (!raw) return createSeedBudgets();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createSeedBudgets();
    return parsed;
  } catch {
    return createSeedBudgets();
  }
}

function saveEntries() {
  localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries));
}

function saveBudgets() {
  localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
}

function createSeed() {
  return [
    { id: createId(), date: dateOffsetIso(-60), category: "Receita SaaS", type: "income", amount: 39500 },
    { id: createId(), date: dateOffsetIso(-58), category: "Infra", type: "expense", amount: 8300 },
    { id: createId(), date: dateOffsetIso(-50), category: "Marketing", type: "expense", amount: 6200 },
    { id: createId(), date: dateOffsetIso(-20), category: "Receita SaaS", type: "income", amount: 43800 },
    { id: createId(), date: dateOffsetIso(-18), category: "Vendas", type: "expense", amount: 5100 },
    { id: createId(), date: dateOffsetIso(-16), category: "Produto", type: "expense", amount: 6100 },
    { id: createId(), date: todayIsoDate(), category: "Receita SaaS", type: "income", amount: 45200 },
    { id: createId(), date: todayIsoDate(), category: "Infra", type: "expense", amount: 9200 },
    { id: createId(), date: todayIsoDate(), category: "Marketing", type: "expense", amount: 7300 },
  ];
}

function createSeedBudgets() {
  return {
    Infra: 8500,
    Marketing: 7000,
    Vendas: 5500,
    Produto: 6200,
  };
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function formatDate(value) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function dateOffsetIso(daysToAdd) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  return date.toISOString().slice(0, 10);
}
