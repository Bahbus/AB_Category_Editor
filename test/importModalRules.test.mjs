import test from 'node:test';
import assert from 'node:assert/strict';

const documentStub = {
  readyState: 'loading',
  addEventListener() {},
  documentElement: { dataset: {} }
};
globalThis.document = documentStub;
globalThis.window = { addEventListener() {} };

const {
  shouldShowImportValidationModal,
  isMaterialImportRepair,
  reviewableImportRepairs,
  validationSummaryText
} = await import('../src/app.js');

const note = { severity: 'note', field: 'Description', message: 'Description is blank.' };
const error = { severity: 'error', field: 'Order', message: 'Order must be finite.' };
const warning = { severity: 'warning', field: 'SortPosition', message: 'Duplicate sort position.' };
const sortRepair = { field: 'Categories', severity: 'note', material: false, message: 'Categories were sorted by Order, Priority, Name, and internal fallback.' };
const rarityReorderRepair = { field: 'AllowedRarities', severity: 'note', material: false, showBeforeAfter: false, message: 'Allowed Rarities were sorted during import normalization.' };
const invalidRarityRepair = { field: 'AllowedRarities', severity: 'warning', material: true, message: 'Allowed Rarities changed during import normalization.' };
const malformedRulesRepair = { field: 'Rules', message: 'Rules were missing or malformed and replaced with defaults.' };
const rangeRepair = { field: 'Level', severity: 'warning', material: true, message: 'Level filter values were normalized.' };
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
test('Allowed Rarities reorder-only normalization suppresses import validation modal', () => assert.equal(modal([], [rarityReorderRepair]), false));
test('blank-description notes only suppress import validation modal', () => assert.equal(modal([{ ...note, message: 'Description is blank.' }]), false));
test('dropped or changed invalid data repairs show import validation modal', () => assert.equal(modal([], [materialRepair]), true));
test('Allowed Rarities invalid/drop repairs show import validation modal', () => assert.equal(modal([], [invalidRarityRepair]), true));
test('malformed Rules repairs show import validation modal', () => assert.equal(modal([], [malformedRulesRepair]), true));
test('material Range/State normalization repairs show import validation modal', () => assert.equal(modal([], [rangeRepair]), true));

test('isMaterialImportRepair classifies harmless and material repairs', () => {
  assert.equal(isMaterialImportRepair(sortRepair), false);
  assert.equal(isMaterialImportRepair(rarityReorderRepair), false);
  assert.equal(isMaterialImportRepair(invalidRarityRepair), true);
  assert.equal(isMaterialImportRepair(malformedRulesRepair), true);
});

test('reviewableImportRepairs filters mixed repair lists to modal-worthy rows', () => {
  const repairs = [rangeRepair, sortRepair, rarityReorderRepair];

  assert.equal(modal([], repairs), true);
  assert.deepEqual(reviewableImportRepairs(repairs), [rangeRepair]);
});


function analysis(counts = {}) {
  return { counts, findings: [] };
}

test('validation summary reports clean imports without validation issues', () => {
  assert.equal(validationSummaryText(2, analysis(), []), 'Imported 2 categories · no validation issues');
});

test('validation summary reports note-only cleanup for note findings', () => {
  assert.match(validationSummaryText(1, analysis({ note: 1 }), []), /note-only cleanup/);
});

test('validation summary reports display order cleanup for category sorting repairs', () => {
  assert.match(validationSummaryText(2, analysis(), [sortRepair]), /normalized display order/);
});

test('validation summary reports rarity order cleanup for rarity reorder-only repairs', () => {
  assert.match(validationSummaryText(2, analysis(), [rarityReorderRepair]), /normalized rarity order/);
});

test('validation summary reports combined display and rarity order cleanup', () => {
  assert.match(validationSummaryText(2, analysis(), [sortRepair, rarityReorderRepair]), /normalized display and rarity order/);
});

test('validation summary does not describe material repairs as order-only cleanup', () => {
  const summary = validationSummaryText(2, analysis(), [invalidRarityRepair]);
  assert.doesNotMatch(summary, /normalized (?:display|rarity|display and rarity) order/);
});
