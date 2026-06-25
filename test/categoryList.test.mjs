import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultCategory } from '../src/config.js';
import { computeCategoryIssueCounts, getCategoryIssueCount } from '../src/ui/categoryList.js';

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

test('getCategoryIssueCount counts errors and warnings but not notes', () => {
  const category = cleanCategory({
    Description: '',
    Order: 'not-a-number',
    Rules: {
      ...cleanCategory().Rules,
      AllowedItemNamePatterns: ['[']
    }
  });

  assert.equal(getCategoryIssueCount(category, [category]), 2);
});


test('computeCategoryIssueCounts counts duplicate sort positions once without full per-row validation', () => {
  const first = cleanCategory({ Id: 'cat-a', Order: 3, Priority: 7 });
  const second = cleanCategory({ Id: 'cat-b', Order: 3, Priority: 7 });
  const clean = cleanCategory({ Id: 'cat-c', Order: 4, Priority: 7 });
  const counts = computeCategoryIssueCounts([first, second, clean]);

  assert.equal(counts.get(first), getCategoryIssueCount(first, [first, second, clean]));
  assert.equal(counts.get(second), getCategoryIssueCount(second, [first, second, clean]));
  assert.equal(counts.get(clean), 0);
});
