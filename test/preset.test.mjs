import test from 'node:test';
import assert from 'node:assert/strict';

import { SORTAKINDA_PRESET_BASE64 } from '../src/presets.js';
import { parseImportedText } from '../src/importExport.js';
import { validateConfig } from '../src/config.js';

test('SortaKinda preset constant is a real gzip+Base64 value', () => {
  assert.equal(typeof SORTAKINDA_PRESET_BASE64, 'string');
  assert.notEqual(SORTAKINDA_PRESET_BASE64, 'PLACEHOLDER');
  assert.match(SORTAKINDA_PRESET_BASE64, /^H4sI/);
});

test('SortaKinda preset parses through the normal import parser', async t => {
  if (!('DecompressionStream' in globalThis)) {
    t.skip('DecompressionStream is unavailable in this Node version');
    return;
  }
  globalThis.window = globalThis;
  const parsed = await parseImportedText(SORTAKINDA_PRESET_BASE64);
  assert.ok(Array.isArray(parsed.Categories));
  assert.ok(parsed.Categories.length > 0);
  const validation = validateConfig(parsed);
  assert.ok(Array.isArray(validation.config.Categories));
  assert.ok(validation.config.Categories.length > 0);
});
