import { supabase } from "./supabase.js";

const TABLES = {
  tasks: "tasks",
  goals: "goals",
  habits: "habits",
  notes: "notes",
  movements: "movements"
};
const state = { user: null, tasks: [], goals: [], habits: [], notes: [], movements: [] };
const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);
const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));
const showMessage = (text, error = false) => {
  $("app-message").textContent = text;
  $("app-message").className = error ? "message error" : "message success";
};

async function requireUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = "login.html";
    return false;
  }
  state.user = session.user;
  $("user-email").textContent = session.user.email || session.user.phone || "Mi cuenta";
  return true;
}

async function loadAll() {
  for (const key of Object.keys(TABLES)) {
    const { data, error } = await supabase.from(TABLES[key]).select("*").order("created_at", { ascending: false });
    if (error) {
      showMessage(`No se pudo cargar ${key}: ${error.message}`, true);
      return;
    }
    state[key] = data || [];
  }
  renderAll();
}

async function insertRecord(key, values) {
  const { error } = await supabase.from(TABLES[key]).insert({ ...values, user_id: state.user.id });
  if (error) throw error;
  await loadAll();
}
async function updateRecord(key, id, values) {
  const { error } = await supabase.from(TABLES[key]).update(values).eq("id", id);
  if (error) throw error;
  await loadAll();
}
async function deleteRecord(key, id) {
  if (!confirm("¿Quieres eliminar este elemento?")) return;
  const { error } = await supabase.from(TABLES[key]).delete().eq("id", id);
  if (error) return showMessage(error.message, true);
  await loadAll();
}

function itemActions(key, id) {
  return `<button class="icon-button delete-btn" data-key="${key}" data-id="${id}" aria-label="Eliminar">Eliminar</button>`;
}
function renderTasks() {
  $("tasks-list").innerHTML = state.tasks.length ? state.tasks.map(t => `
    <article class="item ${t.completed ? "done" : ""}">
      <div class="item-main">
        <label class="check-line"><input type="checkbox" class="task-check" data-id="${t.id}" ${t.completed ? "checked" : ""}><strong>${escapeHTML(t.title)}</strong></label>
        ${t.description ? `<p>${escapeHTML(t.description)}</p>` : ""}
        ${t.due_date ? `<small>Fecha límite: ${escapeHTML(t.due_date)}</small>` : ""}
      </div>${itemActions("tasks", t.id)}
    </article>`).join("") : `<p class="empty">Todavía no tienes tareas. Agrega la primera.</p>`;
}
function renderGoals() {
  $("goals-list").innerHTML = state.goals.length ? state.goals.map(g => `
    <article class="item">
      <div class="item-main">
        <strong>${escapeHTML(g.title)}</strong>
        ${g.description ? `<p>${escapeHTML(g.description)}</p>` : ""}
        <div class="progress-row"><input type="range" min="0" max="100" value="${g.progress || 0}" class="goal-progress" data-id="${g.id}" aria-label="Progreso de ${escapeHTML(g.title)}"><span>${g.progress || 0}%</span></div>
        ${g.target_date ? `<small>Fecha objetivo: ${escapeHTML(g.target_date)}</small>` : ""}
      </div>${itemActions("goals", g.id)}
    </article>`).join("") : `<p class="empty">Tus objetivos aparecerán aquí.</p>`;
}
function renderHabits() {
  $("habits-list").innerHTML = state.habits.length ? state.habits.map(h => `
    <article class="item ${h.completed_today ? "done" : ""}">
      <div class="item-main">
        <label class="check-line"><input type="checkbox" class="habit-check" data-id="${h.id}" ${h.completed_today ? "checked" : ""}><strong>${escapeHTML(h.title)}</strong></label>
        ${h.description ? `<p>${escapeHTML(h.description)}</p>` : ""}
        <small>${h.completed_today ? "Completado hoy" : "Pendiente de hoy"}</small>
      </div>${itemActions("habits", h.id)}
    </article>`).join("") : `<p class="empty">Añade hábitos que quieras fortalecer.</p>`;
}
function renderNotes() {
  $("notes-list").innerHTML = state.notes.length ? state.notes.map(n => `
    <article class="item">
      <div class="item-main"><strong>${escapeHTML(n.title)}</strong><p class="note-content">${escapeHTML(n.content)}</p></div>
      ${itemActions("notes", n.id)}
    </article>`).join("") : `<p class="empty">Tus notas e ideas se guardarán aquí.</p>`;
}
function renderFinance() {
  const income = state.movements.filter(m => m.type === "income").reduce((s, m) => s + Number(m.amount), 0);
  const expense = state.movements.filter(m => m.type === "expense").reduce((s, m) => s + Number(m.amount), 0);
  $("income-total").textContent = money(income);
  $("expense-total").textContent = money(expense);
  $("balance-total").textContent = money(income - expense);
  $("movements-list").innerHTML = state.movements.length ? state.movements.map(m => `
    <article class="item">
      <div class="item-main"><strong>${escapeHTML(m.description)}</strong><p>${m.type === "income" ? "Ingreso" : "Gasto"} · ${escapeHTML(m.movement_date || "")}</p></div>
      <strong class="${m.type === "income" ? "positive" : "negative"}">${m.type === "income" ? "+" : "−"}${money(m.amount)}</strong>
      ${itemActions("movements", m.id)}
    </article>`).join("") : `<p class="empty">Aún no registras movimientos.</p>`;
}
function money(amount) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(amount || 0));
}
function renderPoints() {
  const taskPoints = state.tasks.filter(t => t.completed).length * 10;
  const habitPoints = state.habits.filter(h => h.completed_today).length * 5;
  const points = taskPoints + habitPoints;
  $("points-total").textContent = points;
  const rank = points >= 500 ? "Constancia" : points >= 200 ? "En progreso" : points >= 50 ? "En marcha" : "Inicio";
  $("rank-label").textContent = `Rango: ${rank}`;
}
function renderAll() {
  renderTasks(); renderGoals(); renderHabits(); renderNotes(); renderFinance(); renderPoints();
}

