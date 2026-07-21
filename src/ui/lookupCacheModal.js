import { escapeHtml, requireScopedEl } from '../dom.js';
import { openModal, closeModal } from '../modals.js';
import { lookupCacheClearAvailable } from '../actionAvailability.js';

function formatLookupCacheStats(stats, translate) {
  return translate('lookupCache.stats', {
    useful: stats.useful.toLocaleString(),
    unresolved: stats.unresolved.toLocaleString()
  });
}

export function showLookupCacheModal({ lookupCacheStats, clearLookupCache, isLookupCacheProducerActive, onLookupCacheProducerChange, translate }) {
  const wrap = document.createElement('div');
  wrap.className = 'lookup-cache-modal';
  wrap.innerHTML = `
    <p class="hint">${escapeHtml(translate('lookupCache.privacy'))}</p>
    <div class="cache-counts">
      <div><strong>${escapeHtml(translate('lookupCache.itemNames.label'))}</strong> <span>${escapeHtml(formatLookupCacheStats(lookupCacheStats('Item'), translate))}</span></div>
      <div><strong>${escapeHtml(translate('lookupCache.uiCategoryNames.label'))}</strong> <span>${escapeHtml(formatLookupCacheStats(lookupCacheStats('ItemUICategory'), translate))}</span></div>
    </div>
    <div class="row modal-action-row modal-action-row-loose">
      <button id="clearLookupCache" class="danger">${escapeHtml(translate('lookupCache.clear'))}</button>
    </div>
    <p id="lookupCacheClearUnavailable" class="hint" role="status"></p>
  `;
  const clearButton = requireScopedEl(wrap, '#clearLookupCache', 'lookup cache');
  const unavailable = requireScopedEl(wrap, '#lookupCacheClearUnavailable', 'lookup cache');
  const updateClearState = active => {
    const stats = [lookupCacheStats('Item'), lookupCacheStats('ItemUICategory')];
    clearButton.disabled = !lookupCacheClearAvailable(stats, active);
    unavailable.textContent = active
      ? translate('lookupCache.unavailable.active')
      : clearButton.disabled ? translate('lookupCache.unavailable.empty') : '';
  };
  updateClearState(isLookupCacheProducerActive());
  const unsubscribe = onLookupCacheProducerChange(updateClearState);
  clearButton.onclick = () => {
    if (clearButton.disabled) { updateClearState(isLookupCacheProducerActive()); return; }
    if (!clearLookupCache()) {
      updateClearState(true);
      unavailable.textContent = translate('lookupCache.unavailable.race');
      return;
    }
    closeModal();
  };
  openModal(translate('action.lookupCache'), wrap, { onClose: unsubscribe });
}
