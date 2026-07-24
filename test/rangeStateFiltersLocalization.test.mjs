import test from 'node:test';
import assert from 'node:assert/strict';

import { RANGE_FILTER_KEYS, STATE_FILTER_KEYS } from '../src/constants.js';
import { createTranslator } from '../src/localization.js';
import { rangeFiltersSummaryParts, stateFiltersSummaryParts } from '../src/ui/filterSummary.js';
import { createRangeStateFilterMessages } from '../src/ui/rangeStateFiltersEditor.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('Range and State messages preserve exact English for every stable filter key', () => {
  const messages = createRangeStateFilterMessages(createTranslator('en'));

  assert.equal(messages.rangeTitle, 'Range Filters');
  assert.deepEqual(RANGE_FILTER_KEYS.map(messages.rangeLabel), ['Level', 'Item Level', 'Vendor Price']);
  assert.equal(messages.enabled, 'Enabled');
  assert.equal(messages.rangeActive(1), '1 active');
  assert.equal(messages.rangeActive(3), '3 active');
  assert.equal(messages.rangeControls.minimum, 'Minimum');
  assert.equal(messages.rangeControls.maximum, 'Maximum');
  assert.equal(messages.rangeControls.minimumSlider('Vendor Price'), 'Vendor Price minimum slider');
  assert.equal(messages.rangeControls.maximumSlider('Vendor Price'), 'Vendor Price maximum slider');
  assert.equal(messages.rangeControls.integer('Minimum'), 'Minimum must be an integer.');
  assert.equal(messages.rangeControls.atLeast('Minimum', 0), 'Minimum must be at least 0.');
  assert.equal(messages.rangeControls.noGreater('Maximum', 4294967295), 'Maximum must be no greater than 4294967295.');
  assert.equal(messages.rangeControls.bounds('Minimum', -2147483648, 2147483647), 'Minimum must be an integer from -2147483648 through 2147483647.');
  assert.equal(messages.rangeControls.reversed, 'Minimum is greater than maximum. Values are preserved until you edit them.');

  assert.equal(messages.stateTitle, 'State Filters');
  assert.deepEqual(STATE_FILTER_KEYS.map(messages.stateLabel), [
    'Untradable',
    'Unique',
    'Collectable',
    'Dyeable',
    'Repairable',
    'High Quality',
    'Desynthesizable',
    'Glamourable',
    'Fully Spiritbonded'
  ]);
  assert.deepEqual(messages.stateOptions.map(({ value, label, tone }) => ({ value, label, tone })), [
    { value: 0, label: 'Ignored', tone: 'ignored' },
    { value: 1, label: 'Required', tone: 'required' },
    { value: 2, label: 'Excluded', tone: 'excluded' }
  ]);
  assert.equal(messages.stateGroup('HighQuality'), 'High Quality');
  assert.equal(messages.stateRequired(1), '1 required');
  assert.equal(messages.stateRequired(2), '2 required');
  assert.equal(messages.stateExcluded(1), '1 excluded');
  assert.equal(messages.stateExcluded(2), '2 excluded');
});

test('Range and State messages invoke the translator with named interpolation', () => {
  const calls = [];
  const translate = (key, parameters = {}) => {
    calls.push({ key, parameters });
    return `${key}:${JSON.stringify(parameters)}`;
  };
  const messages = createRangeStateFilterMessages(translate);

  messages.rangeLabel('ItemLevel');
  messages.rangeActive(2);
  messages.rangeControls.minimumSlider('Translated Level');
  messages.rangeControls.bounds('Translated Minimum', -10, 20);
  messages.stateGroup('FullySpiritbonded');
  messages.stateRequired(1);
  messages.stateExcluded(3);

  assert.ok(calls.some(call => call.key === 'rangeState.range.itemLevel.label'));
  assert.ok(calls.some(call => call.key === 'rangeState.range.summary.active.many' && call.parameters.count === 2));
  assert.ok(calls.some(call => call.key === 'rangeState.range.minimumSlider.accessible' && call.parameters.filter === 'Translated Level'));
  assert.ok(calls.some(call => call.key === 'rangeState.range.validation.bounds'
    && call.parameters.component === 'Translated Minimum'
    && call.parameters.minimum === -10
    && call.parameters.maximum === 20));
  assert.ok(calls.some(call => call.key === 'rangeState.state.group.accessible'
    && call.parameters.filter === 'rangeState.state.fullySpiritbonded.label:{}'));
  assert.ok(calls.some(call => call.key === 'rangeState.state.summary.required.one' && call.parameters.count === 1));
  assert.ok(calls.some(call => call.key === 'rangeState.state.summary.excluded.many' && call.parameters.count === 3));
});

test('the same message object drives exact initial and refreshed summary output', () => {
  const messages = createRangeStateFilterMessages(createTranslator('en'));

  assert.deepEqual(rangeFiltersSummaryParts({}, messages), {
    title: 'Range Filters',
    badges: [],
    issueCount: 0
  });
  assert.deepEqual(rangeFiltersSummaryParts({
    Level: { Enabled: true },
    ItemLevel: { Enabled: true },
    VendorPrice: { Enabled: true }
  }, messages).badges, [{ label: '3 active', tone: 'success' }]);
  assert.deepEqual(stateFiltersSummaryParts({
    Unique: { State: 1 },
    Dyeable: { State: 1 },
    Repairable: { State: 2 }
  }, messages).badges, [
    { label: '2 required', tone: 'required' },
    { label: '1 excluded', tone: 'excluded' }
  ]);
});

test('Range and State UI leaves keep localization injected and translated values in safe sinks', () => {
  const editor = read('src/ui/rangeStateFiltersEditor.js');
  const controls = read('src/ui/formControls.js');

  assert.doesNotMatch(editor, /locales\/|localization\.js|ENGLISH_MESSAGES|createTranslator/);
  assert.match(editor, /title\.innerHTML = `<h3>\$\{escapeHtml\(filterLabel\)\}<\/h3>`/);
  assert.match(editor, /title\.innerHTML = `<h3>\$\{escapeHtml\(messages\.stateLabel\(filterName\)\)\}<\/h3>`/);
  assert.match(controls, /escapeHtml\(messages\.minimumSlider\(label\)\)/);
  assert.match(controls, /escapeHtml\(messages\.maximumSlider\(label\)\)/);
  assert.match(controls, /escapeHtml\(messages\.minimum\)/);
  assert.match(controls, /escapeHtml\(messages\.maximum\)/);
  assert.doesNotMatch(controls, /stateFilterLabel/);
});
