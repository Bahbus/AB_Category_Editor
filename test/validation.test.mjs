import test from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeImportedConfig,
  getCategoryIssueCount,
  getCategoryIssueCounts,
  groupedDuplicateSortPositionFindings,
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



test('shared category issue counts include errors and warnings but not notes', () => {
  assert.equal(getCategoryIssueCount(cleanCategory({ Description: '' })), 0);
  assert.equal(getCategoryIssueCount(cleanCategory({ Name: '' })), 1);
  assert.equal(getCategoryIssueCount(cleanCategory({ Order: 'not-finite' })), 1);
});

test('shared category issue counts handle sort-position duplicates only for matching pairs', () => {
  const sameOrder = [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 1, Priority: 2 })
  ];
  assert.equal(getCategoryIssueCount(sameOrder[0], sameOrder), 0);

  const samePriority = [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 2, Priority: 1 })
  ];
  assert.equal(getCategoryIssueCount(samePriority[0], samePriority), 0);

  const samePair = [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 1, Priority: 1 })
  ];
  assert.equal(getCategoryIssueCount(samePair[0], samePair), 1);
  assert.equal(getCategoryIssueCount(samePair[1], samePair), 1);
});

test('shared category issue counts include duplicate list values and invalid regex patterns', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [1, 1];
  category.Rules.AllowedUiCategoryIds = [2, 2];
  category.Rules.AllowedItemNamePatterns = ['foo', 'foo', '['];

  assert.equal(getCategoryIssueCount(category), 4);
});


test('duplicate list warnings are grouped per field', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [1, 1, 2, 2];
  const analysis = analyzeImportedConfig({ Categories: [category] });
  const itemFindings = analysis.findings.filter(item => item.field === 'AllowedItemIds');

  assert.equal(itemFindings.length, 1);
  assert.match(itemFindings[0].message, /Duplicate Item IDs/);
  assert.doesNotMatch(itemFindings[0].message, /1|2/);
});

test('different duplicate list fields still create separate warnings', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [1, 1];
  category.Rules.AllowedUiCategoryIds = [2, 2];
  category.Rules.AllowedItemNamePatterns = ['foo', 'foo'];
  const analysis = analyzeImportedConfig({ Categories: [category] });
  const duplicateFields = fields(analysis);

  assert.equal(duplicateFields.includes('AllowedItemIds'), true);
  assert.equal(duplicateFields.includes('AllowedUiCategoryIds'), true);
  assert.equal(duplicateFields.includes('AllowedItemNamePatterns'), true);
});

test('category issue counts group duplicate list fields while counting invalid regex separately', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [1, 1, 2, 2];
  assert.equal(getCategoryIssueCount(category), 1);

  category.Rules.AllowedItemIds = [];
  category.Rules.AllowedItemNamePatterns = ['foo', 'foo', '['];
  assert.equal(getCategoryIssueCount(category), 2);
});

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



test('category validation uses friendly Range and State labels while keeping stable fields', () => {
  const category = cleanCategory();
  category.Rules.ItemLevel = { Enabled: true, Min: 10, Max: 2 };
  category.Rules.HighQuality = { State: 9, Filter: 0 };
  const analysis = analyzeImportedConfig({ Categories: [category] });
  const itemLevelFinding = analysis.findings.find(item => item.field === 'ItemLevel');
  const highQualityFinding = analysis.findings.find(item => item.field === 'HighQuality');

  assert.ok(itemLevelFinding);
  assert.match(itemLevelFinding.message, /Item Level minimum is greater than maximum/);
  assert.doesNotMatch(itemLevelFinding.message, /ItemLevel/);
  assert.ok(highQualityFinding);
  assert.match(highQualityFinding.message, /High Quality uses an unsupported state/);
  assert.doesNotMatch(highQualityFinding.message, /HighQuality/);
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

test('duplicate Order and Priority pair creates one grouped import summary warning', () => {
  const analysis = analyzeImportedConfig({ Categories: [
    cleanCategory({ Id: 'a', Name: 'Gear', Order: '1', Priority: 1 }),
    cleanCategory({ Id: 'b', Name: 'Meals', Order: 1, Priority: '1' })
  ] });
  const sortFindings = analysis.findings.filter(item => item.field === 'SortPosition');

  assert.equal(sortFindings.length, 1);
  assert.equal(analysis.counts.warning, 1);
  assert.match(sortFindings[0].message, /Order 1 \/ Priority 1 is shared by 2 categories/);
  assert.match(sortFindings[0].message, /Gear/);
  assert.match(sortFindings[0].message, /Meals/);
  assert.equal(sortFindings[0].categoryName, '');
  assert.doesNotMatch(sortFindings[0].message, /^Duplicate sort position: Order 1 \/ Priority 1\.$/);
});


test('grouped duplicate sort-position messages are stable across input order', () => {
  const first = groupedDuplicateSortPositionFindings([
    cleanCategory({ Id: 'ultimate', Name: 'Ultimate Totems', Order: 30, Priority: 100 }),
    cleanCategory({ Id: 'raid', Name: 'Raid Tokens', Order: 30, Priority: 100 })
  ]);
  const second = groupedDuplicateSortPositionFindings([
    cleanCategory({ Id: 'raid', Name: 'Raid Tokens', Order: 30, Priority: 100 }),
    cleanCategory({ Id: 'ultimate', Name: 'Ultimate Totems', Order: 30, Priority: 100 })
  ]);

  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0].message, second[0].message);
  assert.match(first[0].message, /Raid Tokens, Ultimate Totems/);
  assert.doesNotMatch(first[0].message, /Ultimate Totems, Raid Tokens/);
  assert.equal(first[0].sortPositionKey, '30:100');
  assert.deepEqual(first[0].categoryNames, ['Raid Tokens', 'Ultimate Totems']);
});

