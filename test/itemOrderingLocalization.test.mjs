import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeItemOrdering, DEFAULT_ITEM_ORDERING_FINDING_MESSAGES } from '../src/itemOrdering.js';
import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createItemOrderingMessages } from '../src/ui/itemOrderingEditor.js';
import { analyzeImportedConfig, validateCategory } from '../src/validation.js';
import { decideAetherBagsExportPreflight } from '../src/exportCompatibility.js';
import { defaultCategory } from '../src/config.js';
import { read } from '../testSupport/sourceFiles.mjs';

const FINDING_CASES = Object.freeze([
  { ItemSortCriteria: {} },
  { ItemSortCriteria: [null] },
  { ItemSortCriteria: [{}] },
  { ItemSortCriteria: [{ Field: '1', Direction: 0 }] },
  { ItemSortCriteria: [{ Field: 1, Direction: '0' }] },
  { ItemSortCriteria: [{ Field: 99, Direction: 0 }] },
  { ItemSortCriteria: [{ Field: 2, Direction: 0 }, { Field: 2, Direction: 1 }] },
  { ItemSortCriteria: [{ Field: 2, Direction: 0 }, { Field: 0, Direction: 1 }] },
  { CustomItemOrder: {} },
  { CustomItemOrder: ['1'] },
  { ItemSortCriteria: [{ Field: 5, Direction: 0 }] },
  { ItemSortCriteria: [{ Field: 5, Direction: 0 }, { Field: 2, Direction: 0 }] },
  { ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [] },
  { ItemSortCriteria: [{ Field: 5, Direction: 0 }, { Field: 2, Direction: 0 }], CustomItemOrder: [] },
  { ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [7, 7] }
]);

test('Item Ordering message adapter preserves every established English UI string', () => {
  const messages = createItemOrderingMessages(createTranslator('en'));
  assert.equal(messages.title, 'Item Ordering');
  assert.equal(messages.summaryBadge(analyzeItemOrdering({})), 'Use global');
  assert.equal(messages.summaryBadge(analyzeItemOrdering({ ItemSortCriteria: [{ Field: 2, Direction: 0 }] })), '1 criterion');
  assert.equal(messages.summaryBadge(analyzeItemOrdering({ ItemSortCriteria: [{ Field: 2, Direction: 0 }, { Field: 7, Direction: 1 }] })), '2 criteria');
  assert.equal(messages.summaryBadge(analyzeItemOrdering({ ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [42] })), 'Custom order');
  assert.equal(messages.issueCount(0), '0 issues');
  assert.equal(messages.issueCount(1), '1 issue');
  assert.equal(messages.issueCount(3), '3 issues');
  assert.equal(messages.introduction, 'Ordering changes how items already matched into this category are displayed; it does not change category membership.');

  assert.equal(messages.criteria.title, 'Item Sort Criteria');
  assert.equal(messages.criteria.hint, 'The first criterion sorts matched items; each later criterion breaks ties.');
  assert.equal(messages.criteria.group(2), 'Sort criterion 2');
  assert.equal(messages.criteria.field, 'Field');
  assert.equal(messages.criteria.fieldAccessible(2), 'Field for sort criterion 2');
  assert.deepEqual(Array.from({ length: 8 }, (_, value) => messages.criteria.fieldLabel(value)), [
    'Use Global Default', 'Quantity', 'Name', 'Rarity', 'Item ID', 'Custom Item Order', 'Game Category', 'Item Level'
  ]);
  assert.equal(messages.criteria.direction, 'Direction');
  assert.equal(messages.criteria.directionAccessible(2), 'Direction for sort criterion 2');
  assert.deepEqual([0, 1].map(value => messages.criteria.directionLabel(value)), ['Ascending', 'Descending']);
  assert.equal(messages.criteria.move(2, -1), 'Move sort criterion 2 up');
  assert.equal(messages.criteria.move(2, 1), 'Move sort criterion 2 down');
  assert.equal(messages.criteria.remove(2), 'Remove sort criterion 2');
  assert.equal(messages.criteria.addLabel, 'Add criterion');
  assert.equal(messages.criteria.addField, 'Field for new sort criterion');
  assert.equal(messages.criteria.addAction, 'Add sort criterion');
  assert.equal(messages.criteria.rawAdditionalProperties, 'The stored ItemSortCriteria contains additional properties that these structured controls do not represent. Use selected-category Raw JSON to edit it without discarding those properties; the stored value has been preserved exactly.');
  assert.equal(messages.criteria.rawUnsafe, 'The stored criteria cannot be represented safely by these controls. Open selected-category Raw JSON and correct ItemSortCriteria directly; the raw value has been preserved.');
  assert.equal(messages.criteria.rawAction, 'Edit selected category Raw JSON');
  assert.equal(messages.criteria.normalizedPreview('Name / Ascending'), 'AetherBags-normalized criteria: Name / Ascending. This action rewrites the stored ItemSortCriteria list.');
  assert.equal(messages.criteria.normalizedAction, 'Replace with AetherBags-normalized criteria');
  assert.equal(messages.criteria.normalizedSuccess, 'Stored Item Sort Criteria replaced with the shown AetherBags-normalized list.');

  assert.equal(messages.customOrder.title, 'Custom Item Order');
  assert.equal(messages.customOrder.active, 'Earlier IDs rank first. Ranked items stay ahead of unranked items; Descending reverses only the ranked order.');
  assert.equal(messages.customOrder.inactive, 'This ranked list is retained and editable, but inactive because Custom Item Order is not a current criterion.');
  assert.equal(messages.customOrder.rawDescription, 'The stored CustomItemOrder value cannot be edited safely as a ranked list. Open Advanced to correct it without losing the raw value.');
  assert.equal(messages.customOrder.rawAction, 'Edit in Raw JSON');
  assert.equal(messages.customOrder.ranksTitle, 'Custom Item Ranks');
  assert.equal(messages.customOrder.ranksHint, 'Add Item IDs in rank order.');
  assert.equal(messages.customOrder.ranksPlaceholder, 'Add one Item ID, or comma-separated Item IDs');
  assert.equal(messages.customOrder.ranksError, 'Custom Item IDs must be exact integers from 0 through 4294967295.');
});