function bindForm(formId, key, buildValues) {
  $(formId).addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = buildValues(new FormData(form));
    try {
      await insertRecord(key, values);
      form.reset();
      showMessage("Guardado correctamente.");
    } catch (error) { showMessage(error.message, true); }
  });
}

bindForm("task-form", "tasks", fd => ({
  title: fd.get("title").trim(), due_date: fd.get("due_date") || null,
  description: fd.get("description").trim(), completed: false
}));
bindForm("goal-form", "goals", fd => ({
  title: fd.get("title").trim(), target_date: fd.get("target_date") || null,
  description: fd.get("description").trim(), progress: 0
}));
bindForm("habit-form", "habits", fd => ({
  title: fd.get("title").trim(), description: fd.get("description").trim(), completed_today: false
}));
bindForm("note-form", "notes", fd => ({
  title: fd.get("title").trim(), content: fd.get("content").trim()
}));
bindForm("movement-form", "movements", fd => ({
  description: fd.get("description").trim(), amount: Number(fd.get("amount")),
  type: fd.get("type"), movement_date: fd.get("movement_date") || today()
}));

document.addEventListener("click", async (event) => {
  const del = event.target.closest(".delete-btn");
  if (del) await deleteRecord(del.dataset.key, del.dataset.id);
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  try {
    if (el.matches(".task-check")) await updateRecord("tasks", el.dataset.id, { completed: el.checked });
    if (el.matches(".habit-check")) await updateRecord("habits", el.dataset.id, { completed_today: el.checked });
  } catch (error) { showMessage(error.message, true); }
});
document.addEventListener("change", async (event) => {
  const el = event.target;
  if (el.matches(".goal-progress")) {
    try { await updateRecord("goals", el.dataset.id, { progress: Number(el.value) }); }
    catch (error) { showMessage(error.message, true); }
  }
});

document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t === tab));
  document.querySelectorAll(".section-panel").forEach(p => p.classList.add("hidden"));
  $(`section-${tab.dataset.section}`).classList.remove("hidden");
}));

$("logout-btn").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return showMessage(error.message, true);
  window.location.href = "login.html";
});

(async function init() {
  if (await requireUser()) await loadAll();
})();
