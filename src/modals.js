import { el } from './dom.js';

let activeCloseHandler = null;
let previouslyFocusedElement = null;

function getFocusableElements(container) {
  if (!container) return [];
  return [...container.querySelectorAll('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')]
    .filter(node => !node.hidden && node.offsetParent !== null);
}

export function trapModalFocus(event) {
  if (event.key !== 'Tab') return;
  const backdrop = el('modalBackdrop');
  if (!backdrop || backdrop.classList.contains('hidden')) return;
  const modal = backdrop.querySelector('.modal');
  const focusable = getFocusableElements(modal);
  if (!focusable.length) {
    event.preventDefault();
    modal?.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function openModal(title, contentNode, options = {}) {
  previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  activeCloseHandler = typeof options.onClose === 'function' ? options.onClose : null;
  el('modalTitle').textContent = title;
  const box = el('modalContent');
  box.innerHTML = '';
  box.appendChild(contentNode);
  el('modalBackdrop').classList.remove('hidden');
  setTimeout(() => {
    const modal = el('modalBackdrop')?.querySelector('.modal');
    const focusTarget = getFocusableElements(modal)[0] || el('closeModal') || modal;
    if (focusTarget) focusTarget.focus();
  }, 0);
}

export function closeModal() {
  const closeHandler = activeCloseHandler;
  const restoreTarget = previouslyFocusedElement;
  activeCloseHandler = null;
  previouslyFocusedElement = null;
  if (closeHandler) closeHandler();
  el('modalBackdrop').classList.add('hidden');
  if (restoreTarget && typeof restoreTarget.focus === 'function' && document.contains(restoreTarget)) {
    setTimeout(() => restoreTarget.focus(), 0);
  }
}