test('Item Ordering adapter invokes the translator with named runtime parameters', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return `${key}:${Object.entries(parameters).map(([name, value]) => `${name}=${value}`).join(',')}`;
  };
  const messages = createItemOrderingMessages(translate);
  messages.summaryBadge({ customOrderingApplied: false, normalizedCriteria: [{ Field: 2 }] });
  messages.summaryBadge({ customOrderingApplied: false, normalizedCriteria: [{ Field: 2 }, { Field: 7 }] });
  messages.issueCount(0);
  messages.issueCount(1);
  messages.issueCount(4);
  messages.criteria.group(3);
  messages.criteria.fieldAccessible(3);
  messages.criteria.directionAccessible(3);
  messages.criteria.move(3, -1);
  messages.criteria.move(3, 1);
  messages.criteria.remove(3);
  messages.criteria.normalizedPreview('Name / Ascending');

  for (const expected of [
    { key: 'itemOrdering.summary.criterion.one', parameters: { count: 1 } },
    { key: 'itemOrdering.summary.criterion.many', parameters: { count: 2 } },
    { key: 'itemOrdering.summary.issue.many', parameters: { count: 0 } },
    { key: 'itemOrdering.summary.issue.one', parameters: { count: 1 } },
    { key: 'itemOrdering.summary.issue.many', parameters: { count: 4 } },
    { key: 'itemOrdering.criteria.group', parameters: { position: 3 } },
    { key: 'itemOrdering.criteria.field.accessible', parameters: { position: 3 } },
    { key: 'itemOrdering.criteria.direction.accessible', parameters: { position: 3 } },
    { key: 'itemOrdering.criteria.move', parameters: { position: 3, direction: 'itemOrdering.criteria.movement.up:' } },
    { key: 'itemOrdering.criteria.move', parameters: { position: 3, direction: 'itemOrdering.criteria.movement.down:' } },
    { key: 'itemOrdering.criteria.remove', parameters: { position: 3 } },
    { key: 'itemOrdering.criteria.normalized.preview', parameters: { preview: 'Name / Ascending' } }
  ]) assert.ok(calls.some(call => (
    call.key === expected.key && JSON.stringify(call.parameters) === JSON.stringify(expected.parameters)
  )), `missing translator call ${JSON.stringify(expected)}`);

  for (const key of [
    'itemOrdering.criteria.raw.additionalProperties',
    'itemOrdering.criteria.raw.unsafe',
    'itemOrdering.criteria.raw.action',
    'itemOrdering.customOrder.active',
    'itemOrdering.customOrder.inactive',
    'itemOrdering.customOrder.raw.description',
    'itemOrdering.customOrder.raw.action'
  ]) assert.ok(calls.some(call => call.key === key), `missing translator call for ${key}`);
});

