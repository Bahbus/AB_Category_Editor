import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import {
  createApplicationOperationsMessages,
  createLookupSheetLabel
} from '../src/ui/applicationOperationsMessages.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('application operation messages preserve exact English and dynamic data', () => {
  const messages = createApplicationOperationsMessages(createTranslator('en'));

  assert.equal(messages.lookup.noneReferenced, 'No referenced Item/UI Category IDs to look up.');
  assert.equal(messages.lookup.allCached(1), 'All 1 referenced ID name(s) already cached.');
  assert.equal(messages.lookup.allCached(2), 'All 2 referenced ID name(s) already cached.');
  assert.equal(messages.lookup.busyTitle, 'Looking up IDs');
  assert.equal(messages.lookup.busyInitial(3), '0/3 complete');
  assert.equal(
    messages.lookup.busyProgress(2, 7, 'ItemUICategory', 1, 3),
    '2/7 checked · UI category batch 1/3'
  );
  assert.equal(messages.lookup.failureMore(1), ', +1 more');
  assert.equal(messages.lookup.failureMore(4), ', +4 more');
  assert.equal(
    messages.lookup.partialFailure(1, 'Item <7>'),
    'Lookup finished with 1 failure(s): Item <7>'
  );
  assert.equal(
    messages.lookup.partialFailure(6, 'Item 1, +1 more'),
    'Lookup finished with 6 failure(s): Item 1, +1 more'
  );
  assert.equal(messages.lookup.automaticUnresolved(1), 'Automatic lookup left 1 unresolved ID(s).');
  assert.equal(messages.lookup.automaticUnresolved(2), 'Automatic lookup left 2 unresolved ID(s).');
  assert.equal(messages.lookup.automaticCached(1), 'Automatic lookup cached 1 new name(s).');
  assert.equal(messages.lookup.automaticCached(2), 'Automatic lookup cached 2 new name(s).');
  assert.equal(messages.lookup.complete(1), 'Lookup complete: 1 new name(s) cached.');
  assert.equal(messages.lookup.complete(2), 'Lookup complete: 2 new name(s) cached.');
  assert.equal(
    messages.lookup.automaticFailed(new Error('<automatic detail>')),
    'Automatic ID lookup failed: <automatic detail>'
  );
  assert.equal(messages.lookup.failed('<manual detail>'), 'ID lookup failed: <manual detail>');
  assert.deepEqual(messages.cache, {
    clearRefused: 'Lookup cache cannot be cleared while a lookup or scan is running.',
    cleared: 'Lookup cache cleared. Category data was not changed.'
  });
  assert.deepEqual(messages.categories, {
    sortNoop: 'Categories are already sorted. No changes were made.',
    renumberNoop: 'Order and Priority are already renumbered. No changes were made.'
  });
});

test('application operation adapter invokes every owned key with named parameters', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return key;
  };
  const messages = createApplicationOperationsMessages(translate);

  messages.lookup.allCached(5);
  messages.lookup.busyInitial(6);
  messages.lookup.busyProgress(2, 6, 'Item', 1, 2);
  messages.lookup.failureMore(3);
  messages.lookup.partialFailure(8, 'details');
  messages.lookup.automaticUnresolved(4);
  messages.lookup.automaticCached(5);
  messages.lookup.complete(6);
  messages.lookup.automaticFailed(new Error('automatic'));
  messages.lookup.failed('manual');

  const invoked = new Set(calls.map(call => call.key));
  const ownedKeys = Object.keys(ENGLISH_MESSAGES)
    .filter(key => key.startsWith('applicationOperations.'));
  assert.deepEqual([...invoked].sort(), ownedKeys.sort());
  assert.deepEqual(
    calls.find(call => call.key === 'applicationOperations.lookup.busy.progress').parameters,
    { done: 2, total: 6, sheet: 'applicationOperations.lookup.sheet.item', batch: 1, batches: 2 }
  );
  assert.deepEqual(
    calls.find(call => call.key === 'applicationOperations.lookup.failure.partial').parameters,
    { count: 8, details: 'details' }
  );
  assert.deepEqual(
    calls.find(call => call.key === 'applicationOperations.lookup.failed').parameters,
    { error: 'manual' }
  );
});

test('every application operation adapter member has a production consumer', () => {
  const messages = createApplicationOperationsMessages(createTranslator('en'));
  const app = read('src/app.js');
  const members = Object.entries(messages).flatMap(([group, groupMessages]) =>
    Object.keys(groupMessages).map(member => `${group}.${member}`)
  );

  for (const member of members) {
    assert.match(
      app,
      new RegExp(`applicationOperationsMessages\\.${member.replaceAll('.', '\\.')}(?:\\b|\\()`),
      member
    );
  }
});

test('lookup sheet label boundary translates known identifiers and preserves unknown identifiers', () => {
  const calls = [];
  const label = createLookupSheetLabel((key, parameters = {}) => {
    calls.push({ key, parameters });
    return key === 'applicationOperations.lookup.sheet.item' ? 'Localized item' : 'Localized category';
  });

  assert.equal(label('Item'), 'Localized item');
  assert.equal(label('ItemUICategory'), 'Localized category');
  assert.equal(label('FutureSheet'), 'FutureSheet');
  assert.deepEqual(calls, [
    { key: 'applicationOperations.lookup.sheet.item', parameters: {} },
    { key: 'applicationOperations.lookup.sheet.uiCategory', parameters: {} }
  ]);
});

test('application operation localization is DOM-free, shared, and safely consumed', () => {
  const adapter = read('src/ui/applicationOperationsMessages.js');
  const app = read('src/app.js');
  const list = read('src/ui/listEditor.js');
  const xivapi = read('src/xivapi.js');
  const dom = read('src/dom.js');

  assert.doesNotMatch(adapter, /\b(?:document|window|HTMLElement|Node)\b/);
  assert.doesNotMatch(adapter, /locales\/|localization\.js|createTranslator|DEFAULT_LOCALE|app\.js|dom\.js|xivapi\.js/);
  assert.match(app, /const applicationOperationsMessages = createApplicationOperationsMessages\(translate\);/);
  assert.equal((app.match(/createTranslator\(/g) || []).length, 1);
  assert.match(list, /createLookupSheetLabel\(translate\)\(lookupSheet\)/);
  assert.match(list, /createListEditorMessages\(translate, \{ title, lookupSheet \}\)/);
  assert.doesNotMatch(xivapi, /function sheetLabel|UI category/);
  assert.doesNotMatch(app, /No referenced Item\/UI Category IDs to look up|Lookup cache cleared|Categories are already sorted|Order and Priority are already renumbered/);
  assert.match(app, /fetchLookupBatch\(sheet, missing/);
  assert.match(app, /failure\.sheet/);
  assert.match(app, /failure\.id/);
  assert.match(dom, /export function setStatus\(msg, cls=''\)[\s\S]*?s\.textContent = msg;/);
});
