const ORDER_STORAGE_KEY = "portfolio.project.commerceJava.orders.v2";
const AUDIT_STORAGE_KEY = "portfolio.project.commerceJava.audit.v2";

const NEXT_STATUS = {
  new: "picking",
  picking: "packing",
  packing: "shipping",
  shipping: "delivered",
};

const orderForm = document.getElementById("orderForm");
const customerInput = document.getElementById("customerInput");
const channelInput = document.getElementById("channelInput");
const valueInput = document.getElementById("valueInput");
const skuInput = document.getElementById("skuInput");
const qtyInput = document.getElementById("qtyInput");
const deadlineInput = document.getElementById("deadlineInput");
const feedback = document.getElementById("feedback");
const seedBtn = document.getElementById("seedBtn");

const orderBody = document.getElementById("orderBody");
const emptyState = document.getElementById("emptyState");
const auditList = document.getElementById("auditList");
const emptyAudit = document.getElementById("emptyAudit");
const kpiActive = document.getElementById("kpiActive");
const kpiShipping = document.getElementById("kpiShipping");
const kpiDelivered = document.getElementById("kpiDelivered");
const kpiAverage = document.getElementById("kpiAverage");

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let orders = loadOrders();
let audit = loadAudit();
if (orders.length === 0) {
  orders = createSeed();
  audit = createSeedAudit(orders);
  saveOrders();
  saveAudit();
}

render();

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const order = {
    id: createId(),
    customer: customerInput.value.trim(),
    channel: channelInput.value,
    value: Number(valueInput.value),
    sku: skuInput.value.trim().toUpperCase(),
    quantity: Number(qtyInput.value),
    deadlineDays: Number(deadlineInput.value),
    status: "new",
    stockReserved: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!order.customer || !order.channel || !order.value || !order.sku || !order.quantity || !order.deadlineDays) {
    setFeedback("Preencha todos os campos.", true);
    return;
  }

  orders.unshift(order);
  registerAudit(order.id, `Pedido ${order.customer} criado no status NEW.`);
  saveOrders();
  saveAudit();
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

  if (action === "reserve") {
    if (selected.status === "canceled" || selected.status === "delivered") return;
    if (selected.stockReserved) {
      setFeedback("Estoque já reservado para este pedido.", true);
      return;
    }
    selected.stockReserved = true;
    selected.updatedAt = new Date().toISOString();
    registerAudit(selected.id, `Estoque reservado para ${selected.sku} (qtd ${selected.quantity}).`);
    saveOrders();
    saveAudit();
    render();
    setFeedback(`Estoque reservado para ${selected.customer}.`);
    return;
  }

  if (action === "next") {
    const nextStatus = NEXT_STATUS[selected.status];
    if (!nextStatus) return;
    if (selected.status === "new" && !selected.stockReserved) {
      setFeedback("Reserve estoque antes de iniciar a separação.", true);
      return;
    }
    const fromStatus = selected.status;
    selected.status = nextStatus;
    selected.updatedAt = new Date().toISOString();
    registerAudit(selected.id, `Transição ${fromStatus.toUpperCase()} -> ${nextStatus.toUpperCase()}.`);
    saveOrders();
    saveAudit();
    render();
    setFeedback(`Pedido movido para ${statusLabel(nextStatus)}.`);
    return;
  }

  if (action === "cancel") {
    if (selected.status === "delivered") {
      setFeedback("Pedido entregue não pode ser cancelado.", true);
      return;
    }
    selected.status = "canceled";
    selected.updatedAt = new Date().toISOString();
    registerAudit(selected.id, "Pedido cancelado.");
    saveOrders();
    saveAudit();
    render();
    setFeedback(`Pedido de ${selected.customer} cancelado.`);
    return;
  }
});

seedBtn.addEventListener("click", () => {
  orders = createSeed();
  audit = createSeedAudit(orders);
  saveOrders();
  saveAudit();
  render();
  setFeedback("Dados demo carregados.");
});

