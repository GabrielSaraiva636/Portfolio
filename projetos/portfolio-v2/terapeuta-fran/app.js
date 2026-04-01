const STORAGE_KEY = "portfolio.terapeuta.appointments.v2";
const REMINDER_KEY = "portfolio.terapeuta.reminders.v1";
const CLINIC_WHATSAPP = "5551999999999";
const SERVICE_DURATION = {
  "Terapia Individual": 50,
  "Terapia de Casal": 80,
  "Plantao Emocional": 30,
};

const appointmentForm = document.getElementById("appointmentForm");
const patientNameInput = document.getElementById("patientName");
const patientEmailInput = document.getElementById("patientEmail");
const serviceTypeInput = document.getElementById("serviceType");
const serviceDurationInput = document.getElementById("serviceDuration");
const sessionModeInput = document.getElementById("sessionMode");
const sessionDateInput = document.getElementById("sessionDate");
const sessionHourInput = document.getElementById("sessionHour");
const retentionPolicyInput = document.getElementById("retentionPolicy");
const consentLgpdInput = document.getElementById("consentLgpd");
const appointmentFeedback = document.getElementById("appointmentFeedback");
const demoAppointmentsBtn = document.getElementById("demoAppointmentsBtn");

const appointmentsBody = document.getElementById("appointmentsBody");
const searchPatientInput = document.getElementById("searchPatient");
const emptyAppointments = document.getElementById("emptyAppointments");

const reminderLogList = document.getElementById("reminderLog");
const emptyReminderLog = document.getElementById("emptyReminderLog");

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
let reminders = loadReminders();

if (appointments.length === 0) {
  appointments = createSeedAppointments();
  saveState();
}

applyRetentionPolicy();
sessionDateInput.value = todayIsoDate();
updateServiceDuration();
render();
renderTestimonial();

serviceTypeInput.addEventListener("change", updateServiceDuration);

appointmentForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!consentLgpdInput.checked) {
    setFeedback("É necessário aceitar o consentimento LGPD.", true);
    return;
  }

  const serviceType = serviceTypeInput.value;
  const durationMinutes = SERVICE_DURATION[serviceType] || 0;

  const appointment = {
    id: createId(),
    patientName: patientNameInput.value.trim(),
    patientEmail: patientEmailInput.value.trim().toLowerCase(),
    serviceType,
    durationMinutes,
    sessionMode: sessionModeInput.value,
    sessionDate: sessionDateInput.value,
    sessionHour: sessionHourInput.value,
    retentionMonths: Number(retentionPolicyInput.value),
    consentAt: new Date().toISOString(),
    status: "pending",
    anonymizedAt: "",
    createdAt: new Date().toISOString(),
  };

  if (
    !appointment.patientName ||
    !appointment.patientEmail ||
    !appointment.serviceType ||
    !appointment.durationMinutes ||
    !appointment.sessionMode ||
    !appointment.sessionDate ||
    !appointment.sessionHour ||
    !appointment.retentionMonths
  ) {
    setFeedback("Preencha todos os campos obrigatórios.", true);
    return;
  }

  if (!isValidEmail(appointment.patientEmail)) {
    setFeedback("Informe um e-mail válido.", true);
    return;
  }

  const hasConflict = appointments.some((item) => {
    if (item.status === "canceled") return false;
    if (item.sessionDate !== appointment.sessionDate) return false;
    return hasTimeOverlap(item.sessionHour, item.durationMinutes, appointment.sessionHour, appointment.durationMinutes);
  });

  if (hasConflict) {
    setFeedback("Conflito detectado por duração de sessão. Escolha outro horário.", true);
    return;
  }

  appointments.push(appointment);
  sortAppointments();
  saveState();
  render();

  appointmentForm.reset();
  serviceDurationInput.value = "Selecione um serviço";
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

  if (action === "remind-whatsapp") {
    sendReminder(selected, "whatsapp");
  }

  if (action === "remind-email") {
    sendReminder(selected, "email");
  }

  if (action === "anonymize") {
    const confirmed = window.confirm("Anonimizar dados deste paciente?");
    if (!confirmed) return;
    anonymizeAppointment(selected);
    saveState();
    render();
    setFeedback("Dados do paciente anonimizados.");
  }
});

searchPatientInput.addEventListener("input", render);

demoAppointmentsBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Substituir agenda atual pelos dados de demonstração?");
  if (!confirmed) return;
  appointments = createSeedAppointments();
  reminders = [];
  saveState();
  saveReminders();
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
      const consentLabel = item.consentAt ? "OK" : "Pendente";
      const retentionLabel = item.retentionMonths ? `${item.retentionMonths}m` : "—";

      return `
        <tr>
          <td>
            <strong>${escapeHtml(item.patientName)}</strong><br />
            <small>${escapeHtml(item.patientEmail)}</small>
          </td>
          <td>${item.serviceType}</td>
          <td>${formatDate(item.sessionDate)}</td>
          <td>${item.sessionHour}</td>
          <td>${item.durationMinutes} min</td>
          <td>${item.sessionMode}</td>
          <td><span class="status-chip ${item.status}">${statusLabel}</span></td>
          <td>${consentLabel} • ${retentionLabel}</td>
          <td>
            <button type="button" class="table-action confirm" data-action="confirm" data-id="${item.id}" ${isConfirmed || isCanceled ? "disabled" : ""}>Confirmar</button>
            <button type="button" class="table-action cancel" data-action="cancel" data-id="${item.id}" ${isCanceled ? "disabled" : ""}>Cancelar</button>
            <button type="button" class="table-action remind" data-action="remind-whatsapp" data-id="${item.id}" ${isCanceled ? "disabled" : ""}>WhatsApp</button>
            <button type="button" class="table-action remind-email" data-action="remind-email" data-id="${item.id}" ${isCanceled ? "disabled" : ""}>E-mail</button>
            <button type="button" class="table-action anonymize" data-action="anonymize" data-id="${item.id}" ${item.anonymizedAt ? "disabled" : ""}>Anonimizar</button>
          </td>
        </tr>
      `;
    })
    .join("");

  emptyAppointments.style.display = visibleAppointments.length === 0 ? "block" : "none";
  updateStats();
  renderReminderLog();
}

