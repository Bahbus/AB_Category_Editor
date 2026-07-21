import test from 'node:test';
import assert from 'node:assert/strict';

import { BASIC_PRESET_BASE64, ADVANCED_PRESET_BASE64, PRESETS } from '../src/presets.js';
import { parseImportedText } from '../src/importExport.js';
import { validateConfig } from '../src/config.js';

const presets = [
  ['basic', BASIC_PRESET_BASE64],
  ['advanced', ADVANCED_PRESET_BASE64]
];

test('basic and advanced preset constants are real gzip+Base64 values', () => {
  assert.equal(typeof BASIC_PRESET_BASE64, 'string');
  assert.equal(typeof ADVANCED_PRESET_BASE64, 'string');
  assert.notEqual(BASIC_PRESET_BASE64, ADVANCED_PRESET_BASE64);
  for (const [, value] of presets) {
    assert.ok(value.length > 0, `${value} is non-empty`);
    assert.match(value, /^H4sI/);
    assert.doesNotMatch(value, /PASTE_|PLACEHOLDER|TODO/);
  }
});

test('preset metadata retains import identity and payload without orphaned UI labels', () => {
  assert.deepEqual(PRESETS.map(preset => preset.id), ['basic', 'advanced']);
  assert.deepEqual(PRESETS.map(preset => preset.sourceLabel), ['Basic presets', 'Advanced presets']);
  assert.deepEqual(PRESETS.map(preset => preset.data), [BASIC_PRESET_BASE64, ADVANCED_PRESET_BASE64]);
  assert.equal(PRESETS.some(preset => Object.hasOwn(preset, 'label')), false);
});

test('bundled presets parse through the normal import parser', async t => {
  if (!('DecompressionStream' in globalThis)) {
    t.skip('DecompressionStream is unavailable in this Node version');
    return;
  }
  globalThis.window = globalThis;
  for (const [name, value] of presets) {
    const parsed = await parseImportedText(value);
    assert.equal(typeof parsed, 'object', `${name} preset parses to an object`);
    assert.ok(Array.isArray(parsed.Categories), `${name} preset has Categories array`);
    assert.ok(parsed.Categories.length > 0, `${name} preset has at least one category`);
    const validation = validateConfig(parsed);
    assert.ok(Array.isArray(validation.config.Categories), `${name} preset validates with Categories array`);
    assert.ok(validation.config.Categories.length > 0, `${name} preset validates with categories`);
  }
});
