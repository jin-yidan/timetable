/**
 * Minimal offline timeline widget.
 */

const STORAGE_KEY = "timetable.events.v1";
const SELECTED_DATE_KEY = "timetable.selectedDate.v1";
const MONTHLY_KEY = "timetable.monthly.v1";
const WEEK_START_KEY = "timetable.weekStart.v1";
const RECURRENCE_DONE_KEY = "timetable.recurrenceDone.v1";
const CALENDAR_URL_KEY = "timetable.calendarUrl.v1";
const IMPORTED_EVENTS_KEY = "timetable.importedEvents.v1";

/**
 * @typedef {{
 *   id: string;
 *   date: string;
 *   time: string;
 *   title: string;
 *   note: string;
 *   important: boolean;
 *   done: boolean;
 *   createdAt: number;
 *   endTime?: string;
 *   sortOrder?: number;
 *   modifiedAt?: number;
 *   recurrence?: { type: "none" | "daily" | "weekly" | "monthly"; interval: number; endDate?: string; daysOfWeek?: number[] } | null;
 * }} EventItem
 */
/** @typedef {{ id: string; month: number; title: string; createdAt: number }} MonthlyGoal */

const els = {
  // Add Form Elements
  addForm: /** @type {HTMLFormElement} */ (document.getElementById("addForm")),
  timeInput: /** @type {HTMLInputElement} */ (document.getElementById("timeInput")),
  endTimeInput: /** @type {HTMLInputElement} */ (document.getElementById("endTimeInput")),
  titleInput: /** @type {HTMLInputElement} */ (document.getElementById("titleInput")),
  noteInput: /** @type {HTMLInputElement} */ (document.getElementById("noteInput")),
  importantToggle: /** @type {HTMLButtonElement} */ (document.getElementById("importantToggle")),
  addBtn: /** @type {HTMLButtonElement} */ (document.getElementById("addBtn")),
  showAddBtn: /** @type {HTMLButtonElement} */ (document.getElementById("showAddBtn")),
  cancelAddBtn: /** @type {HTMLButtonElement} */ (document.getElementById("cancelAddBtn")),
  toggleNoteBtn: /** @type {HTMLButtonElement} */ (document.getElementById("toggleNoteBtn")),
  suggestions: /** @type {HTMLDataListElement} */ (document.getElementById("eventSuggestions")),
  recurrenceSelect: /** @type {HTMLSelectElement} */ (document.getElementById("recurrenceSelect")),
  nlpPreview: /** @type {HTMLDivElement} */ (document.getElementById("nlpPreview")),

  // Timeline Elements
  timeline: /** @type {HTMLOListElement} */ (document.getElementById("timeline")),
  timeBlockContainer: /** @type {HTMLDivElement} */ (document.getElementById("timeBlockContainer")),
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
  dateSubtitle: /** @type {HTMLDivElement} */ (document.getElementById("dateSubtitle")),
  viewToggle: /** @type {HTMLButtonElement} */ (document.getElementById("viewToggle")),

  // Modal
  editDialog: /** @type {HTMLDialogElement} */ (document.getElementById("editDialog")),
  editForm: /** @type {HTMLFormElement} */ (document.getElementById("editForm")),
  editDateInput: /** @type {HTMLInputElement} */ (document.getElementById("editDateInput")),
  editTimeInput: /** @type {HTMLInputElement} */ (document.getElementById("editTimeInput")),
  editEndTimeInput: /** @type {HTMLInputElement} */ (document.getElementById("editEndTimeInput")),
  editTitleInput: /** @type {HTMLInputElement} */ (document.getElementById("editTitleInput")),
  editNoteInput: /** @type {HTMLInputElement} */ (document.getElementById("editNoteInput")),
  editRecurrenceSelect: /** @type {HTMLSelectElement} */ (document.getElementById("editRecurrenceSelect")),
  closeEditBtn: /** @type {HTMLButtonElement} */ (document.getElementById("closeEditBtn")),
  deleteEditBtn: /** @type {HTMLButtonElement} */ (document.getElementById("deleteEditBtn")),

  // Navigation
  navTimeline: document.getElementById("navTimeline"),
  navWeek: document.getElementById("navWeek"),
  navTasks: document.getElementById("navTasks"),
  navPlanner: document.getElementById("navPlanner"),
  timelineActions: document.getElementById("timelineActions"),
  weekActions: document.getElementById("weekActions"),

  // View Containers
  timelineView: document.getElementById("timelineView"),
  weekView: document.getElementById("weekView"),
  tasksView: document.getElementById("tasksView"),
  plannerView: document.getElementById("plannerView"),

  // Week View Elements
  weekGrid: document.getElementById("weekGrid"),
  weekLabel: document.getElementById("weekLabel"),
  prevWeekBtn: document.getElementById("prevWeekBtn"),
  nextWeekBtn: document.getElementById("nextWeekBtn"),
  todayWeekBtn: document.getElementById("todayWeekBtn"),

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

  // Settings
  settingsBtn: document.getElementById("settingsBtn"),
  settingsDialog: document.getElementById("settingsDialog"),
  settingsForm: document.getElementById("settingsForm"),
  calendarUrlInput: document.getElementById("calendarUrlInput"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  syncStatus: document.getElementById("syncStatus"),
  dateInfoLabel: document.getElementById("dateInfoLabel"),

};

/** @type {EventItem[]} */
let events = loadEvents();
/** @type {MonthlyGoal[]} */
let monthlyGoals = loadMonthlyGoals();
/** @type {Object<string, boolean>} */
let recurrenceDoneMap = loadRecurrenceDone();
/** @type {EventItem[]} */
let importedEvents = loadImportedEvents();
/** @type {"timeline" | "week" | "tasks" | "planner"} */
let currentView = "timeline";
/** @type {"list" | "block"} */
let timelineViewMode = "list";
/** @type {boolean} */
let plannerEditMode = false;
let selectedDate = loadSelectedDate();
let weekStartDate = loadWeekStart();
let addRowImportant = false;
let draggedItem = null;
let calendarUrl = localStorage.getItem(CALENDAR_URL_KEY) || "";

// Defer initialization to avoid choppiness
requestAnimationFrame(() => {
  init();
});

function init() {
  // Setup inputs
  collapseAdd();
  els.dateInput.value = selectedDate;

  // Navigation
  els.navTimeline.addEventListener("click", () => switchView("timeline"));
  els.navWeek?.addEventListener("click", () => switchView("week"));
  els.navTasks.addEventListener("click", () => switchView("tasks"));
  els.navPlanner.addEventListener("click", () => switchView("planner"));

  // Timeline date navigation
  els.dateInput.addEventListener("change", (e) => {
    selectedDate = els.dateInput.value;
    localStorage.setItem(SELECTED_DATE_KEY, selectedDate);
    render();
  });

  els.prevDayBtn.addEventListener("click", () => shiftDate(-1));
  els.nextDayBtn.addEventListener("click", () => shiftDate(1));

  // Week navigation
  els.prevWeekBtn?.addEventListener("click", () => shiftWeek(-1));
  els.nextWeekBtn?.addEventListener("click", () => shiftWeek(1));
  els.todayWeekBtn?.addEventListener("click", goToCurrentWeek);

  // View toggle (list/block)
  els.viewToggle?.addEventListener("click", toggleViewMode);

  // Title input with NLP parsing
  els.titleInput.addEventListener("input", () => {
    syncAddEnabled();
    parseNaturalLanguage(els.titleInput.value);
  });

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
    const isDisabled = els.noteInput.disabled;
    els.noteInput.disabled = !isDisabled;
    els.toggleNoteBtn.textContent = isDisabled ? "Hide note" : "Note";
    els.toggleNoteBtn.classList.toggle("active", isDisabled);
    if (isDisabled) els.noteInput.focus();
  });

  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const time = parseTimeFlexible(els.timeInput.value.trim());
    const endTime = els.endTimeInput?.value ? parseTimeFlexible(els.endTimeInput.value.trim()) : null;
    let title = els.titleInput.value.trim();
    const note = els.noteInput.disabled ? "" : els.noteInput.value.trim();

    if (!title || !time) return;

    // Get parsed NLP data
    const parsed = parseNaturalLanguageData(title);
    const eventDate = parsed.date || selectedDate;
    const eventTime = parsed.time || time;
    const cleanTitle = parsed.cleanTitle || title;
    const recurrenceType = parsed.recurrence || els.recurrenceSelect?.value || "none";

    const item = {
      id: cryptoId(),
      date: eventDate,
      time: eventTime,
      title: cleanTitle,
      note,
      important: addRowImportant,
      done: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      endTime: parsed.endTime || endTime,
      sortOrder: events.length,
      recurrence: recurrenceType !== "none" ? { type: recurrenceType, interval: 1 } : null,
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
    events = events.filter(e => e.id !== id);
    persist();
    render();
    els.editDialog.close();
  });
  
  els.editForm.addEventListener("submit", (e) => {
    const id = els.editDialog.dataset.editingId;
    if (!id) return;

    const item = events.find(e => e.id === id);
    if (item) {
      item.date = els.editDateInput.value || item.date;
      item.time = parseTimeFlexible(els.editTimeInput.value) || item.time;
      if (els.editEndTimeInput?.value === "") {
        item.endTime = null;
      } else if (els.editEndTimeInput?.value) {
        const parsed = parseTimeFlexible(els.editEndTimeInput.value);
        if (parsed !== null) item.endTime = parsed;
      }
      item.title = els.editTitleInput.value.trim();
      item.note = els.editNoteInput.value.trim();
      item.modifiedAt = Date.now();

      const recurrence = els.editRecurrenceSelect?.value || "none";
      item.recurrence = recurrence !== "none" ? { type: recurrence, interval: 1 } : null;

      persist();
      render();
    }
  });

  // Auto-Today Refresh logic
  setInterval(() => {
    const now = new Date();
    const todayStr = localDateKey(now);
    // If the date has changed and we were viewing the "previous" today
    if (selectedDate !== todayStr && currentView === "timeline") {
      // Check if the page title was "Today"
      const wasToday = els.pageTitle.textContent === "Today";
      if (wasToday) {
        selectedDate = todayStr;
        els.dateInput.value = selectedDate;
        localStorage.setItem(SELECTED_DATE_KEY, selectedDate);
        render();
      }
    }
  }, 60000); // Check every minute

  // Settings
  els.settingsBtn?.addEventListener("click", openSettings);
  els.closeSettingsBtn?.addEventListener("click", () => els.settingsDialog?.close());
  els.settingsForm?.addEventListener("submit", saveSettings);

  // Listen for imported events from Swift
  window.receiveImportedEvents = (eventsJson) => {
    try {
      const parsed = JSON.parse(eventsJson);
      importedEvents = parsed;
      localStorage.setItem(IMPORTED_EVENTS_KEY, eventsJson);
      render();
      updateSyncStatus("success", `Synced ${parsed.length} events`);
    } catch (e) {
      console.error("Failed to parse imported events:", e);
      updateSyncStatus("error", "Failed to parse calendar data");
    }
  };

  // Request calendar sync from Swift on load
  if (calendarUrl && window.webkit?.messageHandlers?.calendarSync) {
    window.webkit.messageHandlers.calendarSync.postMessage({ action: "sync", url: calendarUrl });
  }

  render();
}

