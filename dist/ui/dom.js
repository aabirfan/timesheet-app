import { toMinutes, isoWeekNumber } from '../utils/time.js';

const ALL_FILTER = 'all';

export const els = {
  signInBtn: document.getElementById('sign-in'),
  signOutBtn: document.getElementById('sign-out'),
  authed: document.getElementById('authed'),

  entryForm: document.getElementById('entry-form'),
  entriesBody: document.getElementById('entries-body'),
  calcPreview: document.getElementById('calc-preview'),

  date: document.getElementById('date'),
  start: document.getElementById('start'),
  end: document.getElementById('end'),
  task: document.getElementById('task'),
  comments: document.getElementById('comments'),

  weekYear: document.getElementById('week-year'),
  weekSelect: document.getElementById('week-select'),
  weekSummary: document.getElementById('week-summary'),
  monthSummary: document.getElementById('month-summary'),

  exportMonth: document.getElementById('export-month'),
  exportBtn: document.getElementById('export-btn'),

  saveBtn: document.querySelector('#entry-form button[type="submit"]'),
  cancelEditBtn: document.getElementById('cancel-edit'),

  filterTask: document.getElementById('filter-task'),
  filterWeek: document.getElementById('filter-week'),
  filterMonth: document.getElementById('filter-month'),
  filtersClear: document.getElementById('filters-clear'),
  filtersActive: document.getElementById('filters-active'),
  entriesCount: document.getElementById('entries-count'),
};

const state = {
  weekMap: new Map(),
  weeksByYear: new Map(),
  monthMap: new Map(),
  allEntries: [],
  byId: new Map(),
  filters: { task: ALL_FILTER, week: ALL_FILTER, month: ALL_FILTER },
};

export function bindFormPreview() {
  if (!els.entryForm) return;
  els.entryForm.addEventListener('input', () => {
    const date = els.date?.value;
    const start = els.start?.value;
    const end = els.end?.value;
    if (date && start && end) {
      const mins = toMinutes(start, end);
      if (els.calcPreview) els.calcPreview.textContent = `= ${mins} min (${(mins / 60).toFixed(2)} h)`;
    } else if (els.calcPreview) {
      els.calcPreview.textContent = '';
    }
  });
}

export function getFormData() {
  const dateStr = els.date?.value ?? '';
  const start = els.start?.value ?? '';
  const end = els.end?.value ?? '';
  const task = els.task?.value ?? 'Misc';
  const comments = (els.comments?.value ?? '').trim();
  const minutes = toMinutes(start, end);
  const hours = parseFloat((minutes / 60).toFixed(2));
  const d = new Date(dateStr + 'T00:00:00');
  const week = isoWeekNumber(d);
  return { date: dateStr, start, end, task, comments, minutes, hours, week };
}

export function setFormData(e) {
  if (!e) return;
  if (els.date) els.date.value = e.date || '';
  if (els.start) els.start.value = e.start || '';
  if (els.end) els.end.value = e.end || '';
  if (els.task) els.task.value = e.task || 'Misc';
  if (els.comments) els.comments.value = e.comments || '';
  const mins = toMinutes(e.start || '', e.end || '');
  if (els.calcPreview && e.start && e.end) els.calcPreview.textContent = `= ${mins} min (${(mins / 60).toFixed(2)} h)`;
}

export function resetFormPreview() {
  if (els.entryForm) els.entryForm.reset();
  if (els.calcPreview) els.calcPreview.textContent = '';
}

export function setEditModeUI(isEditing) {
  if (!els.saveBtn || !els.cancelEditBtn) return;
  els.saveBtn.textContent = isEditing ? 'Update' : 'Save';
  els.cancelEditBtn.style.display = isEditing ? 'inline-block' : 'none';
}

