import { supabase } from "./supabase.js";

/* =========================================
   ATEMPORAL 2.0
   Gestión de tareas, objetivos, hábitos,
   notas, finanzas y estadísticas.
========================================= */

const TABLES = {
  tasks: "tasks",
  goals: "goals",
  habits: "habits",
  notes: "notes",
  movements: "movements",
  habitLogs: "habit_logs"
};

const state = {
  user: null,
  tasks: [],
  goals: [],
  habits: [],
  notes: [],
  movements: [],
  habitLogs: [],
  editing: null
};

const $ = (id) => document.getElementById(id);

const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function money(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN"
  }).format(Number(value) || 0);
}

function showMessage(message, error = false) {
  const element = $("app-message");
  if (!element) return;

  element.textContent = message;
  element.className = error ? "message error" : "message success";
}

/* =========================================
   AUTENTICACIÓN
========================================= */

async function requireUser() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    window.location.href = "login.html";
    return false;
  }

  state.user = data.session.user;

  const email = state.user.email || state.user.phone || "Mi cuenta";

  if ($("user-email")) {
    $("user-email").textContent = email;
  }

  return true;
}

async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    showMessage("No se pudo cerrar la sesión: " + error.message, true);
    return;
  }

  window.location.href = "login.html";
}

/* =========================================
   CARGA DE DATOS
========================================= */

async function loadAll() {
  if (!state.user) return;

  const requests = [
    supabase.from(TABLES.tasks)
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false }),

    supabase.from(TABLES.goals)
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false }),

    supabase.from(TABLES.habits)
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false }),

    supabase.from(TABLES.notes)
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false }),

    supabase.from(TABLES.movements)
      .select("*")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false }),

    supabase.from(TABLES.habitLogs)
      .select("*")
      .eq("user_id", state.user.id)
      .order("completed_on", { ascending: false })
  ];

  const results = await Promise.all(requests);

  const names = [
    "tareas",
    "objetivos",
    "hábitos",
    "notas",
    "movimientos",
    "historial de hábitos"
  ];

  const failed = results.findIndex((result) => result.error);

  if (failed !== -1) {
    showMessage(
      `No se pudieron cargar los ${names[failed]}: ${results[failed].error.message}`,
      true
    );
    return;
  }

  state.tasks = results[0].data || [];
  state.goals = results[1].data || [];
  state.habits = results[2].data || [];
  state.notes = results[3].data || [];
  state.movements = results[4].data || [];
  state.habitLogs = results[5].data || [];

  renderAll();
}

/* =========================================
   OPERACIONES GENERALES
========================================= */

async function insertRecord(key, values) {
  const table = TABLES[key];

  if (!table || !state.user) {
    throw new Error("No se pudo identificar el registro.");
  }

  const { error } = await supabase
    .from(table)
    .insert({
      ...values,
      user_id: state.user.id
    });

  if (error) throw error;

  await loadAll();
}

async function updateRecord(key, id, values) {
  const table = TABLES[key];

  if (!table || !state.user) {
    throw new Error("No se pudo identificar el registro.");
  }

  const { data, error } = await supabase
    .from(table)
    .update(values)
    .eq("id", id)
    .eq("user_id", state.user.id)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No se encontró el registro o no tienes permiso para editarlo.");

  await loadAll();
}

async function deleteRecord(key, id) {
  const table = TABLES[key];

  if (!table || !state.user) return;

  const confirmed = confirm("¿Quieres eliminar este elemento?");

  if (!confirmed) return;

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq("id", id)
    .eq("user_id", state.user.id)
    .select("id");

  if (error) {
    showMessage("No se pudo eliminar: " + error.message, true);
    return;
  }

  if (!data || data.length === 0) {
    showMessage("No se encontró el registro que deseas eliminar.", true);
    return;
  }

  showMessage("Registro eliminado correctamente.");
  await loadAll();
}

/* =========================================
   PUNTOS Y RANGOS
========================================= */

