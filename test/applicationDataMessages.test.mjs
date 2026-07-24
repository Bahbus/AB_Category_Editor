import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createApplicationDataMessages } from '../src/ui/applicationDataMessages.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('application data messages preserve exact English and interpolate dynamic data', () => {
  const messages = createApplicationDataMessages(createTranslator('en'));

  assert.deepEqual(messages.replacement, {
    title: 'Replace current data?',
    warning: 'Current unexported changes will be replaced. Export or download them first if you want to keep them.',
    confirm: 'Replace current data',
    cancel: 'Cancel',
    bindingContext: 'Replace confirmation unavailable'
  });
  assert.equal(messages.import.title, 'Import / Paste');
  assert.equal(messages.import.guidance, 'Paste either formatted JSON or the gzip+Base64 blob. Then click Import.');
  assert.equal(messages.import.placeholder, 'Paste JSON or gzip+Base64 here');
  assert.equal(messages.import.failed(new Error('<bad JSON>')), 'Import failed: <bad JSON>');
  assert.equal(messages.import.fileFailed('broken file'), 'Could not load file: broken file');
  assert.equal(messages.import.status('my <file>.json', 'Imported 1 category'), 'my <file>.json: Imported 1 category');
  assert.equal(messages.raw.inputLimitLabel, 'Full Raw JSON input');
  assert.equal(messages.raw.invalid(new Error('unexpected <token>')), 'Invalid full JSON: unexpected <token>');
  assert.equal(messages.raw.copyError('too large'), 'Could not copy full JSON: too large');
  assert.equal(messages.validation.findingsMore(81), 'Showing first 80 of 81 findings.');
  assert.equal(messages.validation.repairsMore(82), 'Showing first 80 of 82 import changes.');
  assert.equal(messages.validation.categoryRepair('<Category>', 'Raw finding'), '“<Category>”: Raw finding');
  assert.equal(messages.validation.changedRepair('Repair', '<before>', '<after>'), 'Repair Changed from <before> to <after>.');
});

test('application data messages own singular and plural summary wording', () => {
  const messages = createApplicationDataMessages(createTranslator('en')).summary;
  assert.equal(messages.importedCategories(1), 'Imported 1 category');
  assert.equal(messages.importedCategories(1234), 'Imported 1,234 categories');
  assert.equal(messages.errors(1), '1 error');
  assert.equal(messages.errors(2), '2 errors');
  assert.equal(messages.warnings(1), '1 warning');
  assert.equal(messages.warnings(2), '2 warnings');
  assert.equal(messages.repairs(1), '1 import repair');
  assert.equal(messages.repairs(2), '2 import repairs');
  assert.equal(messages.notes(1), '1 note');
  assert.equal(messages.notes(2), '2 notes');
});

test('application data adapter invokes every owned stable key and stays DOM-free', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return key;
  };
  const messages = createApplicationDataMessages(translate);

  messages.import.failed(new Error('failure'));
  messages.import.unavailable('failure');
  messages.import.uploadUnavailable('failure');
  messages.import.fileFailed('failure');
  messages.import.status('source', 'summary');
  messages.raw.invalid('failure');
  messages.raw.copyError('failure');
  messages.validation.findingsMore(81);
  messages.validation.repairsMore(81);
  messages.validation.severity('error');
  messages.validation.severity('warning');
  messages.validation.categoryRepair('category', 'message');
  messages.validation.changedRepair('message', 'before', 'after');
  for (const count of [1, 2]) {
    messages.summary.importedCategories(count);
    messages.summary.errors(count);
    messages.summary.warnings(count);
    messages.summary.repairs(count);
    messages.summary.notes(count);
  }

  const invoked = new Set(calls.map(call => call.key));
  const ownedKeys = Object.keys(ENGLISH_MESSAGES).filter(key => key.startsWith('applicationData.'));
  for (const key of ownedKeys) assert.ok(invoked.has(key), key);
  const source = read('src/ui/applicationDataMessages.js');
  assert.doesNotMatch(source, /\b(?:document|window|HTMLElement|Node)\b/);
  assert.doesNotMatch(source, /locales\/|localization\.js|createTranslator|DEFAULT_LOCALE/);
  assert.doesNotMatch(read('src/importValidationSummary.js'), /locales\/|localization\.js|createTranslator|DEFAULT_LOCALE|\b(?:document|window)\b/);
});
