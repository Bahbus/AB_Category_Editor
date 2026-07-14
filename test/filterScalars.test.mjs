import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UINT32_MAX,
  isBooleanScalar,
  isIntegerScalar,
  isRangeBoundScalar,
  isStateFilterScalar,
  isStateScalar,
  isUnsignedIntegerScalar
} from '../src/filterScalars.js';

const incompatibleScalars = [null, undefined, '', ' ', '1', false, true, [], [1], {}, 1.5, NaN, Infinity, -Infinity];

test('filter scalar classification accepts only actual booleans and finite integer numbers', () => {
  assert.equal(isBooleanScalar(false), true);
  assert.equal(isBooleanScalar(true), true);
  assert.equal(isIntegerScalar(-7), true);
  assert.equal(isIntegerScalar(0), true);
  assert.equal(isIntegerScalar(42), true);
  for (const value of incompatibleScalars) {
    if (typeof value !== 'boolean') assert.equal(isBooleanScalar(value), false);
    assert.equal(isIntegerScalar(value), false);
  }
});

test('range scalar classification preserves signed Level integers and enforces uint Vendor Price', () => {
  assert.equal(isRangeBoundScalar('Level', -1), true);
  assert.equal(isRangeBoundScalar('ItemLevel', -200), true);
  assert.equal(isRangeBoundScalar('VendorPrice', 0), true);
  assert.equal(isRangeBoundScalar('VendorPrice', UINT32_MAX), true);
  assert.equal(isUnsignedIntegerScalar(-1), false);
  assert.equal(isRangeBoundScalar('VendorPrice', -1), false);
  assert.equal(isRangeBoundScalar('VendorPrice', 1.5), false);
  assert.equal(isRangeBoundScalar('VendorPrice', UINT32_MAX + 1), false);
});

test('state scalar classification limits State but preserves unusual integer Filter values', () => {
  for (const state of [0, 1, 2]) assert.equal(isStateScalar(state), true);
  for (const state of [-1, 3, 1.5, '1', null, true]) assert.equal(isStateScalar(state), false);
  for (const filter of [-999, 0, 47]) assert.equal(isStateFilterScalar(filter), true);
  for (const filter of [1.5, '7', null, false, [], {}]) assert.equal(isStateFilterScalar(filter), false);
});