function getPoints() {
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const habitCompletions = state.habitLogs.length;

  return completedTasks * 10 + habitCompletions * 5;
}

function getRank(points) {
  if (points >= 1000) return "Rango: Leyenda";
  if (points >= 500) return "Rango: Constante";
  if (points >= 200) return "Rango: Avanzado";
  if (points >= 50) return "Rango: En progreso";
  return "Rango: Inicio";
}

/* =========================================
   ESTADO DE HÁBITOS
========================================= */

function isHabitCompleted(habitId, date = localDate()) {
  return state.habitLogs.some((log) =>
    log.habit_id === habitId && log.completed_on === date
  );
}

async function toggleHabit(habitId, checked) {
  const date = localDate();

  try {
    if (checked) {
      const { error } = await supabase
        .from(TABLES.habitLogs)
        .upsert(
          {
            user_id: state.user.id,
            habit_id: habitId,
            completed_on: date
          },
          {
            onConflict: "habit_id,completed_on",
            ignoreDuplicates: true
          }
        );

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(TABLES.habitLogs)
        .delete()
        .eq("user_id", state.user.id)
        .eq("habit_id", habitId)
        .eq("completed_on", date);

      if (error) throw error;
    }

    await loadAll();
  } catch (error) {
    showMessage("No se pudo actualizar el hábito: " + error.message, true);
    await loadAll();
  }
}

/* =========================================
   RENDERIZADO: INICIO
========================================= */

function renderHome() {
  const today = localDate();

  const pendingTasks = state.tasks.filter((task) => !task.completed);
  const activeGoals = state.goals.filter((goal) => Number(goal.progress) < 100);
  const completedHabits = state.habits.filter((habit) =>
    isHabitCompleted(habit.id, today)
  );

  const income = state.movements
    .filter((movement) => movement.type === "income")
    .reduce((total, movement) => total + Number(movement.amount), 0);

  const expenses = state.movements
    .filter((movement) => movement.type === "expense")
    .reduce((total, movement) => total + Number(movement.amount), 0);

  const points = getPoints();

  $("today-label").textContent = new Date().toLocaleDateString("es-PE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  $("points-total").textContent = points;
  $("rank-label").textContent = getRank(points);

  $("home-pending-tasks").textContent = pendingTasks.length;
  $("home-active-goals").textContent = activeGoals.length;
  $("home-habits-completed").textContent =
    `${completedHabits.length}/${state.habits.length}`;
  $("home-balance").textContent = money(income - expenses);

  const upcomingTasks = [...pendingTasks]
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    })
    .slice(0, 5);

  $("home-tasks-list").innerHTML = upcomingTasks.length
    ? upcomingTasks.map((task) => taskHTML(task)).join("")
    : '<p class="empty">¡No tienes tareas pendientes!</p>';

  $("home-habits-list").innerHTML = state.habits.length
    ? state.habits.map((habit) => habitHTML(habit)).join("")
    : '<p class="empty">Todavía no has agregado hábitos.</p>';
}

/* =========================================
   RENDERIZADO: TAREAS
========================================= */

function taskHTML(task) {
  return `
    <div class="item ${task.completed ? "done" : ""}">
      <div class="item-main">
        <label class="check-line">
          <input
            type="checkbox"
            class="task-check"
            data-id="${escapeHTML(task.id)}"
            ${task.completed ? "checked" : ""}
          >
          <span>${escapeHTML(task.title)}</span>
        </label>

        ${task.description
          ? `<p class="item-description">${escapeHTML(task.description)}</p>`
          : ""}

        <span class="item-date">
          ${task.due_date ? "Fecha límite: " + formatDate(task.due_date) : "Sin fecha límite"}
        </span>
      </div>

      <div class="item-actions">
        <button class="icon-button edit-btn" data-key="tasks" data-id="${escapeHTML(task.id)}" type="button">
          Editar
        </button>
        <button class="icon-button delete-btn" data-key="tasks" data-id="${escapeHTML(task.id)}" type="button">
          Eliminar
        </button>
      </div>
    </div>
  `;
}

