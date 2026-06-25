import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBasicSwitchWarnings,
  rangeFiltersSummary,
  rangeFiltersSummaryParts,
  renderDetailsSummaryHtml,
  stateFiltersSummary,
  stateFiltersSummaryParts
} from '../src/ui/categoryEditor.js';

test('rangeFiltersSummaryParts returns no badges for inactive valid ranges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({}), {
    title: 'Range Filters',
    badges: [],
    issueCount: 0
  });
  assert.equal(rangeFiltersSummary({}), 'Range Filters');
});


test('renderDetailsSummaryHtml always includes stable empty badge slot', () => {
  const html = renderDetailsSummaryHtml(rangeFiltersSummaryParts({}));
  assert.match(html, /details-summary-title">Range Filters<\/span><span class="details-summary-badges"><\/span>/);
  assert.doesNotMatch(html, /ui-badge/);
});

test('renderDetailsSummaryHtml renders badges inside stable badge slot', () => {
  const html = renderDetailsSummaryHtml(rangeFiltersSummaryParts({ Level: { Enabled: true, Min: 10, Max: 1 } }));
  assert.match(html, /<span class="details-summary-badges"><span class="ui-badge details-summary-badge success ui-badge-success">Level<\/span><span class="ui-badge details-summary-badge warning ui-badge-warning">1 issue<\/span><\/span>/);
});

test('rangeFiltersSummaryParts returns active range badges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true } }).badges, [
    { label: 'Level', tone: 'success' }
  ]);
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true }, ItemLevel: { Enabled: true } }).badges, [
    { label: 'Level', tone: 'success' },
    { label: 'Item Level', tone: 'success' }
  ]);
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true }, ItemLevel: { Enabled: true }, VendorPrice: { Enabled: true } }).badges, [
    { label: '3 active', tone: 'success' }
  ]);
});

test('rangeFiltersSummaryParts includes issue badge for invalid ranges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: false, Min: 20, Max: 10 } }), {
    title: 'Range Filters',
    badges: [{ label: '1 issue', tone: 'warning' }],
    issueCount: 1
  });
});

test('stateFiltersSummaryParts returns no badges for inactive valid states', () => {
  assert.deepEqual(stateFiltersSummaryParts({}), {
    title: 'State Filters',
    badges: [],
    issueCount: 0
  });
  assert.equal(stateFiltersSummary({}), 'State Filters');
});

test('stateFiltersSummaryParts returns required and excluded badges', () => {
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 1 } }).badges, [
    { label: '2 required', tone: 'required' }
  ]);
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 2 } }).badges, [
    { label: '1 excluded', tone: 'excluded' }
  ]);
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 1 }, Repairable: { State: 2 } }).badges, [
    { label: '2 required', tone: 'required' },
    { label: '1 excluded', tone: 'excluded' }
  ]);
});

test('stateFiltersSummaryParts preserves state counts and includes issue badge', () => {
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 7 }, Repairable: { State: 2 } }), {
    title: 'State Filters',
    badges: [
      { label: '1 required', tone: 'required' },
      { label: '1 excluded', tone: 'excluded' },
      { label: '1 issue', tone: 'warning' }
    ],
    issueCount: 1
  });
});

test('getBasicSwitchWarnings returns disabled pinned warning', () => {
  assert.deepEqual(getBasicSwitchWarnings({ Enabled: false, Pinned: true }).map(item => item.message), [
    'Disabled categories should usually not be pinned.'
  ]);
  assert.deepEqual(getBasicSwitchWarnings({ Enabled: true, Pinned: true }), []);
});
