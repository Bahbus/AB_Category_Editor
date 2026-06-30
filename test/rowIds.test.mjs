import test from 'node:test';
import assert from 'node:assert/strict';

import { invalidRowIds, isValidRowIdValue, normalizeRowIdValue } from '../src/rowIds.js';

test('row ID helpers accept non-negative integer numbers and digit strings', () => {
  assert.equal(isValidRowIdValue(0), true);
  assert.equal(isValidRowIdValue(123), true);
  assert.equal(isValidRowIdValue('0'), true);
  assert.equal(isValidRowIdValue('123'), true);
  assert.equal(isValidRowIdValue('00123'), true);
});

test('row ID helpers reject nullish, boolean, object, negative, decimal, and nonnumeric values', () => {
  assert.equal(isValidRowIdValue(null), false);
  assert.equal(isValidRowIdValue(undefined), false);
  assert.equal(isValidRowIdValue(''), false);
  assert.equal(isValidRowIdValue('   '), false);
  assert.equal(isValidRowIdValue(false), false);
  assert.equal(isValidRowIdValue(true), false);
  assert.equal(isValidRowIdValue({}), false);
  assert.equal(isValidRowIdValue([]), false);
  assert.equal(isValidRowIdValue(-1), false);
  assert.equal(isValidRowIdValue('-1'), false);
  assert.equal(isValidRowIdValue(1.5), false);
  assert.equal(isValidRowIdValue('1.5'), false);
  assert.equal(isValidRowIdValue('abc'), false);
});

test('normalizeRowIdValue returns numbers for valid values and null for invalid values', () => {
  assert.equal(normalizeRowIdValue('00123'), 123);
  assert.equal(normalizeRowIdValue(null), null);
});

test('invalidRowIds returns only invalid values without mutating inputs', () => {
  const values = [0, '123', null, '', false, -1];
  assert.deepEqual(invalidRowIds(values), [null, '', false, -1]);
  assert.deepEqual(values, [0, '123', null, '', false, -1]);
});