function renderTasks() {
  const pending = state.tasks.filter((task) => !task.completed).length;

  $("tasks-count").textContent =
    `${state.tasks.length} ${state.tasks.length === 1 ? "tarea" : "tareas"}`;

  $("tasks-list").innerHTML = state.tasks.length
    ? state.tasks.map(taskHTML).join("")
    : '<p class="empty">Todavía no tienes tareas. ¡Agrega la primera!</p>';
}

/* =========================================
   RENDERIZADO: OBJETIVOS
========================================= */

function goalHTML(goal) {
  const progress = Math.min(100, Math.max(0, Number(goal.progress) || 0));

  return `
    <div class="item">
      <div class="item-main">
        <strong>${escapeHTML(goal.title)}</strong>

        ${goal.description
          ? `<p class="item-description">${escapeHTML(goal.description)}</p>`
          : ""}

        <span class="item-date">
          ${goal.target_date ? "Fecha objetivo: " + formatDate(goal.target_date) : "Sin fecha objetivo"}
        </span>

        <div class="progress-row">
          <input
            type="range"
            class="goal-progress"
            data-id="${escapeHTML(goal.id)}"
            min="0"
            max="100"
            step="5"
            value="${progress}"
            aria-label="Progreso del objetivo"
          >
          <strong>${progress}%</strong>
        </div>
      </div>

      <div class="item-actions">
        <button class="icon-button edit-btn" data-key="goals" data-id="${escapeHTML(goal.id)}" type="button">
          Editar
        </button>
        <button class="icon-button delete-btn" data-key="goals" data-id="${escapeHTML(goal.id)}" type="button">
          Eliminar
        </button>
      </div>
    </div>
  `;
}

function renderGoals() {
  $("goals-count").textContent =
    `${state.goals.length} ${state.goals.length === 1 ? "objetivo" : "objetivos"}`;

  $("goals-list").innerHTML = state.goals.length
    ? state.goals.map(goalHTML).join("")
    : '<p class="empty">Todavía no tienes objetivos registrados.</p>';
}

/* =========================================
   RENDERIZADO: HÁBITOS
========================================= */

function habitHTML(habit) {
  const completed = isHabitCompleted(habit.id);

  return `
    <div class="item ${completed ? "done" : ""}">
      <div class="item-main">
        <label class="check-line">
          <input
            type="checkbox"
            class="habit-check"
            data-id="${escapeHTML(habit.id)}"
            ${completed ? "checked" : ""}
          >
          <span>${escapeHTML(habit.title)}</span>
        </label>

        ${habit.description
          ? `<p class="item-description">${escapeHTML(habit.description)}</p>`
          : ""}

        <span class="item-date">
          ${completed ? "Completado hoy" : "Pendiente por hoy"}
        </span>
      </div>

      <div class="item-actions">
        <button class="icon-button edit-btn" data-key="habits" data-id="${escapeHTML(habit.id)}" type="button">
          Editar
        </button>
        <button class="icon-button delete-btn" data-key="habits" data-id="${escapeHTML(habit.id)}" type="button">
          Eliminar
        </button>
      </div>
    </div>
  `;
}

function renderHabits() {
  $("habits-count").textContent =
    `${state.habits.length} ${state.habits.length === 1 ? "hábito" : "hábitos"}`;

  $("habits-list").innerHTML = state.habits.length
    ? state.habits.map(habitHTML).join("")
    : '<p class="empty">Agrega un hábito para comenzar a registrar tu constancia.</p>';

  renderHabitCalendar();
}

/* =========================================
   CALENDARIO DE HÁBITOS
========================================= */

