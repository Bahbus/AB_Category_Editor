import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { createListEditorMessages, tokenizeListInput } from '../src/ui/listEditor.js';

test('list input tokenization splits and trims comma-separated values by default', () => {
  assert.deepEqual(tokenizeListInput('1, 2, 3'), ['1', '2', '3']);
});

test('list input tokenization preserves comma-bearing patterns when splitting is disabled', () => {
  assert.deepEqual(tokenizeListInput('^A{1,3}$', false), ['^A{1,3}$']);
  assert.deepEqual(tokenizeListInput('^Foo, Bar$', false), ['^Foo, Bar$']);
});

test('list input tokenization treats blank input as a no-op', () => {
  assert.deepEqual(tokenizeListInput('   '), []);
  assert.deepEqual(tokenizeListInput('\t\n', false), []);
});

test('list input tokenization trims surrounding whitespace without changing internal commas', () => {
  assert.deepEqual(tokenizeListInput('  ^Foo, Bar$  ', false), ['^Foo, Bar$']);
});

test('list editor messages preserve exact English copy and named dynamic values', () => {
  const messages = createListEditorMessages(createTranslator('en'), {
    title: 'Custom Item Ranks',
    sheet: 'Item'
  });

  assert.equal(messages.empty, 'Empty');
  assert.equal(messages.defaultPlaceholder, 'Add one value, or comma-separated values');
  assert.equal(messages.addLabel, 'Add value to Custom Item Ranks');
  assert.equal(messages.moveUpLabel('#7', 1), 'Move #7 from rank 1 up in Custom Item Ranks');
  assert.equal(messages.moveDownLabel('#7', 2), 'Move #7 from rank 2 down in Custom Item Ranks');
  assert.equal(messages.removeLabel('#7'), 'Remove #7 from Custom Item Ranks');
  assert.equal(messages.unresolvedName, 'not looked up');
  assert.equal(messages.duplicateAll, 'No new values added; all were already present.');
  assert.equal(messages.duplicatePartial(1, 2), 'Added 1 value(s); skipped 2 duplicate(s).');
  assert.equal(messages.lookupLabel, 'Lookup Item names');
  assert.equal(messages.allCached(0), 'All 0 Item name(s) already cached.');
  assert.equal(messages.allCached(1), 'All 1 Item name(s) already cached.');
  assert.equal(messages.lookupBusyTitle, 'Looking up Item names');
  assert.equal(messages.lookupProgress(0, 3), '0/3 uncached checked');
  assert.equal(messages.lookupStatus(1, 3), 'Looked up 1/3 uncached Item ID(s)...');
  assert.equal(messages.failureMore(4), ', +4 more');
  assert.equal(messages.lookupFailure(6, '#1, #2, #3, #4, #5, +1 more'), 'Item lookup finished with 6 failure(s): #1, #2, #3, #4, #5, +1 more');
  assert.equal(messages.lookupComplete, 'Item lookup complete');
  assert.equal(messages.searchLabel, 'Search Item by English name');
  assert.equal(messages.searchPlaceholder, 'Example: potion, materia, weapon');
  assert.equal(messages.searchAction, 'Search');
  assert.equal(messages.searchProgress, 'Searching...');
  assert.equal(messages.noResults, 'No results.');
  assert.equal(messages.nameUnavailable, '(name unavailable)');
  assert.equal(messages.addResultLabel('<Potion>', 42), 'Add <Potion> #42 to Custom Item Ranks');
  assert.equal(messages.addResultFallback, 'Add lookup result');
  assert.equal(messages.noUsableResults, 'No usable results with valid row IDs.');
  assert.equal(messages.noUsableStatus, 'No usable search results with valid row IDs.');
  assert.equal(messages.searchComplete, 'Search complete');
});
