const STORAGE_KEY = "portfolio.project.finopsPython";

const entryForm = document.getElementById("entryForm");
const dateInput = document.getElementById("dateInput");
const categoryInput = document.getElementById("categoryInput");
const typeInput = document.getElementById("typeInput");
const amountInput = document.getElementById("amountInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const entryBody = document.getElementById("entryBody");
const emptyState = document.getElementById("emptyState");
const chart = document.getElementById("chart");
const kpiIncome = document.getElementById("kpiIncome");
const kpiExpense = document.getElementById("kpiExpense");
const kpiBalance = document.getElementById("kpiBalance");
const kpiMargin = document.getElementById("kpiMargin");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let entries = loadEntries();
if (entries.length === 0) {
  entries = createSeed();
  saveEntries();
}

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
  setFeedback("Lancamento salvo.");
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
  saveEntries();
  render();
  setFeedback("Dados demo carregados.");
});

function render() {
  entryBody.innerHTML = entries
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

  emptyState.style.display = entries.length === 0 ? "block" : "none";
  updateKpi();
  drawChart();
}

function updateKpi() {
  const income = entries.filter((item) => item.type === "income").reduce((acc, item) => acc + item.amount, 0);
  const expense = entries.filter((item) => item.type === "expense").reduce((acc, item) => acc + item.amount, 0);
  const balance = income - expense;
  const margin = income > 0 ? Math.round((balance / income) * 100) : 0;

  kpiIncome.textContent = currency.format(income);
  kpiExpense.textContent = currency.format(expense);
  kpiBalance.textContent = currency.format(balance);
  kpiMargin.textContent = `${margin}%`;
}

function drawChart() {
  const context = chart.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, chart.width, chart.height);

  const grouped = aggregateByCategory();
  const categories = Object.keys(grouped);
  if (categories.length === 0) return;

  const maxValue = Math.max(...Object.values(grouped), 1);
  const barWidth = Math.floor((chart.width - 80) / categories.length);
  const baseY = 210;

  context.font = "12px DM Sans";
  context.fillStyle = "#6f7f9f";
  context.fillText("Receita liquida por categoria", 20, 24);

  categories.forEach((category, index) => {
    const value = grouped[category];
    const safeValue = value < 0 ? 0 : value;
    const barHeight = Math.round((safeValue / maxValue) * 140);
    const x = 40 + index * barWidth;
    const y = baseY - barHeight;

    context.fillStyle = "#2a6af3";
    context.fillRect(x, y, Math.max(barWidth - 16, 18), barHeight);

    context.fillStyle = "#4d6088";
    context.fillText(category.slice(0, 12), x, 226);
    context.fillText(`R$${Math.round(value)}`, x, y - 6);
  });
}

function aggregateByCategory() {
  const map = {};
  entries.forEach((entry) => {
    if (!map[entry.category]) map[entry.category] = 0;
    map[entry.category] += entry.type === "income" ? entry.amount : -entry.amount;
  });
  return map;
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#b63b4e" : "#2e7343";
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function createSeed() {
  return [
    { id: createId(), date: todayIsoDate(), category: "Receita SaaS", type: "income", amount: 42000 },
    { id: createId(), date: todayIsoDate(), category: "Infra", type: "expense", amount: 8900 },
    { id: createId(), date: todayIsoDate(), category: "Marketing", type: "expense", amount: 6100 },
    { id: createId(), date: todayIsoDate(), category: "Vendas", type: "expense", amount: 4700 },
    { id: createId(), date: todayIsoDate(), category: "Produto", type: "expense", amount: 5200 },
  ];
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