function renderHabitCalendar() {
  const container = $("habit-calendar");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = firstDay.toLocaleDateString("es-PE", {
    month: "long",
    year: "numeric"
  });

  const weekdayOffset = (firstDay.getDay() + 6) % 7;

  const counts = {};

  state.habitLogs.forEach((log) => {
    const date = log.completed_on;
    counts[date] = (counts[date] || 0) + 1;
  });

  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  let html = `
    <div class="calendar-header">
      <strong>${escapeHTML(monthName)}</strong>
      <span class="muted small">Registros diarios</span>
    </div>
    <div class="calendar-grid">
      ${weekdays.map((day) => `<span class="calendar-weekday">${day}</span>`).join("")}
  `;

  for (let i = 0; i < weekdayOffset; i++) {
    html += '<span class="calendar-day empty-day"></span>';
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const count = counts[date] || 0;
    const isToday = date === localDate();

    html += `
      <div class="calendar-day ${count ? "has-activity" : ""} ${isToday ? "is-today" : ""}">
        <span>${day}</span>
        ${count ? `<small>${count} ${count === 1 ? "hábito" : "hábitos"}</small>` : ""}
      </div>
    `;
  }

  html += "</div>";

  html += `
    <p class="calendar-legend">
      <span class="legend-dot"></span>
      Día con hábitos registrados
    </p>
  `;

  container.innerHTML = html;
}

/* =========================================
   RENDERIZADO: NOTAS
========================================= */

function noteHTML(note) {
  return `
    <div class="item">
      <div class="item-main">
        <strong>${escapeHTML(note.title)}</strong>
        <p class="item-description note-content">${escapeHTML(note.content)}</p>
        <span class="item-date">
          ${note.created_at ? formatDate(note.created_at) : ""}
        </span>
      </div>

      <div class="item-actions">
        <button class="icon-button edit-btn" data-key="notes" data-id="${escapeHTML(note.id)}" type="button">
          Editar
        </button>
        <button class="icon-button delete-btn" data-key="notes" data-id="${escapeHTML(note.id)}" type="button">
          Eliminar
        </button>
      </div>
    </div>
  `;
}

function renderNotes() {
  $("notes-count").textContent =
    `${state.notes.length} ${state.notes.length === 1 ? "nota" : "notas"}`;

  $("notes-list").innerHTML = state.notes.length
    ? state.notes.map(noteHTML).join("")
    : '<p class="empty">Todavía no tienes notas guardadas.</p>';
}

/* =========================================
   RENDERIZADO: FINANZAS
========================================= */

function renderFinance() {
  const income = state.movements
    .filter((movement) => movement.type === "income")
    .reduce((total, movement) => total + Number(movement.amount), 0);

  const expenses = state.movements
    .filter((movement) => movement.type === "expense")
    .reduce((total, movement) => total + Number(movement.amount), 0);

  const balance = income - expenses;

  $("income-total").textContent = money(income);
  $("expense-total").textContent = money(expenses);
  $("balance-total").textContent = money(balance);

  $("movements-count").textContent =
    `${state.movements.length} ${state.movements.length === 1 ? "movimiento" : "movimientos"}`;

  $("home-balance").textContent = money(balance);

  $("movements-list").innerHTML = state.movements.length
    ? state.movements.map((movement) => `
        <div class="item">
          <div class="item-main">
            <strong>${escapeHTML(movement.description)}</strong>
            <span class="item-date">${formatDate(movement.movement_date)}</span>
          </div>

          <div class="movement-value ${movement.type === "income" ? "positive" : "negative"}">
            <strong>${movement.type === "income" ? "+" : "−"} ${money(movement.amount)}</strong>
          </div>

          <div class="item-actions">
            <button class="icon-button edit-btn" data-key="movements" data-id="${escapeHTML(movement.id)}" type="button">
              Editar
            </button>
            <button class="icon-button delete-btn" data-key="movements" data-id="${escapeHTML(movement.id)}" type="button">
              Eliminar
            </button>
          </div>
        </div>
      `).join("")
    : '<p class="empty">Todavía no has registrado movimientos.</p>';
}

/* =========================================
   RENDERIZADO: ESTADÍSTICAS
========================================= */

