export const el = id => document.getElementById(id);

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function setSaveState(text='Saved', cls='') {
  const node = el('saveState');
  if (!node) return;
  node.textContent = text;
  node.className = 'save-state' + (cls ? ' ' + cls : '');
}

export function showToast(msg, cls='') {
  if (!msg) return;
  const box = el('toastContainer');
  if (!box) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + cls;
  toast.textContent = msg;
  box.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity .18s ease, transform .18s ease';
  }, 3200);
  setTimeout(() => toast.remove(), 3500);
}

export function setStatus(msg, cls='') {
  const s = el('status');
  if (s) {
    s.className = 'hidden';
    s.textContent = msg;
  }
  if (cls === 'err') console.error(msg);
  else if (cls === 'warn') console.warn(msg);
  else console.log(msg);

  if (cls === 'ok' || cls === 'err' || cls === 'warn') {
    showToast(msg, cls);
  }
}

let busyCount = 0;

export function showBusy(title, detail='', percent=null) {
  busyCount++;
  const box = el('busyOverlay');
  el('busyTitle').textContent = title || 'Working';
  updateBusy(detail, percent);
  box.classList.remove('hidden');
}

export function updateBusy(detail='', percent=null) {
  const box = el('busyOverlay');
  const fill = el('busyProgressFill');
  if (!box || box.classList.contains('hidden')) return;
  el('busyDetail').textContent = detail || '';
  if (percent === null || Number.isNaN(Number(percent))) {
    fill.classList.add('indeterminate');
    fill.style.width = '35%';
  } else {
    const clamped = Math.max(0, Math.min(100, Number(percent)));
    fill.classList.remove('indeterminate');
    fill.style.transform = 'none';
    fill.style.width = clamped + '%';
  }
}

export function hideBusy(force=false) {
  busyCount = force ? 0 : Math.max(0, busyCount - 1);
  if (busyCount === 0) {
    const box = el('busyOverlay');
    if (box) box.classList.add('hidden');
  }
}
