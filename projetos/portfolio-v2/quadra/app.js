const STORAGE_KEY = "portfolio.quadra.reservas.v2";

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
const weekBaseDateInput = document.getElementById("weekBaseDate");

const statTotal = document.getElementById("statTotal");
const statToday = document.getElementById("statToday");
const statRevenue = document.getElementById("statRevenue");
const statPending = document.getElementById("statPending");
const emptyState = document.getElementById("emptyState");
const formFeedback = document.getElementById("formFeedback");
const weeklyBoard = document.getElementById("weeklyBoard");
const paymentPreview = document.getElementById("paymentPreview");

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
weekBaseDateInput.value = todayIsoDate();

render();

reservationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const startMinute = hourToMinutes(reservationHourInput.value);
  const duration = Number(durationInput.value);
  const endMinute = startMinute + duration;

  const reservation = {
    id: createId(),
    customerName: customerNameInput.value.trim(),
    customerPhone: customerPhoneInput.value.trim(),
    date: reservationDateInput.value,
    hour: reservationHourInput.value,
    startMinute,
    endMinute,
    courtType: courtTypeInput.value,
    duration,
    amount: Number(reservationAmountInput.value),
    paymentStatus: paymentStatusInput.value,
    createdAt: new Date().toISOString(),
  };

  if (!reservation.customerName || !reservation.date || !reservation.hour || !reservation.courtType || !reservation.amount) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  const hasConflict = reservations.some((item) => {
    const sameDateCourt = item.date === reservation.date && item.courtType === reservation.courtType;
    if (!sameDateCourt) return false;
    return reservation.startMinute < item.endMinute && item.startMinute < reservation.endMinute;
  });

  if (hasConflict) {
    setFeedback("Conflito detectado: já existe reserva sobreposta para essa quadra.", true);
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

reservationsBody.addEventListener("click", async (event) => {
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

  if (action === "whatsapp") {
    const message = `Olá ${selected.customerName}, sua reserva está confirmada para ${formatDate(selected.date)} às ${selected.hour} na ${selected.courtType}. Valor: ${currencyFormatter.format(selected.amount)}.`;
    const digits = selected.customerPhone.replace(/\D/g, "");
    const url = `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
    paymentPreview.innerHTML = `<p><strong>WhatsApp preparado:</strong></p><p>${escapeHtml(message)}</p><a class="payment-link" href="${url}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>`;
  }

  if (action === "pix") {
    const pixPayload = `PIX|CHAVE:showdebola@pix.com|VALOR:${selected.amount.toFixed(2)}|ID:${selected.id.slice(0, 8)}`;
    try {
      await navigator.clipboard.writeText(pixPayload);
      paymentPreview.innerHTML = `<p><strong>Cobrança Pix gerada:</strong></p><code>${escapeHtml(pixPayload)}</code><p>Payload copiado para a área de transferência.</p>`;
    } catch {
      paymentPreview.innerHTML = `<p><strong>Cobrança Pix gerada:</strong></p><code>${escapeHtml(pixPayload)}</code><p>Copie manualmente o código acima.</p>`;
    }
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
weekBaseDateInput.addEventListener("change", renderWeeklyCalendar);

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
          <td>${item.hour} - ${minutesToHour(item.endMinute)}</td>
          <td>${item.courtType}</td>
          <td>${currencyFormatter.format(item.amount)}</td>
          <td><span class="status-chip ${paymentClass}">${paymentLabel}</span></td>
          <td>
            <button class="table-action pay" data-action="togglePayment" data-id="${item.id}" type="button">${toggleLabel}</button>
            <button class="table-action whatsapp" data-action="whatsapp" data-id="${item.id}" type="button">WhatsApp</button>
            <button class="table-action pix" data-action="pix" data-id="${item.id}" type="button">Pix</button>
            <button class="table-action delete" data-action="delete" data-id="${item.id}" type="button">Excluir</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyState.style.display = rows.length === 0 ? "block" : "none";
  updateStats();
  renderWeeklyCalendar();
}

function renderWeeklyCalendar() {
  const baseDate = weekBaseDateInput.value ? new Date(weekBaseDateInput.value + "T00:00:00") : new Date();
  const weekStart = startOfWeek(baseDate);

  const dayColumns = [];
  for (let i = 0; i < 7; i += 1) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const iso = toIsoDate(dayDate);
    const dayReservations = reservations
      .filter((item) => item.date === iso)
      .sort((a, b) => a.startMinute - b.startMinute);

    const slots = dayReservations.length
      ? dayReservations
          .map(
            (item) => `
          <div class="slot-card ${item.paymentStatus}">
            <strong>${item.hour} - ${minutesToHour(item.endMinute)}</strong>
            <p>${escapeHtml(item.customerName)}</p>
            <small>${item.courtType}</small>
          </div>`
          )
          .join("")
      : '<p class="slot-empty">Sem reservas</p>';

    dayColumns.push(`
      <article class="day-col">
        <h4>${dayDate.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}</h4>
        ${slots}
      </article>
    `);
  }

  weeklyBoard.innerHTML = dayColumns.join("");
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
    const first = `${a.date} ${String(a.startMinute).padStart(4, "0")}`;
    const second = `${b.date} ${String(b.startMinute).padStart(4, "0")}`;
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
      startMinute: 19 * 60,
      endMinute: 20 * 60,
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
      startMinute: 20 * 60,
      endMinute: 21 * 60 + 30,
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
      startMinute: 18 * 60,
      endMinute: 19 * 60,
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
    return parsed.filter((item) => item && typeof item.id === "string").map((item) => normalizeReservation(item));
  } catch {
    return [];
  }
}

function normalizeReservation(item) {
  const startMinute = typeof item.startMinute === "number" ? item.startMinute : hourToMinutes(item.hour || "00:00");
  const duration = Number(item.duration || 60);
  return {
    ...item,
    startMinute,
    duration,
    endMinute: typeof item.endMinute === "number" ? item.endMinute : startMinute + duration,
  };
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

function startOfWeek(date) {
  const day = new Date(date);
  const weekDay = day.getDay();
  const diff = weekDay === 0 ? -6 : 1 - weekDay;
  day.setDate(day.getDate() + diff);
  return day;
}

function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hourToMinutes(hour) {
  const [h, m] = hour.split(":").map(Number);
  return h * 60 + m;
}

function minutesToHour(minutes) {
  const safe = Math.max(0, minutes);
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
