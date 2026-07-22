import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { createMatchingRuleMessages } from '../src/ui/matchingRulesEditor.js';

test('matching-rule messages preserve every exact English title, hint, action, error, and rarity label', () => {
  const messages = createMatchingRuleMessages(createTranslator('en'));

  assert.deepEqual(messages.allowedUiCategoryIds, {
    title: 'Allowed UI Category IDs',
    hint: 'Game ItemUICategory row IDs accepted by this category.',
    error: 'UI category IDs must be exact integers from 0 through 4294967295.'
  });
  assert.deepEqual(messages.allowedItemIds, {
    title: 'Allowed Item IDs',
    hint: 'Specific Item row IDs accepted by this category.',
    error: 'Item IDs must be exact integers from 0 through 4294967295.'
  });
  assert.deepEqual(messages.allowedItemNamePatterns, {
    title: 'Allowed Item Name Patterns',
    hint: 'Regex/name patterns matched against item names.',
    placeholder: 'Add one regex/name pattern',
    convert: 'Convert patterns to Item IDs'
  });
  assert.equal(messages.allowedRarities.title, 'Allowed Rarities');
  assert.equal(messages.allowedRarities.hint, 'Select the item rarities this category accepts. Leave all unchecked to ignore rarity.');
  assert.deepEqual([1, 2, 3, 4, 7].map(messages.allowedRarities.label), ['Common', 'Uncommon', 'Rare', 'Relic', 'Aetherial']);
});
