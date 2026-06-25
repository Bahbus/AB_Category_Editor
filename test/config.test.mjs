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
  validateConfig,
  buildImportSummary
} from '../src/config.js';
import { RANGE_FILTERS, STATE_FILTER_KEYS } from '../src/constants.js';

const allowedRarities = [1, 2, 3, 4, 7];

test('shared range defaults match defaultRules', () => {
  const rules = defaultRules();
  for (const filter of RANGE_FILTERS) {
    assert.deepEqual(rules[filter.key], filter.defaults);
    assert.notEqual(rules[filter.key], filter.defaults);
  }
  assert.deepEqual(STATE_FILTER_KEYS.map(key => rules[key]), STATE_FILTER_KEYS.map(() => ({ State: 0, Filter: 0 })));
});

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
  assert.ok(Array.isArray(result.repairs));
  assert.match(result.summary, /Imported 2 categories/);
  assert.deepEqual(config.Categories.map(category => category.Id), ['first', 'later']);
  assert.deepEqual(config.Categories[1].Rules.AllowedRarities, [1, 7]);
});

test('validateConfig repair report includes rarity normalization details', () => {
  const config = { Categories: [{ Id: 'potions', Name: 'Potions', Rules: { AllowedRarities: [1, 99, 7, 7] } }] };

  const result = validateConfig(config);

  assert.ok(result.repairs.some(repair => (
    repair.categoryName === 'Potions'
    && repair.field === 'AllowedRarities'
    && /Allowed Rarities changed/.test(repair.message)
    && repair.before.length === 4
    && repair.after.length === 2
  )));
});

test('validateConfig repair report includes malformed range, state, and list details', () => {
  const config = {
    Categories: [{
      Id: 'gear',
      Name: 'Gear',
      Rules: {
        AllowedItemIds: 'bad',
        Level: null,
        Dyeable: []
      }
    }]
  };

  const result = validateConfig(config);

  assert.ok(result.repairs.some(repair => repair.field === 'AllowedItemIds' && /empty array/.test(repair.message)));
  assert.ok(result.repairs.some(repair => repair.field === 'Level' && /malformed/.test(repair.message)));
  assert.ok(result.repairs.some(repair => repair.field === 'Dyeable' && /malformed/.test(repair.message)));
});

test('ensureShape repairs malformed range, state, and array rules safely', () => {
  const category = {
    Rules: {
      AllowedItemIds: 'bad',
      AllowedItemNamePatterns: null,
      AllowedUiCategoryIds: {},
      AllowedRarities: 'bad',
      Level: null,
      ItemLevel: [],
      VendorPrice: 'bad',
      Untradable: null,
      Unique: [],
      Collectable: 'bad',
      Dyeable: { State: 99, Filter: 3 },
      Repairable: { State: 1 },
      HighQuality: { State: '2', Filter: '7' }
    }
  };

  assert.doesNotThrow(() => ensureShape(category));

  assert.deepEqual(category.Rules.AllowedItemIds, []);
  assert.deepEqual(category.Rules.AllowedItemNamePatterns, []);
  assert.deepEqual(category.Rules.AllowedUiCategoryIds, []);
  assert.deepEqual(category.Rules.AllowedRarities, []);
  assert.deepEqual(category.Rules.Level, { Enabled: false, Min: 0, Max: 200 });
  assert.deepEqual(category.Rules.ItemLevel, { Enabled: false, Min: 0, Max: 2000 });
  assert.deepEqual(category.Rules.VendorPrice, { Enabled: false, Min: 0, Max: 9999999 });
  assert.deepEqual(category.Rules.Untradable, { State: 0, Filter: 0 });
  assert.deepEqual(category.Rules.Unique, { State: 0, Filter: 0 });
  assert.deepEqual(category.Rules.Collectable, { State: 0, Filter: 0 });
  assert.deepEqual(category.Rules.Dyeable, { State: 0, Filter: 3 });
  assert.deepEqual(category.Rules.Repairable, { State: 1, Filter: 0 });
  assert.deepEqual(category.Rules.HighQuality, { State: 2, Filter: 7 });
});

test('ensureShape repairs malformed range fields while preserving finite unusual values', () => {
  const category = {
    Rules: {
      Level: { Enabled: 'yes', Min: -50, Max: 'bad' },
      ItemLevel: { Enabled: 0, Max: 12345 },
      VendorPrice: { Enabled: false, Min: 1.5, Max: 999999999 }
    }
  };

  ensureShape(category);

  assert.deepEqual(category.Rules.Level, { Enabled: true, Min: -50, Max: 200 });
  assert.deepEqual(category.Rules.ItemLevel, { Enabled: false, Min: 0, Max: 12345 });
  assert.deepEqual(category.Rules.VendorPrice, { Enabled: false, Min: 1.5, Max: 999999999 });
});

test('validateConfig does not crash on malformed but repairable nested rules', () => {
  const config = {
    Categories: [{
      Id: 'broken',
      Rules: {
        AllowedItemIds: 'bad',
        AllowedItemNamePatterns: null,
        AllowedUiCategoryIds: {},
        AllowedRarities: 'bad',
        Level: null,
        ItemLevel: [],
        VendorPrice: 'bad',
        Untradable: null,
        Unique: [],
        Collectable: 'bad',
        Dyeable: { State: 3, Filter: 'bad' }
      }
    }]
  };

  assert.doesNotThrow(() => validateConfig(config));
  validateConfig(config);

  assert.deepEqual(config.Categories[0].Rules.Level, { Enabled: false, Min: 0, Max: 200 });
  assert.deepEqual(config.Categories[0].Rules.ItemLevel, { Enabled: false, Min: 0, Max: 2000 });
  assert.deepEqual(config.Categories[0].Rules.VendorPrice, { Enabled: false, Min: 0, Max: 9999999 });
  assert.deepEqual(config.Categories[0].Rules.Dyeable, { State: 0, Filter: 0 });
});


test('buildImportSummary mentions Order, Priority, and Name sorting', () => {
  const summary = buildImportSummary(2, 0);

  assert.match(summary, /Order, Priority, and Name/);
  assert.doesNotMatch(summary, /sorted them by Order\./);
});

test('makeId returns 32 lowercase hex characters', async () => {
  const { makeId } = await import('../src/config.js');

  assert.match(makeId(), /^[0-9a-f]{32}$/);
});
