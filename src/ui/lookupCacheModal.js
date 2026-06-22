import { openModal, closeModal } from '../modals.js';

export function showLookupCacheModal({ lookupCacheCount, clearLookupCache }) {
  const wrap = document.createElement('div');
  wrap.className = 'lookup-cache-modal';
  wrap.innerHTML = `
    <p class="hint">Only Item IDs, ItemUICategory IDs, and item search/scan queries are sent to XIVAPI. Your full imported category config is never uploaded.</p>
    <div class="cache-counts">
      <div><strong>Cached Item names:</strong> <span>${lookupCacheCount('Item').toLocaleString()}</span></div>
      <div><strong>Cached UI category names:</strong> <span>${lookupCacheCount('ItemUICategory').toLocaleString()}</span></div>
    </div>
    <div class="row" style="margin-top: 14px;">
      <button id="clearLookupCache" class="danger">Clear lookup cache</button>
    </div>
  `;
  wrap.querySelector('#clearLookupCache').onclick = () => { clearLookupCache(); closeModal(); };
  openModal('Lookup Cache', wrap);
}
