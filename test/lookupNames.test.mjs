import test from 'node:test';
import assert from 'node:assert/strict';

import { hasUsefulLookupName, isUsefulLookupName, lookupDisplayName } from '../src/lookupNames.js';

test('isUsefulLookupName accepts real lookup names and rejects sentinel labels', () => {
  assert.equal(isUsefulLookupName('Potion'), true);
  assert.equal(isUsefulLookupName('Grade IX Strength Tincture'), true);
  assert.equal(isUsefulLookupName('Materia'), true);
  assert.equal(isUsefulLookupName(''), false);
  assert.equal(isUsefulLookupName('unknown'), false);
  assert.equal(isUsefulLookupName('(name unavailable)'), false);
  assert.equal(isUsefulLookupName('name unavailable'), false);
  assert.equal(isUsefulLookupName('not looked up'), false);
});

test('lookup helper functions use the same sentinel filtering semantics', () => {
  const cache = { Item: { 1: 'Potion', 2: '(name unavailable)' } };
  const lookupName = (sheet, id) => cache[sheet]?.[String(id)] || '';

  assert.equal(hasUsefulLookupName(lookupName, 'Item', 1), true);
  assert.equal(hasUsefulLookupName(lookupName, 'Item', 2), false);
  assert.equal(hasUsefulLookupName(lookupName, 'Item', 3), false);
  assert.equal(lookupDisplayName('  Potion  '), 'Potion');
  assert.equal(lookupDisplayName('(name unavailable)'), '');
});
