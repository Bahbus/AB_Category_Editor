import test from 'node:test';
import assert from 'node:assert/strict';

import { analyzeItemOrdering } from '../src/itemOrdering.js';
import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createItemOrderingMessages } from '../src/ui/itemOrderingEditor.js';

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

test('Item Ordering catalog entries remain plain text without markup', () => {
  for (const [key, value] of Object.entries(ENGLISH_MESSAGES).filter(([key]) => key.startsWith('itemOrdering.'))) {
    assert.doesNotMatch(value, /<[^>]*>/, `${key} must remain plain text`);
  }
});