function renderStats() {
  const completedTasks = state.tasks.filter((task) => task.completed).length;
  const completedGoals = state.goals.filter((goal) => Number(goal.progress) >= 100).length;
  const points = getPoints();

  $("stats-completed-tasks").textContent = completedTasks;
  $("stats-completed-goals").textContent = completedGoals;
  $("stats-habit-completions").textContent = state.habitLogs.length;
  $("stats-points").textContent = points;

  $("stats-habits-summary").innerHTML = state.habits.length
    ? state.habits.map((habit) => {
        const total = state.habitLogs.filter((log) =>
          log.habit_id === habit.id
        ).length;

        return `
          <div class="stats-habit-row">
            <strong>${escapeHTML(habit.title)}</strong>
            <span>${total} ${total === 1 ? "registro" : "registros"}</span>
          </div>
        `;
      }).join("")
    : '<p class="empty">Agrega hábitos para comenzar a ver tus estadísticas.</p>';
}

/* =========================================
   ACTUALIZAR TODA LA INTERFAZ
========================================= */

function renderAll() {
  renderHome();
  renderTasks();
  renderGoals();
  renderHabits();
  renderNotes();
  renderFinance();
  renderStats();
}

/* =========================================
   FORMULARIOS: CREAR REGISTROS
========================================= */

function bindForm(formId, key, buildValues) {
  const form = $(formId);
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');

    try {
      if (button) button.disabled = true;

      const values = buildValues(new FormData(form));

      await insertRecord(key, values);

      form.reset();
      showMessage("Registro guardado correctamente.");
    } catch (error) {
      showMessage("No se pudo guardar: " + error.message, true);
    } finally {
      if (button) button.disabled = false;
    }
  });
}

bindForm("task-form", "tasks", (form) => ({
  title: String(form.get("title") || "").trim(),
  due_date: form.get("due_date") || null,
  description: String(form.get("description") || "").trim(),
  completed: false
}));

bindForm("goal-form", "goals", (form) => ({
  title: String(form.get("title") || "").trim(),
  target_date: form.get("target_date") || null,
  description: String(form.get("description") || "").trim(),
  progress: 0
}));

bindForm("habit-form", "habits", (form) => ({
  title: String(form.get("title") || "").trim(),
  description: String(form.get("description") || "").trim(),
  completed_today: false
}));

bindForm("note-form", "notes", (form) => ({
  title: String(form.get("title") || "").trim(),
  content: String(form.get("content") || "").trim()
}));

bindForm("movement-form", "movements", (form) => {
  const amount = Number(form.get("amount"));
  const type = form.get("type");

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Escribe un monto mayor que cero.");
  }

  if (!["income", "expense"].includes(type)) {
    throw new Error("Selecciona un tipo de movimiento válido.");
  }

  return {
    description: String(form.get("description") || "").trim(),
    amount,
    type,
    movement_date: form.get("movement_date") || localDate()
  };
});

/* =========================================
   VENTANA DE EDICIÓN
========================================= */

function editField(label, name, value = "", type = "text", options = {}) {
  const required = options.required ? "required" : "";
  const maxLength = options.maxLength
    ? `maxlength="${options.maxLength}"`
    : "";

  const safeValue = escapeHTML(value ?? "");

  if (type === "textarea") {
    return `
      <label class="edit-field">
        <span>${label}</span>
        <textarea name="${name}" rows="4" ${required} ${maxLength}>${safeValue}</textarea>
      </label>
    `;
  }

  if (type === "select") {
    return `
      <label class="edit-field">
        <span>${label}</span>
        <select name="${name}" ${required}>
          <option value="expense" ${value === "expense" ? "selected" : ""}>Gasto</option>
          <option value="income" ${value === "income" ? "selected" : ""}>Ingreso</option>
        </select>
      </label>
    `;
  }

  if (type === "number") {
    return `
      <label class="edit-field">
        <span>${label}</span>
        <input
          type="number"
          name="${name}"
          value="${safeValue}"
          min="0"
          max="100"
          step="5"
          ${required}
        >
      </label>
    `;
  }

  return `
    <label class="edit-field">
      <span>${label}</span>
      <input
        type="${type}"
        name="${name}"
        value="${safeValue}"
        ${required}
        ${maxLength}
      >
    </label>
  `;
}

