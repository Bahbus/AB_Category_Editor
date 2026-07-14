import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCategoryReorder, applyConfigReplacement, applyFullConfigCandidate, applyGeneratedDescriptionChange, applySelectedCategoryCandidate, jsonSemanticEqual, renumberCategories, reorderCategories, sortCategoriesPreservingSelection } from '../src/categoryChanges.js';
import { ensureShape, validateConfig } from '../src/config.js';

test('JSON semantic equality ignores object key order but preserves array order and types', () => {
  assert.equal(jsonSemanticEqual({ a: 1, b: { c: true } }, { b: { c: true }, a: 1 }), true);
  assert.equal(jsonSemanticEqual([1, 2], [2, 1]), false);
  assert.equal(jsonSemanticEqual({ value: 1 }, { value: '1' }), false);
});

test('config replacement applies changed data once and skips JSON-semantic no-ops', () => {
  let currentData = { Categories: [{ Name: 'A' }] };
  let replacements = 0;
  const replace = candidate => applyConfigReplacement(currentData, candidate, nextData => {
    currentData = nextData;
    replacements++;
  });

  assert.equal(replace({ Categories: [{ Name: 'B' }] }), true);
  assert.deepEqual(currentData, { Categories: [{ Name: 'B' }] });
  assert.equal(replacements, 1);

  assert.equal(replace({ Categories: [{ Name: 'B' }] }), false);
  assert.deepEqual(currentData, { Categories: [{ Name: 'B' }] });
  assert.equal(replacements, 1);
});

test('identical generated description performs no assignment or callback', () => {
  const category = { Description: 'Groups crafting materials.' };
  let callbacks = 0;
  assert.equal(applyGeneratedDescriptionChange(category, 'Groups crafting materials.', () => callbacks++), false);
  assert.deepEqual(category, { Description: 'Groups crafting materials.' });
  assert.equal(callbacks, 0);
});

test('changed generated description assigns and signals exactly once', () => {
  const category = { Description: 'Old text.' };
  let callbacks = 0;
  assert.equal(applyGeneratedDescriptionChange(category, 'New text.', () => callbacks++), true);
  assert.equal(category.Description, 'New text.');
  assert.equal(callbacks, 1);
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

test('category reorder supports real moves in both directions and placements', () => {
  for (const [source, target, before, expected, selectedIndex] of [
    [0, 2, false, ['b', 'c', 'a'], 2],
    [2, 0, true, ['c', 'a', 'b'], 0],
    [0, 2, true, ['b', 'a', 'c'], 1],
    [2, 0, false, ['a', 'c', 'b'], 1]
  ]) {
    const categories = ['a', 'b', 'c'].map(name => ({ name }));
    const moved = categories[source];
    assert.deepEqual(reorderCategories(categories, source, target, before), { changed: true, selectedIndex });
    assert.deepEqual(categories.map(category => category.name), expected);
    assert.equal(categories[selectedIndex], moved);
  }
});

test('category reorder detects adjacent and same-target identity no-ops', () => {
  for (const [source, target, before] of [[0, 1, true], [1, 0, false], [1, 1, true], [1, 1, false]]) {
    const categories = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
    const original = categories.slice();
    assert.deepEqual(reorderCategories(categories, source, target, before), { changed: false, selectedIndex: source });
    assert.deepEqual(categories, original);
  }
});

test('category reorder rejects invalid indices without mutation', () => {
  const invalid = [-1, 0.5, NaN, Infinity, '0', null, 3];
  for (const index of invalid) {
    const categories = [{}, {}, {}];
    const original = categories.slice();
    assert.deepEqual(reorderCategories(categories, index, 1, true), { changed: false, selectedIndex: -1 });
    assert.deepEqual(categories, original);
    assert.deepEqual(reorderCategories(categories, 1, index, false), { changed: false, selectedIndex: -1 });
    assert.deepEqual(categories, original);
  }
});

test('category reorder compares identity with duplicate IDs and JSON-identical objects', () => {
  const first = { Id: 'duplicate', Rules: {} };
  const second = { Id: 'duplicate', Rules: {} };
  const categories = [first, second];
  assert.deepEqual(first, second);
  assert.deepEqual(reorderCategories(categories, 0, 1, false), { changed: true, selectedIndex: 1 });
  assert.equal(categories[0], second);
  assert.equal(categories[1], first);
});

test('no-op and invalid category drops have no structural side effects', () => {
  for (const sourceIndex of [0, -1, '0', NaN]) {
    const categories = [{ Order: 1 }, { Order: 2 }];
    const calls = { select: 0, renumber: 0, dirty: 0, render: 0 };
    const result = applyCategoryReorder({
      categories, sourceIndex, targetIndex: 1, before: true,
      setSelectedIndex: () => calls.select++, autoRenumber: true,
      renumber: () => calls.renumber++, markDirty: () => calls.dirty++, render: () => calls.render++
    });
    assert.equal(result.changed, false);
    assert.deepEqual(calls, { select: 0, renumber: 0, dirty: 0, render: 0 });
  }
});

test('successful category drop selects, optionally renumbers, dirties, and renders exactly once', () => {
  for (const autoRenumber of [false, true]) {
    const moved = { Order: 1 };
    const categories = [moved, { Order: 2 }, { Order: 3 }];
    const calls = { selected: [], renumber: 0, dirty: 0, render: 0 };
    const result = applyCategoryReorder({
      categories, sourceIndex: 0, targetIndex: 2, before: false, autoRenumber,
      setSelectedIndex: index => calls.selected.push(index), renumber: () => calls.renumber++,
      markDirty: () => calls.dirty++, render: () => calls.render++
    });
    assert.deepEqual(result, { changed: true, selectedIndex: 2 });
    assert.equal(categories[2], moved);
    assert.deepEqual(calls, { selected: [2], renumber: autoRenumber ? 1 : 0, dirty: 1, render: 1 });
  }
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
