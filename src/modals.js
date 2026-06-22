import { el } from './dom.js';

export function openModal(title, contentNode) {
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
  el('modalBackdrop').classList.add('hidden');
}