function openEdit(key, id) {
  const records = {
    tasks: state.tasks,
    goals: state.goals,
    habits: state.habits,
    notes: state.notes,
    movements: state.movements
  };

  const record = records[key]?.find((item) => item.id === id);

  if (!record) {
    showMessage("No se encontró el registro.", true);
    return;
  }

  state.editing = { key, id };

  let fields = "";
  let title = "Editar registro";

  if (key === "tasks") {
    title = "Editar tarea";

    fields = `
      ${editField("Nombre de la tarea", "title", record.title, "text", {
        required: true,
        maxLength: 120
      })}
      ${editField("Fecha límite", "due_date", record.due_date || "", "date")}
      ${editField("Descripción", "description", record.description, "textarea", {
        maxLength: 300
      })}
    `;
  }

  if (key === "goals") {
    title = "Editar objetivo";

    fields = `
      ${editField("Nombre del objetivo", "title", record.title, "text", {
        required: true,
        maxLength: 120
      })}
      ${editField("Fecha objetivo", "target_date", record.target_date || "", "date")}
      ${editField("Descripción", "description", record.description, "textarea", {
        maxLength: 300
      })}
      ${editField("Progreso (%)", "progress", Number(record.progress) || 0, "number")}
    `;
  }

  if (key === "habits") {
    title = "Editar hábito";

    fields = `
      ${editField("Nombre del hábito", "title", record.title, "text", {
        required: true,
        maxLength: 120
      })}
      ${editField("Frecuencia o detalle", "description", record.description, "textarea", {
        maxLength: 200
      })}
    `;
  }

  if (key === "notes") {
    title = "Editar nota";

    fields = `
      ${editField("Título", "title", record.title, "text", {
        required: true,
        maxLength: 120
      })}
      ${editField("Contenido", "content", record.content, "textarea", {
        required: true,
        maxLength: 10000
      })}
    `;
  }

  if (key === "movements") {
    title = "Editar movimiento";

    fields = `
      ${editField("Concepto", "description", record.description, "text", {
        required: true,
        maxLength: 120
      })}
      ${editField("Monto (S/)", "amount", record.amount, "number", {
        required: true
      })}
      ${editField("Tipo de movimiento", "type", record.type, "select")}
      ${editField("Fecha", "movement_date", record.movement_date || "", "date")}
    `;
  }

  $("edit-title").textContent = title;
  $("edit-fields").innerHTML = fields;

  const dialog = $("edit-dialog");

  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function closeEdit() {
  const dialog = $("edit-dialog");

  if (dialog?.open) {
    dialog.close();
  }

  state.editing = null;
}

$("close-edit-btn")?.addEventListener("click", closeEdit);
$("cancel-edit-btn")?.addEventListener("click", closeEdit);

$("edit-dialog")?.addEventListener("click", (event) => {
  if (event.target === $("edit-dialog")) {
    closeEdit();
  }
});

$("edit-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.editing) return;

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const data = new FormData(form);

  const { key, id } = state.editing;
  let values = {};

  if (key === "tasks") {
    values = {
      title: String(data.get("title") || "").trim(),
      due_date: data.get("due_date") || null,
      description: String(data.get("description") || "").trim()
    };
  }

  if (key === "goals") {
    const progress = Number(data.get("progress"));

    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      showMessage("El progreso debe estar entre 0 y 100.", true);
      return;
    }

    values = {
      title: String(data.get("title") || "").trim(),
      target_date: data.get("target_date") || null,
      description: String(data.get("description") || "").trim(),
      progress
    };
  }

  if (key === "habits") {
    values = {
      title: String(data.get("title") || "").trim(),
      description: String(data.get("description") || "").trim()
    };
  }

  if (key === "notes") {
    values = {
      title: String(data.get("title") || "").trim(),
      content: String(data.get("content") || "").trim()
    };
  }

  if (key === "movements") {
    const amount = Number(data.get("amount"));

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("El monto debe ser mayor que cero.", true);
      return;
    }

    values = {
      description: String(data.get("description") || "").trim(),
      amount,
      type: data.get("type"),
      movement_date: data.get("movement_date") || localDate()
    };
  }

  try {
    if (button) button.disabled = true;

    await updateRecord(key, id, values);

    closeEdit();
    showMessage("Cambios guardados correctamente.");
  } catch (error) {
    showMessage("No se pudieron guardar los cambios: " + error.message, true);
  } finally {
    if (button) button.disabled = false;
  }
});

