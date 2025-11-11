import { auth } from './firebase.js';
import { bindAuthButtons, onAuth } from './auth.js';
import { addEntry, listenToEntries, updateEntry, deleteEntry } from './services/entries.js';
import {
  els,
  bindFormPreview,
  getFormData,
  resetFormPreview,
  renderEntries,
  setAuthedUI,
  bindWeekDropdown,
  bindTimeSelectorLock,
  bindExport,
  getEntryById,
  setFormData,
  setEditModeUI,
} from './ui/dom.js';

let unsubscribeEntries = null;
let editingId = null;

function startEntriesListener(uid) {
  stopEntriesListener();
  unsubscribeEntries = listenToEntries(uid, (snap) => {
    renderEntries(snap);
  });
}

function stopEntriesListener() {
  if (unsubscribeEntries) {
    unsubscribeEntries();
    unsubscribeEntries = null;
  }
}

function enterEditMode(id) {
  const e = getEntryById(id);
  if (!e) return;
  editingId = id;
  setFormData(e);
  setEditModeUI(true);
  els.date?.focus();
}

function cancelEditMode() {
  editingId = null;
  resetFormPreview();
  setEditModeUI(false);
}

function init() {
  initThemeToggle();
  bindAuthButtons(els.signInBtn, els.signOutBtn);
  bindFormPreview();
  bindWeekDropdown();
  bindExport();
  bindTimeSelectorLock();

  els.entryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const data = getFormData();
    if (editingId) {
      await updateEntry(editingId, { uid: user.uid, ...data });
      cancelEditMode();
    } else {
      await addEntry({ uid: user.uid, ...data });
      resetFormPreview();
    }
  });

  if (els.cancelEditBtn) {
    els.cancelEditBtn.addEventListener('click', cancelEditMode);
  }

  if (els.entriesBody) {
    els.entriesBody.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('button[data-action]');
      if (!btn) return;
      const tr = btn.closest('tr[data-id]');
      const id = tr?.getAttribute('data-id');
      if (!id) return;
      const action = btn.getAttribute('data-action');
      if (action === 'edit') {
        enterEditMode(id);
      } else if (action === 'delete') {
        if (confirm('Delete this entry? This cannot be undone.')) {
          await deleteEntry(id);
          if (editingId === id) cancelEditMode();
        }
      }
    });
  }

  onAuth((user) => {
    const isAuthed = !!user;
    setAuthedUI(isAuthed);
    if (isAuthed) startEntriesListener(user.uid);
    else {
      stopEntriesListener();
      cancelEditMode();
    }
  });
}

init();

function initThemeToggle(){
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const root = document.documentElement;
  let theme = localStorage.getItem('theme');
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  root.setAttribute('data-theme', theme);
  const setIcon = () => {
    const dark = root.getAttribute('data-theme') === 'dark';
    btn.textContent = dark ? '🌞' : '🌙';
    btn.title = dark ? 'Switch to light' : 'Switch to dark';
    btn.setAttribute('aria-label', btn.title);
  };
  setIcon();
  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setIcon();
  });
}