test('three duplicate sort positions still create one grouped warning with all names', () => {
  const findings = groupedDuplicateSortPositionFindings([
    cleanCategory({ Id: 'a', Name: 'Gear', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Name: 'Materia', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'c', Name: 'Meals', Order: 1, Priority: 1 })
  ]);

  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /3 categories/);
  assert.match(findings[0].message, /Gear, Materia, Meals/);
});

test('separate duplicate sort-position groups create separate grouped warnings', () => {
  const analysis = analyzeImportedConfig({ Categories: [
    cleanCategory({ Id: 'a', Name: 'A', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Name: 'B', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'c', Name: 'C', Order: 2, Priority: 5 }),
    cleanCategory({ Id: 'd', Name: 'D', Order: 2, Priority: 5 })
  ] });
  const sortFindings = analysis.findings.filter(item => item.field === 'SortPosition');

  assert.equal(sortFindings.length, 2);
  assert.ok(sortFindings.some(item => /Order 1 \/ Priority 1/.test(item.message)));
  assert.ok(sortFindings.some(item => /Order 2 \/ Priority 5/.test(item.message)));
});

test('duplicate sort grouping caps long category name lists', () => {
  const findings = groupedDuplicateSortPositionFindings(Array.from({ length: 12 }, (_, index) => (
    cleanCategory({ Id: `cat-${index}`, Name: `Category ${index + 1}`, Order: 1, Priority: 1 })
  )));

  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /shared by 12 categories/);
  assert.match(findings[0].message, /Category 1, Category 2, Category 3, Category 4, Category 5, Category 6, Category 7, Category 8, \+4 more\./);
  assert.doesNotMatch(findings[0].message, /Category 9/);
});

test('non-finite sort positions do not participate in grouped warnings but still validate fields', () => {
  const analysis = analyzeImportedConfig({ Categories: [
    cleanCategory({ Id: 'a', Name: 'Bad Order', Order: 'nope', Priority: 1 }),
    cleanCategory({ Id: 'b', Name: 'Also Bad Order', Order: 'nope', Priority: 1 }),
    cleanCategory({ Id: 'c', Name: 'Bad Priority', Order: 1, Priority: Number.POSITIVE_INFINITY })
  ] });

  assert.equal(analysis.findings.some(item => item.field === 'SortPosition'), false);
  assert.equal(analysis.findings.filter(item => item.field === 'Order').length, 2);
  assert.equal(analysis.findings.filter(item => item.field === 'Priority').length, 1);
});

test('category issue counts remain per-category for duplicate sort positions', () => {
  const categories = [
    cleanCategory({ Id: 'a', Order: 1, Priority: 1 }),
    cleanCategory({ Id: 'b', Order: 1, Priority: 1 })
  ];
  const counts = getCategoryIssueCounts(categories);

  assert.equal(counts.get(categories[0]), 1);
  assert.equal(counts.get(categories[1]), 1);
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

test('invalid Allowed Item IDs create one warning without exposing values', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [-1, 1.5, 'abc'];
  const analysis = analyzeImportedConfig({ Categories: [category] });
  const findings = analysis.findings.filter(item => item.field === 'AllowedItemIds');

  assert.equal(findings.some(item => /non-negative integers/i.test(item.message)), true);
  const invalidFinding = findings.find(item => /non-negative integers/i.test(item.message));
  assert.doesNotMatch(invalidFinding.message, /-1|1\.5|abc/);
});

test('invalid Allowed UI Category IDs create one warning without exposing values', () => {
  const category = cleanCategory();
  category.Rules.AllowedUiCategoryIds = [-1, 2.5, 'bad'];
  const analysis = analyzeImportedConfig({ Categories: [category] });

  const invalidFinding = analysis.findings.find(item =>
    item.field === 'AllowedUiCategoryIds' &&
    /non-negative integers/i.test(item.message)
  );
  assert.ok(invalidFinding);
  assert.doesNotMatch(invalidFinding.message, /-1|2\.5|bad/);
});

test('numeric string row IDs are accepted by numeric ID validation', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = ['123'];
  category.Rules.AllowedUiCategoryIds = ['456'];
  const analysis = analyzeImportedConfig({ Categories: [category] });

  assert.equal(analysis.counts.warning, 0);
});

test('invalid numeric row ID values are grouped per field', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [-1, -2, 'bad'];
  const analysis = analyzeImportedConfig({ Categories: [category] });

  const itemFindings = analysis.findings.filter(item =>
    item.field === 'AllowedItemIds' &&
    /non-negative integers/i.test(item.message)
  );

  assert.equal(itemFindings.length, 1);
});

test('invalid and duplicate row ID values produce separate Allowed Item ID issues', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [-1, -1];
  const analysis = analyzeImportedConfig({ Categories: [category] });

  const itemFindings = analysis.findings.filter(item => item.field === 'AllowedItemIds');

  assert.equal(itemFindings.length, 2);
  assert.ok(itemFindings.some(item => /Duplicate Item IDs/i.test(item.message)));
  assert.ok(itemFindings.some(item => /non-negative integers/i.test(item.message)));
});

test('issue counts include invalid numeric IDs once per affected field', () => {
  const category = cleanCategory();
  category.Rules.AllowedItemIds = [-1, -2];
  assert.equal(getCategoryIssueCount(category), 1);

  category.Rules.AllowedItemIds = [-1, -1];
  assert.equal(getCategoryIssueCount(category), 2);
});
