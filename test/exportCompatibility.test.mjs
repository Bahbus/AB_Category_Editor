import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultCategory } from '../src/config.js';
import {
  analyzeAetherBagsCompatibility,
  decideAetherBagsExportPreflight,
  jsonSerializationFidelityFindings,
  runAetherBagsExportPreflight
} from '../src/exportCompatibility.js';

function validConfig() {
  return {
    Format: 'AetherBags_Category',
    Version: 1,
    Categories: [defaultCategory(0)]
  };
}

function blockingFields(config) {
  return decideAetherBagsExportPreflight(config).blockingFindings.map(item => item.field);
}

test('complete valid exports and unknown properties remain compatible without mutation', () => {
  const config = validConfig();
  config.UnknownRoot = { future: true, nested: [1, { finite: -123.5 }] };
  config.Categories[0].UnknownCategory = ['preserved', { count: 2 }];
  config.Categories[0].Rules.UnknownRule = { value: 42 };
  const before = structuredClone(config);

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  assert.equal(decision.blockingFindings.length, 0);
  assert.deepEqual(config, before);
  assert.deepEqual(JSON.parse(JSON.stringify(config)), before);
});

test('nested unknown non-finite numbers block before the export callback without mutation', async () => {
  const config = validConfig();
  config.UnknownRoot = JSON.parse('{"nested":{"positive":1e400,"values":[0,-1e400]}}');
  config.Categories[0].UnknownCategory = JSON.parse('{"deep":[{"overflow":1e400}]}');
  config.Categories[0].Rules.UnknownRule = JSON.parse('{"overflow":-1e400}');
  const positive = config.UnknownRoot.nested.positive;
  const negative = config.UnknownRoot.nested.values[1];
  let callbackCount = 0;

  const result = await runAetherBagsExportPreflight(config, async () => { callbackCount++; });

  assert.equal(result.allowed, false);
  assert.equal(callbackCount, 0);
  assert.equal(config.UnknownRoot.nested.positive, positive);
  assert.equal(config.UnknownRoot.nested.values[1], negative);
  assert.equal(positive, Infinity);
  assert.equal(negative, -Infinity);
  assert.deepEqual(new Set(result.blockingFindings.filter(item => item.serializationFidelity).map(item => item.field)), new Set([
    '$.UnknownRoot.nested.positive',
    '$.UnknownRoot.nested.values[1]',
    '$.Categories[0].UnknownCategory.deep[0].overflow',
    '$.Categories[0].Rules.UnknownRule.overflow'
  ]));
  assert.match(result.blockingFindings[0].message, /silently replace with null/);
});

test('serialization fidelity traversal handles cycles and unserializable shapes with controlled findings', () => {
  const cyclic = validConfig();
  cyclic.UnknownRoot = { nested: {} };
  cyclic.UnknownRoot.nested.back = cyclic.UnknownRoot;
  const cycleDecision = decideAetherBagsExportPreflight(cyclic);
  assert.equal(cycleDecision.allowed, false);
  assert.ok(cycleDecision.blockingFindings.some(item => item.field === '$.UnknownRoot.nested.back' && /circular reference/.test(item.message)));
  assert.strictEqual(cyclic.UnknownRoot.nested.back, cyclic.UnknownRoot);

  const bigint = validConfig();
  bigint.Categories[0].Rules.UnknownBigInt = { value: 1n };
  assert.ok(decideAetherBagsExportPreflight(bigint).blockingFindings.some(item => item.field === '$.Categories[0].Rules.UnknownBigInt.value'));

  const sparse = validConfig();
  sparse.Categories[0].UnknownArray = new Array(2);
  sparse.Categories[0].UnknownArray[1] = 'present';
  assert.ok(decideAetherBagsExportPreflight(sparse).blockingFindings.some(item => item.field === '$.Categories[0].UnknownArray[0]' && /array hole/.test(item.message)));

  const accessor = validConfig();
  let getterCalls = 0;
  Object.defineProperty(accessor, 'UnknownAccessor', { enumerable: true, get() { getterCalls++; return 1; } });
  const accessorFindings = jsonSerializationFidelityFindings(accessor);
  assert.equal(getterCalls, 0);
  assert.ok(accessorFindings.some(item => item.field === '$.UnknownAccessor' && /accessor property/.test(item.message)));
});

test('root envelope requires the exact format, numeric version, and category array', () => {
  const config = validConfig();
  config.Format = 1;
  config.Version = '1';
  config.Categories = null;

  assert.deepEqual(blockingFields(config), ['Format', 'Version', 'Categories']);
});

