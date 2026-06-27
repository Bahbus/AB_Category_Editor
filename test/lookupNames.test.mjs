import test from 'node:test';
import assert from 'node:assert/strict';

import { isUsefulLookupName } from '../src/lookupNames.js';

test('isUsefulLookupName accepts real lookup names and rejects sentinel labels', () => {
  assert.equal(isUsefulLookupName('Grade IX Strength Tincture'), true);
  assert.equal(isUsefulLookupName('Materia'), true);
  assert.equal(isUsefulLookupName(''), false);
  assert.equal(isUsefulLookupName('unknown'), false);
  assert.equal(isUsefulLookupName('(name unavailable)'), false);
  assert.equal(isUsefulLookupName('name unavailable'), false);
  assert.equal(isUsefulLookupName('not looked up'), false);
});
