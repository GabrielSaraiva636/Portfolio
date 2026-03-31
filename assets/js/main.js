const THEME_KEY = "portfolio.theme";
const FAVORITES_KEY = "portfolio.favorites";
const LEADS_KEY = "portfolio.home.leads";

const themeBtn = document.getElementById("themeBtn");
const contactForm = document.getElementById("contactForm");
const contactFeedback = document.getElementById("contactFeedback");
const bookmarkButtons = document.querySelectorAll(".bookmark");

let favorites = loadJson(FAVORITES_KEY, []);

applyTheme(localStorage.getItem(THEME_KEY) || "dark");
renderFavoriteButtons();

themeBtn?.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("light") ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
});

bookmarkButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const project = button.dataset.project;
    if (!project) return;

    if (favorites.includes(project)) {
      favorites = favorites.filter((item) => item !== project);
    } else {
      favorites.push(project);
    }

    saveJson(FAVORITES_KEY, favorites);
    renderFavoriteButtons();
  });
});

contactForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(contactForm);

  const lead = {
    id: createId(),
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    briefing: String(data.get("briefing") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!lead.name || !lead.email || !lead.briefing) {
    contactFeedback.textContent = "Preencha todos os campos.";
    return;
  }

  const leads = loadJson(LEADS_KEY, []);
  leads.unshift(lead);
  saveJson(LEADS_KEY, leads.slice(0, 50));
  contactForm.reset();
  contactFeedback.textContent = "Briefing salvo com sucesso no navegador.";
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const href = anchor.getAttribute("href");
    const target = href ? document.querySelector(href) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

function applyTheme(theme) {
  document.body.classList.toggle("light", theme === "light");
}

function renderFavoriteButtons() {
  bookmarkButtons.forEach((button) => {
    const project = button.dataset.project;
    const active = Boolean(project && favorites.includes(project));
    button.classList.toggle("active", active);
    button.textContent = active ? "Favoritado" : "Favoritar";
  });
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
