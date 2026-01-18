/**
 * Minimal offline timeline widget.
 */

const STORAGE_KEY = "timetable.events.v1";
const SELECTED_DATE_KEY = "timetable.selectedDate.v1";
const MONTHLY_KEY = "timetable.monthly.v1";

/** @typedef {{ id: string; date: string; time: string; title: string; note: string; important: boolean; done: boolean; createdAt: number }} EventItem */
/** @typedef {{ id: string; month: number; title: string; createdAt: number }} MonthlyGoal */

const els = {
  // ... existing elements ...
  addForm: /** @type {HTMLFormElement} */ (document.getElementById("addForm")),
  timeInput: /** @type {HTMLInputElement} */ (document.getElementById("timeInput")),
  titleInput: /** @type {HTMLInputElement} */ (document.getElementById("titleInput")),
  noteInput: /** @type {HTMLInputElement} */ (document.getElementById("noteInput")),
  importantToggle: /** @type {HTMLButtonElement} */ (document.getElementById("importantToggle")),
  addBtn: /** @type {HTMLButtonElement} */ (document.getElementById("addBtn")),
  showAddBtn: /** @type {HTMLButtonElement} */ (document.getElementById("showAddBtn")),
  cancelAddBtn: /** @type {HTMLButtonElement} */ (document.getElementById("cancelAddBtn")),
  toggleNoteBtn: /** @type {HTMLButtonElement} */ (document.getElementById("toggleNoteBtn")),
  noteWrap: /** @type {HTMLDivElement} */ (document.getElementById("noteWrap")),
  suggestions: /** @type {HTMLDataListElement} */ (document.getElementById("eventSuggestions")),
  timeline: /** @type {HTMLOListElement} */ (document.getElementById("timeline")),
  tmpl: /** @type {HTMLTemplateElement} */ (document.getElementById("eventTemplate")),
  emptyState: /** @type {HTMLDivElement} */ (document.getElementById("emptyState")),
  addFormDivider: /** @type {HTMLDivElement} */ (document.getElementById("addFormDivider")),
  countHint: /** @type {HTMLSpanElement} */ (document.getElementById("countHint")),
  progressBarWrap: /** @type {HTMLDivElement} */ (document.getElementById("progressBarWrap")),
  progressBarFill: /** @type {HTMLDivElement} */ (document.getElementById("progressBarFill")),
  dateInput: /** @type {HTMLInputElement} */ (document.getElementById("dateInput")),
  prevDayBtn: /** @type {HTMLButtonElement} */ (document.getElementById("prevDayBtn")),
  nextDayBtn: /** @type {HTMLButtonElement} */ (document.getElementById("nextDayBtn")),
  pageTitle: /** @type {HTMLHeadingElement} */ (document.getElementById("pageTitle")),
  
  // Modal
  editDialog: /** @type {HTMLDialogElement} */ (document.getElementById("editDialog")),
  editForm: /** @type {HTMLFormElement} */ (document.getElementById("editForm")),
  editTimeInput: /** @type {HTMLInputElement} */ (document.getElementById("editTimeInput")),
  editTitleInput: /** @type {HTMLInputElement} */ (document.getElementById("editTitleInput")),
  editNoteInput: /** @type {HTMLInputElement} */ (document.getElementById("editNoteInput")),
  closeEditBtn: /** @type {HTMLButtonElement} */ (document.getElementById("closeEditBtn")),
  deleteEditBtn: /** @type {HTMLButtonElement} */ (document.getElementById("deleteEditBtn")),
  
  // Navigation
  navTimeline: document.getElementById("navTimeline"),
  navTasks: document.getElementById("navTasks"),
  navPlanner: document.getElementById("navPlanner"),
  timelineActions: document.getElementById("timelineActions"),
  
  // View Containers
  timelineView: document.getElementById("timelineView"),
  tasksView: document.getElementById("tasksView"),
  plannerView: document.getElementById("plannerView"),
  
  // Tasks View
  unfinishedList: document.getElementById("unfinishedList"),
  unfinishedCount: document.getElementById("unfinishedCount"),
  
  // Planner View
  plannerForm: document.getElementById("plannerForm"),
  showPlannerAddBtn: document.getElementById("showPlannerAddBtn"),
  plannerMonthInput: document.getElementById("plannerMonthInput"),
  plannerTitleInput: document.getElementById("plannerTitleInput"),
  monthlyPlannerList: document.getElementById("monthlyPlannerList"),
  plannerDisplayContent: document.getElementById("plannerDisplayContent"),
  plannerEditContent: document.getElementById("plannerEditContent"),
  plannerEditList: document.getElementById("plannerEditList"),
};

