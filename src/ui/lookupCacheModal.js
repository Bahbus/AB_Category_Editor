import { requireScopedEl } from '../dom.js';
import { openModal, closeModal } from '../modals.js';

function formatLookupCacheStats(stats) {
  return `${stats.useful.toLocaleString()} useful, ${stats.unresolved.toLocaleString()} unresolved`;
}

export function showLookupCacheModal({ lookupCacheStats, clearLookupCache, isLookupCacheProducerActive, onLookupCacheProducerChange }) {
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
    <p id="lookupCacheClearUnavailable" class="hint" role="status"></p>
  `;
  const clearButton = requireScopedEl(wrap, '#clearLookupCache', 'lookup cache');
  const unavailable = requireScopedEl(wrap, '#lookupCacheClearUnavailable', 'lookup cache');
  const updateClearState = active => {
    clearButton.disabled = active;
    unavailable.textContent = active ? 'Lookup names are currently being cached. Wait for the lookup or scan to finish before clearing the cache.' : '';
  };
  updateClearState(isLookupCacheProducerActive());
  const unsubscribe = onLookupCacheProducerChange(updateClearState);
  clearButton.onclick = () => {
    if (!clearLookupCache()) {
      updateClearState(true);
      unavailable.textContent = 'The cache was not cleared because a lookup or scan is still running.';
      return;
    }
    closeModal();
  };
  openModal('Lookup Cache', wrap, { onClose: unsubscribe });
}
