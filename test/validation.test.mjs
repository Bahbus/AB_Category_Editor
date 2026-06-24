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
import { defaultCategory, validateConfig } from '../src/config.js';

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

test('duplicate category IDs are reported without exposing the ID value', () => {
  const analysis = analyzeImportedConfig({ Categories: [cleanCategory({ Id: 'same-secret' }), cleanCategory({ Id: 'same-secret', Order: 2, Priority: 2 })] });
  const finding = analysis.findings.find(item => item.field === 'Id');
  assert.ok(finding);
  assert.match(finding.message, /share the same internal category ID/);
  assert.doesNotMatch(finding.message, /same-secret/);
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

test('default range filter values do not report Min greater than Max', () => {
  assert.equal(validateRangeFilter('Level', { Min: 0, Max: 200 }).length, 0);
  assert.equal(validateRangeFilter('ItemLevel', { Min: 0, Max: 2000 }).length, 0);
  assert.equal(validateRangeFilter('VendorPrice', { Min: 0, Max: 9999999 }).length, 0);
});

test('duplicate Order alone does not warn when Priority differs', () => {
  const analysis = analyzeImportedConfig({ Categories: [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 1, Priority: 2 })
  ] });
  assert.equal(analysis.findings.some(item => /Duplicate sort position/.test(item.message)), false);
});

test('duplicate Priority alone does not warn when Order differs', () => {
  const analysis = analyzeImportedConfig({ Categories: [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 2, Priority: 1 })
  ] });
  assert.equal(analysis.findings.some(item => /Duplicate sort position/.test(item.message)), false);
});

test('duplicate Order and Priority pair warns as duplicate sort position', () => {
  const analysis = analyzeImportedConfig({ Categories: [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 1, Priority: 1 })
  ] });
  assert.ok(analysis.findings.some(item => item.field === 'SortPosition' && /Duplicate sort position: Order 1 \/ Priority 1/.test(item.message)));
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

test('duplicate item and UI category ID warnings do not expose numeric values', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [12345, 12345];
  category.Rules.AllowedUiCategoryIds = [67890, 67890];
  const analysis = analyzeImportedConfig({ Categories: [category] });
  const itemFinding = analysis.findings.find(item => item.field === 'AllowedItemIds');
  const uiFinding = analysis.findings.find(item => item.field === 'AllowedUiCategoryIds');
  assert.ok(itemFinding);
  assert.ok(uiFinding);
  assert.doesNotMatch(itemFinding.message, /12345/);
  assert.doesNotMatch(uiFinding.message, /67890/);
});

test('repair category labels fall back to position instead of raw category ID', () => {
  const config = { Categories: [cleanCategory({ Id: 'secret-category-id', Name: '   ' })] };
  config.Categories[0].Rules.AllowedItemIds = 'malformed';
  const validation = validateConfig(config);
  const repair = validation.repairs.find(item => item.field === 'AllowedItemIds');
  assert.ok(repair);
  assert.equal(repair.categoryName, 'Category 1');
  assert.doesNotMatch(repair.categoryName, /secret-category-id/);
  assert.doesNotMatch(repair.message, /secret-category-id/);
});

test('sort repair report suppresses user-facing before and after category ID arrays', () => {
  const validation = validateConfig({ Categories: [
    cleanCategory({ Id: 'later-secret', Name: 'Later', Order: 2, Priority: 2 }),
    cleanCategory({ Id: 'earlier-secret', Name: 'Earlier', Order: 1, Priority: 1 })
  ] });
  const repair = validation.repairs.find(item => item.field === 'Categories');
  assert.ok(repair);
  assert.equal(repair.showBeforeAfter, false);
  assert.doesNotMatch(repair.message, /later-secret|earlier-secret/);
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
