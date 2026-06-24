import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeImportedConfig,
  validateCategoryName,
  validateRegexPattern,
  validateRangeFilter,
  validateRarities,
  validateStateFilter
} from '../src/validation.js';
import { defaultCategory } from '../src/config.js';

function cleanCategory(overrides = {}) {
  const category = defaultCategory(0);
  category.Id = overrides.Id ?? 'cat-a';
  category.Name = overrides.Name ?? 'Clean';
  category.Description = overrides.Description ?? 'Has description';
  category.Order = overrides.Order ?? 1;
  category.Priority = overrides.Priority ?? 1;
  Object.assign(category, overrides);
  return category;
}

function fields(analysis) { return analysis.findings.map(item => item.field); }

test('duplicate category IDs are reported', () => {
  const analysis = analyzeImportedConfig({ Categories: [cleanCategory({ Id: 'same' }), cleanCategory({ Id: 'same', Order: 2, Priority: 2 })] });
  assert.ok(analysis.findings.some(item => item.field === 'Id' && /Duplicate category ID/.test(item.message)));
});

test('blank category names are reported', () => {
  assert.ok(validateCategoryName(cleanCategory({ Name: '  ' })).some(item => item.field === 'Name'));
});

test('invalid regex patterns are reported without rewriting input', () => {
  const pattern = '[';
  const findings = validateRegexPattern(pattern);
  assert.equal(pattern, '[');
  assert.equal(findings[0].severity, 'error');
});

test('Min greater than Max is reported for range filters', () => {
  const findings = validateRangeFilter('Level', { Min: 10, Max: 2 });
  assert.ok(findings.some(item => /minimum is greater than maximum/.test(item.message)));
});

test('duplicate item IDs, UI category IDs, and regex patterns are reported', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [1, 1];
  category.Rules.AllowedUiCategoryIds = [2, 2];
  category.Rules.AllowedItemNamePatterns = ['foo', 'foo'];
  const analysis = analyzeImportedConfig({ Categories: [category] });
  assert.ok(fields(analysis).includes('AllowedItemIds'));
  assert.ok(fields(analysis).includes('AllowedUiCategoryIds'));
  assert.ok(fields(analysis).includes('AllowedItemNamePatterns'));
});

test('unsupported rarities are reported', () => {
  const category = cleanCategory();
  category.Rules.AllowedRarities = [1, 99];
  assert.ok(validateRarities(category).some(item => item.field === 'AllowedRarities'));
});

test('invalid state values are reported', () => {
  assert.ok(validateStateFilter('Dyeable', { State: 9 }).some(item => item.field === 'Dyeable'));
});

test('clean config returns no errors or warnings', () => {
  const analysis = analyzeImportedConfig({ Categories: [cleanCategory()] });
  assert.equal(analysis.counts.error, 0);
  assert.equal(analysis.counts.warning, 0);
});
