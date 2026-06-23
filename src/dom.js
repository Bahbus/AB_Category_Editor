export const el = id => document.getElementById(id);

export function requireEl(id) {
  const node = el(id);
  if (!node) throw new Error(`Missing required element: #${id}`);
  return node;
}

export function requireScopedEl(root, selector, context = 'scoped') {
  const node = root?.querySelector?.(selector);
  if (!node) throw new Error(`Missing required ${context} element: ${selector}`);
  return node;
}

function bindEvent(id, eventName, handler) {
  try {
    const node = requireEl(id);
    node.addEventListener(eventName, handler);
    return node;
  } catch (err) {
    setStatus(err instanceof Error ? err.message : String(err), 'err');
    return null;
  }
}

export const bindClick = (id, handler) => bindEvent(id, 'click', handler);
export const bindInput = (id, handler) => bindEvent(id, 'input', handler);
export const bindChange = (id, handler) => bindEvent(id, 'change', handler);

const TOAST_VISIBLE_MS = 5200;
const TOAST_REMOVE_MS = 5500;

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function setSaveState(text='No changes', cls='') {
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
  }, TOAST_VISIBLE_MS);
  setTimeout(() => toast.remove(), TOAST_REMOVE_MS);
}

export function setStatus(msg, cls='') {
  const s = el('status');
  if (s) {
    s.className = 'sr-only status' + (cls ? ' ' + cls : '');
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
  const box = el('busyOverlay');
  if (!box) return;
  busyCount++;
  const titleNode = el('busyTitle');
  if (titleNode) titleNode.textContent = title || 'Working';
  box.classList.remove('hidden');
  updateBusy(detail, percent);
}

export function updateBusy(detail='', percent=null) {
  const box = el('busyOverlay');
  const fill = el('busyProgressFill');
  const detailNode = el('busyDetail');
  if (!box || !fill || box.classList.contains('hidden')) return;
  if (detailNode) detailNode.textContent = detail || '';
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