test('root defaults and ignored correctly typed envelope values are warnings, while incompatible types block', () => {
  const omitted = validConfig();
  delete omitted.Format;
  delete omitted.Version;
  const omittedDecision = decideAetherBagsExportPreflight(omitted);
  assert.equal(omittedDecision.allowed, true);
  assert.ok(omittedDecision.analysis.findings.some(item => item.field === 'Format' && item.severity === 'warning' && /default/.test(item.message)));
  assert.ok(omittedDecision.analysis.findings.some(item => item.field === 'Version' && item.severity === 'warning' && /default/.test(item.message)));

  const ignored = validConfig();
  ignored.Format = 'Future_Category_Format';
  ignored.Version = -2147483648;
  const ignoredDecision = decideAetherBagsExportPreflight(ignored);
  assert.equal(ignoredDecision.allowed, true);
  assert.ok(ignoredDecision.analysis.findings.some(item => item.field === 'Format' && item.severity === 'warning' && /ignores/.test(item.message)));
  assert.ok(ignoredDecision.analysis.findings.some(item => item.field === 'Version' && item.severity === 'warning' && /ignores/.test(item.message)));

  const nullFormat = validConfig();
  nullFormat.Format = null;
  const nullFormatDecision = decideAetherBagsExportPreflight(nullFormat);
  assert.equal(nullFormatDecision.allowed, true);
  assert.ok(nullFormatDecision.analysis.findings.some(item => item.field === 'Format' && item.severity === 'warning' && /ignores/.test(item.message)));

  for (const [field, value] of [['Format', 1], ['Version', '1'], ['Version', 2147483648]]) {
    const invalid = validConfig();
    invalid[field] = value;
    assert.ok(decideAetherBagsExportPreflight(invalid).blockingFindings.some(item => item.field === field));
  }
});

test('omitted upstream-defaulted category and rule properties warn without becoming unreadable blockers', () => {
  const config = validConfig();
  const category = config.Categories[0];
  for (const field of ['Enabled', 'Pinned', 'Id', 'Name', 'Description', 'Order', 'Priority', 'Color', 'ItemSortCriteria', 'CustomItemOrder', 'Rules']) delete category[field];

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  for (const field of ['Enabled', 'Pinned', 'Id', 'Name', 'Description', 'Order', 'Priority', 'Color', 'ItemSortCriteria', 'CustomItemOrder', 'Rules']) {
    assert.ok(decision.analysis.findings.some(item => item.field === field && item.severity === 'warning' && /omitted/.test(item.message)), `missing default warning for ${field}`);
  }
});

test('omitted nested initialized members warn while explicit null and malformed members still block', () => {
  const config = validConfig();
  const category = config.Categories[0];
  delete category.Color.X;
  delete category.ItemSortCriteria[0].Field;
  delete category.Rules.AllowedItemIds;
  delete category.Rules.Level;
  delete category.Rules.Unique.State;

  const decision = decideAetherBagsExportPreflight(config);
  assert.equal(decision.allowed, true);
  assert.ok(decision.analysis.findings.filter(item => item.severity === 'warning').length >= 5);

  const explicitNull = validConfig();
  explicitNull.Categories[0].Color = null;
  explicitNull.Categories[0].Rules.Level = null;
  explicitNull.Categories[0].Rules.AllowedItemIds = null;
  const blocking = new Set(blockingFields(explicitNull));
  assert.ok(blocking.has('Color'));
  assert.ok(blocking.has('Level'));
  assert.ok(blocking.has('AllowedItemIds'));
});

test('Order and Priority require signed Int32 JSON-number integers', () => {
  for (const value of [-2147483648, 2147483647]) {
    const config = validConfig();
    config.Categories[0].Order = value;
    config.Categories[0].Priority = value;
    assert.equal(decideAetherBagsExportPreflight(config).allowed, true);
  }

  for (const value of ['1', 1.5, true, false, null, undefined, [], {}, Infinity, -2147483649, 2147483648]) {
    const config = validConfig();
    config.Categories[0].Order = value;
    const decision = decideAetherBagsExportPreflight(config);
    assert.equal(decision.allowed, false, `expected ${String(value)} to be rejected`);
    assert.ok(decision.blockingFindings.some(item => item.field === 'Order'));
    assert.strictEqual(config.Categories[0].Order, value);
  }
});

