export const LOOKUP_CACHE_KEY = 'aetherbagsEditorLookupCache';
export const EDITOR_PREFERENCES_KEY = 'aetherbagsEditorPreferences';

export const DEFAULT_EDITOR_PREFERENCES = Object.freeze({
  theme: 'system',
  density: 'comfortable'
});

export const EDITOR_PREFERENCE_OPTIONS = Object.freeze({
  theme: Object.freeze(['system', 'dark', 'light', 'high-contrast', 'aetherial', 'dalamud']),
  density: Object.freeze(['comfortable', 'compact'])
});

function normalizeEditorPreferenceValue(key, value) {
  return EDITOR_PREFERENCE_OPTIONS[key]?.includes(value) ? value : DEFAULT_EDITOR_PREFERENCES[key];
}

export function normalizeEditorPreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    theme: normalizeEditorPreferenceValue('theme', source.theme),
    density: normalizeEditorPreferenceValue('density', source.density)
  };
}

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

export function loadEditorPreferences(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(EDITOR_PREFERENCES_KEY);
    return normalizeEditorPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeEditorPreferences(null);
  }
}

export function persistEditorPreferences(preferences, storage = globalThis.localStorage) {
  const normalized = normalizeEditorPreferences(preferences);
  try {
    storage?.setItem?.(EDITOR_PREFERENCES_KEY, JSON.stringify(normalized));
  } catch {
    // Appearance preferences are optional editor-only settings.
  }
  return normalized;
}
