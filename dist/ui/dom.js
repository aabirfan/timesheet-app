import { toMinutes, isoWeekNumber } from '../utils/time.js';

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

  weekSelect: document.getElementById('week-select'),
  weekSummary: document.getElementById('week-summary'),
  monthSummary: document.getElementById('month-summary'),

  exportMonth: document.getElementById('export-month'),
  exportBtn: document.getElementById('export-btn'),

  saveBtn: document.querySelector('#entry-form button[type="submit"]'),
  cancelEditBtn: document.getElementById('cancel-edit'),
};

const state = {
  weekMap: new Map(),
  monthMap: new Map(),
  allEntries: [],
  byId: new Map(),
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
  const rows = [];
  const weekMap = new Map();
  const monthMap = new Map();
  const all = [];
  const byId = new Map();

  snapshot.forEach((doc) => {
    const id = doc.id;
    const e = doc.data();
    all.push({ id, ...e });
    byId.set(id, e);

    const taskName = e.task || 'Misc';
    const taskClass = `tag-${String(taskName).toLowerCase()}`;

    rows.push(`
      <tr data-id="${id}">
        <td>${e.date}</td>
        <td>${e.start}–${e.end}</td>
        <td><span class="tag ${taskClass}"><span class="dot"></span>${taskName}</span></td>
        <td>${e.minutes}</td>
        <td>${Number(e.hours).toFixed(2)}</td>
        <td>${e.week}</td>
        <td>
          <button class="ghost" data-action="edit">Edit</button>
          <button class="ghost" data-action="delete">Delete</button>
        </td>
      </tr>
    `);

    weekMap.set(e.week, (weekMap.get(e.week) || 0) + Number(e.hours));
    const monthKey = e.date?.slice(0, 7);
    if (monthKey) monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + Number(e.hours));
  });

  if (els.entriesBody) {
    els.entriesBody.innerHTML =
      rows.join('') || `<tr><td colspan="7" class="muted">No entries yet.</td></tr>`;
  }

  state.weekMap = weekMap;
  state.monthMap = monthMap;
  state.allEntries = all;
  state.byId = byId;

  populateWeekDropdown([...weekMap.keys()]);
  updateWeekSummary();
  renderMonthSummary();
  populateExportMonths([...monthMap.keys()]);
}

export function getEntryById(id) {
  return state.byId.get(id);
}

function populateWeekDropdown(weeks) {
  if (!els.weekSelect) return;
  const sorted = weeks.sort((a, b) => b - a);
  if (sorted.length === 0) {
    els.weekSelect.innerHTML = `<option disabled selected>No weeks</option>`;
    if (els.weekSummary) els.weekSummary.textContent = '–';
    return;
  }
  const html = sorted.map(w => `<option value="${w}">Week ${w}</option>`).join('');
  const prev = els.weekSelect.value;
  els.weekSelect.innerHTML = html;
  els.weekSelect.value = sorted.includes(Number(prev)) ? prev : String(sorted[0]);
}

export function bindWeekDropdown() {
  if (!els.weekSelect) return;
  els.weekSelect.addEventListener('change', updateWeekSummary);
}

export function updateWeekSummary() {
  if (!els.weekSelect || !els.weekSummary) return;
  const raw = els.weekSelect.value;
  if (!raw) { els.weekSummary.textContent = '–'; return; }
  const w = Number(raw);
  const total = (state.weekMap.get(w) || 0).toFixed(2);
  els.weekSummary.textContent = `W${w}: ${total} h`;
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
