import test from 'node:test';
import assert from 'node:assert/strict';

import { duplicateResultCount, findDuplicateFilters } from '../src/tools/findDuplicateFilters.js';

function cat(name, order, rules = {}) {
  return { Name: name, Order: order, Rules: rules };
}

test('finds duplicate item IDs numerically across categories', () => {
  const results = findDuplicateFilters([
    cat('Alpha', 2, { AllowedItemIds: ['100', 101] }),
    cat('Beta', 1, { AllowedItemIds: [100] })
  ]);

  assert.equal(results.itemIds.length, 1);
  assert.equal(results.itemIds[0].key, '100');
  assert.deepEqual(results.itemIds[0].categories.map(c => c.label), ['Order 2 · Alpha', 'Order 1 · Beta']);
});

test('finds duplicate UI category IDs numerically across categories', () => {
  const results = findDuplicateFilters([
    cat('One', 1, { AllowedUiCategoryIds: [7] }),
    cat('Two', 2, { AllowedUiCategoryIds: ['7'] })
  ]);

  assert.equal(results.uiCategoryIds.length, 1);
  assert.equal(results.uiCategoryIds[0].display, '7');
});

test('finds duplicate trimmed name patterns while preserving case sensitivity', () => {
  const results = findDuplicateFilters([
    cat('One', 1, { AllowedItemNamePatterns: ['  ^Iron'] }),
    cat('Two', 2, { AllowedItemNamePatterns: ['^Iron'] }),
    cat('Three', 3, { AllowedItemNamePatterns: ['^iron'] })
  ]);

  assert.equal(results.namePatterns.length, 1);
  assert.equal(results.namePatterns[0].display, '^Iron');
});

test('does not report duplicates for empty or default filters', () => {
  const results = findDuplicateFilters([
    cat('Empty', 1, { AllowedItemIds: [], AllowedUiCategoryIds: [], AllowedItemNamePatterns: ['  '], AllowedRarities: [], Level: { Enabled: false, Min: 0, Max: 200 }, Unique: { State: 0, Filter: 0 } }),
    cat('Default', 2, { Level: { Enabled: false, Min: 0, Max: 200 }, Unique: { State: 0, Filter: 0 } })
  ]);

  assert.equal(duplicateResultCount(results), 0);
});

test('finds normalized rarity set duplicates', () => {
  const results = findDuplicateFilters([
    cat('One', 1, { AllowedRarities: [7, '2', 2] }),
    cat('Two', 2, { AllowedRarities: [2, 7] })
  ]);

  assert.equal(results.raritySets.length, 1);
  assert.equal(results.raritySets[0].key, '2,7');
});

test('category labels include order and name for display', () => {
  const results = findDuplicateFilters([
    cat('Weapons', 12, { AllowedItemIds: [5] }),
    cat('Armor', 13, { AllowedItemIds: [5] })
  ]);

  assert.deepEqual(results.itemIds[0].categories.map(c => c.label), ['Order 12 · Weapons', 'Order 13 · Armor']);
});