test('uint lists require exact JSON numbers and never round oversized digit strings', () => {
  const config = validConfig();
  const rules = config.Categories[0].Rules;
  rules.AllowedItemIds = [0, 4294967295];
  rules.AllowedUiCategoryIds = [0, 4294967295];
  config.Categories[0].CustomItemOrder = [0, 4294967295];
  assert.equal(decideAetherBagsExportPreflight(config).allowed, true);

  for (const value of [4294967296, Number.MAX_SAFE_INTEGER + 1, '9007199254740993', '1', 1.5, -1, true, null, [], {}]) {
    const candidate = validConfig();
    candidate.Categories[0].Rules.AllowedItemIds = [value];
    const decision = decideAetherBagsExportPreflight(candidate);
    assert.equal(decision.allowed, false, `expected ${String(value)} to be rejected`);
    assert.strictEqual(candidate.Categories[0].Rules.AllowedItemIds[0], value);
  }

  const exact = validConfig();
  exact.Categories[0].Rules.AllowedItemIds = ['9007199254740993'];
  decideAetherBagsExportPreflight(exact);
  assert.equal(exact.Categories[0].Rules.AllowedItemIds[0], '9007199254740993');
  assert.notEqual(exact.Categories[0].Rules.AllowedItemIds[0], 9007199254740992);
});

test('category booleans, strings, ForkedFromKey, sort criteria, and rule members are checked', () => {
  const config = validConfig();
  const category = config.Categories[0];
  category.Enabled = 'true';
  category.Pinned = 0;
  category.Id = 1;
  category.Name = null;
  category.Description = false;
  category.ForkedFromKey = 12;
  category.ItemSortCriteria = [null, { Field: '1', Direction: 0 }, { Field: 1, Direction: '0' }];
  category.CustomItemOrder = ['1'];
  category.Rules.AllowedItemNamePatterns = [42];
  category.Rules.AllowedRarities = ['1'];

  const fields = new Set(blockingFields(config));
  for (const field of ['Enabled', 'Pinned', 'Id', 'Name', 'Description', 'ForkedFromKey', 'ItemSortCriteria', 'CustomItemOrder', 'AllowedItemNamePatterns', 'AllowedRarities']) {
    assert.ok(fields.has(field), `missing ${field}`);
  }
});

test('AetherBags sort-criterion normalization is reviewable but does not block deserialization', () => {
  const config = validConfig();
  config.Categories[0].ItemSortCriteria = [
    { Field: 1, Direction: 1 },
    { Field: 1, Direction: 0 },
    { Field: 99, Direction: 0 }
  ];

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  assert.ok(decision.analysis.findings.some(item => item.field === 'ItemSortCriteria' && item.severity === 'warning'));
});

test('Color requires finite values that remain finite as single precision', () => {
  for (const value of [Infinity, -Infinity, NaN, 3.5e38, '1', null]) {
    const config = validConfig();
    config.Categories[0].Color.X = value;
    assert.equal(decideAetherBagsExportPreflight(config).allowed, false);
  }
  const config = validConfig();
  config.Categories[0].Color.X = 3.4e38;
  assert.equal(decideAetherBagsExportPreflight(config).allowed, true);
});

test('range and state scalar widths remain part of export compatibility', () => {
  const config = validConfig();
  config.Categories[0].Rules.Level.Min = '0';
  config.Categories[0].Rules.VendorPrice.Max = 4294967296;
  config.Categories[0].Rules.HighQuality.Filter = 2147483648;

  const fields = blockingFields(config);
  assert.ok(fields.includes('Level'));
  assert.ok(fields.includes('VendorPrice'));
  assert.ok(fields.includes('HighQuality'));
});

test('one shared preflight blocks copy and download work but permits valid configs', async () => {
  const invalid = validConfig();
  invalid.Categories[0].Order = '1';
  let copySideEffects = 0;
  let downloadSideEffects = 0;

  const copy = await runAetherBagsExportPreflight(invalid, async () => { copySideEffects++; return 'copy'; });
  const download = await runAetherBagsExportPreflight(invalid, async () => { downloadSideEffects++; return 'download'; });
  assert.equal(copy.allowed, false);
  assert.equal(download.allowed, false);
  assert.equal(copySideEffects, 0);
  assert.equal(downloadSideEffects, 0);

  const valid = validConfig();
  assert.equal((await runAetherBagsExportPreflight(valid, async () => { copySideEffects++; return 'copy'; })).value, 'copy');
  assert.equal((await runAetherBagsExportPreflight(valid, async () => { downloadSideEffects++; return 'download'; })).value, 'download');
  assert.equal(copySideEffects, 1);
  assert.equal(downloadSideEffects, 1);
});

test('analysis exposes stable severity and count fields', () => {
  const config = validConfig();
  config.Categories[0].Order = '1';
  config.Categories[0].ItemSortCriteria = [];
  const analysis = analyzeAetherBagsCompatibility(config);

  assert.equal(analysis.counts.error, 1);
  assert.equal(analysis.counts.warning, 1);
  assert.equal(analysis.counts.blocking, 1);
  assert.equal(analysis.findings[0].categoryIndex, 0);
});
