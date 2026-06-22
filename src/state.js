export const LOOKUP_CACHE_KEY = 'aetherbagsEditorLookupCache';

export function emptyLookupCache() {
  return { Item: {}, ItemUICategory: {} };
}

export function loadLookupCache() {
  try {
    const raw = localStorage.getItem(LOOKUP_CACHE_KEY);
    return raw ? JSON.parse(raw) : emptyLookupCache();
  } catch {
    return emptyLookupCache();
  }
}

export function persistLookupCache(lookupCache) {
  try {
    localStorage.setItem(LOOKUP_CACHE_KEY, JSON.stringify(lookupCache));
  } catch {
    // If storage is full or blocked, lookup caching is skipped.
  }
}

export function removeLookupCache() {
  try {
    localStorage.removeItem(LOOKUP_CACHE_KEY);
  } catch {
    // If storage is blocked, the in-memory cache can still be cleared.
  }
}
