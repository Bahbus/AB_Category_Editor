import { el } from './dom.js';

let activeCloseHandler = null;

export function openModal(title, contentNode, options = {}) {
  activeCloseHandler = typeof options.onClose === 'function' ? options.onClose : null;
  el('modalTitle').textContent = title;
  const box = el('modalContent');
  box.innerHTML = '';
  box.appendChild(contentNode);
  el('modalBackdrop').classList.remove('hidden');
  setTimeout(() => {
    const focusTarget = box.querySelector('textarea, input:not([type="hidden"]), button, select, a[href]') || el('closeModal');
    if (focusTarget) focusTarget.focus();
  }, 0);
}

export function closeModal() {
  const closeHandler = activeCloseHandler;
  activeCloseHandler = null;
  if (closeHandler) closeHandler();
  el('modalBackdrop').classList.add('hidden');
}
