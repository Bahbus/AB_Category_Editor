import test from 'node:test';
import assert from 'node:assert/strict';

import { BASIC_PRESET_BASE64, ADVANCED_PRESET_BASE64, PRESETS } from '../src/presets.js';
import { parseImportedText } from '../src/importExport.js';
import { validateConfig } from '../src/config.js';

const PLACEHOLDER_PATTERNS = ['PASTE_', 'PLACEHOLDER', 'TODO', 'undefined', 'null'];

test('bundled preset constants are populated gzip+Base64 strings', () => {
  assert.equal(typeof BASIC_PRESET_BASE64, 'string');
  assert.equal(typeof ADVANCED_PRESET_BASE64, 'string');

  assert.ok(BASIC_PRESET_BASE64.length > 0);
  assert.ok(ADVANCED_PRESET_BASE64.length > 0);

  assert.match(BASIC_PRESET_BASE64, /^H4sI/);
  assert.match(ADVANCED_PRESET_BASE64, /^H4sI/);

  assert.notEqual(BASIC_PRESET_BASE64, ADVANCED_PRESET_BASE64);

  for (const presetString of [BASIC_PRESET_BASE64, ADVANCED_PRESET_BASE64]) {
    for (const placeholder of PLACEHOLDER_PATTERNS) {
      assert.equal(presetString.includes(placeholder), false, `preset string should not contain ${placeholder}`);
    }
  }
});

test('bundled preset metadata points at the expected preset payloads', () => {
  const basic = PRESETS.find(preset => preset.id === 'basic');
  const advanced = PRESETS.find(preset => preset.id === 'advanced');

  assert.ok(basic);
  assert.ok(advanced);

  assert.equal(basic.id, 'basic');
  assert.equal(basic.label, 'Load basic presets');
  assert.equal(basic.sourceLabel, 'Basic presets');
  assert.equal(basic.data, BASIC_PRESET_BASE64);

  assert.equal(advanced.id, 'advanced');
  assert.equal(advanced.label, 'Load advanced presets');
  assert.equal(advanced.sourceLabel, 'Advanced presets');
  assert.equal(advanced.data, ADVANCED_PRESET_BASE64);

  assert.equal(new Set(PRESETS.map(preset => preset.id)).size, PRESETS.length);
});

test('bundled presets parse through import parser when decompression is available', async t => {
  if (!('DecompressionStream' in globalThis)) {
    t.skip('DecompressionStream unavailable');
    return;
  }

  for (const preset of PRESETS) {
    const parsed = await parseImportedText(preset.data);
    assert.ok(parsed && typeof parsed === 'object', `${preset.id} preset should parse to an object`);
    assert.ok(Array.isArray(parsed.Categories), `${preset.id} preset should contain Categories`);
    assert.ok(parsed.Categories.length > 0, `${preset.id} preset should contain at least one category`);
  }
});

test('bundled presets validate through config validation when decompression is available', async t => {
  if (!('DecompressionStream' in globalThis)) {
    t.skip('DecompressionStream unavailable');
    return;
  }

  for (const preset of PRESETS) {
    const parsed = await parseImportedText(preset.data);
    const validation = validateConfig(parsed);
    assert.ok(validation.config, `${preset.id} preset should produce a validated config`);
    assert.ok(Array.isArray(validation.config.Categories), `${preset.id} validated config should contain Categories`);
    assert.ok(validation.config.Categories.length > 0, `${preset.id} validated config should contain at least one category`);
  }
});
