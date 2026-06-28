import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectReferencedIds,
  countReferencedIds,
  countUncachedReferencedIds,
  extractNextCursor,
  extractSheetRows,
  extractSheetRowsById,
  fetchLookupBatch,
  normalizeLookupIds,
  rowId,
  rowName
} from '../src/xivapi.js';
import { isUsefulLookupName } from '../src/lookupNames.js';

test('normalizeLookupIds removes invalid, negative, fractional, and duplicate values', () => {
  assert.deepEqual(normalizeLookupIds([3, '3', 0, -1, 2.5, 'abc', 4]), [3, 0, 4]);
});

test('extractSheetRows supports plausible XIVAPI row containers', () => {
  const rows = [{ row_id: 1 }, { row_id: 2 }];

  assert.equal(extractSheetRows({ rows }), rows);
  assert.deepEqual(extractSheetRows({ results: rows }), rows);
  assert.deepEqual(extractSheetRows({ data: rows }), rows);
  assert.equal(extractSheetRows(rows), rows);
  assert.deepEqual(extractSheetRows({}), []);
});

test('extractSheetRowsById maps array rows and numeric object fallback keys', () => {
  const payload = {
    rows: [{ row_id: 10, fields: { Name: 'Potion' } }],
    data: {
      20: { fields: { Name: 'Ether' } },
      notAnId: { fields: { Name: 'Ignored fallback' } }
    },
    30: { id: 30, Name: 'Elixir' }
  };

  const rowsById = extractSheetRowsById(payload);

  assert.equal(rowName(rowsById.get('10')), 'Potion');
  assert.equal(rowName(rowsById.get('20')), 'Ether');
  assert.equal(rowName(rowsById.get('30')), 'Elixir');
  assert.equal(rowsById.has('notAnId'), false);
});

test('extractNextCursor prefers pagination cursors before falling back to the last row id', () => {
  assert.equal(extractNextCursor({ pagination: { next: 'p2' } }, []), 'p2');
  assert.equal(extractNextCursor({ next: 'n2' }, []), 'n2');
  assert.equal(extractNextCursor({ next_after: 123 }, []), 123);
  assert.equal(extractNextCursor({ cursor: { next: 'c2' } }, []), 'c2');
  assert.equal(extractNextCursor({}, [{ row_id: 41 }, { id: 42 }]), 42);
  assert.equal(extractNextCursor({}, []), null);
});

test('rowId and rowName support common field variants', () => {
  assert.equal(rowId({ row_id: 1 }), 1);
  assert.equal(rowId({ rowId: 2 }), 2);
  assert.equal(rowId({ id: 3 }), 3);
  assert.equal(rowName({ fields: { Name: 'Potion' } }), 'Potion');
  assert.equal(rowName({ fields: { Name_en: 'Ether' } }), 'Ether');
  assert.equal(rowName({ Name: 'Elixir' }), 'Elixir');
  assert.equal(rowName({ Name_en: 'Hi-Elixir' }), 'Hi-Elixir');
  assert.equal(rowName({ name: 'Phoenix Down' }), 'Phoenix Down');
  assert.equal(rowName({}), '');
});

test('collectReferencedIds and countReferencedIds collect Item and UI category ids', () => {
  const categories = [
    { Rules: { AllowedItemIds: [100, '101', 'bad', 100], AllowedUiCategoryIds: [5] } },
    { Rules: { AllowedItemIds: [102], AllowedUiCategoryIds: ['5', 6] } }
  ];
  const ensureShape = category => {
    category.Rules ||= {};
    category.Rules.AllowedItemIds ||= [];
    category.Rules.AllowedUiCategoryIds ||= [];
  };

  const ids = collectReferencedIds(categories, ensureShape);

  assert.deepEqual([...ids.Item].sort((a, b) => a - b), [100, 101, 102]);
  assert.deepEqual([...ids.ItemUICategory].sort((a, b) => a - b), [5, 6]);
  assert.equal(countReferencedIds(ids), 5);
});

test('countUncachedReferencedIds counts missing and unusable cached lookup names', () => {
  const ids = {
    Item: new Set([1, 2, 3]),
    ItemUICategory: new Set([10, 11])
  };
  const cache = {
    Item: { 1: 'Potion', 2: '(name unavailable)', 3: 'not looked up' },
    ItemUICategory: { 10: 'Medicine' }
  };
  const lookupName = (sheet, id) => cache[sheet]?.[String(id)] || null;

  assert.equal(countUncachedReferencedIds(ids, lookupName), 3);
});

test('fetchLookupBatch retries cached sentinel names and replaces them with useful names', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ fields: { Name: 'Ether' } })
  });
  const lookupCache = { Item: { 1: 'Potion', 2: '(name unavailable)' } };

  const failures = await fetchLookupBatch('Item', [1, 2], { lookupCache, saveLookupCache() {}, batchSize: 50 });

  assert.deepEqual(failures, []);
  assert.equal(lookupCache.Item['1'], 'Potion');
  assert.equal(lookupCache.Item['2'], 'Ether');
});


test('fetchLookupBatch reports cached sentinel failure when retry returns no row', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({})
  });
  const lookupCache = { Item: { 2: '(name unavailable)' } };

  const failures = await fetchLookupBatch('Item', [2], { lookupCache, saveLookupCache() {}, batchSize: 50 });

  assert.equal(failures.length, 1);
  assert.equal(failures[0].sheet, 'Item');
  assert.equal(failures[0].id, 2);
  assert.equal(isUsefulLookupName(lookupCache.Item['2']), false);
});

test('fetchLookupBatch reports cached sentinel failure when retry returns unusable name', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ fields: { Name: '' } })
  });
  const lookupCache = { Item: { 2: '(name unavailable)' } };

  const failures = await fetchLookupBatch('Item', [2], { lookupCache, saveLookupCache() {}, batchSize: 50 });

  assert.equal(failures.length, 1);
  assert.equal(failures[0].sheet, 'Item');
  assert.equal(failures[0].id, 2);
  assert.equal(isUsefulLookupName(lookupCache.Item['2']), false);
});

test('fetchLookupBatch falls back from mixed batch sentinel failures to single-id retry', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requestedUrls = [];
  globalThis.fetch = async url => {
    requestedUrls.push(String(url));
    if (String(url).includes('/sheet/Item?')) {
      return {
        ok: true,
        json: async () => ({ rows: [{ row_id: 3, fields: { Name: 'Elixir' } }] })
      };
    }
    return {
      ok: true,
      json: async () => ({ fields: { Name: '' } })
    };
  };
  const lookupCache = { Item: { 1: 'Potion', 2: '(name unavailable)' } };

  const failures = await fetchLookupBatch('Item', [1, 2, 3], { lookupCache, saveLookupCache() {}, batchSize: 50 });

  assert.equal(failures.length, 1);
  assert.equal(failures[0].sheet, 'Item');
  assert.equal(failures[0].id, 2);
  assert.equal(lookupCache.Item['1'], 'Potion');
  assert.equal(isUsefulLookupName(lookupCache.Item['2']), false);
  assert.equal(lookupCache.Item['3'], 'Elixir');
  assert.equal(requestedUrls.length, 2);
  assert.equal(requestedUrls.some(url => url.includes('/sheet/Item/2?')), true);
});
