const STORAGE_KEY = "portfolio.terapeuta.appointments.v1";

const appointmentForm = document.getElementById("appointmentForm");
const patientNameInput = document.getElementById("patientName");
const patientEmailInput = document.getElementById("patientEmail");
const serviceTypeInput = document.getElementById("serviceType");
const sessionModeInput = document.getElementById("sessionMode");
const sessionDateInput = document.getElementById("sessionDate");
const sessionHourInput = document.getElementById("sessionHour");
const appointmentFeedback = document.getElementById("appointmentFeedback");
const demoAppointmentsBtn = document.getElementById("demoAppointmentsBtn");

const appointmentsBody = document.getElementById("appointmentsBody");
const searchPatientInput = document.getElementById("searchPatient");
const emptyAppointments = document.getElementById("emptyAppointments");

const statScheduled = document.getElementById("statScheduled");
const statConfirmed = document.getElementById("statConfirmed");
const statOnline = document.getElementById("statOnline");
const statRate = document.getElementById("statRate");

const testimonialQuote = document.getElementById("testimonialQuote");
const testimonialAuthor = document.getElementById("testimonialAuthor");
const prevTestimonialBtn = document.getElementById("prevTestimonial");
const nextTestimonialBtn = document.getElementById("nextTestimonial");

const testimonials = [
  {
    quote: "Senti acolhimento desde a primeira sessão e consegui recuperar minha rotina com mais clareza.",
    author: "Paciente A, 32 anos",
  },
  {
    quote: "A terapia de casal trouxe diálogo real para nossa relação e melhorou decisões do dia a dia.",
    author: "Casal B",
  },
  {
    quote: "O atendimento online me ajudou a manter constância mesmo em semana de trabalho intensa.",
    author: "Paciente C, 27 anos",
  },
];

let activeTestimonial = 0;
let appointments = loadState();

if (appointments.length === 0) {
  appointments = createSeedAppointments();
  saveState();
}

sessionDateInput.value = todayIsoDate();
render();
renderTestimonial();

appointmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const appointment = {
    id: createId(),
    patientName: patientNameInput.value.trim(),
    patientEmail: patientEmailInput.value.trim().toLowerCase(),
    serviceType: serviceTypeInput.value,
    sessionMode: sessionModeInput.value,
    sessionDate: sessionDateInput.value,
    sessionHour: sessionHourInput.value,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  if (
    !appointment.patientName ||
    !appointment.patientEmail ||
    !appointment.serviceType ||
    !appointment.sessionMode ||
    !appointment.sessionDate ||
    !appointment.sessionHour
  ) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  const hasConflict = appointments.some(
    (item) => item.sessionDate === appointment.sessionDate && item.sessionHour === appointment.sessionHour && item.status !== "canceled"
  );

  if (hasConflict) {
    setFeedback("Esse horário já está ocupado. Escolha outro horário.", true);
    return;
  }

  appointments.push(appointment);
  sortAppointments();
  saveState();
  render();
  appointmentForm.reset();
  sessionDateInput.value = todayIsoDate();
  setFeedback("Consulta agendada com sucesso.");
});

appointmentsBody.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) return;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  const selected = appointments.find((item) => item.id === id);
  if (!selected) return;

  if (action === "confirm") {
    selected.status = "confirmed";
    saveState();
    render();
    setFeedback(`Consulta de ${selected.patientName} confirmada.`);
  }

  if (action === "cancel") {
    selected.status = "canceled";
    saveState();
    render();
    setFeedback(`Consulta de ${selected.patientName} cancelada.`);
  }
});

searchPatientInput.addEventListener("input", render);

demoAppointmentsBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Substituir agenda atual pelos dados de demonstração?");
  if (!confirmed) return;
  appointments = createSeedAppointments();
  saveState();
  render();
  setFeedback("Agenda demo carregada.");
});

prevTestimonialBtn.addEventListener("click", () => {
  activeTestimonial = (activeTestimonial - 1 + testimonials.length) % testimonials.length;
  renderTestimonial();
});

nextTestimonialBtn.addEventListener("click", () => {
  activeTestimonial = (activeTestimonial + 1) % testimonials.length;
  renderTestimonial();
});

function render() {
  const visibleAppointments = getFilteredAppointments();

  appointmentsBody.innerHTML = visibleAppointments
    .map((item) => {
      const statusLabel = getStatusLabel(item.status);
      const isConfirmed = item.status === "confirmed";
      const isCanceled = item.status === "canceled";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.patientName)}</strong><br />
            <small>${escapeHtml(item.patientEmail)}</small>
          </td>
          <td>${item.serviceType}</td>
          <td>${formatDate(item.sessionDate)}</td>
          <td>${item.sessionHour}</td>
          <td>${item.sessionMode}</td>
          <td><span class="status-chip ${item.status}">${statusLabel}</span></td>
          <td>
            <button type="button" class="table-action confirm" data-action="confirm" data-id="${item.id}" ${isConfirmed || isCanceled ? "disabled" : ""}>Confirmar</button>
            <button type="button" class="table-action cancel" data-action="cancel" data-id="${item.id}" ${isCanceled ? "disabled" : ""}>Cancelar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyAppointments.style.display = visibleAppointments.length === 0 ? "block" : "none";
  updateStats();
}

function renderTestimonial() {
  const item = testimonials[activeTestimonial];
  testimonialQuote.textContent = `"${item.quote}"`;
  testimonialAuthor.textContent = item.author;
}

function updateStats() {
  const total = appointments.length;
  const confirmed = appointments.filter((item) => item.status === "confirmed").length;
  const online = appointments.filter((item) => item.sessionMode === "Online" && item.status !== "canceled").length;
  const rate = total ? Math.round((confirmed / total) * 100) : 0;

  statScheduled.textContent = String(total);
  statConfirmed.textContent = String(confirmed);
  statOnline.textContent = String(online);
  statRate.textContent = `${rate}%`;
}

function getFilteredAppointments() {
  const query = searchPatientInput.value.trim().toLowerCase();
  if (!query) return appointments;
  return appointments.filter((item) => item.patientName.toLowerCase().includes(query));
}

function sortAppointments() {
  appointments.sort((a, b) => {
    const first = `${a.sessionDate} ${a.sessionHour}`;
    const second = `${b.sessionDate} ${b.sessionHour}`;
    return first.localeCompare(second);
  });
}

function setFeedback(message, isError = false) {
  appointmentFeedback.textContent = message;
  appointmentFeedback.style.color = isError ? "#b23949" : "#2d684e";
}

function getStatusLabel(status) {
  if (status === "confirmed") return "Confirmada";
  if (status === "canceled") return "Cancelada";
  return "Pendente";
}

function createSeedAppointments() {
  return [
    {
      id: createId(),
      patientName: "Ana Gomes",
      patientEmail: "ana.gomes@email.com",
      serviceType: "Terapia Individual",
      sessionMode: "Online",
      sessionDate: todayIsoDate(),
      sessionHour: "14:00",
      status: "confirmed",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      patientName: "Bruno e Luiza",
      patientEmail: "casal@email.com",
      serviceType: "Terapia de Casal",
      sessionMode: "Presencial",
      sessionDate: nextIsoDate(1),
      sessionHour: "19:00",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      patientName: "Carla Souza",
      patientEmail: "carla@email.com",
      serviceType: "Plantao Emocional",
      sessionMode: "Online",
      sessionDate: nextIsoDate(2),
      sessionHour: "10:00",
      status: "pending",
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
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

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