function expandAdd() {
  els.addForm.hidden = false;
  els.addFormDivider.hidden = false;
  els.showAddBtn.hidden = true;
  els.timeInput.value = formatTime(toTimeInputValue(roundTo5Minutes(new Date())));
  els.noteInput.disabled = true;
  els.noteInput.value = "";
  els.toggleNoteBtn.textContent = "Note";
  els.toggleNoteBtn.classList.remove("active");
  els.titleInput.focus();
}

function collapseAdd() {
  els.addForm.hidden = true;
  els.addFormDivider.hidden = true;
  els.showAddBtn.hidden = false;
  els.titleInput.value = "";
  els.noteInput.value = "";
  els.noteInput.disabled = true;
  els.toggleNoteBtn.textContent = "Note";
  els.toggleNoteBtn.classList.remove("active");
  addRowImportant = false;
  els.importantToggle.classList.remove("active");
  els.importantToggle.querySelector(".icon").textContent = "⚐";
  syncAddEnabled();
}

function render() {
  if (currentView === "timeline") {
    renderTimeline();
  } else if (currentView === "week") {
    renderWeekView();
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
  els.navWeek?.classList.toggle("active", view === "week");
  els.navTasks.classList.toggle("active", view === "tasks");
  els.navPlanner.classList.toggle("active", view === "planner");

  // Show/Hide Containers
  els.timelineView.hidden = view !== "timeline";
  els.weekView && (els.weekView.hidden = view !== "week");
  els.tasksView.hidden = view !== "tasks";
  els.plannerView.hidden = view !== "planner";
  els.timelineActions.hidden = view !== "timeline";
  els.weekActions && (els.weekActions.hidden = view !== "week");

  // Update page title
  if (view === "week") {
    els.pageTitle.textContent = "Week";
    els.dateSubtitle.textContent = "";
  } else if (view === "tasks") {
    els.pageTitle.textContent = "Upcoming";
    els.dateSubtitle.textContent = "";
  } else if (view === "planner") {
    els.pageTitle.textContent = "Planner";
    els.dateSubtitle.textContent = "";
  }

  render();
}

function renderTimeline() {
  // Get events for this day including recurring instances
  const dayEvents = getEventsForDate(selectedDate);
  const dayImported = getImportedEventsForDate(selectedDate);
  const allEvents = [
    ...dayEvents.map(e => ({ ...e, isImported: false })),
    ...dayImported.map(e => ({ ...e, isImported: true }))
  ];
  const sorted = stableSort(allEvents.slice(), compareEvent);

  els.timeline.innerHTML = "";
  if (els.timeBlockContainer) els.timeBlockContainer.innerHTML = "";

  if (timelineViewMode === "list") {
    els.timeline.hidden = false;
    if (els.timeBlockContainer) els.timeBlockContainer.hidden = true;

    for (const item of sorted) {
      els.timeline.appendChild(createEventNode(item, item._instanceDate || null, item.isImported));
    }
  } else {
    // Block view
    els.timeline.hidden = true;
    if (els.timeBlockContainer) {
      els.timeBlockContainer.hidden = false;
      renderTimeBlocks(sorted, els.timeBlockContainer);
    }
  }

  const totalEvents = allEvents.length;
  els.emptyState.hidden = totalEvents > 0;
  els.countHint.textContent = `${totalEvents} event${totalEvents === 1 ? "" : "s"}`;

  // Update Progress Bar (only count manual events for progress)
  if (dayEvents.length > 0) {
    const doneCount = dayEvents.filter(e => isEventDone(e, selectedDate)).length;
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
  // Only show manual unfinished events (no imported events)
  const unfinished = events.filter(e => !e.done);

  // Filter to only future/today events
  const today = localDateKey(new Date());
  const futureTasks = unfinished.filter(e => e.date >= today);

  els.unfinishedCount.textContent = `${futureTasks.length} upcoming tasks`;

  // Sort by date then by time
  futureTasks.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return compareEvent(a, b);
  });

  // Group by date
  const groups = new Map();
  for (const item of futureTasks) {
    if (!groups.has(item.date)) groups.set(item.date, []);
    groups.get(item.date).push(item);
  }

  els.unfinishedList.innerHTML = "";
  if (futureTasks.length === 0) {
    els.unfinishedList.innerHTML = '<div class="empty-view">Everything caught up.</div>';
    return;
  }

  for (const [date, items] of groups) {
    const groupEl = document.createElement("div");
    groupEl.className = "date-group";

    const dt = new Date(`${date}T00:00:00`);
    const dateLabel = dt.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });

    // Get holiday info for the date
    const dateInfo = typeof formatDateInfo === "function" ? formatDateInfo(date) : "";
    const dateInfoHtml = dateInfo ? ` · <span style="color:var(--danger)">${dateInfo}</span>` : "";

    groupEl.innerHTML = `<div class="date-group-header">${dateLabel}${dateInfoHtml}</div>`;

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