export function renderEntries(snapshot) {
  const weekMap = new Map();
  const weeksByYear = new Map();
  const monthMap = new Map();
  const all = [];
  const byId = new Map();

  snapshot.forEach((doc) => {
    const id = doc.id;
    const data = doc.data();
    const entry = normalizeEntry({ id, ...data });

    all.push(entry);
    byId.set(id, entry);

    if (entry._weekKey) {
      weekMap.set(entry._weekKey, (weekMap.get(entry._weekKey) || 0) + Number(entry.hours));
    }

    if (entry._year && entry._weekKey) {
      if (!weeksByYear.has(entry._year)) weeksByYear.set(entry._year, new Set());
      weeksByYear.get(entry._year).add(entry._weekKey);
    }

    if (entry._monthKey) {
      monthMap.set(entry._monthKey, (monthMap.get(entry._monthKey) || 0) + Number(entry.hours));
    }
  });

  state.weekMap = weekMap;
  state.weeksByYear = weeksByYear;
  state.monthMap = monthMap;
  state.allEntries = all;
  state.byId = byId;

  updateFilterControls();
  renderFilteredEntries();

  populateWeekYearDropdown();
  populateWeekDropdownForSelectedYear();
  updateWeekSummary();
  renderMonthSummary();
  populateExportMonths([...monthMap.keys()]);
}

export function getEntryById(id) {
  return state.byId.get(id);
}

function populateWeekYearDropdown() {
  if (!els.weekYear) return;
  const years = [...state.weeksByYear.keys()].sort().reverse();
  if (!years.length) {
    els.weekYear.innerHTML = `<option disabled selected>No years</option>`;
    return;
  }

  const prev = els.weekYear.value;
  els.weekYear.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join('');
  els.weekYear.value = years.includes(prev) ? prev : years[0];
}

function populateWeekDropdownForSelectedYear() {
  if (!els.weekSelect) return;
  const selectedYear = els.weekYear?.value;
  const set = selectedYear ? state.weeksByYear.get(selectedYear) : null;
  const keys = set ? [...set] : [];
  const sorted = keys.sort().reverse(); // week-desc within year, since key is YYYY-W##

  if (sorted.length === 0) {
    els.weekSelect.innerHTML = `<option disabled selected>No weeks</option>`;
    if (els.weekSummary) els.weekSummary.textContent = '–';
    return;
  }
  const html = sorted.map(key => {
    const str = String(key);
    const match = str.match(/^(\d{4})-W(\d{1,2})$/);
    if (match) {
      const week = Number(match[2]);
      return `<option value="${str}">Week ${week}</option>`;
    }
    return `<option value="${str}">Week ${str}</option>`;
  }).join('');
  const prev = els.weekSelect.value;
  els.weekSelect.innerHTML = html;
  els.weekSelect.value = sorted.includes(prev) ? prev : String(sorted[0]);
}

export function bindWeekDropdown() {
  if (!els.weekSelect) return;
  els.weekSelect.addEventListener('change', updateWeekSummary);

  if (els.weekYear) {
    els.weekYear.addEventListener('change', () => {
      populateWeekDropdownForSelectedYear();
      updateWeekSummary();
    });
  }
}

export function updateWeekSummary() {
  if (!els.weekSelect || !els.weekSummary) return;
  const key = els.weekSelect.value;
  if (!key) { els.weekSummary.textContent = '–'; return; }
  const total = (state.weekMap.get(key) || 0).toFixed(2);

  let label = key;
  const match = String(key).match(/^(\d{4})-W(\d{1,2})$/);
  if (match) {
    const year = match[1];
    const week = Number(match[2]);
    label = `${year} – W${week}`;
  }

  els.weekSummary.textContent = `${label}: ${total} h`;
}

function renderMonthSummary() {
  if (!els.monthSummary) return;
  const items = [...state.monthMap.entries()].sort(([a],[b]) => (a > b ? -1 : 1));
  if (!items.length) {
    els.monthSummary.textContent = 'No data yet.';
    return;
  }
  els.monthSummary.innerHTML = items.map(([m, h]) => `<span class="pill">${m}: ${h.toFixed(2)} h</span>`).join('');
}