function render() {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  orderBody.innerHTML = sortedOrders
    .map((order) => {
      const canNext = Boolean(NEXT_STATUS[order.status]);
      const canReserve = order.status !== "delivered" && order.status !== "canceled";
      const canCancel = order.status !== "delivered" && order.status !== "canceled";
      return `
        <tr>
          <td>${escapeHtml(order.customer)}<br /><small>${order.sku} • ${order.quantity} un.</small></td>
          <td>${order.channel}</td>
          <td><span class="status ${order.status}">${statusLabel(order.status)}</span></td>
          <td>${currency.format(order.value)}</td>
          <td>${order.stockReserved ? "Reservado" : "Pendente"}</td>
          <td>${order.deadlineDays} dias</td>
          <td>
            <button class="action reserve" data-action="reserve" data-id="${order.id}" ${canReserve ? "" : "disabled"}>Reservar estoque</button>
            <button class="action next" data-action="next" data-id="${order.id}" ${canNext ? "" : "disabled"}>Avançar</button>
            <button class="action cancel" data-action="cancel" data-id="${order.id}" ${canCancel ? "" : "disabled"}>Cancelar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyState.style.display = sortedOrders.length === 0 ? "block" : "none";
  renderAudit();
  updateKpi();
}

function renderAudit() {
  const sortedAudit = [...audit].sort((a, b) => new Date(b.at) - new Date(a.at));
  auditList.innerHTML = sortedAudit
    .slice(0, 30)
    .map((item) => `<li>${formatDateTime(item.at)} · ${escapeHtml(item.message)}</li>`)
    .join("");

  emptyAudit.style.display = sortedAudit.length === 0 ? "block" : "none";
}

function updateKpi() {
  const active = orders.filter((item) => !["delivered", "canceled"].includes(item.status)).length;
  const shipping = orders.filter((item) => ["picking", "packing", "shipping"].includes(item.status)).length;
  const delivered = orders.filter((item) => item.status === "delivered").length;
  const average = orders.length ? orders.reduce((acc, item) => acc + item.value, 0) / orders.length : 0;

  kpiActive.textContent = String(active);
  kpiShipping.textContent = String(shipping);
  kpiDelivered.textContent = String(delivered);
  kpiAverage.textContent = currency.format(average);
}

function registerAudit(orderId, message) {
  audit.push({
    id: createId(),
    orderId,
    message,
    at: new Date().toISOString(),
  });
}

function statusLabel(status) {
  if (status === "picking") return "Separação";
  if (status === "packing") return "Embalagem";
  if (status === "shipping") return "Expedição";
  if (status === "delivered") return "Entregue";
  if (status === "canceled") return "Cancelado";
  return "Novo";
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? "#ffadb6" : "#ffe8c1";
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function loadAudit() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string");
  } catch {
    return [];
  }
}

function saveOrders() {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function saveAudit() {
  localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(audit));
}

function createSeed() {
  return [
    {
      id: createId(),
      customer: "Mercado Sul",
      channel: "Marketplace",
      value: 1490,
      sku: "SKU-1029",
      quantity: 4,
      deadlineDays: 3,
      status: "new",
      stockReserved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      customer: "Loja Cobalto",
      channel: "E-commerce",
      value: 2390,
      sku: "SKU-2299",
      quantity: 8,
      deadlineDays: 2,
      status: "shipping",
      stockReserved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: createId(),
      customer: "Casa Prime",
      channel: "Loja fisica",
      value: 980,
      sku: "SKU-1180",
      quantity: 2,
      deadlineDays: 1,
      status: "delivered",
      stockReserved: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

function createSeedAudit(seedOrders) {
  return seedOrders.map((order) => ({
    id: createId(),
    orderId: order.id,
    message: `Carga inicial no status ${order.status.toUpperCase()}.`,
    at: new Date().toISOString(),
  }));
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("pt-BR");
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