function createEventNode(item, instanceDate = null, isImported = false) {
  const frag = els.tmpl.content.cloneNode(true);
  const li = frag.querySelector(".timeline-item");
  const displayDate = instanceDate || item.date;
  li.dataset.id = item.id;
  li.dataset.instanceDate = displayDate;
  li.dataset.important = String(item.important);
  li.dataset.done = String(isImported ? false : isEventDone(item, displayDate));
  li.draggable = !isImported;
  if (isImported) li.classList.add("imported");

  const when = li.querySelector('[data-role="when"]');
  const what = li.querySelector('[data-role="what"]');
  const note = li.querySelector('[data-role="note"]');
  const indicators = li.querySelector('[data-role="indicators"]');

  // Time display with end time if present
  if (item.endTime) {
    when.textContent = `${item.time}-${item.endTime}`;
  } else {
    when.textContent = item.time;
  }

  // Title with indicators
  let titleContent = item.title;
  if (item.important) {
    titleContent = `<span class="flag-indicator">!!</span> ${titleContent}`;
  }
  what.innerHTML = titleContent;

  // Show indicators (recurring)
  if (indicators) {
    let indicatorHtml = "";
    if (item.recurrence && item.recurrence.type !== "none") {
      indicatorHtml += '<span class="indicator repeat-indicator" title="Recurring">↻</span>';
    }
    indicators.innerHTML = indicatorHtml;
  }

  note.textContent = item.note || "";
  note.hidden = !item.note;

  // Drag & Drop handlers (only for non-imported events)
  if (!isImported) {
    li.addEventListener("dragstart", (e) => {
      draggedItem = { item, instanceDate: displayDate };
      li.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.id);
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      draggedItem = null;
      document.querySelectorAll(".drag-over").forEach(el => el.classList.remove("drag-over"));
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem.item.id !== item.id) {
        li.classList.add("drag-over");
      }
    });

    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over");
    });

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      if (draggedItem && draggedItem.item.id !== item.id) {
        reorderEvents(draggedItem.item.id, item.id, displayDate);
      }
    });
  }

  li.addEventListener("click", (e) => {
    if (isImported) return; // Don't handle clicks for imported events
    const target = e.target;
    const action = target.closest("[data-action]")?.getAttribute("data-action");
    if (!action) return;

    if (action === "toggleDone") {
      toggleEventDone(item, displayDate);
      persist();
      render();
    } else if (action === "edit") {
      // Close any existing menus first
      document.querySelectorAll(".popover-menu").forEach(m => m.remove());
      document.querySelectorAll(".timeline-item").forEach(item => item.style.zIndex = "");

      const menu = document.createElement("div");
      menu.className = "popover-menu";
      li.style.zIndex = "1000";

      menu.addEventListener("click", (e) => e.stopPropagation());

      const editBtn = document.createElement("button");
      editBtn.className = "popover-item";
      editBtn.type = "button";
      editBtn.textContent = "Edit";
      editBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openEditDialog(item);
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
        events = events.filter(e => e.id !== item.id);
        persist();
        render();
        menu.remove();
        li.style.zIndex = "";
      };

      menu.appendChild(editBtn);
      menu.appendChild(deleteBtn);

      li.appendChild(menu);

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

function openEditDialog(item) {
  els.editDialog.dataset.editingId = item.id;
  els.editDateInput.value = item.date;
  els.editTimeInput.value = item.time;
  if (els.editEndTimeInput) els.editEndTimeInput.value = item.endTime || "";
  els.editTitleInput.value = item.title;
  els.editNoteInput.value = item.note;
  if (els.editRecurrenceSelect) {
    els.editRecurrenceSelect.value = item.recurrence?.type || "none";
  }
  els.editDialog.showModal();
}

// Helpers
function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}
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
    createdAt: x.createdAt || Date.now(),
    modifiedAt: x.modifiedAt || Date.now(),
    endTime: x.endTime || null,
    sortOrder: x.sortOrder ?? null,
    recurrence: x.recurrence || null,
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
  const weekday = dt.toLocaleDateString(undefined, { weekday: "long" });
  const month = dt.toLocaleDateString(undefined, { month: "short" });
  const day = dt.getDate();
  const year = dt.getFullYear();

  if (selectedDate === today) {
    els.pageTitle.textContent = "Today";
  } else {
    els.pageTitle.textContent = weekday;
  }
  els.dateSubtitle.textContent = `${year}/${month}/${day}`;

  // Update holiday/solar term label
  updateDateInfoLabel(selectedDate);
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

// ===== RECURRING EVENTS =====

function loadRecurrenceDone() {
  try {
    const raw = localStorage.getItem(RECURRENCE_DONE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function persistRecurrenceDone() {
  localStorage.setItem(RECURRENCE_DONE_KEY, JSON.stringify(recurrenceDoneMap));
}

function getRecurrenceDoneKey(eventId, date) {
  return `${eventId}:${date}`;
}

function isEventDone(event, date) {
  if (!event.recurrence || event.recurrence.type === "none") {
    return event.done;
  }
  const key = getRecurrenceDoneKey(event.id, date);
  return recurrenceDoneMap[key] || false;
}

function toggleEventDone(event, date) {
  // Find the actual event in the array by ID (not the copy used for rendering)
  const actualEvent = events.find(e => e.id === event.id);
  if (!actualEvent) return;

  if (!actualEvent.recurrence || actualEvent.recurrence.type === "none") {
    actualEvent.done = !actualEvent.done;
    actualEvent.modifiedAt = Date.now();
  } else {
    const key = getRecurrenceDoneKey(actualEvent.id, date);
    recurrenceDoneMap[key] = !recurrenceDoneMap[key];
    persistRecurrenceDone();
  }
}

function getEventsForDate(dateStr) {
  const result = [];
  const targetDate = new Date(`${dateStr}T00:00:00`);

  for (const event of events) {
    const eventDate = new Date(`${event.date}T00:00:00`);

    // Non-recurring event
    if (!event.recurrence || event.recurrence.type === "none") {
      if (event.date === dateStr) {
        result.push(event);
      }
      continue;
    }

    // Check if recurring event applies to this date
    if (eventDate > targetDate) continue;
    if (event.recurrence.endDate && new Date(`${event.recurrence.endDate}T00:00:00`) < targetDate) continue;

    const interval = event.recurrence.interval || 1;

    if (event.recurrence.type === "daily") {
      const daysDiff = Math.floor((targetDate - eventDate) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff % interval === 0) {
        result.push({ ...event, _instanceDate: dateStr });
      }
    } else if (event.recurrence.type === "weekly") {
      const daysDiff = Math.floor((targetDate - eventDate) / (1000 * 60 * 60 * 24));
      if (daysDiff >= 0 && daysDiff % (7 * interval) === 0) {
        result.push({ ...event, _instanceDate: dateStr });
      }
    } else if (event.recurrence.type === "monthly") {
      if (targetDate.getDate() === eventDate.getDate()) {
        const monthsDiff = (targetDate.getFullYear() - eventDate.getFullYear()) * 12 + (targetDate.getMonth() - eventDate.getMonth());
        if (monthsDiff >= 0 && monthsDiff % interval === 0) {
          result.push({ ...event, _instanceDate: dateStr });
        }
      }
    }
  }

  return result;
}

// ===== TIME BLOCKING VISUALIZATION =====

function toggleViewMode() {
  timelineViewMode = timelineViewMode === "list" ? "block" : "list";
  if (els.viewToggle) {
    els.viewToggle.textContent = timelineViewMode === "list" ? "☰" : "▤";
  }
  render();
}

function renderTimeBlocks(dayEvents, container) {
  container.innerHTML = "";

  // Create inner wrapper for fixed height
  const innerWrapper = document.createElement("div");
  innerWrapper.className = "time-block-inner";

  // Create hour ruler (0 to 24 = 24 hour slots, 60px each = 1440px total)
  const hourRuler = document.createElement("div");
  hourRuler.className = "hour-ruler";
  for (let h = 0; h < 24; h++) {
    const hourLine = document.createElement("div");
    hourLine.className = "hour-line";
    hourLine.dataset.hour = h;
    hourLine.innerHTML = `<span class="hour-label">${String(h).padStart(2, "0")}</span>`;
    hourRuler.appendChild(hourLine);
  }
  innerWrapper.appendChild(hourRuler);

  // Create events container
  const eventsLayer = document.createElement("div");
  eventsLayer.className = "time-blocks-layer";

  // Constants for positioning: 60px per hour, 24 hours = 1440px total
  const HOUR_HEIGHT = 60;
  const START_HOUR = 0;

  for (const event of dayEvents) {
    const block = createTimeBlock(event, START_HOUR, HOUR_HEIGHT, event.isImported);
    eventsLayer.appendChild(block);
  }

  innerWrapper.appendChild(eventsLayer);
  container.appendChild(innerWrapper);

  // Add current time indicator if today
  if (selectedDate === localDateKey(new Date())) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const indicator = document.createElement("div");
    indicator.className = "current-time-indicator";
    const topPx = (nowMinutes / 60) * HOUR_HEIGHT;
    indicator.style.top = `${topPx}px`;
    eventsLayer.appendChild(indicator);
  }
}

function createTimeBlock(event, startHour = 0, hourHeight = 60, isImported = false) {
  const block = document.createElement("div");
  block.className = "time-block";
  if (isImported) block.classList.add("imported");
  block.dataset.id = event.id;

  const eventStartMinutes = timeToMinutes(event.time);
  const eventEndMinutes = event.endTime ? timeToMinutes(event.endTime) : eventStartMinutes + 60;
  const duration = Math.max(eventEndMinutes - eventStartMinutes, 30);

  // Position using pixels: each hour is 60px
  const topPx = (eventStartMinutes / 60) * hourHeight;
  const heightPx = (duration / 60) * hourHeight;

  block.style.top = `${topPx}px`;
  block.style.height = `${Math.max(heightPx, 30)}px`;

  if (!isImported && isEventDone(event, event._instanceDate || event.date)) {
    block.classList.add("done");
  }
  if (event.important) {
    block.classList.add("important");
  }

  block.innerHTML = `
    <div class="block-time">${event.time}${event.endTime ? `-${event.endTime}` : ""}</div>
    <div class="block-title">${event.title}</div>
  `;

  if (!isImported) {
    block.addEventListener("click", () => openEditDialog(event));
  }

  return block;
}

// ===== WEEK VIEW =====

function loadWeekStart() {
  const stored = localStorage.getItem(WEEK_START_KEY);
  if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
    return stored;
  }
  // Default to current week's Monday
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return localDateKey(monday);
}

function shiftWeek(weeks) {
  const dt = new Date(`${weekStartDate}T00:00:00`);
  dt.setDate(dt.getDate() + (weeks * 7));
  weekStartDate = localDateKey(dt);
  localStorage.setItem(WEEK_START_KEY, weekStartDate);
  render();
}

function goToCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  weekStartDate = localDateKey(monday);
  localStorage.setItem(WEEK_START_KEY, weekStartDate);
  render();
}

function renderWeekView() {
  if (!els.weekGrid) return;

  const startDate = new Date(`${weekStartDate}T00:00:00`);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  // Update week label
  if (els.weekLabel) {
    const startMonth = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endMonth = endDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    els.weekLabel.textContent = `${startMonth} - ${endMonth}`;
  }

  els.weekGrid.innerHTML = "";

  // Create header row
  const headerRow = document.createElement("div");
  headerRow.className = "week-header-row";
  headerRow.innerHTML = '<div class="week-time-col"></div>';

  const today = localDateKey(new Date());
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + i);
    const dateStr = localDateKey(dayDate);
    const isToday = dateStr === today;
    const dayInfo = getWeekDayInfo(dateStr);

    const dayHeader = document.createElement("div");
    dayHeader.className = `week-day-header${isToday ? " today" : ""}`;
    dayHeader.innerHTML = `
      <div class="day-name">${days[i]}</div>
      <div class="day-number">${dayDate.getDate()}</div>
      <div class="day-info">${dayInfo}</div>
    `;
    headerRow.appendChild(dayHeader);
  }
  els.weekGrid.appendChild(headerRow);

  // Create time grid
  const gridBody = document.createElement("div");
  gridBody.className = "week-grid-body";

  // Hour labels column (24 hour slots: 0 to 24)
  const hourCol = document.createElement("div");
  hourCol.className = "week-time-col";
  for (let h = 0; h < 24; h++) {
    const hourLabel = document.createElement("div");
    hourLabel.className = "week-hour-label";
    hourLabel.textContent = String(h).padStart(2, "0");
    hourCol.appendChild(hourLabel);
  }
  gridBody.appendChild(hourCol);

  // Day columns
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + i);
    const dateStr = localDateKey(dayDate);
    const isToday = dateStr === today;

    const dayCol = document.createElement("div");
    dayCol.className = `week-day-col${isToday ? " today" : ""}`;
    dayCol.dataset.date = dateStr;

    // Add events for this day (manual events)
    const dayEvents = getEventsForDate(dateStr);
    for (const event of dayEvents) {
      const eventEl = createWeekEventBlock(event, dateStr, false);
      dayCol.appendChild(eventEl);
    }

    // Add imported events for this day
    const dayImported = getImportedEventsForDate(dateStr);
    for (const event of dayImported) {
      const eventEl = createWeekEventBlock(event, dateStr, true);
      dayCol.appendChild(eventEl);
    }

    // Drop zone for drag and drop
    dayCol.addEventListener("dragover", (e) => {
      e.preventDefault();
      dayCol.classList.add("drag-over");
    });
    dayCol.addEventListener("dragleave", () => {
      dayCol.classList.remove("drag-over");
    });
    dayCol.addEventListener("drop", (e) => {
      e.preventDefault();
      dayCol.classList.remove("drag-over");
      if (draggedItem) {
        draggedItem.item.date = dateStr;
        draggedItem.item.modifiedAt = Date.now();
        persist();
        render();
      }
    });

    gridBody.appendChild(dayCol);
  }

  els.weekGrid.appendChild(gridBody);

  // Add current time indicator
  if (weekContainsToday()) {
    const now = new Date();
    const todayCol = gridBody.querySelector(`[data-date="${today}"]`);
    if (todayCol) {
      const HOUR_HEIGHT = 60;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const indicator = document.createElement("div");
      indicator.className = "current-time-indicator";
      const topPx = (nowMinutes / 60) * HOUR_HEIGHT;
      indicator.style.top = `${topPx}px`;
      todayCol.appendChild(indicator);
    }
  }
}