/** @type {EventItem[]} */
let events = loadEvents();
/** @type {MonthlyGoal[]} */
let monthlyGoals = loadMonthlyGoals();
/** @type {"timeline" | "tasks" | "planner"} */
let currentView = "timeline";
/** @type {boolean} */
let plannerEditMode = false;
let selectedDate = loadSelectedDate();
let addRowImportant = false;

init();

function init() {
  // Setup inputs
  collapseAdd();
  els.dateInput.value = selectedDate;
  
  // Navigation
  els.navTimeline.addEventListener("click", () => switchView("timeline"));
  els.navTasks.addEventListener("click", () => switchView("tasks"));
  els.navPlanner.addEventListener("click", () => switchView("planner"));

  // Events
  els.dateInput.addEventListener("change", (e) => {
    selectedDate = els.dateInput.value;
    localStorage.setItem(SELECTED_DATE_KEY, selectedDate);
    render();
  });

  els.prevDayBtn.addEventListener("click", () => shiftDate(-1));
  els.nextDayBtn.addEventListener("click", () => shiftDate(1));

  els.titleInput.addEventListener("input", syncAddEnabled);

  els.showAddBtn.addEventListener("click", expandAdd);
  els.cancelAddBtn.addEventListener("click", collapseAdd);

  // Planner Logic
  els.showPlannerAddBtn.addEventListener("click", () => {
    plannerEditMode = !plannerEditMode;
    els.showPlannerAddBtn.textContent = plannerEditMode ? "Done" : "Edit";
    els.showPlannerAddBtn.classList.toggle("active", plannerEditMode);
    els.plannerDisplayContent.hidden = plannerEditMode;
    els.plannerEditContent.hidden = !plannerEditMode;
    
    if (plannerEditMode) {
      els.plannerMonthInput.value = new Date().getMonth().toString();
      renderPlannerEditList();
      els.plannerTitleInput.focus();
    }
  });

  els.plannerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const month = parseInt(els.plannerMonthInput.value);
    const title = els.plannerTitleInput.value.trim();
    if (!title) return;

    monthlyGoals.push({
      id: cryptoId(),
      month,
      title,
      createdAt: Date.now()
    });
    
    persistMonthly();
    els.plannerTitleInput.value = "";
    renderPlannerEditList();
    render();
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!els.addForm.hidden) collapseAdd();
    }
  });

  els.importantToggle.addEventListener("click", () => {
    addRowImportant = !addRowImportant;
    els.importantToggle.classList.toggle("active", addRowImportant);
    els.importantToggle.querySelector(".icon").textContent = addRowImportant ? "⚑" : "⚐";
  });

  els.toggleNoteBtn.addEventListener("click", () => {
    const isHidden = els.noteWrap.hidden;
    els.noteWrap.hidden = !isHidden;
    els.toggleNoteBtn.textContent = isHidden ? "Hide note" : "Add note";
    if (isHidden) els.noteInput.focus();
  });

  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const time = parseTimeFlexible(els.timeInput.value.trim());
    const title = els.titleInput.value.trim();
    const note = els.noteWrap.hidden ? "" : els.noteInput.value.trim();

    if (!title || !time) return;

    const item = {
      id: cryptoId(),
      date: selectedDate,
      time,
      title,
      note,
      important: addRowImportant,
      done: false,
      createdAt: Date.now(),
    };

    events.push(item);
    persist();
    collapseAdd();
    render();
  });

  // Modal setup
  els.closeEditBtn.addEventListener("click", () => els.editDialog.close());
  
  els.deleteEditBtn.addEventListener("click", () => {
    const id = els.editDialog.dataset.editingId;
    if (!id) return;
    if (confirm("Delete this event?")) {
      events = events.filter(e => e.id !== id);
      persist();
      render();
      els.editDialog.close();
    }
  });
  
  els.editForm.addEventListener("submit", (e) => {
    const id = els.editDialog.dataset.editingId;
    if (!id) return;
    
    const item = events.find(e => e.id === id);
    if (item) {
      item.time = parseTimeFlexible(els.editTimeInput.value) || item.time;
      item.title = els.editTitleInput.value.trim();
      item.note = els.editNoteInput.value.trim();
      persist();
      render();
    }
  });

  // Time chips
  document.querySelectorAll("[data-timechip]").forEach(btn => {
    btn.addEventListener("click", () => {
      const chip = btn.getAttribute("data-timechip");
      const next = timeFromChip(chip);
      if (next) {
        els.timeInput.value = next;
        els.timeInput.focus();
      }
    });
  });

  render();
}