function normalizeEntry(entry) {
  const clone = { ...entry };
  clone.task = clone.task || 'Misc';
  clone.minutes = Number(clone.minutes ?? 0);
  clone.hours = Number.isFinite(Number(clone.hours)) ? Number(clone.hours) : Number((clone.minutes / 60).toFixed(2));
  const meta = deriveDateMeta(clone);
  if (!clone.week && meta.weekNum) clone.week = meta.weekNum;
  return {
    ...clone,
    _weekKey: meta.weekKey,
    _monthKey: meta.monthKey,
    _year: meta.year,
    _dateStr: meta.dateStr,
  };
}

function deriveDateMeta(entry) {
  const dateStr = typeof entry.date === 'string' ? entry.date : '';
  const dateObj =
    (typeof entry.date?.toDate === 'function' ? entry.date.toDate() : null) ||
    (entry.date instanceof Date ? entry.date : null) ||
    (dateStr ? new Date(dateStr + 'T00:00:00') : null) ||
    (typeof entry.createdAt?.toDate === 'function' ? entry.createdAt.toDate() : null) ||
    null;

  const year =
    (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr.slice(0, 4) : '') ||
    (dateObj ? String(dateObj.getFullYear()) : '');

  const weekNumRaw = typeof entry.week === 'string' ? Number(entry.week) : entry.week;
  const computedWeek = dateObj ? isoWeekNumber(dateObj) : undefined;
  const weekNum = Number.isFinite(weekNumRaw) ? weekNumRaw : computedWeek;
  const weekKey = year && weekNum
    ? `${year}-W${String(weekNum).padStart(2, '0')}`
    : weekNum
      ? `W${String(weekNum).padStart(2, '0')}`
      : '';

  const monthKey =
    (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr.slice(0, 7) : '') ||
    (dateObj ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}` : '');

  return { dateStr, dateObj, year, weekKey, monthKey, weekNum };
}

function updateFilterControls() {
  const { tasks, weeks, months } = collectFilterOptions();
  updateFilterSelect(els.filterTask, tasks, 'task', 'All tasks', (val) => val);
  updateFilterSelect(els.filterWeek, weeks, 'week', 'All weeks', formatWeekLabel);
  updateFilterSelect(els.filterMonth, months, 'month', 'All months', formatMonthLabel);
}

function collectFilterOptions() {
  const tasks = new Set();
  const weeks = new Set();
  const months = new Set();
  state.allEntries.forEach((entry) => {
    if (entry.task) tasks.add(entry.task);
    if (entry._weekKey) weeks.add(entry._weekKey);
    if (entry._monthKey) months.add(entry._monthKey);
  });
  return {
    tasks: [...tasks].sort((a, b) => a.localeCompare(b)),
    weeks: [...weeks].sort((a, b) => (a > b ? -1 : 1)),
    months: [...months].sort((a, b) => (a > b ? -1 : 1)),
  };
}

function updateFilterSelect(selectEl, options, key, defaultLabel, formatter) {
  if (!selectEl) return;
  const safeOptions = options.map((opt) => ({ value: opt, label: formatter(opt) }));
  if (!options.includes(state.filters[key])) {
    state.filters[key] = ALL_FILTER;
  }
  const html = [`<option value="${ALL_FILTER}">${defaultLabel}</option>`];
  safeOptions.forEach(({ value, label }) => {
    html.push(`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`);
  });
  selectEl.innerHTML = html.join('');
  selectEl.value = state.filters[key];
}

function renderFilteredEntries() {
  if (!els.entriesBody) return;
  const filtered = state.allEntries.filter((entry) => {
    if (state.filters.task !== ALL_FILTER && entry.task !== state.filters.task) return false;
    if (state.filters.week !== ALL_FILTER && entry._weekKey !== state.filters.week) return false;
    if (state.filters.month !== ALL_FILTER && entry._monthKey !== state.filters.month) return false;
    return true;
  });

  const rows = filtered.map(createEntryRow).join('');
  const placeholder = !state.allEntries.length
    ? 'No entries yet.'
    : 'No entries match filters.';

  els.entriesBody.innerHTML = rows || `<tr><td colspan="7" class="muted">${placeholder}</td></tr>`;
  updateEntriesCount(filtered.length);
  renderFilterChips();
  updateClearFiltersState();
}

function createEntryRow(entry) {
  const taskName = entry.task || 'Misc';
  const taskClass = `tag-${String(taskName).toLowerCase()}`;
  return `
    <tr data-id="${escapeHtml(entry.id)}">
      <td>${escapeHtml(entry.date ?? '')}</td>
      <td>${escapeHtml(entry.start ?? '')}–${escapeHtml(entry.end ?? '')}</td>
      <td><span class="tag ${taskClass}"><span class="dot"></span>${escapeHtml(taskName)}</span></td>
      <td>${escapeHtml(String(entry.minutes ?? ''))}</td>
      <td>${Number(entry.hours ?? 0).toFixed(2)}</td>
      <td>${escapeHtml(String(entry.week ?? ''))}</td>
      <td>
        <button class="ghost" data-action="edit">Edit</button>
        <button class="ghost" data-action="delete">Delete</button>
      </td>
    </tr>
  `;
}

function updateEntriesCount(filteredCount) {
  if (!els.entriesCount) return;
  const total = state.allEntries.length;
  let text = 'Showing 0 entries';
  if (!total) text = 'No entries yet.';
  else if (!filteredCount) text = 'No entries match filters.';
  else if (hasActiveFilters()) text = `Showing ${filteredCount} of ${total} entries`;
  else text = `Showing ${filteredCount} entries`;
  els.entriesCount.textContent = text;
}

function renderFilterChips() {
  if (!els.filtersActive) return;
  const chips = [];
  if (state.filters.task !== ALL_FILTER) chips.push(makeFilterChip('Task', state.filters.task));
  if (state.filters.week !== ALL_FILTER) chips.push(makeFilterChip('Week', formatWeekLabel(state.filters.week)));
  if (state.filters.month !== ALL_FILTER) chips.push(makeFilterChip('Month', formatMonthLabel(state.filters.month)));
  els.filtersActive.innerHTML = chips.length
    ? chips.join('')
    : '<span class="filter-empty">No filters applied</span>';
}

function makeFilterChip(label, value) {
  return `<span class="filter-chip"><span>${escapeHtml(label)}</span>${escapeHtml(value)}</span>`;
}

function hasActiveFilters() {
  return Object.values(state.filters).some((val) => val !== ALL_FILTER);
}

function updateClearFiltersState() {
  if (!els.filtersClear) return;
  const active = hasActiveFilters();
  els.filtersClear.disabled = !active;
}

function formatWeekLabel(key) {
  const match = String(key).match(/^(\d{4})-W(\d{2})$/);
  if (match) {
    const [, year, week] = match;
    return `Week ${Number(week)} / ${year}`;
  }
  if (String(key).startsWith('W')) return `Week ${String(key).slice(1)}`;
  return key || '–';
}

function formatMonthLabel(key) {
  const parts = String(key).split('-');
  if (parts.length === 2) {
    const [year, month] = parts;
    const date = new Date(`${year}-${month}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return `${date.toLocaleString('default', { month: 'short' })} ${year}`;
    }
  }
  return key || '–';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syncFilterSelectValues() {
  if (els.filterTask) els.filterTask.value = state.filters.task;
  if (els.filterWeek) els.filterWeek.value = state.filters.week;
  if (els.filterMonth) els.filterMonth.value = state.filters.month;
}