function weekContainsToday() {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= start && today <= end;
}

function createWeekEventBlock(event, dateStr, isImported = false) {
  const block = document.createElement("div");
  block.className = "week-event-block";
  if (isImported) block.classList.add("imported");
  block.dataset.id = event.id;
  block.draggable = !isImported;

  const HOUR_HEIGHT = 60;
  const startMinutes = timeToMinutes(event.time);
  const endMinutes = event.endTime ? timeToMinutes(event.endTime) : startMinutes + 60;
  const duration = Math.max(endMinutes - startMinutes, 30);

  const topPx = (startMinutes / 60) * HOUR_HEIGHT;
  const heightPx = (duration / 60) * HOUR_HEIGHT;

  block.style.top = `${topPx}px`;
  block.style.height = `${Math.max(heightPx, 30)}px`;

  if (!isImported && isEventDone(event, dateStr)) {
    block.classList.add("done");
  }
  if (event.important) {
    block.classList.add("important");
  }

  let blockHtml = `<div class="week-event-title">${event.title}</div>`;
  if (event.note && isImported) {
    blockHtml += `<div class="week-event-location">${event.note}</div>`;
  }
  block.innerHTML = blockHtml;

  if (!isImported) {
    block.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditDialog(event);
    });

    block.addEventListener("dragstart", (e) => {
      draggedItem = { item: event, instanceDate: dateStr };
      block.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", event.id);
    });

    block.addEventListener("dragend", () => {
      block.classList.remove("dragging");
      draggedItem = null;
    });
  }

  return block;
}