function expandAdd() {
  els.addForm.hidden = false;
  els.addFormDivider.hidden = false;
  els.showAddBtn.hidden = true;
  els.timeInput.value = formatTime(toTimeInputValue(roundTo5Minutes(new Date())));
  els.titleInput.focus();
}

function collapseAdd() {
  els.addForm.hidden = true;
  els.addFormDivider.hidden = true;
  els.showAddBtn.hidden = false;
  els.titleInput.value = "";
  els.noteInput.value = "";
  els.noteWrap.hidden = true;
  els.toggleNoteBtn.textContent = "Add note";
  addRowImportant = false;
  els.importantToggle.classList.remove("active");
  els.importantToggle.querySelector(".icon").textContent = "⚐";
  syncAddEnabled();
}

function render() {
  if (currentView === "timeline") {
    renderTimeline();
  } else if (currentView === "tasks") {
    renderTasks();
  } else if (currentView === "planner") {
    renderPlanner();
  }
}

function switchView(view) {
  currentView = view;
  
  // Reset planner edit mode when switching
  plannerEditMode = false;
  els.showPlannerAddBtn.textContent = "Edit";
  els.plannerDisplayContent.hidden = false;
  els.plannerEditContent.hidden = true;
  
  // Update Nav
  els.navTimeline.classList.toggle("active", view === "timeline");
  els.navTasks.classList.toggle("active", view === "tasks");
  els.navPlanner.classList.toggle("active", view === "planner");
  
  // Show/Hide Containers
  els.timelineView.hidden = view !== "timeline";
  els.tasksView.hidden = view !== "tasks";
  els.plannerView.hidden = view !== "planner";
  els.timelineActions.hidden = view !== "timeline";
  
  render();
}

function renderTimeline() {
  const dayEvents = events.filter(e => e.date === selectedDate);
  const sorted = stableSort(dayEvents.slice(), compareEvent);

  els.timeline.innerHTML = "";
  for (const item of sorted) {
    els.timeline.appendChild(createEventNode(item));
  }

  els.emptyState.hidden = dayEvents.length > 0;
  els.countHint.textContent = `${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}`;
  
  // Update Progress Bar
  if (dayEvents.length > 0) {
    const doneCount = dayEvents.filter(e => e.done).length;
    const percent = Math.round((doneCount / dayEvents.length) * 100);
    els.progressBarWrap.hidden = false;
    els.progressBarFill.style.width = `${percent}%`;
  } else {
    els.progressBarWrap.hidden = true;
    els.progressBarFill.style.width = "0%";
  }

  syncTitle();
  updateSuggestions();
}

function renderTasks() {
  const unfinished = events.filter(e => !e.done);
  els.unfinishedCount.textContent = `${unfinished.length} upcoming tasks`;
  
  // Sort by date then by time
  unfinished.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return compareEvent(a, b);
  });
  
  // Group by date
  const groups = new Map();
  for (const item of unfinished) {
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date).push(item);
  }
  
  els.unfinishedList.innerHTML = "";
  if (unfinished.length === 0) {
    els.unfinishedList.innerHTML = '<div class="empty-view">Everything caught up.</div>';
    return;
  }
  
  for (const [date, items] of groups) {
    const groupEl = document.createElement("div");
    groupEl.className = "date-group";
    
    const dt = new Date(`${date}T00:00:00`);
    const dateLabel = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
    
    groupEl.innerHTML = `<div class="date-group-header">${dateLabel}</div>`;
    
    const itemsEl = document.createElement("div");
    for (const item of items) {
      const itemEl = document.createElement("div");
      itemEl.className = "task-item";
      itemEl.innerHTML = `<span class="task-bullet"></span><span>${item.title}</span>`;
      itemsEl.appendChild(itemEl);
    }
    groupEl.appendChild(itemsEl);
    els.unfinishedList.appendChild(groupEl);
  }
}

