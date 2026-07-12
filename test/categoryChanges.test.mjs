import test from 'node:test';
import assert from 'node:assert/strict';
import { applyFullConfigCandidate, applySelectedCategoryCandidate, jsonSemanticEqual, renumberCategories, sortCategoriesPreservingSelection } from '../src/categoryChanges.js';
import { ensureShape, validateConfig } from '../src/config.js';

test('JSON semantic equality ignores object key order but preserves array order and types', () => {
  assert.equal(jsonSemanticEqual({ a: 1, b: { c: true } }, { b: { c: true }, a: 1 }), true);
  assert.equal(jsonSemanticEqual([1, 2], [2, 1]), false);
  assert.equal(jsonSemanticEqual({ value: 1 }, { value: '1' }), false);
});

test('renumber is a no-op for correct numeric values', () => {
  const categories = [{ Order: 1, Priority: 1 }, { Order: 2, Priority: 2 }];
  assert.equal(renumberCategories(categories), false);
  assert.deepEqual(categories, [{ Order: 1, Priority: 1 }, { Order: 2, Priority: 2 }]);
});

test('renumber changes incorrect values and numeric strings to one-based numbers', () => {
  const categories = [{ Order: '1', Priority: 8 }, { Order: 9, Priority: '2' }];
  assert.equal(renumberCategories(categories), true);
  assert.deepEqual(categories, [{ Order: 1, Priority: 1 }, { Order: 2, Priority: 2 }]);
});

test('sorting detects identity order changes and preserves the selected object', () => {
  const selected = { order: 2 };
  const categories = [selected, { order: 1 }];
  const result = sortCategoriesPreservingSelection(categories, 0, (a, b) => a.order - b.order);
  assert.equal(result.changed, true);
  assert.equal(categories[1], selected);
  assert.equal(result.selectedCategory, selected);
  assert.equal(result.selectedIndex, 1);
});

test('sorting an already sorted array is a no-op', () => {
  const categories = [{ order: 1 }, { order: 2 }];
  const result = sortCategoriesPreservingSelection(categories, 1, (a, b) => a.order - b.order);
  assert.equal(result.changed, false);
  assert.equal(result.selectedIndex, 1);
});

test('selected Raw JSON normalized no-op does not assign or dirty', () => {
  const current = { Name: 'Same' };
  ensureShape(current);
  const categories = [current];
  let dirtyCalls = 0;
  const changed = applySelectedCategoryCandidate({ categories, selectedIndex: 0, candidate: { Name: 'Same' }, normalize: ensureShape, onChanged: () => { dirtyCalls++; } });
  assert.equal(changed, false);
  assert.equal(categories[0], current);
  assert.equal(dirtyCalls, 0);
});

test('selected Raw JSON changed candidate assigns and dirties', () => {
  const categories = [{ Name: 'Before' }];
  const candidate = { Name: 'After' };
  let dirtyCalls = 0;
  assert.equal(applySelectedCategoryCandidate({ categories, selectedIndex: 0, candidate, normalize: () => {}, onChanged: () => { dirtyCalls++; } }), true);
  assert.equal(categories[0], candidate);
  assert.equal(dirtyCalls, 1);
});

test('selected Raw JSON parse and shape failures are atomic', () => {
  const current = { Name: 'Before' };
  const categories = [current];
  assert.throws(() => JSON.parse('{'));
  assert.throws(() => applySelectedCategoryCandidate({ categories, selectedIndex: 0, candidate: null, normalize: () => { throw new Error('shape'); }, onChanged: () => assert.fail() }));
  assert.equal(categories[0], current);
});

test('full Raw JSON no-op bypasses confirmation and changes while preserving dirty state', async () => {
  const currentData = { Categories: [{ Name: 'Same' }] };
  let dirty = true;
  let confirmationCalls = 0;
  let selection = 4;
  let lookupCalls = 0;
  const result = await applyFullConfigCandidate({
    currentData, candidate: { Categories: [{ Name: 'Same' }] },
    confirmReplace: async () => { confirmationCalls++; return true; }, onNoChange: () => {},
    onChanged: () => { dirty = true; selection = 0; lookupCalls++; }
  });
  assert.equal(result, false);
  assert.equal(confirmationCalls, 0);
  assert.equal(dirty, true);
  assert.equal(selection, 4);
  assert.equal(lookupCalls, 0);
});

test('full Raw JSON changed candidate retains confirmation and replacement behavior', async () => {
  let confirmed = 0;
  let changed = 0;
  const result = await applyFullConfigCandidate({
    currentData: { Categories: [] }, candidate: { Categories: [{}] },
    confirmReplace: async () => { confirmed++; return true; }, onNoChange: () => assert.fail(), onChanged: () => { changed++; }
  });
  assert.equal(result, true);
  assert.equal(confirmed, 1);
  assert.equal(changed, 1);
});

test('full Raw JSON cancelled replacement performs no change', async () => {
  const result = await applyFullConfigCandidate({ currentData: {}, candidate: { changed: true }, confirmReplace: async () => false, onNoChange: () => assert.fail(), onChanged: () => assert.fail() });
  assert.equal(result, null);
});

test('full Raw JSON parse and shape failures leave current data untouched', () => {
  const currentData = { Categories: [{ Name: 'Current' }] };
  assert.throws(() => JSON.parse('{'));
  assert.throws(() => validateConfig({ Categories: [null] }));
  assert.deepEqual(currentData, { Categories: [{ Name: 'Current' }] });
});
