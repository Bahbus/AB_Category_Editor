import test from 'node:test';
import assert from 'node:assert/strict';

const documentStub = {
  readyState: 'loading',
  addEventListener() {},
  documentElement: { dataset: {} }
};
globalThis.document = documentStub;
globalThis.window = { addEventListener() {} };

const { shouldShowImportValidationModal } = await import('../src/app.js');

const note = { severity: 'note', field: 'Description', message: 'Description is blank.' };
const error = { severity: 'error', field: 'Order', message: 'Order must be finite.' };
const warning = { severity: 'warning', field: 'SortPosition', message: 'Duplicate sort position.' };
const sortRepair = { field: 'Categories', severity: 'note', material: false, message: 'Categories were sorted by Order, Priority, Name, and internal fallback.' };
const materialRepair = { field: 'AllowedItemIds', message: 'AllowedItemIds was malformed and replaced with an empty array.' };

function modal(findings = [], repairs = []) {
  return shouldShowImportValidationModal({ analysis: { findings }, repairs });
}

test('errors show import validation modal', () => assert.equal(modal([error]), true));
test('warnings show import validation modal', () => assert.equal(modal([warning]), true));
test('errors plus notes show import validation modal', () => assert.equal(modal([error, note]), true));
test('warnings plus notes show import validation modal', () => assert.equal(modal([warning, note]), true));
test('notes only suppress import validation modal', () => assert.equal(modal([note]), false));
test('sorting/order normalization only suppresses import validation modal', () => assert.equal(modal([], [sortRepair]), false));
test('blank-description notes only suppress import validation modal', () => assert.equal(modal([{ ...note, message: 'Description is blank.' }]), false));
test('dropped or changed invalid data repairs show import validation modal', () => assert.equal(modal([], [materialRepair]), true));