function renderPlanner() {
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  els.monthlyPlannerList.innerHTML = "";
  
  // Group by month
  const groups = new Map();
  for (let i = 0; i < 12; i++) groups.set(i, []);
  for (const goal of monthlyGoals) {
    groups.get(goal.month).push(goal);
  }
  
  for (let i = 0; i < 12; i++) {
    const items = groups.get(i);
    if (items.length === 0 && i < new Date().getMonth()) continue; // Skip past empty months
    
    const groupEl = document.createElement("div");
    groupEl.className = "month-group";
    
    const header = document.createElement("div");
    header.className = "month-header";
    header.textContent = months[i];
    groupEl.appendChild(header);
    
    const list = document.createElement("div");
    list.className = "goal-list";
    
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "count-label";
      empty.textContent = "No goals set";
      list.appendChild(empty);
    } else {
      for (const item of items) {
        const itemEl = document.createElement("div");
        itemEl.className = "goal-item";
        itemEl.innerHTML = `
          <div class="goal-item-left">
            <span>${item.title}</span>
          </div>
        `;
        list.appendChild(itemEl);
      }
    }
    
    groupEl.appendChild(list);
    els.monthlyPlannerList.appendChild(groupEl);
  }
}

function renderPlannerEditList() {
  const months = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];
  
  els.plannerEditList.innerHTML = "";
  
  if (monthlyGoals.length === 0) {
    els.plannerEditList.innerHTML = '<div class="empty-view">No goals yet.</div>';
    return;
  }

  // Sort by month
  const sorted = [...monthlyGoals].sort((a, b) => a.month - b.month);

  for (const item of sorted) {
    const itemEl = document.createElement("div");
    itemEl.className = "goal-item";
    itemEl.style.marginBottom = "8px";
    itemEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:2px;">
        <span style="font-size:10px; color:var(--muted); text-transform:uppercase;">${months[item.month]}</span>
        <span style="font-size:13px;">${item.title}</span>
      </div>
      <button class="btn-text-sm danger" data-goal-id="${item.id}">Delete</button>
    `;
    
    itemEl.querySelector("button").addEventListener("click", () => {
      monthlyGoals = monthlyGoals.filter(g => g.id !== item.id);
      persistMonthly();
      renderPlannerEditList();
      render();
    });
    
    els.plannerEditList.appendChild(itemEl);
  }
}

function persistMonthly() {
  localStorage.setItem(MONTHLY_KEY, JSON.stringify(monthlyGoals));
}

function loadMonthlyGoals() {
  try {
    const raw = localStorage.getItem(MONTHLY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function createEventNode(item) {
  const frag = els.tmpl.content.cloneNode(true);
  const li = frag.querySelector(".timeline-item");
  li.dataset.id = item.id;
  li.dataset.important = String(item.important);
  li.dataset.done = String(item.done);

  const when = li.querySelector('[data-role="when"]');
  const what = li.querySelector('[data-role="what"]');
  const note = li.querySelector('[data-role="note"]');
  const flag = li.querySelector('[data-role="flag"]');
  const starBtn = li.querySelector('.star-btn');

  when.textContent = item.time;
  
  if (item.important) {
    what.innerHTML = `<span class="flag-indicator">!!</span> ${item.title}`;
  } else {
    what.textContent = item.title;
  }

  note.textContent = item.note || "";
  note.hidden = !item.note;
  flag.textContent = item.important ? "⚑" : "⚐";
  starBtn.dataset.active = String(item.important);

  li.addEventListener("click", (e) => {
    const target = e.target;
    const action = target.closest("[data-action]")?.getAttribute("data-action");
    if (!action) return;

    if (action === "toggleDone") {
      item.done = !item.done;
      persist();
      render();
    } else if (action === "toggleImportant") {
      item.important = !item.important;
      persist();
      render();
    } else if (action === "edit") {
      // Close any existing menus first
      document.querySelectorAll(".popover-menu").forEach(m => m.remove());
      document.querySelectorAll(".timeline-item").forEach(item => item.style.zIndex = "");
      
      const menu = document.createElement("div");
      menu.className = "popover-menu";
      li.style.zIndex = "1000"; // Ensure this item is above others
      
      // Prevent any clicks inside the menu from reaching the timeline item listener
      menu.addEventListener("click", (e) => e.stopPropagation());
      
      const editBtn = document.createElement("button");
      editBtn.className = "popover-item";
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        els.editDialog.dataset.editingId = item.id;
        els.editTimeInput.value = item.time;
        els.editTitleInput.value = item.title;
        els.editNoteInput.value = item.note;
        els.editDialog.showModal();
        menu.remove();
        li.style.zIndex = "";
      };
      
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "popover-item danger";
      deleteBtn.type = "button";
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm("Delete this event?")) {
          events = events.filter(e => e.id !== item.id);
          persist();
          render();
        }
        menu.remove();
        li.style.zIndex = "";
      };
      
      menu.appendChild(editBtn);
      menu.appendChild(deleteBtn);
      
      // Append to the item
      li.appendChild(menu);
      
      // Close on click outside
      setTimeout(() => {
        const closer = (e) => {
          if (!menu.parentElement) {
            document.removeEventListener("click", closer);
            return;
          }
          if (!menu.contains(e.target)) {
            menu.remove();
            li.style.zIndex = "";
            document.removeEventListener("click", closer);
          }
        };
        document.addEventListener("click", closer);
      }, 0);
    }
  });

  return li;
}

// Helpers
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(events)); }
function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).map(normalizeEvent).filter(Boolean) : [];
  } catch { return []; }
}
function normalizeEvent(x) {
  if (!x || typeof x !== "object") return null;
  return {
    id: x.id || cryptoId(),
    date: x.date || localDateKey(new Date()),
    time: x.time || "",
    title: x.title || "",
    note: x.note || "",
    important: !!x.important,
    done: !!x.done,
    createdAt: x.createdAt || Date.now()
  };
}

function loadSelectedDate() {
  const stored = localStorage.getItem(SELECTED_DATE_KEY);
  return (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) ? stored : localDateKey(new Date());
}

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftDate(days) {
  const dt = new Date(`${selectedDate}T00:00:00`);
  dt.setDate(dt.getDate() + days);
  selectedDate = localDateKey(dt);
  els.dateInput.value = selectedDate;
  localStorage.setItem(SELECTED_DATE_KEY, selectedDate);
  render();
}

function syncTitle() {
  const dt = new Date(`${selectedDate}T00:00:00`);
  const today = localDateKey(new Date());

  if (selectedDate === today) {
    els.pageTitle.textContent = "Today";
  } else {
    els.pageTitle.textContent = dt.toLocaleDateString(undefined, { 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  }
}

function syncAddEnabled() {
  els.addBtn.disabled = els.titleInput.value.trim().length === 0;
}

function updateSuggestions() {
  const titles = Array.from(new Set(events.map(e => e.title.trim()).filter(Boolean)));
  els.suggestions.innerHTML = "";
  titles.slice(0, 10).forEach(t => {
    const opt = document.createElement("option");
    opt.value = t;
    els.suggestions.appendChild(opt);
  });
}

function compareEvent(a, b) {
  const am = timeToMinutes(a.time), bm = timeToMinutes(b.time);
  if (am !== bm) return am - bm;
  return a.createdAt - b.createdAt;
}

function timeToMinutes(t) {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 0;
  return parseInt(m[1]) * 60 + parseInt(m[2]);
}

function parseTimeFlexible(raw) {
  const s = raw.trim().toLowerCase();
  if (s === "now") return toTimeInputValue(new Date());

  // Handle relative time like "+15", "+1h", "in 20"
  const relMatch = s.match(/^(?:\+|\bin\s+)(\d+)(m|h)?$/);
  if (relMatch) {
    const amount = parseInt(relMatch[1]);
    const unit = relMatch[2] || "m";
    const dt = new Date();
    if (unit === "h") dt.setHours(dt.getHours() + amount);
    else dt.setMinutes(dt.getMinutes() + amount);
    return toTimeInputValue(dt);
  }

  let h, m;
  const m1 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m1) { h = parseInt(m1[1]); m = parseInt(m1[2]); }
  const m2 = s.match(/^(\d{3,4})$/);
  if (m2) { 
    const v = m2[1]; 
    if (v.length === 3) { h = parseInt(v[0]); m = parseInt(v.slice(1)); }
    else { h = parseInt(v.slice(0,2)); m = parseInt(v.slice(2)); }
  }
  if (h !== undefined && h >= 0 && h < 24 && m >= 0 && m < 60) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  return null;
}

function formatTime(t) { return t; }
function toTimeInputValue(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function roundTo5Minutes(d) {
  const t = new Date(d);
  t.setSeconds(0, 0);
  t.setMinutes(Math.round(t.getMinutes() / 5) * 5);
  return t;
}
function cryptoId() { return Math.random().toString(36).slice(2, 11); }
function stableSort(arr, cmp) {
  return arr.map((item, idx) => ({ item, idx }))
    .sort((a, b) => cmp(a.item, b.item) || a.idx - b.idx)
    .map(x => x.item);
}
function timeFromChip(chip) {
  const base = new Date();
  if (chip === "now") return toTimeInputValue(roundTo5Minutes(base));
  const m = chip.match(/^[+](\d+)$/);
  if (!m) return null;
  base.setMinutes(base.getMinutes() + parseInt(m[1]));
  return toTimeInputValue(roundTo5Minutes(base));
}
