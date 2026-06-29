import { requireScopedEl } from '../dom.js';
import { openModal, closeModal } from '../modals.js';

function formatLookupCacheStats(stats) {
  return `${stats.useful.toLocaleString()} useful, ${stats.unresolved.toLocaleString()} unresolved`;
}

export function showLookupCacheModal({ lookupCacheStats, clearLookupCache }) {
  const wrap = document.createElement('div');
  wrap.className = 'lookup-cache-modal';
  wrap.innerHTML = `
    <p class="hint">Only Item IDs, ItemUICategory IDs, and item search/scan queries are sent to XIVAPI. Your full imported category config is never uploaded.</p>
    <div class="cache-counts">
      <div><strong>Item names:</strong> <span>${formatLookupCacheStats(lookupCacheStats('Item'))}</span></div>
      <div><strong>UI category names:</strong> <span>${formatLookupCacheStats(lookupCacheStats('ItemUICategory'))}</span></div>
    </div>
    <div class="row modal-action-row modal-action-row-loose">
      <button id="clearLookupCache" class="danger">Clear lookup cache</button>
    </div>
  `;
  requireScopedEl(wrap, '#clearLookupCache', 'lookup cache').onclick = () => { clearLookupCache(); closeModal(); };
  openModal('Lookup Cache', wrap);
}
