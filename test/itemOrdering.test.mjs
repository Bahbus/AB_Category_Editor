import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ITEM_SORT_FIELDS,
  ITEM_SORT_DIRECTIONS,
  analyzeItemOrdering,
  decideCanonicalCriteriaRepair,
  decideCriterionAdd,
  decideCriterionChange,
  decideCriterionRemove,
  decideOrderedMove,
  decideUniqueItemAdd,
  decideItemRemove
} from '../src/itemOrdering.js';

test('ordering metadata exposes every pinned upstream field and direction', () => {
  assert.deepEqual(ITEM_SORT_FIELDS, [
    { value: 0, label: 'Use Global Default' }, { value: 1, label: 'Quantity' },
    { value: 2, label: 'Name' }, { value: 3, label: 'Rarity' },
    { value: 4, label: 'Item ID' }, { value: 5, label: 'Custom Item Order' },
    { value: 6, label: 'Game Category' }, { value: 7, label: 'Item Level' }
  ]);
  assert.deepEqual(ITEM_SORT_DIRECTIONS, [{ value: 0, label: 'Ascending' }, { value: 1, label: 'Descending' }]);
});

test('omitted and empty criteria derive Use Global without inserting properties', () => {
  for (const category of [{}, { ItemSortCriteria: [] }]) {
    const before = JSON.stringify(category);
    const analysis = analyzeItemOrdering(category);
    assert.deepEqual(analysis.effectiveCriteria, [{ Field: 0, Direction: 0 }]);
    assert.equal(analysis.badge, 'Use global');
    assert.equal(JSON.stringify(category), before);
  }
});

test('normalization preserves order, defaults missing members, discards unsupported and duplicates', () => {
  const category = { ItemSortCriteria: [
    { Field: 2, Direction: 0 }, {}, { Field: 2, Direction: 1 },
    { Field: 99, Direction: 0 }, { Field: 7, Direction: 1 }
  ] };
  const analysis = analyzeItemOrdering(category);
  assert.deepEqual(analysis.normalizedCriteria, [
    { Field: 2, Direction: 0 }, { Field: 1, Direction: 1 }, { Field: 7, Direction: 1 }
  ]);
  assert.match(analysis.criteriaIssues.map(item => item.message).join('\n'), /Field is omitted/);
  assert.match(analysis.criteriaIssues.map(item => item.message).join('\n'), /repeats Field 2/);
  assert.match(analysis.criteriaIssues.map(item => item.message).join('\n'), /unsupported/);
});

test('Use Global anywhere takes exclusive precedence and canonical direction', () => {
  const analysis = analyzeItemOrdering({ ItemSortCriteria: [
    { Field: 2, Direction: 1 }, { Field: 0, Direction: 1 }, { Field: 5, Direction: 0 }
  ], CustomItemOrder: [7] });
  assert.deepEqual(analysis.normalizedCriteria, [{ Field: 0, Direction: 0 }]);
  assert.equal(analysis.customCriterionActive, false);
  assert.equal(analysis.retainedInactiveCustomOrder, true);
});

test('custom order activation, retained inactive lists, and empty fallback are explicit', () => {
  const active = analyzeItemOrdering({ ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [8, 7] });
  assert.equal(active.customCriterionActive, true);
  assert.equal(active.customOrderingApplied, true);
  assert.equal(active.badge, 'Custom order');
  const retained = analyzeItemOrdering({ CustomItemOrder: [8, 7] });
  assert.equal(retained.retainedInactiveCustomOrder, true);
  assert.equal(retained.customOrderingApplied, false);
  for (const category of [
    { ItemSortCriteria: [{ Field: 5, Direction: 0 }] },
    { ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [] }
  ]) assert.match(analyzeItemOrdering(category).customIssues[0].message, /fall back to Quantity \/ Descending/);
  const mixed = analyzeItemOrdering({
    ItemSortCriteria: [{ Field: 5, Direction: 0 }, { Field: 2, Direction: 0 }],
    CustomItemOrder: []
  });
  assert.match(mixed.customIssues[0].message, /remaining sort criteria/);
});

test('canonical repair returns a fresh normalized list and is a strict no-op when canonical', () => {
  const normalized = [{ Field: 0, Direction: 0 }];
  assert.equal(decideCanonicalCriteriaRepair(normalized, normalized).changed, false);
  const repair = decideCanonicalCriteriaRepair([{ Field: 0, Direction: 1 }, { Field: 2, Direction: 0 }], normalized);
  assert.equal(repair.changed, true);
  assert.deepEqual(repair.value, normalized);
  assert.notEqual(repair.value, normalized);
});

test('criterion decisions enforce exclusivity, uniqueness, bounds, and no-ops', () => {
  const global = [{ Field: 0, Direction: 0 }];
  assert.deepEqual(decideCriterionAdd(global, 2, 1), { changed: true, value: [{ Field: 2, Direction: 1 }] });
  const two = [{ Field: 2, Direction: 1 }, { Field: 7, Direction: 0 }];
  assert.equal(decideCriterionAdd(two, 2).changed, false);
  assert.deepEqual(decideCriterionChange(two, 1, 'Field', 0).value, global);
  assert.equal(decideCriterionChange(two, 0, 'Direction', 1).changed, false);
  assert.equal(decideCriterionChange(two, 0, 'Field', 7).changed, false);
  assert.deepEqual(decideCriterionRemove(two, 0).value, [{ Field: 7, Direction: 0 }]);
  assert.equal(decideCriterionRemove(two, 9).changed, false);
  assert.equal(decideOrderedMove(two, 0, -1).changed, false);
  assert.deepEqual(decideOrderedMove(two, 0, 1).value, [two[1], two[0]]);
});

test('custom-list decisions are atomic, unique, ordered, and boundary aware', () => {
  const values = [7, 8];
  assert.equal(decideUniqueItemAdd(values, 7).changed, false);
  assert.equal(decideUniqueItemAdd(values, '9').changed, false);
  assert.deepEqual(decideUniqueItemAdd(values, 9).value, [7, 8, 9]);
  assert.equal(decideOrderedMove(values, 0, -1).changed, false);
  assert.deepEqual(decideOrderedMove(values, 1, -1).value, [8, 7]);
  assert.equal(decideItemRemove(values, 4).changed, false);
  assert.deepEqual(decideItemRemove(values, 0).value, [8]);
});

test('malformed ordering values remain unchanged and route away from structured editing', () => {
  for (const category of [
    { ItemSortCriteria: {} }, { ItemSortCriteria: [null] }, { CustomItemOrder: {} },
    { CustomItemOrder: [1, '2'] }
  ]) {
    const before = JSON.stringify(category);
    const analysis = analyzeItemOrdering(category);
    assert.ok(analysis.issues.some(item => item.blocksExport));
    assert.equal(JSON.stringify(category), before);
  }
});

test('a deliberate canonical repair clears ordering findings immediately', () => {
  const category = { ItemSortCriteria: [
    { Field: 2, Direction: 0 }, { Field: 2, Direction: 1 }, { Field: 99, Direction: 0 }
  ] };
  const before = analyzeItemOrdering(category);
  assert.ok(before.issues.length >= 2);
  const repair = decideCanonicalCriteriaRepair(category.ItemSortCriteria, before.normalizedCriteria);
  category.ItemSortCriteria = repair.value;
  assert.deepEqual(analyzeItemOrdering(category).issues, []);
});
