import { normalizeRowIdValue } from './rowIds.js';

export function hasNonblankText(value) {
  return String(value ?? '').trim().length > 0;
}

export function textActionAvailable(value, running = false) {
  return !running && hasNonblankText(value);
}

export function lookupResultAddAvailable(rowIdValue, existingValues = []) {
  const id = normalizeRowIdValue(rowIdValue);
  if (id === null) return false;
  return !existingValues.some(value => normalizeRowIdValue(value) === id);
}

export function regexScanAvailable(pattern, running = false) {
  return textActionAvailable(pattern, running);
}

export function regexAddMatchesAvailable({ matches = [], existingIds = [], canRemoveSelectedPattern = false, running = false } = {}) {
  if (running) return false;
  if (canRemoveSelectedPattern) return true;
  const existing = new Set(existingIds.map(normalizeRowIdValue).filter(id => id !== null));
  return matches.some(item => {
    const id = normalizeRowIdValue(item?.id);
    return id !== null && !existing.has(id);
  });
}

export function categorySortAvailable(categories = [], compare) {
  if (categories.length < 2 || typeof compare !== 'function') return false;
  return categories.slice().sort(compare).some((category, index) => category !== categories[index]);
}

export function categoryRenumberAvailable(categories = []) {
  return categories.some((category, index) => category?.Order !== index + 1 || category?.Priority !== index + 1);
}

export function referencedIdLookupAvailable(uncachedCount, running = false) {
  return !running && Number.isFinite(uncachedCount) && uncachedCount > 0;
}

export function lookupCacheEntryCount(stats = []) {
  return stats.reduce((total, value) => total + (Number.isFinite(value?.total) ? Math.max(0, value.total) : 0), 0);
}

export function lookupCacheClearAvailable(stats = [], producerActive = false) {
  return !producerActive && lookupCacheEntryCount(stats) > 0;
}
