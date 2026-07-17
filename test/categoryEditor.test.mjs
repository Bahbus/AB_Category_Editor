import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeRgbInputValue } from '../src/ui/colorEditor.js';

test('RGB input normalization restores blank and non-finite values to the committed component', () => {
  assert.equal(normalizeRgbInputValue('', 128), 128);
  assert.equal(normalizeRgbInputValue('not-a-number', 128), 128);
  assert.equal(normalizeRgbInputValue('128', 128), 128);
});

test('RGB input normalization clamps finite edited values to byte range', () => {
  assert.equal(normalizeRgbInputValue('126.6', 128), 127);
  assert.equal(normalizeRgbInputValue('-1', 128), 0);
  assert.equal(normalizeRgbInputValue('999', 128), 255);
});
