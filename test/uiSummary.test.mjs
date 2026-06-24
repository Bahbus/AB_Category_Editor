import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBasicSwitchWarnings,
  rangeFiltersSummary,
  rangeFiltersSummaryParts,
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
    { label: '2 required', tone: 'success' }
  ]);
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 2 } }).badges, [
    { label: '1 excluded', tone: 'success' }
  ]);
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 1 }, Repairable: { State: 2 } }).badges, [
    { label: '2 required', tone: 'success' },
    { label: '1 excluded', tone: 'success' }
  ]);
});

test('stateFiltersSummaryParts preserves state counts and includes issue badge', () => {
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 7 }, Repairable: { State: 2 } }), {
    title: 'State Filters',
    badges: [
      { label: '1 required', tone: 'success' },
      { label: '1 excluded', tone: 'success' },
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
