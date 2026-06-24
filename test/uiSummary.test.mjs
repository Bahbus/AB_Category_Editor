import test from 'node:test';
import assert from 'node:assert/strict';

import { rangeFiltersSummary, stateFiltersSummary } from '../src/ui/categoryEditor.js';

test('rangeFiltersSummary describes no active ranges', () => {
  assert.equal(rangeFiltersSummary({}), 'Range Filters · none active');
});

test('rangeFiltersSummary lists one or two active range names and counts three', () => {
  assert.equal(rangeFiltersSummary({ Level: { Enabled: true } }), 'Range Filters · Level active');
  assert.equal(rangeFiltersSummary({ Level: { Enabled: true }, ItemLevel: { Enabled: true } }), 'Range Filters · Level, Item Level active');
  assert.equal(rangeFiltersSummary({ Level: { Enabled: true }, ItemLevel: { Enabled: true }, VendorPrice: { Enabled: true } }), 'Range Filters · 3 active');
});

test('stateFiltersSummary describes required and excluded state filters', () => {
  assert.equal(stateFiltersSummary({}), 'State Filters · none active');
  assert.equal(stateFiltersSummary({ Unique: { State: 1 }, Dyeable: { State: 1 } }), 'State Filters · 2 required');
  assert.equal(stateFiltersSummary({ Unique: { State: 2 } }), 'State Filters · 1 excluded');
  assert.equal(stateFiltersSummary({ Unique: { State: 1 }, Dyeable: { State: 1 }, Repairable: { State: 2 } }), 'State Filters · 2 required · 1 excluded');
});
