import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createApplicationExportMessages } from '../src/ui/applicationExportMessages.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('application export messages preserve exact English and interpolate dynamic data', () => {
  const messages = createApplicationExportMessages(createTranslator('en'));

  assert.deepEqual(messages.savedState, {
    changesNotExported: 'Changes not exported',
    exported: 'Exported',
    downloaded: 'Downloaded'
  });
  assert.deepEqual(messages.availability, {
    exportEmpty: 'Add or import at least one category before exporting.',
    downloadEmpty: 'Add or import at least one category before downloading.'
  });
  assert.deepEqual(messages.busy, {
    exportTitle: 'Generating export',
    downloadTitle: 'Generating download',
    compression: 'Compressing JSON to gzip+Base64...'
  });
  assert.equal(messages.failure.export(new Error('<export detail>')), 'Export failed: <export detail>');
  assert.equal(messages.failure.download('<download detail>'), 'Download failed: <download detail>');
  assert.equal(messages.compatibility.title, 'AetherBags export compatibility');
  assert.equal(messages.compatibility.heading, 'Export blocked:');
  assert.equal(
    messages.compatibility.explanation(3),
    'the current data contains 3 value(s) that cannot be safely serialized or read by the current AetherBags category importer.'
  );
  assert.equal(messages.compatibility.truncated(81), 'Showing first 80 of 81 blocking compatibility errors.');
  assert.equal(
    messages.compatibility.status(3),
    'Export blocked by 3 AetherBags compatibility error(s). Correct the listed fields and try again.'
  );
  assert.equal(messages.export.title, 'Export / Copy');
  assert.equal(
    messages.export.currentExplanation,
    'Current gzip+Base64 export. Automatic clipboard copy will be attempted if the browser allows it.'
  );
  assert.equal(
    messages.export.staleExplanation,
    'This gzip+Base64 export represents earlier editor data and is not the current config. Automatic clipboard copy will still be attempted.'
  );
  assert.equal(messages.export.copied, 'Copied to clipboard.');
  assert.equal(messages.export.retryCopyError, 'Copy failed. Select the export text manually.');
  assert.equal(messages.download.success('<categories>.txt'), 'Downloaded <categories>.txt');
  assert.equal(
    messages.download.staleDirty('<categories>.txt'),
    'Downloaded <categories>.txt, but newer changes remain unexported.'
  );
  assert.equal(
    messages.download.staleSaved('<categories>.txt'),
    'Downloaded <categories>.txt, but it represents earlier editor data and is not the current config.'
  );
});

test('application export adapter invokes every owned stable key with named parameters', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return key;
  };
  const messages = createApplicationExportMessages(translate);

  messages.failure.export(new Error('export detail'));
  messages.failure.download('download detail');
  messages.compatibility.explanation(2);
  messages.compatibility.truncated(82);
  messages.compatibility.status(2);
  messages.download.success('current.txt');
  messages.download.staleDirty('dirty.txt');
  messages.download.staleSaved('saved.txt');

  const invoked = new Set(calls.map(call => call.key));
  const ownedKeys = Object.keys(ENGLISH_MESSAGES).filter(key => key.startsWith('applicationExport.'));
  assert.deepEqual([...invoked].sort(), ownedKeys.sort());
  assert.deepEqual(
    calls.find(call => call.key === 'applicationExport.failure.export').parameters,
    { error: 'export detail' }
  );
  assert.deepEqual(
    calls.find(call => call.key === 'applicationExport.compatibility.explanation').parameters,
    { count: 2 }
  );
  assert.deepEqual(
    calls.find(call => call.key === 'applicationExport.download.success').parameters,
    { filename: 'current.txt' }
  );
});

test('every application export adapter member has a production consumer', () => {
  const app = read('src/app.js');
  const members = [
    'savedState.changesNotExported',
    'savedState.exported',
    'savedState.downloaded',
    'availability.exportEmpty',
    'availability.downloadEmpty',
    'busy.exportTitle',
    'busy.downloadTitle',
    'busy.compression',
    'failure.export',
    'failure.download',
    'compatibility.title',
    'compatibility.heading',
    'compatibility.explanation',
    'compatibility.guidance',
    'compatibility.truncated',
    'compatibility.continueEditing',
    'compatibility.bindingContext',
    'compatibility.status',
    'export.activeDialog',
    'export.title',
    'export.currentExplanation',
    'export.staleExplanation',
    'export.copyAgain',
    'export.copied',
    'export.automaticCopyBlocked',
    'export.retryCopyFailed',
    'export.retryCopyError',
    'export.bindingContext',
    'export.staleDirtyStatus',
    'export.staleSavedStatus',
    'download.success',
    'download.staleDirty',
    'download.staleSaved'
  ];

  for (const member of members) {
    assert.match(app, new RegExp(`applicationExportMessages\\.${member.replaceAll('.', '\\.')}(?:\\b|\\()`), member);
  }
});

test('application export localization stays focused, DOM-free, and safely consumed', () => {
  const adapter = read('src/ui/applicationExportMessages.js');
  const app = read('src/app.js');

  assert.doesNotMatch(adapter, /\b(?:document|window|HTMLElement|Node)\b/);
  assert.doesNotMatch(adapter, /locales\/|localization\.js|createTranslator|DEFAULT_LOCALE|app\.js|dom\.js|exportCompatibility|exportSnapshots/);
  assert.match(app, /const applicationExportMessages = createApplicationExportMessages\(translate\);/);
  assert.equal((app.match(/createTranslator\(/g) || []).length, 1);
  assert.match(app, /escapeHtml\(applicationExportMessages\.compatibility\.heading\)/);
  assert.match(app, /escapeHtml\(applicationExportMessages\.compatibility\.explanation\(findings\.length\)\)/);
  assert.match(app, /escapeHtml\(applicationExportMessages\.compatibility\.guidance\)/);
  assert.match(app, /escapeHtml\(item\.message\)/);
  assert.match(app, /escapeHtml\(location\)/);
  assert.match(app, /escapeHtml\(snapshotExplanation\)/);
  assert.match(app, /escapeHtml\(b64\)/);
  assert.match(app, /exportCopyStatus\.textContent = copied/);
  assert.match(app, /setStatus\(applicationExportMessages\.download\.success\(filename\), 'ok'\)/);
});
