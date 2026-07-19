import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import {
  DEFAULT_EDITOR_PREFERENCES,
  EDITOR_PREFERENCES_KEY,
  EDITOR_PREFERENCE_OPTIONS
} from '../src/state.js';
import { read } from '../testSupport/sourceFiles.mjs';

const source = read('src/startupPreferences.js');

function runBootstrap({ storedValue, storage = 'available' } = {}) {
  const dataset = {
    theme: DEFAULT_EDITOR_PREFERENCES.theme,
    density: DEFAULT_EDITOR_PREFERENCES.density
  };
  const requestedKeys = [];
  const context = { document: { documentElement: { dataset } } };
  if (storage === 'available') {
    context.localStorage = {
      getItem(key) {
        requestedKeys.push(key);
        return storedValue ?? null;
      }
    };
  } else if (storage === 'throwing') {
    context.localStorage = {
      getItem() {
        throw new Error('storage unavailable');
      }
    };
  }
  vm.runInNewContext(source, context);
  return { dataset, requestedKeys, context };
}

test('startup bootstrap uses the established preference key and applies every allowed theme', () => {
  for (const theme of EDITOR_PREFERENCE_OPTIONS.theme) {
    const result = runBootstrap({ storedValue: JSON.stringify({ theme }) });
    assert.equal(result.dataset.theme, theme);
    assert.equal(result.dataset.density, DEFAULT_EDITOR_PREFERENCES.density);
    assert.deepEqual(result.requestedKeys, [EDITOR_PREFERENCES_KEY]);
  }
});

test('startup bootstrap applies every allowed density without changing the default theme', () => {
  for (const density of EDITOR_PREFERENCE_OPTIONS.density) {
    const result = runBootstrap({ storedValue: JSON.stringify({ density }) });
    assert.equal(result.dataset.theme, DEFAULT_EDITOR_PREFERENCES.theme);
    assert.equal(result.dataset.density, density);
  }
});

test('startup bootstrap ignores unsupported values while retaining valid independent values', () => {
  assert.deepEqual(
    runBootstrap({ storedValue: JSON.stringify({ theme: 'unsupported', density: 'compact' }) }).dataset,
    { theme: 'system', density: 'compact' }
  );
  assert.deepEqual(
    runBootstrap({ storedValue: JSON.stringify({ theme: 'dark', density: 'unsupported' }) }).dataset,
    { theme: 'dark', density: 'comfortable' }
  );
});

test('startup bootstrap leaves HTML defaults intact for absent, malformed, null, or unavailable storage', () => {
  const cases = [
    runBootstrap(),
    runBootstrap({ storedValue: '{' }),
    runBootstrap({ storedValue: 'null' }),
    runBootstrap({ storage: 'throwing' }),
    runBootstrap({ storage: 'missing' })
  ];
  for (const result of cases) {
    assert.deepEqual(result.dataset, {
      theme: DEFAULT_EDITOR_PREFERENCES.theme,
      density: DEFAULT_EDITOR_PREFERENCES.density
    });
  }
});

test('startup bootstrap is isolated and does not publish a preference authority', () => {
  const { context } = runBootstrap({ storedValue: JSON.stringify({ theme: 'aetherial', density: 'compact' }) });
  assert.deepEqual(Object.keys(context).sort(), ['document', 'localStorage']);
  assert.doesNotMatch(source, /\b(?:import|export)\b|localization|app\.js/);
});
