import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_PREFERENCES_KEY,
  loadEditorPreferences,
  normalizeEditorPreferences,
  persistEditorPreferences
} from '../src/state.js';

function memoryStorage(initial = new Map()) {
  return {
    getItem(key) { return initial.has(key) ? initial.get(key) : null; },
    setItem(key, value) { initial.set(key, String(value)); },
    removeItem(key) { initial.delete(key); }
  };
}

test('normalizeEditorPreferences preserves valid preference values', () => {
  assert.deepEqual(normalizeEditorPreferences({ theme: 'aetherial', density: 'compact', checkboxStyle: 'pills' }), {
    theme: 'aetherial',
    density: 'compact',
    checkboxStyle: 'pills'
  });
});

test('normalizeEditorPreferences falls back for invalid values', () => {
  assert.deepEqual(normalizeEditorPreferences({ theme: 'laser', density: 'tiny', checkboxStyle: 'fake-divs' }), DEFAULT_EDITOR_PREFERENCES);
});

test('loadEditorPreferences falls back when JSON is invalid', () => {
  const storage = memoryStorage(new Map([[EDITOR_PREFERENCES_KEY, '{not json']]));
  assert.deepEqual(loadEditorPreferences(storage), DEFAULT_EDITOR_PREFERENCES);
});

test('loadEditorPreferences falls back when storage is unavailable', () => {
  const storage = { getItem() { throw new Error('blocked'); } };
  assert.deepEqual(loadEditorPreferences(storage), DEFAULT_EDITOR_PREFERENCES);
});

test('persistEditorPreferences stores only normalized editor preferences', () => {
  const backing = new Map();
  const storage = memoryStorage(backing);
  const saved = persistEditorPreferences({ theme: 'dalamud', density: 'compact', checkboxStyle: 'large', exportedData: true }, storage);
  assert.deepEqual(saved, { theme: 'dalamud', density: 'compact', checkboxStyle: 'large' });
  assert.equal(backing.get(EDITOR_PREFERENCES_KEY), JSON.stringify(saved));
});