function renderReminderLog() {
  const sorted = [...reminders].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  reminderLogList.innerHTML = sorted
    .slice(0, 12)
    .map((item) => `<li>${formatDateTime(item.sentAt)} · ${item.channel.toUpperCase()} · ${escapeHtml(item.patientName)}</li>`)
    .join("");

  emptyReminderLog.style.display = sorted.length === 0 ? "block" : "none";
}

function renderTestimonial() {
  const item = testimonials[activeTestimonial];
  testimonialQuote.textContent = `"${item.quote}"`;
  testimonialAuthor.textContent = item.author;
}

function updateStats() {
  const total = appointments.filter((item) => item.status !== "canceled").length;
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

function sendReminder(appointment, channel) {
  const message = `Lembrete da sessão (${appointment.serviceType}) em ${formatDate(appointment.sessionDate)} às ${appointment.sessionHour}.`;
  reminders.push({
    id: createId(),
    appointmentId: appointment.id,
    patientName: appointment.patientName,
    channel,
    message,
    sentAt: new Date().toISOString(),
  });
  saveReminders();

  if (channel === "whatsapp") {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${CLINIC_WHATSAPP}?text=${encodedMessage}`;
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    const subject = encodeURIComponent("Lembrete de sessão");
    const body = encodeURIComponent(message);
    const mailTo = `mailto:${appointment.patientEmail}?subject=${subject}&body=${body}`;
    window.location.href = mailTo;
  }

  renderReminderLog();
  setFeedback(`Lembrete enviado por ${channel === "whatsapp" ? "WhatsApp" : "e-mail"}.`);
}

function anonymizeAppointment(appointment) {
  appointment.patientName = "Paciente anonimizado";
  appointment.patientEmail = "anonimizado@paciente.local";
  appointment.anonymizedAt = new Date().toISOString();
}

function applyRetentionPolicy() {
  const now = new Date();
  let changed = false;

  appointments.forEach((appointment) => {
    if (appointment.anonymizedAt) return;
    if (!appointment.retentionMonths || !appointment.createdAt) return;
    const createdAt = new Date(appointment.createdAt);
    const expirationDate = new Date(createdAt);
    expirationDate.setMonth(expirationDate.getMonth() + appointment.retentionMonths);
    if (expirationDate <= now) {
      anonymizeAppointment(appointment);
      changed = true;
    }
  });

  if (changed) saveState();
}

function updateServiceDuration() {
  const duration = SERVICE_DURATION[serviceTypeInput.value];
  serviceDurationInput.value = duration ? `${duration} minutos` : "Selecione um serviço";
}

function hasTimeOverlap(startHourA, durationA, startHourB, durationB) {
  const startA = toMinutes(startHourA);
  const endA = startA + Number(durationA || 0);
  const startB = toMinutes(startHourB);
  const endB = startB + Number(durationB || 0);
  return startA < endB && startB < endA;
}

function toMinutes(hourValue) {
  const [hour, minute] = String(hourValue).split(":").map(Number);
  return hour * 60 + minute;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
      durationMinutes: 50,
      sessionMode: "Online",
      sessionDate: todayIsoDate(),
      sessionHour: "14:00",
      retentionMonths: 12,
      consentAt: new Date().toISOString(),
      status: "confirmed",
      anonymizedAt: "",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      patientName: "Bruno e Luiza",
      patientEmail: "casal@email.com",
      serviceType: "Terapia de Casal",
      durationMinutes: 80,
      sessionMode: "Presencial",
      sessionDate: nextIsoDate(1),
      sessionHour: "19:00",
      retentionMonths: 24,
      consentAt: new Date().toISOString(),
      status: "pending",
      anonymizedAt: "",
      createdAt: new Date().toISOString(),
    },
    {
      id: createId(),
      patientName: "Carla Souza",
      patientEmail: "carla@email.com",
      serviceType: "Plantao Emocional",
      durationMinutes: 30,
      sessionMode: "Online",
      sessionDate: nextIsoDate(2),
      sessionHour: "10:00",
      retentionMonths: 6,
      consentAt: new Date().toISOString(),
      status: "pending",
      anonymizedAt: "",
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
    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        ...item,
        durationMinutes: Number(item.durationMinutes || SERVICE_DURATION[item.serviceType] || 50),
        retentionMonths: Number(item.retentionMonths || 12),
        consentAt: item.consentAt || "",
        anonymizedAt: item.anonymizedAt || "",
      }));
  } catch {
    return [];
  }
}

function loadReminders() {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
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

function saveReminders() {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));
}

function formatDate(value) {
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  const date = new Date(value);
  return date.toLocaleString("pt-BR");
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
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
