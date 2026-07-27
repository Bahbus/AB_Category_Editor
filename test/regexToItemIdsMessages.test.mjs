import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createRegexToItemIdsMessages } from '../src/tools/regexToItemIdsMessages.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('Regex converter messages preserve exact English and dynamic data', () => {
  const messages = createRegexToItemIdsMessages(createTranslator('en'));

  assert.deepEqual(messages.modal, {
    title: 'Regex → Item IDs',
    introduction: 'AetherBags matches patterns with case-insensitive, culture-invariant .NET regex. This browser converter approximates that behavior with fixed case-insensitive JavaScript regex against English Item names from XIVAPI; some valid AetherBags patterns cannot be scanned here.',
    omittedPatterns: messages.modal.omittedPatterns,
    patternLabel: 'Saved pattern or custom regex',
    customPattern: 'Custom regex',
    regexLabel: 'Regex',
    placeholder: 'Example: ^Augmented .*',
    maxMatchesLabel: 'Max matches to collect',
    pageSizeLabel: 'Page size',
    addBehaviorLabel: 'When adding IDs',
    keepPattern: 'Keep regex filter',
    removePattern: 'Remove selected regex filter',
    scan: 'Scan matching items',
    cancel: 'Cancel scan',
    add: 'Add matched IDs',
    bindingContext: 'regex scan'
  });
  assert.equal(
    messages.modal.omittedPatterns('1,234'),
    '1,234 saved pattern(s) were omitted because they are non-string, empty, or whitespace-only. Correct them in Allowed Item Name Patterns or Raw JSON.'
  );
  assert.equal(messages.results.truncated('5,001'), 'Showing first 300 of 5,001 matches.');
  assert.equal(messages.scan.cancelingSummary, 'Canceling scan... keeping matches found so far.');
  assert.equal(messages.scan.cancelingBusy, 'Canceling Item sheet scan...');
  assert.equal(messages.scan.blankPattern, 'Enter a nonblank AetherBags pattern before scanning.');
  assert.equal(
    messages.scan.incompatiblePattern(new Error('<compiler detail>')),
    'This AetherBags/.NET pattern cannot be scanned by the browser converter because JavaScript regex syntax is incompatible: <compiler detail>'
  );
  assert.equal(
    messages.scan.workerUnavailable('<worker detail>'),
    'Regex scan could not start because the isolated browser worker was unavailable: <worker detail>'
  );
  assert.equal(messages.scan.busyTitle, 'Scanning items');
  assert.equal(messages.scan.busyStarting, 'Starting Item sheet scan...');
  assert.equal(
    messages.scan.progressSummary('1,234', '56', '7'),
    '1,234 item rows scanned · 56 matches found · 7 page(s) fetched'
  );
  assert.equal(
    messages.scan.progressBusy('1,234', '56', '7'),
    '1,234 items scanned · 56 matches · 7 page(s)'
  );
  assert.equal(
    messages.scan.canceledSummary('1', '2'),
    'Scan canceled after 1 item row(s). 2 match(es) found.'
  );
  assert.equal(messages.scan.canceledStatus, 'Regex scan canceled');
  assert.equal(
    messages.scan.completeSummary('1', '2'),
    '1 match(es) found after scanning 2 item row(s).'
  );
  assert.equal(messages.scan.completeStatus, 'Regex scan complete');
  assert.equal(
    messages.scan.batchTimeoutSummary('3', '4'),
    'Browser conversion stopped after 3 completed item row(s). 4 match(es) from completed batches were kept.'
  );
  assert.equal(
    messages.scan.batchTimeoutStatus(2.5),
    'Browser conversion stopped because this JavaScript regex took longer than 2.5 second for one evaluation batch. This does not mean the pattern is invalid for AetherBags/.NET.'
  );
  assert.equal(
    messages.scan.xivapiTimeoutSummary('5', '6'),
    'XIVAPI request timed out after 5 completed item row(s). 6 match(es) from completed batches were kept.'
  );
  assert.equal(
    messages.scan.xivapiTimeoutStatus(12),
    'Regex scan stopped because XIVAPI did not respond within 12 seconds.'
  );
  assert.equal(
    messages.scan.partialFailureSummary('7', '8'),
    'Regex scan stopped after 7 completed item row(s). 8 match(es) from completed batches were kept.'
  );
  assert.equal(messages.scan.failed(new Error('<XIVAPI detail>')), 'Regex scan failed: <XIVAPI detail>');
  assert.equal(messages.add.noop, 'No new item IDs added; all matches were already present.');
  assert.equal(
    messages.add.addedAndRemoved(1000),
    'Added 1000 item ID(s) and removed selected regex filter.'
  );
  assert.equal(messages.add.added(1000), 'Added 1000 item ID(s).');
  assert.equal(messages.add.removed, 'Removed selected regex filter.');
});

