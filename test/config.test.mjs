import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultCategory,
  defaultRules,
  ensureShape,
  compareCategoriesForImport,
  getNormalizedAllowedRarities,
  normalizeAllowedRarities,
  normalizeAllowedRaritiesWithReport,
  sortImportedCategories,
  validateConfig
} from '../src/config.js';

const allowedRarities = [1, 2, 3, 4, 7];

test('defaultRules creates fresh arrays and supported rarity defaults', () => {
  const first = defaultRules();
  const second = defaultRules();

  assert.deepEqual(first.AllowedRarities, []);
  first.AllowedItemIds.push(123);
  assert.deepEqual(second.AllowedItemIds, []);
});

test('defaultCategory uses max order for Order and Priority', () => {
  const category = defaultCategory(41);

  assert.equal(category.Name, 'New Category');
  assert.equal(category.Order, 42);
  assert.equal(category.Priority, 42);
  assert.equal(category.Enabled, true);
  assert.match(category.Id, /^[0-9a-f]{32}$/);
});

test('ensureShape fills missing color and rule fields', () => {
  const category = { Color: { X: 0.25 }, Rules: { AllowedItemIds: 'bad' } };

  ensureShape(category);

  assert.deepEqual(Object.keys(category.Color).sort(), ['W', 'X', 'Y', 'Z']);
  assert.equal(category.Color.X, 0.25);
  assert.equal(category.Color.W, 1);
  assert.deepEqual(category.Rules.AllowedItemIds, []);
  assert.deepEqual(category.Rules.AllowedRarities, []);
  assert.deepEqual(category.Rules.Level, { Enabled: false, Min: 0, Max: 200 });
});

test('getNormalizedAllowedRarities returns display rarities without mutating the category', () => {
  const category = { Rules: { AllowedRarities: [7, '4', 99, 4, 1, 0, 2, 3, 3, 'bad'] } };

  const normalized = getNormalizedAllowedRarities(category);

  assert.deepEqual(normalized, allowedRarities);
  assert.deepEqual(category.Rules.AllowedRarities, [7, '4', 99, 4, 1, 0, 2, 3, 3, 'bad']);
});

test('normalizeAllowedRarities keeps only supported unique numeric rarities', () => {
  const category = { Rules: { AllowedRarities: [7, '4', 99, 4, 1, 0, 2, 3, 3, 'bad'] } };

  const normalized = normalizeAllowedRarities(category);

  assert.deepEqual(normalized, allowedRarities);
  assert.deepEqual(category.Rules.AllowedRarities, allowedRarities);
});

test('normalizeAllowedRaritiesWithReport reports changes only when output differs', () => {
  const changed = { Rules: { AllowedRarities: ['7', 7, 2] } };
  const unchanged = { Rules: { AllowedRarities: [1, 2, 3, 4, 7] } };

  assert.deepEqual(normalizeAllowedRaritiesWithReport(changed), {
    normalized: [2, 7],
    changed: true
  });
  assert.deepEqual(normalizeAllowedRaritiesWithReport(unchanged), {
    normalized: [1, 2, 3, 4, 7],
    changed: false
  });
});

test('compareCategoriesForImport provides shared category order sorting', () => {
  const categories = [
    { Id: 'b', Name: 'Beta', Order: 2, Priority: 1 },
    { Id: 'd', Name: 'Alpha', Order: 1, Priority: 2 },
    { Id: 'c', Name: 'Alpha', Order: 1, Priority: 1 },
    { Id: 'a', Name: 'Alpha', Order: 1, Priority: 1 }
  ];

  categories.sort(compareCategoriesForImport);

  assert.deepEqual(categories.map(category => category.Id), ['a', 'c', 'd', 'b']);
});

test('sortImportedCategories sorts by Order, then Priority, name, and id', () => {
  const config = {
    Categories: [
      { Id: 'b', Name: 'Beta', Order: 2, Priority: 1 },
      { Id: 'd', Name: 'Alpha', Order: 1, Priority: 2 },
      { Id: 'c', Name: 'Alpha', Order: 1, Priority: 1 },
      { Id: 'a', Name: 'Alpha', Order: 1, Priority: 1 }
    ]
  };

  assert.equal(sortImportedCategories(config), config);
  assert.deepEqual(config.Categories.map(category => category.Id), ['a', 'c', 'd', 'b']);
});

test('validateConfig normalizes valid configs and returns a summary without throwing', () => {
  const config = {
    Categories: [
      { Id: 'later', Name: 'Later', Order: 2, Rules: { AllowedRarities: [99, 7, 7, '1'] } },
      { Id: 'first', Name: 'First', Order: 1, Rules: { AllowedRarities: [4, 3] } }
    ]
  };

  assert.doesNotThrow(() => validateConfig(config));
  const result = validateConfig(config);

  assert.equal(result.config, config);
  assert.equal(typeof result.summary, 'string');
  assert.match(result.summary, /Imported 2 categories/);
  assert.deepEqual(config.Categories.map(category => category.Id), ['first', 'later']);
  assert.deepEqual(config.Categories[1].Rules.AllowedRarities, [1, 7]);
});