test('default and injected English finding interfaces preserve every established finding byte for byte', () => {
  const injected = createItemOrderingMessages(createTranslator('en')).findings;
  for (const category of FINDING_CASES) {
    const implicit = analyzeItemOrdering(category);
    const explicitDefault = analyzeItemOrdering(category, DEFAULT_ITEM_ORDERING_FINDING_MESSAGES);
    const translated = analyzeItemOrdering(category, injected);
    assert.deepEqual(explicitDefault, implicit);
    assert.deepEqual(translated, implicit);
  }
});

test('Item Ordering finding adapter invokes every stable key with named dynamic parameters', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return `${key}:${JSON.stringify(parameters)}`;
  };
  const findings = createItemOrderingMessages(translate).findings;
  for (const category of FINDING_CASES) analyzeItemOrdering(category, findings);

  const expected = [
    ['itemOrdering.findings.criteria.mustBeArray', {}],
    ['itemOrdering.findings.criteria.criterion.mustBeObject', { position: 1 }],
    ['itemOrdering.findings.criteria.criterion.fieldOmitted', { position: 1 }],
    ['itemOrdering.findings.criteria.criterion.directionOmitted', { position: 1 }],
    ['itemOrdering.findings.criteria.criterion.fieldInvalid', { position: 1 }],
    ['itemOrdering.findings.criteria.criterion.directionInvalid', { position: 1 }],
    ['itemOrdering.findings.criteria.criterion.unsupported', { position: 1 }],
    ['itemOrdering.findings.criteria.criterion.repeatedField', { position: 2, field: 2 }],
    ['itemOrdering.findings.criteria.useGlobalNormalized', {}],
    ['itemOrdering.findings.criteria.unusableDefault', {}],
    ['itemOrdering.findings.customOrder.mustBeArray', {}],
    ['itemOrdering.findings.customOrder.valuesInvalid', {}],
    ['itemOrdering.findings.customOrder.omitted.quantityFallback', {}],
    ['itemOrdering.findings.customOrder.omitted.remainingCriteria', {}],
    ['itemOrdering.findings.customOrder.empty.quantityFallback', {}],
    ['itemOrdering.findings.customOrder.empty.remainingCriteria', {}],
    ['itemOrdering.findings.customOrder.duplicates', {}]
  ];
  assert.equal(
    new Set(calls.filter(call => call.key.startsWith('itemOrdering.findings.')).map(call => call.key)).size,
    expected.length
  );
  for (const [key, parameters] of expected) {
    assert.ok(calls.some(call => (
      call.key === key && JSON.stringify(call.parameters) === JSON.stringify(parameters)
    )), `missing translator call ${key} ${JSON.stringify(parameters)}`);
  }
});

