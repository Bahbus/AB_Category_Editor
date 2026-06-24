import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBasicSwitchWarnings,
  rangeFiltersSummary,
  rangeFiltersSummaryParts,
  stateFiltersSummary,
  stateFiltersSummaryParts
} from '../src/ui/categoryEditor.js';

test('rangeFiltersSummary describes no active ranges', () => {
  assert.equal(rangeFiltersSummary({}), 'Range Filters · none active');
});

test('rangeFiltersSummary lists one or two active range names and counts three', () => {
  assert.equal(rangeFiltersSummary({ Level: { Enabled: true } }), 'Range Filters · Level active');
  assert.equal(rangeFiltersSummary({ Level: { Enabled: true }, ItemLevel: { Enabled: true } }), 'Range Filters · Level, Item Level active');
  assert.equal(rangeFiltersSummary({ Level: { Enabled: true }, ItemLevel: { Enabled: true }, VendorPrice: { Enabled: true } }), 'Range Filters · 3 active');
});

test('rangeFiltersSummaryParts includes issue count for invalid ranges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: false, Min: 20, Max: 10 } }), {
    title: 'Range Filters',
    meta: 'none active · 1 issue',
    issueCount: 1
  });
});

test('stateFiltersSummary describes required and excluded state filters', () => {
  assert.equal(stateFiltersSummary({}), 'State Filters · none active');
  assert.equal(stateFiltersSummary({ Unique: { State: 1 }, Dyeable: { State: 1 } }), 'State Filters · 2 required');
  assert.equal(stateFiltersSummary({ Unique: { State: 2 } }), 'State Filters · 1 excluded');
  assert.equal(stateFiltersSummary({ Unique: { State: 1 }, Dyeable: { State: 1 }, Repairable: { State: 2 } }), 'State Filters · 2 required · 1 excluded');
});

test('stateFiltersSummaryParts preserves state counts and includes issue count', () => {
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 7 }, Repairable: { State: 2 } }), {
    title: 'State Filters',
    meta: '1 required · 1 excluded · 1 issue',
    issueCount: 1
  });
});

test('getBasicSwitchWarnings returns disabled pinned warning', () => {
  assert.deepEqual(getBasicSwitchWarnings({ Enabled: false, Pinned: true }).map(item => item.message), [
    'Disabled categories should usually not be pinned.'
  ]);
  assert.deepEqual(getBasicSwitchWarnings({ Enabled: true, Pinned: true }), []);
});
