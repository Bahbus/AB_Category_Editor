import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMaterialImportRepair,
  reviewableImportRepairs,
  shouldShowImportValidationModal,
  validationSummaryText,
  nonMaterialRepairSummary
} from '../src/importValidationSummary.js';

test('isMaterialImportRepair identifies repairs that should be reviewed', () => {
  assert.equal(isMaterialImportRepair(null), false);
  assert.equal(isMaterialImportRepair({ material: false, field: 'AllowedRarities' }), false);
  assert.equal(isMaterialImportRepair({ severity: 'error', field: 'Rules' }), true);
  assert.equal(isMaterialImportRepair({ severity: 'warning', field: 'AllowedRarities' }), true);
  assert.equal(isMaterialImportRepair({ material: true, field: 'Something' }), true);
  assert.equal(isMaterialImportRepair({ field: 'Categories' }), false);
  assert.equal(isMaterialImportRepair({ field: 'AllowedItemIds' }), true);
});

test('reviewableImportRepairs filters non-material cleanup repairs', () => {
  const repairs = [
    { field: 'Categories', material: false },
    { field: 'AllowedRarities', material: false },
    { field: 'AllowedRarities', material: true, severity: 'warning' },
    { field: 'Rules', severity: 'error' }
  ];

  assert.deepEqual(reviewableImportRepairs(repairs), [
    repairs[2],
    repairs[3]
  ]);
});

test('nonMaterialRepairSummary summarizes quiet cleanup repairs', () => {
  assert.equal(nonMaterialRepairSummary([]), '');

  assert.equal(
    nonMaterialRepairSummary([{ field: 'Categories', material: false }]),
    'normalized display order'
  );

  assert.equal(
    nonMaterialRepairSummary([{ field: 'AllowedRarities', material: false }]),
    'normalized rarity order'
  );

  assert.equal(
    nonMaterialRepairSummary([
      { field: 'Categories', material: false },
      { field: 'AllowedRarities', material: false }
    ]),
    'normalized display and rarity order'
  );

  assert.equal(
    nonMaterialRepairSummary([{ field: 'SomethingElse', material: false }]),
    'note-only cleanup'
  );

  assert.equal(
    nonMaterialRepairSummary([{ field: 'AllowedRarities', material: true, severity: 'warning' }]),
    ''
  );
});

test('validationSummaryText includes finding and quiet repair status', () => {
  const none = { counts: {} };
  const notes = { counts: { note: 2 } };
  const warning = { counts: { warning: 1 } };

  assert.match(validationSummaryText(2, none), /Imported 2 categories/);
  assert.match(validationSummaryText(2, none), /no validation issues/);

  assert.match(validationSummaryText(2, notes), /2 notes/);
  assert.match(validationSummaryText(2, notes), /note-only cleanup/);

  assert.match(
    validationSummaryText(2, none, [{ field: 'Categories', material: false }]),
    /normalized display order/
  );
  assert.match(
    validationSummaryText(2, none, [{ field: 'AllowedRarities', material: false }]),
    /normalized rarity order/
  );
  assert.match(
    validationSummaryText(2, none, [
      { field: 'Categories', material: false },
      { field: 'AllowedRarities', material: false }
    ]),
    /normalized display and rarity order/
  );

  assert.match(validationSummaryText(2, warning), /1 warning/);
});

test('shouldShowImportValidationModal gates quiet cleanup and material issues', () => {
  assert.equal(
    shouldShowImportValidationModal({ analysis: { findings: [{ severity: 'note' }] }, repairs: [] }),
    false
  );

  assert.equal(
    shouldShowImportValidationModal({ analysis: { findings: [{ severity: 'warning' }] }, repairs: [] }),
    true
  );

  assert.equal(
    shouldShowImportValidationModal({ analysis: { findings: [{ severity: 'error' }] }, repairs: [] }),
    true
  );

  assert.equal(
    shouldShowImportValidationModal({ analysis: { findings: [] }, repairs: [{ field: 'Categories', material: false }] }),
    false
  );

  assert.equal(
    shouldShowImportValidationModal({ analysis: { findings: [] }, repairs: [{ field: 'AllowedRarities', material: false }] }),
    false
  );

  assert.equal(
    shouldShowImportValidationModal({ analysis: { findings: [] }, repairs: [{ field: 'AllowedRarities', material: true, severity: 'warning' }] }),
    true
  );
});