test('injected findings retain metadata and flow through validation, import review, and export preflight', () => {
  const translated = createItemOrderingMessages((key, parameters = {}) => (
    `${key}:${Object.values(parameters).join(',')}`
  )).findings;
  const category = defaultCategory(0);
  category.Id = 'localized-ordering';
  category.Name = 'Localized Ordering';
  category.ItemSortCriteria = [null];

  const selected = validateCategory(category, [category], translated)
    .find(item => item.field === 'ItemSortCriteria');
  assert.deepEqual(
    { severity: selected.severity, field: selected.field, blocksExport: selected.blocksExport },
    { severity: 'error', field: 'ItemSortCriteria', blocksExport: true }
  );
  assert.equal(selected.message, 'itemOrdering.findings.criteria.criterion.mustBeObject:1');

  const imported = analyzeImportedConfig({ Categories: [category] }, translated)
    .findings.find(item => item.field === 'ItemSortCriteria');
  assert.deepEqual(
    {
      severity: imported.severity,
      field: imported.field,
      blocksExport: imported.blocksExport,
      categoryId: imported.categoryId,
      categoryName: imported.categoryName
    },
    {
      severity: 'error',
      field: 'ItemSortCriteria',
      blocksExport: true,
      categoryId: 'localized-ordering',
      categoryName: 'Localized Ordering'
    }
  );
  assert.equal(imported.message, 'itemOrdering.findings.criteria.criterion.mustBeObject:1');

  const config = { Format: 'AetherBags_Category', Version: 1, Categories: [category] };
  const blocked = decideAetherBagsExportPreflight(config, translated).blockingFindings
    .find(item => item.field === 'ItemSortCriteria');
  assert.equal(blocked.message, 'itemOrdering.findings.criteria.criterion.mustBeObject:1');
  assert.equal(blocked.categoryIndex, 0);
});

test('every finding adapter member has a production consumer and all user-visible routes receive it', () => {
  const ordering = read('src/itemOrdering.js');
  const editor = read('src/ui/itemOrderingEditor.js');
  const validation = read('src/validation.js');
  const compatibility = read('src/exportCompatibility.js');
  const categoryEditor = read('src/ui/categoryEditor.js');
  const categoryList = read('src/ui/categoryList.js');
  const app = read('src/app.js');

  const findingsBlock = editor.match(/findings: Object\.freeze\(\{(?<body>[\s\S]*?)\n    \}\),/)?.groups.body ?? '';
  const members = [...findingsBlock.matchAll(/^\s{6}([A-Za-z][A-Za-z0-9]+):/gm)].map(match => match[1]);
  assert.equal(members.length, 17);
  for (const member of members) {
    assert.match(ordering, new RegExp(`messages\\.${member}\\(`), `${member} needs an analyzer consumer`);
  }

  assert.match(editor, /analyzeItemOrdering\(category, messages\.findings\)/);
  assert.match(editor, /CustomItemOrder: values \}, messages\.findings\)/);
  assert.match(validation, /categoryCompatibilityFindings\(category, null, itemOrderingFindingMessages\)/);
  assert.match(validation, /validateCategory\(category, categories, itemOrderingFindingMessages\)/);
  assert.match(compatibility, /analyzeItemOrdering\(category, itemOrderingFindingMessages\)/);
  assert.match(categoryEditor, /validateCategory\(category, allCategories, itemOrderingMessages\?\.findings\)/);
  assert.match(categoryList, /getCategoryIssueCounts\(cats, itemOrderingFindingMessages\)/);
  assert.match(app, /analyzeImportedConfig\(parsed, itemOrderingMessages\.findings\)/);
  assert.match(app, /analyzeImportedConfig\(validation\.config, itemOrderingMessages\.findings\)/);
  assert.match(app, /runAetherBagsExportPreflight\(data,[\s\S]*itemOrderingMessages\.findings\)/);
  assert.doesNotMatch(read('src/xivapi.js'), /analyzeItemOrdering\(cat,\s*[^)]/);
  assert.doesNotMatch(read('src/descriptionGenerator.js'), /analyzeItemOrdering\(category,\s*[^)]/);
});

test('Item Ordering catalog entries remain plain text without markup', () => {
  for (const [key, value] of Object.entries(ENGLISH_MESSAGES).filter(([key]) => key.startsWith('itemOrdering.'))) {
    assert.doesNotMatch(value, /<[^>]*>/, `${key} must remain plain text`);
  }
});