function exportMonthCSV(yyyyMM) {
  const rows = state.allEntries
    .filter(e => (e.date || '').startsWith(yyyyMM))
    .sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)));

  const header = ['Date','Start','End','Task','Minutes','Hours','Week','Comments'];
  const lines = [header.join(',')];
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  rows.forEach(e => {
    lines.push([
      esc(e.date),
      esc(e.start),
      esc(e.end),
      esc(e.task || 'Misc'),
      esc(e.minutes),
      esc(Number(e.hours).toFixed(2)),
      esc(e.week),
      esc(e.comments || '')
    ].join(','));
  });

  const csv = lines.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `timesheet-${yyyyMM}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function populateExportMonths(months) {
  if (!els.exportMonth || !els.exportBtn) return;
  const sorted = [...months].sort().reverse();
  if (sorted.length === 0) {
    els.exportMonth.innerHTML = `<option value="" disabled selected>(no months)</option>`;
    els.exportMonth.disabled = true;
    els.exportBtn.disabled = true;
    const field = document.getElementById('export-field');
    if (field) field.style.opacity = 0.6;
    return;
  }
  els.exportMonth.innerHTML = sorted.map(m => `<option value="${m}">${m}</option>`).join('');
  els.exportMonth.disabled = false;
  els.exportBtn.disabled = false;
  const field = document.getElementById('export-field');
  if (field) field.style.opacity = 1;
}

export function bindExport() {
  if (!els.exportMonth || !els.exportBtn) return;
  els.exportBtn.addEventListener('click', () => {
    const v = els.exportMonth.value;
    if (v) exportMonthCSV(v);
  });
}

export function bindEntryFilters() {
  if (els.filterTask) {
    els.filterTask.addEventListener('change', () => {
      state.filters.task = els.filterTask.value;
      renderFilteredEntries();
    });
  }
  if (els.filterWeek) {
    els.filterWeek.addEventListener('change', () => {
      state.filters.week = els.filterWeek.value;
      renderFilteredEntries();
    });
  }
  if (els.filterMonth) {
    els.filterMonth.addEventListener('change', () => {
      state.filters.month = els.filterMonth.value;
      renderFilteredEntries();
    });
  }
  if (els.filtersClear) {
    els.filtersClear.addEventListener('click', () => {
      if (!hasActiveFilters()) return;
      state.filters = { task: ALL_FILTER, week: ALL_FILTER, month: ALL_FILTER };
      syncFilterSelectValues();
      renderFilteredEntries();
    });
  }
}

export function setAuthedUI(isAuthed) {
  if (els.signInBtn) els.signInBtn.style.display = isAuthed ? 'none' : 'inline-block';
  if (els.signOutBtn) els.signOutBtn.style.display = isAuthed ? 'inline-block' : 'none';
  if (els.authed) els.authed.style.display = isAuthed ? 'block' : 'none';

  if (isAuthed) {
    if (els.exportMonth) els.exportMonth.style.display = 'inline-block';
    if (els.exportBtn)   els.exportBtn.style.display   = 'inline-block';
    const field = document.getElementById('export-field');
    if (field) field.style.opacity = 1;
    return;
  }

  if (els.entriesBody) els.entriesBody.innerHTML = '';
  if (els.calcPreview) els.calcPreview.textContent = '';
  if (els.weekSelect) els.weekSelect.innerHTML = `<option disabled selected>No weeks</option>`;
  if (els.weekSummary) els.weekSummary.textContent = '–';
  if (els.monthSummary) els.monthSummary.textContent = 'No data yet.';

  const field = document.getElementById('export-field');
  if (els.exportMonth) {
    els.exportMonth.innerHTML = `<option value="" disabled selected>(no months)</option>`;
    els.exportMonth.disabled = true;
    els.exportMonth.style.display = 'none';
  }
  if (els.exportBtn) {
    els.exportBtn.disabled = true;
    els.exportBtn.style.display = 'none';
  }
  if (field) field.style.opacity = 0.6;

  state.weekMap = new Map();
  state.monthMap = new Map();
  state.allEntries = [];
  state.byId = new Map();
  state.filters = { task: ALL_FILTER, week: ALL_FILTER, month: ALL_FILTER };
  updateFilterControls();
  renderFilteredEntries();
}

function snapToNearestHalfHour(timeStr) {
  if (!timeStr) return timeStr;
  const [h, m] = timeStr.split(':').map(Number);
  let hour = h, mins;
  if (m < 15) mins = 0;
  else if (m < 45) mins = 30;
  else { mins = 0; hour = (hour + 1) % 24; }
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hour)}:${pad(mins)}`;
}

export function bindTimeSelectorLock() {
  const apply = (el) => {
    const snapped = snapToNearestHalfHour(el.value);
    if (snapped !== el.value) {
      el.value = snapped;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };
  ['input','change','blur','wheel','keydown'].forEach(evt => {
    if (els.start) els.start.addEventListener(evt, () => apply(els.start));
    if (els.end)   els.end.addEventListener(evt,  () => apply(els.end));
  });
}
