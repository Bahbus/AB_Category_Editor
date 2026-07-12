import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMaterialImportRepair,
  reviewableImportRepairs,
  reviewableImportFindings,
  shouldShowImportValidationModal,
  configValidationSummaryText,
  validationSummaryText,
  nonMaterialRepairSummary,
  importStatusSeverity
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


test('reviewableImportFindings filters note-only findings', () => {
  const findings = [
    { severity: 'note', field: 'Description' },
    { severity: 'warning', field: 'AllowedRarities' },
    { severity: 'error', field: 'Rules' }
  ];

  assert.deepEqual(reviewableImportFindings(findings), [
    findings[1],
    findings[2]
  ]);
  assert.deepEqual(reviewableImportFindings(), []);
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


test('validationSummaryText reports material import repairs', () => {
  const none = { counts: {} };
  const warning = { counts: { warning: 1 } };
  const materialRepair = { field: 'AllowedItemIds', material: true, severity: 'warning' };
  const secondMaterialRepair = { field: 'Rules', material: true, severity: 'warning' };
  const sortingRepair = { field: 'Categories', material: false };
  const rarityRepair = { field: 'AllowedRarities', material: false };

  const materialOnly = validationSummaryText(2, none, [materialRepair]);
  assert.match(materialOnly, /import repair/);
  assert.doesNotMatch(materialOnly, /no validation issues/);
  assert.match(validationSummaryText(1, none, [materialRepair]), /1 import repair/);
  assert.match(validationSummaryText(2, none, [materialRepair, secondMaterialRepair]), /2 import repairs/);

  const sortingOnly = validationSummaryText(2, none, [sortingRepair]);
  assert.match(sortingOnly, /normalized display order/);
  assert.doesNotMatch(sortingOnly, /import repair/);

  const rarityOnly = validationSummaryText(2, none, [rarityRepair]);
  assert.match(rarityOnly, /normalized rarity order/);
  assert.doesNotMatch(rarityOnly, /import repair/);

  const warningAndRepair = validationSummaryText(2, warning, [materialRepair]);
  assert.match(warningAndRepair, /1 warning/);
  assert.match(warningAndRepair, /1 import repair/);
});

test('full-config summary uses the candidate category count when categories are added or removed', () => {
  const analysis = { counts: {} };
  for (const [currentCount, candidateCount] of [[1, 3], [3, 1]]) {
    const currentConfig = { Categories: Array.from({ length: currentCount }, () => ({})) };
    const candidateConfig = { Categories: Array.from({ length: candidateCount }, () => ({})) };
    const summary = configValidationSummaryText(candidateConfig, analysis);
    assert.match(summary, new RegExp(`Imported ${candidateCount} categor`));
    assert.doesNotMatch(summary, new RegExp(`Imported ${currentConfig.Categories.length} categor`));
  }
});

test('full-config summary reports the candidate count for an identical no-op', () => {
  const currentConfig = { Categories: [{ Name: 'One' }, { Name: 'Two' }] };
  const candidateConfig = structuredClone(currentConfig);
  assert.equal(configValidationSummaryText(candidateConfig, { counts: {} }), 'Imported 2 categories · no validation issues');
});

test('importStatusSeverity is warn only for reviewable findings or material repairs', () => {
  assert.equal(importStatusSeverity({ counts: {} }, []), 'ok');
  assert.equal(importStatusSeverity({ counts: { note: 1 } }, []), 'ok');
  assert.equal(importStatusSeverity({ counts: {} }, [{ field: 'Categories', material: false }]), 'ok');
  assert.equal(importStatusSeverity({ counts: {} }, [{ field: 'AllowedRarities', material: false }]), 'ok');
  assert.equal(importStatusSeverity({ counts: { warning: 1 } }, []), 'warn');
  assert.equal(importStatusSeverity({ counts: { error: 1 } }, []), 'warn');
  assert.equal(importStatusSeverity({ counts: {} }, [{ field: 'AllowedItemIds', material: true, severity: 'warning' }]), 'warn');
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
