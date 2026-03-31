const STORAGE_KEY = "portfolio.quadra.reservas.v1";

const reservationForm = document.getElementById("reservationForm");
const customerNameInput = document.getElementById("customerName");
const customerPhoneInput = document.getElementById("customerPhone");
const reservationDateInput = document.getElementById("reservationDate");
const reservationHourInput = document.getElementById("reservationHour");
const courtTypeInput = document.getElementById("courtType");
const durationInput = document.getElementById("duration");
const reservationAmountInput = document.getElementById("reservationAmount");
const paymentStatusInput = document.getElementById("paymentStatus");
const clearAllBtn = document.getElementById("clearAllBtn");
const seedBtn = document.getElementById("seedBtn");

const reservationsBody = document.getElementById("reservationsBody");
const filterDateInput = document.getElementById("filterDate");
const filterPaymentInput = document.getElementById("filterPayment");
const searchCustomerInput = document.getElementById("searchCustomer");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

const statTotal = document.getElementById("statTotal");
const statToday = document.getElementById("statToday");
const statRevenue = document.getElementById("statRevenue");
const statPending = document.getElementById("statPending");
const emptyState = document.getElementById("emptyState");
const formFeedback = document.getElementById("formFeedback");

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

let reservations = loadState();

if (reservations.length === 0) {
  reservations = createSeedData();
  saveState();
}

reservationDateInput.value = todayIsoDate();
filterDateInput.value = "";

render();

reservationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const reservation = {
    id: createId(),
    customerName: customerNameInput.value.trim(),
    customerPhone: customerPhoneInput.value.trim(),
    date: reservationDateInput.value,
    hour: reservationHourInput.value,
    courtType: courtTypeInput.value,
    duration: Number(durationInput.value),
    amount: Number(reservationAmountInput.value),
    paymentStatus: paymentStatusInput.value,
    createdAt: new Date().toISOString(),
  };

  if (!reservation.customerName || !reservation.date || !reservation.hour || !reservation.courtType || !reservation.amount) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  const hasConflict = reservations.some(
    (item) =>
      item.date === reservation.date &&
      item.hour === reservation.hour &&
      item.courtType === reservation.courtType
  );

  if (hasConflict) {
    setFeedback("Já existe uma reserva nesse horário para essa quadra.", true);
    return;
  }

  reservations.push(reservation);
  sortReservations();
  saveState();
  render();
  reservationForm.reset();
  reservationDateInput.value = todayIsoDate();
  paymentStatusInput.value = "pending";
  setFeedback("Reserva salva com sucesso.");
});

reservationsBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const reservationId = target.dataset.id;
  const action = target.dataset.action;
  if (!reservationId || !action) return;

  const selected = reservations.find((item) => item.id === reservationId);
  if (!selected) return;

  if (action === "togglePayment") {
    selected.paymentStatus = selected.paymentStatus === "paid" ? "pending" : "paid";
    saveState();
    render();
    setFeedback(`Pagamento de ${selected.customerName} atualizado.`);
  }

  if (action === "delete") {
    const shouldDelete = window.confirm("Deseja remover esta reserva?");
    if (!shouldDelete) return;
    reservations = reservations.filter((item) => item.id !== reservationId);
    saveState();
    render();
    setFeedback("Reserva removida.");
  }
});

clearAllBtn.addEventListener("click", () => {
  if (reservations.length === 0) return;
  const confirmed = window.confirm("Deseja apagar todas as reservas salvas?");
  if (!confirmed) return;
  reservations = [];
  saveState();
  render();
  setFeedback("Todas as reservas foram removidas.");
});

seedBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Substituir os dados atuais pelos dados de demonstração?");
  if (!confirmed) return;
  reservations = createSeedData();
  saveState();
  render();
  setFeedback("Dados demo carregados.");
});

filterDateInput.addEventListener("input", render);
filterPaymentInput.addEventListener("change", render);
searchCustomerInput.addEventListener("input", render);

clearFiltersBtn.addEventListener("click", () => {
  filterDateInput.value = "";
  filterPaymentInput.value = "all";
  searchCustomerInput.value = "";
  render();
});

function render() {
  const rows = getFilteredReservations();

  reservationsBody.innerHTML = rows
    .map((item) => {
      const paymentClass = item.paymentStatus === "paid" ? "paid" : "pending";
      const paymentLabel = item.paymentStatus === "paid" ? "Pago" : "Pendente";
      const toggleLabel = item.paymentStatus === "paid" ? "Marcar pendente" : "Marcar pago";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.customerName)}</strong><br />
            <small>${escapeHtml(item.customerPhone)}</small>
          </td>
          <td>${formatDate(item.date)}</td>
          <td>${item.hour}</td>
          <td>${item.courtType}</td>
          <td>${item.duration} min</td>
          <td>${currencyFormatter.format(item.amount)}</td>
          <td><span class="status-chip ${paymentClass}">${paymentLabel}</span></td>
          <td>
            <button class="table-action pay" data-action="togglePayment" data-id="${item.id}" type="button">${toggleLabel}</button>
            <button class="table-action delete" data-action="delete" data-id="${item.id}" type="button">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyState.style.display = rows.length === 0 ? "block" : "none";
  updateStats();
}

function updateStats() {
  const today = todayIsoDate();
  const total = reservations.length;
  const todayTotal = reservations.filter((item) => item.date === today).length;
  const forecastRevenue = reservations.reduce((sum, item) => sum + item.amount, 0);
  const pendingRevenue = reservations
    .filter((item) => item.paymentStatus === "pending")
    .reduce((sum, item) => sum + item.amount, 0);

  statTotal.textContent = String(total);
  statToday.textContent = String(todayTotal);
  statRevenue.textContent = currencyFormatter.format(forecastRevenue);
  statPending.textContent = currencyFormatter.format(pendingRevenue);
}

function getFilteredReservations() {
  const filterDate = filterDateInput.value;
  const filterPayment = filterPaymentInput.value;
  const query = searchCustomerInput.value.trim().toLowerCase();

  return reservations.filter((item) => {
    const matchesDate = !filterDate || item.date === filterDate;
    const matchesPayment = filterPayment === "all" || item.paymentStatus === filterPayment;
    const matchesName = !query || item.customerName.toLowerCase().includes(query);
    return matchesDate && matchesPayment && matchesName;
  });
}

function sortReservations() {
  reservations.sort((a, b) => {
    const first = `${a.date} ${a.hour}`;
    const second = `${b.date} ${b.hour}`;
    return first.localeCompare(second);
  });
}

function setFeedback(message, isError = false) {
  formFeedback.textContent = message;
  formFeedback.style.color = isError ? "#ff9fab" : "#9deecf";
}

function createSeedData() {
  const today = todayIsoDate();
  const tomorrow = nextIsoDate(1);
  const inTwoDays = nextIsoDate(2);

  return [
    {
      id: createId(),
      customerName: "Joao Pereira",
      customerPhone: "(51) 99432-1024",
      date: today,
      hour: "19:00",
      courtType: "Society",
      duration: 60,
      amount: 320,
      paymentStatus: "paid",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      customerName: "Luan Silveira",
      customerPhone: "(51) 99620-8743",
      date: tomorrow,
      hour: "20:00",
      courtType: "Fut7",
      duration: 90,
      amount: 420,
      paymentStatus: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      customerName: "Equipe Nova Era",
      customerPhone: "(51) 99877-2201",
      date: inTwoDays,
      hour: "18:00",
      courtType: "Futsal",
      duration: 60,
      amount: 280,
      paymentStatus: "pending",
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservations));
}

function formatDate(value) {
  if (!value) return "-";
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

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
