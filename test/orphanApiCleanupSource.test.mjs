import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from '../testSupport/sourceFiles.mjs';

test('obsolete compatibility and Item Ordering APIs stay absent', () => {
  const compatibility = read('src/exportCompatibility.js');
  const ordering = read('src/itemOrdering.js');

  assert.doesNotMatch(compatibility, /\bcompatibilityFindingCategory\b/);
  assert.doesNotMatch(compatibility, /\bCATEGORY_INSTANCE\b|aetherBagsCompatibilityCategoryInstance/);
  assert.doesNotMatch(ordering, /\bitemSortFieldLabel\b|\bitemSortDirectionLabel\b|\bITEM_SORT_FIELDS\b|\bITEM_SORT_DIRECTIONS\b/);
  assert.doesNotMatch(ordering, /\blabel\s*:|Object\.freeze\(\{\s*value\s*:/);
});

test('Item Ordering tables and compatibility finding fields retain runtime consumers', () => {
  const compatibility = read('src/exportCompatibility.js');
  const ordering = read('src/itemOrdering.js');
  const orderingEditor = read('src/ui/itemOrderingEditor.js');
  const app = read('src/app.js');

  assert.match(ordering, /ITEM_SORT_FIELD_VALUES = Object\.freeze\(\[0, 1, 2, 3, 4, 5, 6, 7\]\)/);
  assert.match(ordering, /ITEM_SORT_DIRECTION_VALUES = Object\.freeze\(\[0, 1\]\)/);
  assert.match(ordering, /const FIELD_VALUES = new Set\(ITEM_SORT_FIELD_VALUES\)/);
  assert.match(ordering, /const DIRECTION_VALUES = new Set\(ITEM_SORT_DIRECTION_VALUES\)/);
  assert.match(orderingEditor, /ITEM_SORT_FIELD_VALUES\.filter\(value => value !== 5\)/);
  assert.match(orderingEditor, /optionNodes\(ITEM_SORT_DIRECTION_VALUES,/);
  assert.match(orderingEditor, /node\.textContent = labelForValue\(value\)/);

  assert.match(compatibility, /categoryId: category\?\.Id,[\s\S]*categoryName: categoryLabel\(category, index\),[\s\S]*categoryIndex: index/);
  assert.match(compatibility, /analysis\.findings\.filter\(item => item\.blocksExport\)/);
  assert.match(app, /item\.categoryName \? `\$\{item\.categoryName\} · \$\{item\.field\}` : item\.field/);
});
