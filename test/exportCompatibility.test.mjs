import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultCategory } from '../src/config.js';
import { parseImportedText } from '../src/importExport.js';
import { shouldShowImportValidationModal } from '../src/importValidationSummary.js';
import { ADVANCED_PRESET_BASE64, BASIC_PRESET_BASE64 } from '../src/presets.js';
import { analyzeImportedConfig, getCategoryIssueCounts } from '../src/validation.js';
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

test('unknown sort-criterion properties remain export-compatible and preserved', () => {
  const config = validConfig();
  config.Categories[0].ItemSortCriteria = [{ Field: 2, Direction: 0, FutureOption: true }];
  const before = structuredClone(config);

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  assert.equal(decision.analysis.findings.filter(item => item.field === 'ItemSortCriteria').length, 0);
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

test('negative zero blocks at exact root, category, rule, object, and array paths before export callbacks', async () => {
  const config = validConfig();
  config.UnknownRootNegativeZero = -0;
  config.Categories[0].UnknownCategoryNegativeZero = -0;
  config.Categories[0].Rules.UnknownRuleNegativeZero = -0;
  config.Categories[0].UnknownNested = { member: -0, values: [1, -0] };
  let copyCallbacks = 0;
  let downloadCallbacks = 0;
  let stateAdvances = 0;

  const copy = await runAetherBagsExportPreflight(config, async () => {
    copyCallbacks++;
    stateAdvances++;
  });
  const download = await runAetherBagsExportPreflight(config, async () => {
    downloadCallbacks++;
    stateAdvances++;
  });

  const expectedPaths = new Set([
    '$.UnknownRootNegativeZero',
    '$.Categories[0].UnknownCategoryNegativeZero',
    '$.Categories[0].Rules.UnknownRuleNegativeZero',
    '$.Categories[0].UnknownNested.member',
    '$.Categories[0].UnknownNested.values[1]'
  ]);
  assert.equal(copy.allowed, false);
  assert.equal(download.allowed, false);
  assert.equal(copyCallbacks, 0);
  assert.equal(downloadCallbacks, 0);
  assert.equal(stateAdvances, 0);
  assert.deepEqual(new Set(copy.blockingFindings.filter(item => item.serializationFidelity).map(item => item.field)), expectedPaths);
  assert.deepEqual(new Set(download.blockingFindings.filter(item => item.serializationFidelity).map(item => item.field)), expectedPaths);
  assert.ok(copy.blockingFindings.every(item => !expectedPaths.has(item.field) || /negative zero/.test(item.message)));
  assert.equal(Object.is(config.UnknownRootNegativeZero, -0), true);
  assert.equal(Object.is(config.Categories[0].UnknownNested.values[1], -0), true);
});

test('ordinary finite zero remains serialization-compatible', () => {
  const config = validConfig();
  config.UnknownRootZero = 0;
  config.Categories[0].UnknownNested = { member: 0, values: [0] };

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  assert.equal(decision.blockingFindings.length, 0);
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

test('enumerable and non-enumerable own toJSON accessors block without invoking getters or serializers', async () => {
  for (const enumerable of [true, false]) {
    const config = validConfig();
    config.Categories[0].UnknownNested = { preserved: true };
    let getterCalls = 0;
    let serializerCalls = 0;
    let exportCallbacks = 0;
    Object.defineProperty(config.Categories[0].UnknownNested, 'toJSON', {
      enumerable,
      get() {
        getterCalls++;
        return () => {
          serializerCalls++;
          return { replaced: true };
        };
      }
    });

    const result = await runAetherBagsExportPreflight(config, async () => { exportCallbacks++; });

    assert.equal(result.allowed, false);
    assert.equal(getterCalls, 0);
    assert.equal(serializerCalls, 0);
    assert.equal(exportCallbacks, 0);
    assert.ok(result.blockingFindings.some(item => item.field === '$.Categories[0].UnknownNested.toJSON' && /custom JSON serialization accessor/.test(item.message)));
  }
});

test('function-valued own toJSON remains a path-specific custom-serialization blocker', () => {
  const config = validConfig();
  config.UnknownNested = { preserved: true };
  Object.defineProperty(config.UnknownNested, 'toJSON', {
    enumerable: false,
    value() { return { replaced: true }; }
  });

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, false);
  assert.ok(decision.blockingFindings.some(item => item.field === '$.UnknownNested.toJSON' && /custom JSON serialization/.test(item.message)));
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

test('omitted upstream-defaulted category and rule properties warn without treating ordering defaults as issues', () => {
  const config = validConfig();
  const category = config.Categories[0];
  for (const field of ['Enabled', 'Pinned', 'Id', 'Name', 'Description', 'Order', 'Priority', 'Color', 'ItemSortCriteria', 'CustomItemOrder', 'Rules']) delete category[field];

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  for (const field of ['Enabled', 'Pinned', 'Id', 'Name', 'Description', 'Order', 'Priority', 'Color', 'Rules']) {
    assert.ok(decision.analysis.findings.some(item => item.field === field && item.severity === 'warning' && /omitted/.test(item.message)), `missing default warning for ${field}`);
  }
  assert.equal(decision.analysis.findings.some(item => item.field === 'ItemSortCriteria' || item.field === 'CustomItemOrder'), false);
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

test('omitted and explicitly empty ordering defaults are silent Use Global behavior without mutation', () => {
  for (const criteriaState of ['omitted', 'empty']) {
    for (const customState of ['omitted', 'empty']) {
      const config = validConfig();
      const category = config.Categories[0];
      if (criteriaState === 'omitted') delete category.ItemSortCriteria;
      else category.ItemSortCriteria = [];
      if (customState === 'omitted') delete category.CustomItemOrder;
      else category.CustomItemOrder = [];
      const before = JSON.stringify(config);

      const decision = decideAetherBagsExportPreflight(config);

      assert.equal(decision.allowed, true);
      assert.equal(decision.analysis.findings.some(item => item.field === 'ItemSortCriteria' || item.field === 'CustomItemOrder'), false);
      assert.equal(JSON.stringify(config), before);
      assert.equal(Object.hasOwn(category, 'ItemSortCriteria'), criteriaState === 'empty');
      assert.equal(Object.hasOwn(category, 'CustomItemOrder'), customState === 'empty');
    }
  }
});

test('normalized Custom Order with no custom list produces one stable actionable warning', () => {
  for (const customState of ['omitted', 'empty']) {
    const config = validConfig();
    const category = config.Categories[0];
    category.Id = 'stable-custom-order';
    category.Name = 'Stable Custom Order';
    category.ItemSortCriteria = [{ Field: 5, Direction: 0 }];
    if (customState === 'omitted') delete category.CustomItemOrder;
    else category.CustomItemOrder = [];

    const findings = decideAetherBagsExportPreflight(config).analysis.findings
      .filter(item => item.field === 'CustomItemOrder');

    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'warning');
    assert.equal(findings[0].categoryId, 'stable-custom-order');
    assert.equal(findings[0].categoryName, 'Stable Custom Order');
    assert.equal(findings[0].categoryIndex, 0);
    assert.match(findings[0].message, /fall back to Quantity \/ Descending/);
  }
});

test('Use Global anywhere overrides Custom Order before cross-field fallback analysis', () => {
  const config = validConfig();
  const category = config.Categories[0];
  category.ItemSortCriteria = [
    { Field: 5, Direction: 0 },
    { Field: 2, Direction: 1 },
    { Field: 0, Direction: 1 }
  ];
  delete category.CustomItemOrder;

  const decision = decideAetherBagsExportPreflight(config);

  assert.equal(decision.allowed, true);
  assert.ok(decision.analysis.findings.some(item => item.field === 'ItemSortCriteria' && /single Use Global/.test(item.message)));
  assert.equal(decision.analysis.findings.some(item => item.field === 'CustomItemOrder'), false);
});

test('supplied ordering loss remains reviewable and malformed ordering values remain blocking', () => {
  const reviewable = validConfig();
  reviewable.Categories[0].ItemSortCriteria = [
    { Field: 1, Direction: 1 },
    { Field: 1, Direction: 0 },
    { Field: 99, Direction: 0 },
    { Field: 0, Direction: 1 }
  ];
  reviewable.Categories[0].CustomItemOrder = [7, 7, 8];
  const reviewDecision = decideAetherBagsExportPreflight(reviewable);
  assert.equal(reviewDecision.allowed, true);
  assert.ok(reviewDecision.analysis.findings.some(item => item.field === 'ItemSortCriteria' && /repeats Field/.test(item.message)));
  assert.ok(reviewDecision.analysis.findings.some(item => item.field === 'ItemSortCriteria' && /unsupported/.test(item.message)));
  assert.ok(reviewDecision.analysis.findings.some(item => item.field === 'ItemSortCriteria' && /single Use Global/.test(item.message)));
  assert.equal(reviewDecision.analysis.findings.some(item => item.field === 'CustomItemOrder'), false);

  const duplicateCustomOrder = validConfig();
  duplicateCustomOrder.Categories[0].ItemSortCriteria = [{ Field: 5, Direction: 0 }];
  duplicateCustomOrder.Categories[0].CustomItemOrder = [7, 7, 8];
  assert.ok(decideAetherBagsExportPreflight(duplicateCustomOrder).analysis.findings
    .some(item => item.field === 'CustomItemOrder' && /duplicate item IDs/.test(item.message)));

  for (const criteria of [null, {}, [null], [{ Field: 2147483648, Direction: 0 }], [{ Field: 1, Direction: '0' }]]) {
    const config = validConfig();
    config.Categories[0].ItemSortCriteria = criteria;
    assert.ok(decideAetherBagsExportPreflight(config).blockingFindings.some(item => item.field === 'ItemSortCriteria'));
  }
  for (const customOrder of [null, {}, ['1'], [4294967296]]) {
    const config = validConfig();
    config.Categories[0].CustomItemOrder = customOrder;
    assert.ok(decideAetherBagsExportPreflight(config).blockingFindings.some(item => item.field === 'CustomItemOrder'));
  }
});

test('bundled presets retain their exact JSON shape while ordering findings become actionable', async () => {
  const basic = await parseImportedText(BASIC_PRESET_BASE64);
  const advanced = await parseImportedText(ADVANCED_PRESET_BASE64);
  const basicBefore = JSON.stringify(basic);
  const advancedBefore = JSON.stringify(advanced);

  assert.equal(basic.Categories.length, 24);
  assert.ok(basic.Categories.every(category => !Object.hasOwn(category, 'ItemSortCriteria') && !Object.hasOwn(category, 'CustomItemOrder')));
  const basicAnalysis = analyzeImportedConfig(basic);
  assert.equal(basicAnalysis.findings.some(item => item.field === 'ItemSortCriteria' || item.field === 'CustomItemOrder'), false);
  assert.ok([...getCategoryIssueCounts(basic.Categories).values()].every(count => count === 0));
  assert.equal(shouldShowImportValidationModal({ analysis: basicAnalysis, repairs: [] }), false);

  const advancedAnalysis = analyzeImportedConfig(advanced);
  const advancedWarnings = advancedAnalysis.findings.filter(item => item.severity === 'warning');
  assert.equal(advancedWarnings.length, 3);
  assert.ok(advancedWarnings.every(item => item.field === 'SortPosition'));

  assert.equal(decideAetherBagsExportPreflight(basic).allowed, true);
  assert.equal(decideAetherBagsExportPreflight(advanced).allowed, true);
  let harmlessExportCallbacks = 0;
  assert.equal((await runAetherBagsExportPreflight(basic, async () => { harmlessExportCallbacks++; return 'copy'; })).value, 'copy');
  assert.equal((await runAetherBagsExportPreflight(basic, async () => { harmlessExportCallbacks++; return 'download'; })).value, 'download');
  assert.equal(harmlessExportCallbacks, 2);
  assert.equal(JSON.stringify(basic), basicBefore);
  assert.equal(JSON.stringify(advanced), advancedBefore);
  assert.ok(basic.Categories.every(category => !Object.hasOwn(category, 'ItemSortCriteria') && !Object.hasOwn(category, 'CustomItemOrder')));
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
  config.Categories[0].ItemSortCriteria = [{ Field: 99, Direction: 0 }];
  const analysis = analyzeAetherBagsCompatibility(config);

  assert.equal(analysis.counts.error, 1);
  assert.equal(analysis.counts.warning, 2);
  assert.equal(analysis.counts.blocking, 1);
  assert.equal(analysis.findings[0].categoryIndex, 0);
});
