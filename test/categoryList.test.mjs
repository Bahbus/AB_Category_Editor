import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultCategory } from '../src/config.js';
import { computeCategoryIssueCounts } from '../src/ui/categoryList.js';
import { getCategoryIssueCount, getCategoryIssueCounts, isIssueFinding } from '../src/validation.js';

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
      AllowedItemNamePatterns: ['   ']
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


test('shared issue helper only treats errors and warnings as issue findings', () => {
  assert.equal(isIssueFinding({ severity: 'error' }), true);
  assert.equal(isIssueFinding({ severity: 'warning' }), true);
  assert.equal(isIssueFinding({ severity: 'note' }), false);
});

test('shared issue counts distinguish duplicate order and priority pairs', () => {
  const first = cleanCategory({ Id: 'cat-a', Order: 9, Priority: 1 });
  const sameOrder = cleanCategory({ Id: 'cat-b', Order: 9, Priority: 2 });
  const samePriority = cleanCategory({ Id: 'cat-c', Order: 10, Priority: 1 });
  const counts = getCategoryIssueCounts([first, sameOrder, samePriority]);

  assert.equal(counts.get(first), 0);
  assert.equal(counts.get(sameOrder), 0);
  assert.equal(counts.get(samePriority), 0);
});
