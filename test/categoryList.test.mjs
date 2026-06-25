import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultCategory } from '../src/config.js';
import { getCategoryIssueCount } from '../src/ui/categoryList.js';

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