test('Regex converter adapter invokes every owned key with named parameters', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return key;
  };
  const messages = createRegexToItemIdsMessages(translate);

  messages.modal.omittedPatterns('1');
  messages.results.truncated('2');
  messages.scan.incompatiblePattern(new Error('compiler'));
  messages.scan.workerUnavailable('worker');
  messages.scan.progressSummary('3', '4', '5');
  messages.scan.progressBusy('6', '7', '8');
  messages.scan.canceledSummary('9', '10');
  messages.scan.completeSummary('11', '12');
  messages.scan.batchTimeoutSummary('13', '14');
  messages.scan.batchTimeoutStatus(1.5);
  messages.scan.xivapiTimeoutSummary('15', '16');
  messages.scan.xivapiTimeoutStatus(30);
  messages.scan.partialFailureSummary('17', '18');
  messages.scan.failed(new Error('service'));
  messages.add.addedAndRemoved('19');
  messages.add.added('20');

  const invoked = new Set(calls.map(call => call.key));
  const ownedKeys = Object.keys(ENGLISH_MESSAGES).filter(key => key.startsWith('regexConverter.'));
  assert.deepEqual([...invoked].sort(), ownedKeys.sort());
  assert.deepEqual(
    calls.find(call => call.key === 'regexConverter.scan.progressSummary').parameters,
    { scanned: '3', matches: '4', pages: '5' }
  );
  assert.deepEqual(
    calls.find(call => call.key === 'regexConverter.scan.incompatiblePattern').parameters,
    { error: 'compiler' }
  );
  assert.deepEqual(
    calls.find(call => call.key === 'regexConverter.scan.batchTimeoutStatus').parameters,
    { seconds: 1.5 }
  );
});

test('every returned Regex converter adapter member has a production consumer', () => {
  const messages = createRegexToItemIdsMessages(createTranslator('en'));
  const converter = read('src/tools/regexToItemIds.js');

  for (const [group, groupMessages] of Object.entries(messages)) {
    for (const member of Object.keys(groupMessages)) {
      assert.match(
        converter,
        new RegExp(`messages\\.${group}\\.${member}(?:\\b|\\()`),
        `${group}.${member}`
      );
    }
  }
});

test('Regex converter localization remains injected, DOM-free, and safely consumed', () => {
  const app = read('src/app.js');
  const adapter = read('src/tools/regexToItemIdsMessages.js');
  const converter = read('src/tools/regexToItemIds.js');
  const evaluator = read('src/tools/regexBatchEvaluator.js');
  const worker = read('src/tools/regexBatchWorker.js');
  const patternSemantics = read('src/patternSemantics.js');
  const xivapi = read('src/xivapi.js');
  const dom = read('src/dom.js');

  assert.doesNotMatch(adapter, /\b(?:document|window|HTMLElement|Node)\b/);
  assert.doesNotMatch(adapter, /locales\/|localization\.js|createTranslator|DEFAULT_LOCALE|app\.js|dom\.js/);
  assert.doesNotMatch(converter, /locales\/|localization\.js|createTranslator|DEFAULT_LOCALE/);
  assert.match(app, /openRegexTool\(\{[\s\S]*?onAvailabilityChanged: updateGlobalActionAvailability, translate \}\)/);
  assert.match(converter, /const messages = createRegexToItemIdsMessages\(translate\);/);
  assert.equal((app.match(/createTranslator\(/g) || []).length, 1);

  assert.match(converter, /escapeHtml\(messages\.modal\.introduction\)/);
  assert.match(converter, /escapeHtml\(messages\.modal\.omittedPatterns/);
  assert.match(converter, /escapeHtml\(pattern\)/);
  assert.match(converter, /escapeHtml\(firstSavedPattern\?\.pattern \|\| ''\)/);
  assert.match(converter, /escapeHtml\(item\.id\)/);
  assert.match(converter, /escapeHtml\(item\.name\)/);
  assert.match(converter, /more\.textContent = messages\.results\.truncated/);
  assert.match(converter, /summary\.textContent = messages\.scan\./);
  assert.match(converter, /setStatus\(messages\./);
  assert.doesNotMatch(
    converter,
    /AetherBags matches patterns|Saved pattern or custom regex|Scan matching items|Canceling scan|Regex scan failed|No new item IDs added|Showing first 300/
  );
  assert.match(dom, /export function setStatus\(msg, cls=''\)[\s\S]*?s\.textContent = msg;/);

  assert.doesNotMatch(`${evaluator}\n${worker}\n${patternSemantics}\n${xivapi}`, /regexConverter\./);
  assert.match(worker, /regex\.test\(candidate\.name\)/);
  assert.match(converter, /compileBrowserPattern\(input\.value\)/);
  assert.match(converter, /fetchItemRowsPage\(after, pageSize/);
});