// ===== NATURAL LANGUAGE INPUT =====

function parseNaturalLanguage(text) {
  const parsed = parseNaturalLanguageData(text);
  if (els.nlpPreview) {
    if (parsed.hasAny) {
      let preview = [];
      if (parsed.date) preview.push(formatDateForDisplay(parsed.date));
      if (parsed.time) preview.push(parsed.time);
      if (parsed.endTime) preview.push(`to ${parsed.endTime}`);
      if (parsed.recurrence) preview.push(parsed.recurrence);
      els.nlpPreview.textContent = `Parsed: ${preview.join(", ")}`;
      els.nlpPreview.hidden = false;
    } else {
      els.nlpPreview.hidden = true;
    }
  }
}

function parseNaturalLanguageData(text) {
  const result = { hasAny: false, cleanTitle: text };
  const lowerText = text.toLowerCase();

  // Parse time: "at 2pm", "at 14:00", "9:30am", "from 3-4pm"
  const timePatterns = [
    /\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
    /\bfrom\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  ];

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      result.hasAny = true;
      let hour = parseInt(match[1]);
      let minute = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3]?.toLowerCase();

      if (ampm === "pm" && hour < 12) hour += 12;
      if (ampm === "am" && hour === 12) hour = 0;

      result.time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      result.cleanTitle = text.replace(match[0], "").trim();

      // Check for end time in "from X-Y" pattern
      if (match[4]) {
        let endHour = parseInt(match[4]);
        let endMinute = match[5] ? parseInt(match[5]) : 0;
        const endAmpm = match[6]?.toLowerCase();

        if (endAmpm === "pm" && endHour < 12) endHour += 12;
        if (endAmpm === "am" && endHour === 12) endHour = 0;

        result.endTime = `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
      }
      break;
    }
  }

  // Parse date: "today", "tomorrow", "next Monday", "Jan 25"
  const today = new Date();
  const todayStr = localDateKey(today);

  if (/\btoday\b/i.test(lowerText)) {
    result.date = todayStr;
    result.hasAny = true;
    result.cleanTitle = result.cleanTitle.replace(/\btoday\b/i, "").trim();
  } else if (/\btomorrow\b/i.test(lowerText)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    result.date = localDateKey(tomorrow);
    result.hasAny = true;
    result.cleanTitle = result.cleanTitle.replace(/\btomorrow\b/i, "").trim();
  } else {
    // "next Monday", "next Tuesday", etc.
    const dayMatch = lowerText.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
    if (dayMatch) {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDay = days.indexOf(dayMatch[1].toLowerCase());
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      daysUntil += 7; // "next" means next week

      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + daysUntil);
      result.date = localDateKey(targetDate);
      result.hasAny = true;
      result.cleanTitle = result.cleanTitle.replace(dayMatch[0], "").trim();
    }

    // "Jan 25", "January 25"
    const monthMatch = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i);
    if (monthMatch) {
      const months = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
        may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
        sep: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
      };
      const month = months[monthMatch[1].toLowerCase()];
      const day = parseInt(monthMatch[2]);
      const year = today.getFullYear();
      const targetDate = new Date(year, month, day);
      if (targetDate < today) targetDate.setFullYear(year + 1);
      result.date = localDateKey(targetDate);
      result.hasAny = true;
      result.cleanTitle = result.cleanTitle.replace(monthMatch[0], "").trim();
    }
  }

  // Parse recurrence: "every day", "daily", "weekly", "every Monday"
  if (/\bevery\s*day\b|\bdaily\b/i.test(lowerText)) {
    result.recurrence = "daily";
    result.hasAny = true;
    result.cleanTitle = result.cleanTitle.replace(/\bevery\s*day\b|\bdaily\b/i, "").trim();
  } else if (/\bweekly\b|\bevery\s*week\b/i.test(lowerText)) {
    result.recurrence = "weekly";
    result.hasAny = true;
    result.cleanTitle = result.cleanTitle.replace(/\bweekly\b|\bevery\s*week\b/i, "").trim();
  } else if (/\bmonthly\b|\bevery\s*month\b/i.test(lowerText)) {
    result.recurrence = "monthly";
    result.hasAny = true;
    result.cleanTitle = result.cleanTitle.replace(/\bmonthly\b|\bevery\s*month\b/i, "").trim();
  }

  // Clean up extra spaces
  result.cleanTitle = result.cleanTitle.replace(/\s+/g, " ").trim();

  return result;
}

function formatDateForDisplay(dateStr) {
  const dt = new Date(`${dateStr}T00:00:00`);
  const today = localDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today) return "Today";
  if (dateStr === localDateKey(tomorrow)) return "Tomorrow";
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ===== DRAG & DROP =====

function reorderEvents(draggedId, targetId, date) {
  const dayEvents = events.filter(e => e.date === date);
  const draggedIdx = dayEvents.findIndex(e => e.id === draggedId);
  const targetIdx = dayEvents.findIndex(e => e.id === targetId);

  if (draggedIdx === -1 || targetIdx === -1) return;

  // Update sort orders
  const draggedEvent = events.find(e => e.id === draggedId);
  const targetEvent = events.find(e => e.id === targetId);

  if (!draggedEvent || !targetEvent) return;

  // Swap sort orders or recalculate
  const temp = draggedEvent.sortOrder;
  draggedEvent.sortOrder = targetEvent.sortOrder;
  targetEvent.sortOrder = temp;
  draggedEvent.modifiedAt = Date.now();
  targetEvent.modifiedAt = Date.now();

  persist();
  render();
}

// ===== IMPORTED EVENTS =====

function loadImportedEvents() {
  try {
    const raw = localStorage.getItem(IMPORTED_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getImportedEventsForDate(dateStr) {
  return importedEvents.filter(e => e.date === dateStr);
}

// ===== SETTINGS =====

function openSettings() {
  if (!els.settingsDialog) return;
  els.calendarUrlInput.value = calendarUrl;
  els.syncStatus.textContent = "";
  els.syncStatus.className = "settings-status";
  els.settingsDialog.showModal();
}

function saveSettings(e) {
  e.preventDefault();
  const newUrl = els.calendarUrlInput.value.trim();

  if (newUrl !== calendarUrl) {
    calendarUrl = newUrl;
    localStorage.setItem(CALENDAR_URL_KEY, calendarUrl);

    if (calendarUrl && window.webkit?.messageHandlers?.calendarSync) {
      updateSyncStatus("syncing", "Syncing calendar...");
      window.webkit.messageHandlers.calendarSync.postMessage({ action: "sync", url: calendarUrl });
    } else if (!calendarUrl) {
      // Clear imported events if URL is removed
      importedEvents = [];
      localStorage.removeItem(IMPORTED_EVENTS_KEY);
      render();
    }
  }

  els.settingsDialog?.close();
}

function updateSyncStatus(type, message) {
  if (!els.syncStatus) return;
  els.syncStatus.textContent = message;
  els.syncStatus.className = `settings-status ${type}`;
}

// ===== HOLIDAY DISPLAY =====

function updateDateInfoLabel(dateStr) {
  if (!els.dateInfoLabel) return;

  if (typeof formatDateInfo === "function") {
    const info = getDateInfo(dateStr);
    if (info) {
      let html = "";
      if (info.holiday) {
        html += `<span class="holiday">${info.holiday}</span>`;
      }
      if (info.holiday && info.solarTerm) {
        html += " · ";
      }
      if (info.solarTerm) {
        html += `<span class="solar-term">${info.solarTerm}</span>`;
      }
      els.dateInfoLabel.innerHTML = html;
    } else {
      els.dateInfoLabel.innerHTML = "";
    }
  }
}

function getWeekDayInfo(dateStr) {
  if (typeof getDateInfo !== "function") return "";

  const info = getDateInfo(dateStr);
  if (!info) return "";

  let html = "";
  if (info.holiday) {
    html += `<span class="holiday">${info.holiday}</span>`;
  }
  if (info.holiday && info.solarTerm) {
    html += " ";
  }
  if (info.solarTerm) {
    html += `<span class="solar-term">${info.solarTerm}</span>`;
  }
  return html;
}