/* =========================================
   BOTONES DE ACCIÓN
========================================= */

document.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit-btn");

  if (editButton) {
    openEdit(editButton.dataset.key, editButton.dataset.id);
    return;
  }

  const deleteButton = event.target.closest(".delete-btn");

  if (deleteButton) {
    await deleteRecord(deleteButton.dataset.key, deleteButton.dataset.id);
    return;
  }

  const openButton = event.target.closest("[data-open-section]");

  if (openButton) {
    navigateTo(openButton.dataset.openSection);
  }
});

/* =========================================
   CAMBIOS: TAREAS, HÁBITOS Y OBJETIVOS
========================================= */

document.addEventListener("change", async (event) => {
  const taskCheckbox = event.target.closest(".task-check");

  if (taskCheckbox) {
    try {
      await updateRecord("tasks", taskCheckbox.dataset.id, {
        completed: taskCheckbox.checked
      });

      showMessage(
        taskCheckbox.checked
          ? "¡Tarea completada!"
          : "La tarea volvió a estar pendiente."
      );
    } catch (error) {
      showMessage("No se pudo actualizar la tarea: " + error.message, true);
      await loadAll();
    }

    return;
  }

  const habitCheckbox = event.target.closest(".habit-check");

  if (habitCheckbox) {
    await toggleHabit(habitCheckbox.dataset.id, habitCheckbox.checked);
    return;
  }

  const goalProgress = event.target.closest(".goal-progress");

  if (goalProgress) {
    try {
      await updateRecord("goals", goalProgress.dataset.id, {
        progress: Number(goalProgress.value)
      });

      showMessage("Progreso del objetivo actualizado.");
    } catch (error) {
      showMessage("No se pudo actualizar el objetivo: " + error.message, true);
      await loadAll();
    }
  }
});

/* =========================================
   NAVEGACIÓN ENTRE SECCIONES
========================================= */

const validSections = [
  "home",
  "tasks",
  "goals",
  "habits",
  "notes",
  "finance",
  "stats"
];

function navigateTo(section) {
  if (!validSections.includes(section)) return;

  document.querySelectorAll(".section-panel").forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `section-${section}`);
  });

  document.querySelectorAll(".nav-item, .bottom-nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === section);
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll(".nav-item, .bottom-nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.section);
  });
});

/* =========================================
   CERRAR SESIÓN
========================================= */

$("logout-btn")?.addEventListener("click", logout);
$("mobile-logout-btn")?.addEventListener("click", logout);

/* =========================================
   INICIALIZACIÓN
========================================= */

async function init() {
  try {
    const authenticated = await requireUser();

    if (!authenticated) return;

    // Fecha actual en el formulario de movimientos.
    const movementDate = document.querySelector(
      '#movement-form [name="movement_date"]'
    );

    if (movementDate && !movementDate.value) {
      movementDate.value = localDate();
    }

    await loadAll();
    navigateTo("home");
  } catch (error) {
    showMessage("Ocurrió un error al iniciar ATEMPORAL: " + error.message, true);
  }
}

init();
