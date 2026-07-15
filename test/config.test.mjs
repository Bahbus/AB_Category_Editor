import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultCategory,
  makeId,
  defaultRules,
  ensureShape,
  compareCategoriesForImport,
  getNormalizedAllowedRarities,
  normalizeAllowedRarities,
  normalizeAllowedRaritiesWithReport,
  normalizedRaritySet,
  nextCategorySortValue,
  sameValidRaritySet,
  sortImportedCategories,
  validateConfig
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

test('makeId returns 32 lowercase hex chars and non-trivial values', () => {
  const first = makeId();
  const generated = Array.from({ length: 8 }, () => makeId());

  assert.match(first, /^[0-9a-f]{32}$/);
  assert.ok(generated.every(id => /^[0-9a-f]{32}$/.test(id)));
  assert.ok(new Set([first, ...generated]).size > 1);
});

test('defaultCategory uses max order for Order and Priority', () => {
  const category = defaultCategory(41);

  assert.equal(category.Name, 'New Category');
  assert.equal(category.Order, 42);
  assert.equal(category.Priority, 42);
  assert.equal(category.Enabled, true);
  assert.match(category.Id, /^[0-9a-f]{32}$/);
});

test('nextCategorySortValue uses compatible Int32 numbers without overflowing', () => {
  const categories = [
    { Order: 'not-a-number' }, { Order: 6 }, { Order: '8.5' }, { Order: Number.POSITIVE_INFINITY },
    { Order: null }, { Order: ' ' }, { Order: false }, { Order: [] }, { Order: {} }
  ];

  assert.equal(nextCategorySortValue(categories), 7);
  assert.equal(categories[2].Order, '8.5');
  assert.equal(nextCategorySortValue([{ Order: 2147483647 }]), 2147483647);
  assert.equal(defaultCategory(2147483647).Order, 2147483647);
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

test('categories must be JSON objects while valid objects still receive nested repairs', () => {
  const errorMessage = 'A category must be a JSON object.';
  const invalidCategories = [null, [], 42, 'not a category', true];

  for (const invalidCategory of invalidCategories) {
    assert.throws(() => ensureShape(invalidCategory), { message: errorMessage });

    const config = { Categories: [invalidCategory] };
    assert.throws(() => validateConfig(config), { message: errorMessage });
    assert.deepEqual(config.Categories, [invalidCategory]);
  }

  const validCategory = { Color: [], Rules: { AllowedItemIds: 'bad', Level: null } };
  ensureShape(validCategory);

  assert.deepEqual(validCategory.Color, { X: 1, Y: 1, Z: 1, W: 1 });
  assert.deepEqual(validCategory.Rules.AllowedItemIds, []);
  assert.deepEqual(validCategory.Rules.Level, { Enabled: false, Min: 0, Max: 200 });
});

test('validateConfig replaces an array Color and records a material import repair', () => {
  const config = { Categories: [{ Id: 'array-color', Name: 'Array Color', Color: [], Rules: {} }] };
  const result = validateConfig(config);
  const repair = result.repairs.find(item => item.field === 'Color');

  assert.deepEqual(config.Categories[0].Color, { X: 1, Y: 1, Z: 1, W: 1 });
  assert.ok(repair);
  assert.equal(repair.before instanceof Array, true);
  assert.equal(repair.material, true);
  assert.equal(repair.severity, 'warning');
  assert.match(repair.message, /Color was missing or malformed/);
});

test('validateConfig replaces scalar Color values without throwing', () => {
  const config = { Categories: [{ Id: 'scalar-color', Name: 'Scalar Color', Color: 'not-a-color', Rules: {} }] };

  const result = validateConfig(config);

  assert.deepEqual(config.Categories[0].Color, { X: 1, Y: 1, Z: 1, W: 1 });
  assert.equal(result.repairs.filter(item => item.field === 'Color').length, 1);
});

test('validateConfig records one material repair for malformed Color components and preserves numeric precision', () => {
  const precise = 0.123456789;
  const config = { Categories: [{
    Id: 'component-color',
    Name: 'Component Color',
    Color: { X: precise, Y: 'bad', Z: 0.75 },
    Rules: {}
  }] };

  const result = validateConfig(config);
  const repairs = result.repairs.filter(item => item.field === 'Color');

  assert.deepEqual(config.Categories[0].Color, { X: precise, Y: 1, Z: 0.75, W: 1 });
  assert.equal(repairs.length, 1);
  assert.equal(repairs[0].material, true);
  assert.equal(repairs[0].severity, 'warning');
  assert.equal(repairs[0].showBeforeAfter, false);
  assert.match(repairs[0].message, /components/);
  assert.doesNotMatch(repairs[0].message, /missing or malformed and replaced with default RGBA values/);
});

test('validateConfig repairs JSON-parsed overflowing Color before serialization can turn it into null', () => {
  const config = JSON.parse('{"Categories":[{"Id":"overflow-color","Name":"Overflow Color","Color":{"X":1e400,"Y":0.5,"Z":0.75,"W":1},"Rules":{}}]}');
  assert.equal(config.Categories[0].Color.X, Infinity);

  const result = validateConfig(config);
  const repair = result.repairs.find(item => item.field === 'Color');

  assert.equal(config.Categories[0].Color.X, 1);
  assert.ok(repair);
  assert.equal(repair.material, true);
  assert.equal(JSON.stringify(config).includes('"X":null'), false);
});

test('rarity type-changing coercions are material while valid order-only normalization is not', () => {
  for (const value of ['1', true]) {
    const config = { Categories: [{ ...defaultCategory(), Rules: { ...defaultRules(), AllowedRarities: [value] } }] };
    const result = validateConfig(config);
    const repair = result.repairs.find(item => item.field === 'AllowedRarities');
    assert.equal(repair.material, true);
    assert.equal(repair.severity, 'warning');
  }

  const reorder = { Categories: [{ ...defaultCategory(), Rules: { ...defaultRules(), AllowedRarities: [7, 1, 4] } }] };
  const result = validateConfig(reorder);
  const repair = result.repairs.find(item => item.field === 'AllowedRarities');
  assert.equal(repair.material, false);
  assert.equal(repair.severity, 'note');
});

test('getNormalizedAllowedRarities returns display rarities without mutating the category', () => {
  const category = { Rules: { AllowedRarities: [7, '4', 99, 4, 1, 0, 2, 3, 3, 'bad'] } };

  const normalized = getNormalizedAllowedRarities(category);

  assert.deepEqual(normalized, allowedRarities);
  assert.deepEqual(category.Rules.AllowedRarities, [7, '4', 99, 4, 1, 0, 2, 3, 3, 'bad']);
});


test('rarity set helpers distinguish reorder-only from dropped invalids or duplicates', () => {
  assert.deepEqual(normalizedRaritySet([7, 4, 3, 2]), [2, 3, 4, 7]);
  assert.equal(sameValidRaritySet([7, 4, 3, 2], [2, 3, 4, 7]), true);
  assert.equal(sameValidRaritySet([7, 4, 999, 3, 3], [3, 4, 7]), false);
  assert.equal(sameValidRaritySet([3, 3, 4], [3, 4]), false);
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

test('import sorting accepts numeric strings and places coercion-only sort values after valid values', () => {
  const config = { Categories: [
    { Id: 'null', Name: 'Null', Order: null, Priority: 0 },
    { Id: 'blank', Name: 'Blank', Order: ' ', Priority: 0 },
    { Id: 'boolean', Name: 'Boolean', Order: false, Priority: 0 },
    { Id: 'array', Name: 'Array', Order: [], Priority: 0 },
    { Id: 'decimal', Name: 'Decimal', Order: '-1.5', Priority: '+2' },
    { Id: 'number', Name: 'Number', Order: 3, Priority: 0 }
  ] };

  sortImportedCategories(config);

  assert.deepEqual(config.Categories.map(category => category.Id), ['decimal', 'number', 'array', 'blank', 'boolean', 'null']);
  assert.equal(config.Categories[0].Order, '-1.5');
  assert.equal(config.Categories[0].Priority, '+2');
});

test('validateConfig preserves accepted imported Order and Priority numeric strings', () => {
  const config = { Categories: [{
    Id: 'numeric-strings',
    Name: 'Numeric Strings',
    Order: '-1.25',
    Priority: ' +3 ',
    Rules: {}
  }] };

  validateConfig(config);

  assert.equal(config.Categories[0].Order, '-1.25');
  assert.equal(config.Categories[0].Priority, ' +3 ');
});

test('validateConfig mutates and normalizes valid configs without returning a legacy summary', () => {
  const config = {
    Categories: [
      { Id: 'later', Name: 'Later', Order: 2, Rules: { AllowedRarities: [99, 7, 7, '1'] } },
      { Id: 'first', Name: 'First', Order: 1, Rules: { AllowedRarities: [4, 3] } }
    ]
  };

  assert.doesNotThrow(() => validateConfig(config));
  const result = validateConfig(config);

  assert.equal(result.config, config);
  assert.equal('summary' in result, false);
  assert.ok(Array.isArray(result.repairs));
  assert.deepEqual(config.Categories.map(category => category.Id), ['first', 'later']);
  assert.deepEqual(config.Categories[1].Rules.AllowedRarities, [1, 7]);
});


test('validateConfig classifies Allowed Rarities reorder-only repair as non-material note', () => {
  const config = { Categories: [{ Id: 'gear', Name: 'Gear', Rules: { AllowedRarities: [7, 4, 3, 2] } }] };

  const result = validateConfig(config);
  const repair = result.repairs.find(item => item.field === 'AllowedRarities');

  assert.deepEqual(config.Categories[0].Rules.AllowedRarities, [2, 3, 4, 7]);
  assert.ok(repair);
  assert.equal(repair.material, false);
  assert.equal(repair.severity, 'note');
  assert.equal(repair.showBeforeAfter, false);
  assert.match(repair.message, /sorted/);
});

test('validateConfig classifies Allowed Rarities invalid/drop repair as material warning', () => {
  const config = { Categories: [{ Id: 'gear', Name: 'Gear', Rules: { AllowedRarities: [2, 3, 999] } }] };

  const result = validateConfig(config);
  const repair = result.repairs.find(item => item.field === 'AllowedRarities');

  assert.deepEqual(config.Categories[0].Rules.AllowedRarities, [2, 3]);
  assert.ok(repair);
  assert.equal(repair.material, true);
  assert.equal(repair.severity, 'warning');
});

test('validateConfig classifies duplicate Allowed Rarities removal as material warning', () => {
  const config = { Categories: [{ Id: 'gear', Name: 'Gear', Rules: { AllowedRarities: [3, 3, 4] } }] };

  const result = validateConfig(config);
  const repair = result.repairs.find(item => item.field === 'AllowedRarities');

  assert.deepEqual(config.Categories[0].Rules.AllowedRarities, [3, 4]);
  assert.ok(repair);
  assert.equal(repair.material, true);
  assert.equal(repair.severity, 'warning');
});

test('validateConfig classifies non-array Allowed Rarities repair as material warning', () => {
  const config = { Categories: [{ Id: 'gear', Name: 'Gear', Rules: { AllowedRarities: 'bad' } }] };

  const result = validateConfig(config);
  const repair = result.repairs.find(item => item.field === 'AllowedRarities');

  assert.deepEqual(config.Categories[0].Rules.AllowedRarities, []);
  assert.ok(repair);
  assert.equal(repair.material, true);
  assert.equal(repair.severity, 'warning');
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
  assert.deepEqual(category.Rules.HighQuality, { State: 0, Filter: 0 });
});

test('ensureShape repairs incompatible range fields while preserving schema-valid unusual integers', () => {
  const category = {
    Rules: {
      Level: { Enabled: 'yes', Min: -50, Max: 'bad' },
      ItemLevel: { Enabled: 0, Max: 12345 },
      VendorPrice: { Enabled: false, Min: 1.5, Max: 999999999 }
    }
  };

  ensureShape(category);

  assert.deepEqual(category.Rules.Level, { Enabled: false, Min: -50, Max: 200 });
  assert.deepEqual(category.Rules.ItemLevel, { Enabled: false, Min: 0, Max: 12345 });
  assert.deepEqual(category.Rules.VendorPrice, { Enabled: false, Min: 0, Max: 999999999 });
});

test('range and state import repair uses component defaults without coercion', () => {
  const config = { Categories: [{
    Name: 'Strict scalars',
    Rules: {
      Level: { Enabled: 'false', Min: '12', Max: null },
      ItemLevel: { Enabled: false, Min: -7, Max: '' },
      VendorPrice: { Enabled: false, Min: -1, Max: 1.5 },
      Dyeable: { State: '2', Filter: 1.5 },
      Repairable: { State: 2, Filter: -123 }
    }
  }] };

  const result = validateConfig(config);
  const rules = config.Categories[0].Rules;

  assert.deepEqual(rules.Level, { Enabled: false, Min: 0, Max: 200 });
  assert.deepEqual(rules.ItemLevel, { Enabled: false, Min: -7, Max: 2000 });
  assert.deepEqual(rules.VendorPrice, { Enabled: false, Min: 0, Max: 9999999 });
  assert.deepEqual(rules.Dyeable, { State: 0, Filter: 0 });
  assert.deepEqual(rules.Repairable, { State: 2, Filter: -123 });
  assert.deepEqual(result.repairs.filter(repair => ['Level', 'ItemLevel', 'VendorPrice', 'Dyeable'].includes(repair.field)).map(repair => repair.field), ['Level', 'ItemLevel', 'VendorPrice', 'Dyeable']);
  assert.equal(result.repairs.some(repair => repair.field === 'Repairable'), false);
});

test('range and state import repair preserves width boundaries and repairs adjacent values component by component', () => {
  const category = defaultCategory(0);
  category.Rules.Level = { Enabled: true, Min: -2147483648, Max: 2147483648 };
  category.Rules.ItemLevel = { Enabled: true, Min: -2147483649, Max: 2147483647 };
  category.Rules.VendorPrice = { Enabled: true, Min: 0, Max: 4294967295 };
  category.Rules.Dyeable = { State: 2, Filter: 2147483648 };
  const result = validateConfig({ Categories: [category] });

  assert.deepEqual(category.Rules.Level, { Enabled: true, Min: -2147483648, Max: 200 });
  assert.deepEqual(category.Rules.ItemLevel, { Enabled: true, Min: 0, Max: 2147483647 });
  assert.deepEqual(category.Rules.VendorPrice, { Enabled: true, Min: 0, Max: 4294967295 });
  assert.deepEqual(category.Rules.Dyeable, { State: 2, Filter: 0 });
  assert.deepEqual(result.repairs.filter(item => ['Level', 'ItemLevel', 'Dyeable'].includes(item.field)).map(item => item.field), ['Level', 'ItemLevel', 'Dyeable']);
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



test('makeId returns 32 lowercase hex characters', async () => {
  const { makeId } = await import('../src/config.js');

  assert.match(makeId(), /^[0-9a-f]{32}$/);
});
