import test from 'node:test';
import assert from 'node:assert/strict';

import { optionalFiniteNumber } from '../src/optionalNumbers.js';

test('optionalFiniteNumber accepts finite numbers and non-empty numeric strings', () => {
  assert.equal(optionalFiniteNumber(12.5), 12.5);
  assert.equal(optionalFiniteNumber('-3.25'), -3.25);
  assert.equal(optionalFiniteNumber('  +7  '), 7);
});

test('optionalFiniteNumber rejects coercion-only and non-finite values', () => {
  for (const value of [null, undefined, '', '   ', true, false, [], [1], {}, 'nope', Infinity, -Infinity, NaN]) {
    assert.equal(optionalFiniteNumber(value), null);
  }
});
