const STORAGE_KEY = "portfolio.project.commerceJava";
const STATUS_FLOW = ["new", "shipping", "delivered"];

const orderForm = document.getElementById("orderForm");
const customerInput = document.getElementById("customerInput");
const channelInput = document.getElementById("channelInput");
const valueInput = document.getElementById("valueInput");
const deadlineInput = document.getElementById("deadlineInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const orderBody = document.getElementById("orderBody");
const emptyState = document.getElementById("emptyState");
const kpiActive = document.getElementById("kpiActive");
const kpiShipping = document.getElementById("kpiShipping");
const kpiDelivered = document.getElementById("kpiDelivered");
const kpiAverage = document.getElementById("kpiAverage");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let orders = loadOrders();
if (orders.length === 0) {
  orders = createSeed();
  saveOrders();
}

render();

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const order = {
    id: createId(),
    customer: customerInput.value.trim(),
    channel: channelInput.value,
    value: Number(valueInput.value),
    deadlineDays: Number(deadlineInput.value),
    status: "new",
  };

  if (!order.customer || !order.channel || !order.value || !order.deadlineDays) {
    setFeedback("Preencha todos os campos.", true);
    return;
  }

  orders.unshift(order);
  saveOrders();
  render();
  orderForm.reset();
  setFeedback("Pedido cadastrado.");
});

orderBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const id = target.dataset.id;
  const action = target.dataset.action;
  if (!id || !action) return;

  const selected = orders.find((item) => item.id === id);
  if (!selected) return;

  if (action === "next") {
    const current = STATUS_FLOW.indexOf(selected.status);
    selected.status = STATUS_FLOW[Math.min(current + 1, STATUS_FLOW.length - 1)];
  }

  if (action === "delete") {
    orders = orders.filter((item) => item.id !== id);
  }

  saveOrders();
  render();
});

seedBtn.addEventListener("click", () => {
  orders = createSeed();
  saveOrders();
  render();
  setFeedback("Dados demo carregados.");
});

function render() {
  orderBody.innerHTML = orders
    .map((order) => {
      const disableNext = order.status === "delivered" ? "disabled" : "";
      return `
        <tr>
          <td>${escapeHtml(order.customer)}</td>
          <td>${order.channel}</td>
          <td><span class="status ${order.status}">${statusLabel(order.status)}</span></td>
          <td>${currency.format(order.value)}</td>
          <td>${order.deadlineDays} dias</td>
          <td>
            <button class="action next" data-action="next" data-id="${order.id}" ${disableNext}>Avancar</button>
            <button class="action delete" data-action="delete" data-id="${order.id}">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyState.style.display = orders.length === 0 ? "block" : "none";
  updateKpi();
}

function updateKpi() {
  const active = orders.filter((item) => item.status !== "delivered").length;
  const shipping = orders.filter((item) => item.status === "shipping").length;
  const delivered = orders.filter((item) => item.status === "delivered").length;
  const average = orders.length ? orders.reduce((acc, item) => acc + item.value, 0) / orders.length : 0;

  kpiActive.textContent = String(active);
  kpiShipping.textContent = String(shipping);
  kpiDelivered.textContent = String(delivered);
  kpiAverage.textContent = currency.format(average);
}

function statusLabel(status) {
  if (status === "shipping") return "Expedicao";
  if (status === "delivered") return "Entregue";
  return "Novo";
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#ffadb6" : "#ffe8c1";
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function createSeed() {
  return [
    { id: createId(), customer: "Mercado Sul", channel: "Marketplace", value: 1490, deadlineDays: 3, status: "new" },
    { id: createId(), customer: "Loja Cobalto", channel: "E-commerce", value: 2390, deadlineDays: 2, status: "shipping" },
    { id: createId(), customer: "Casa Prime", channel: "Loja fisica", value: 980, deadlineDays: 1, status: "delivered" },
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
