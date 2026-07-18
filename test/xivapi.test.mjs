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
  fetchLookupRow,
  fetchLookupRows,
  fetchItemRowsPage,
  normalizeLookupIds,
  rowId,
  rowName,
  searchXivapi
} from '../src/xivapi.js';
import { isUsefulLookupName } from '../src/lookupNames.js';
import { XivapiRequestTimeoutError } from '../src/xivapiRequest.js';

function fakeTimers() {
  let nextId = 0;
  const timers = new Map();
  return {
    setTimer(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) { timers.delete(id); },
    fire(id) { timers.get(id)?.callback(); },
    timers
  };
}

test('normalizeLookupIds removes invalid, negative, fractional, and duplicate values', () => {
  assert.deepEqual(normalizeLookupIds([3, '3', 0, -1, 2.5, 'abc', 4]), [3, 0, 4]);
  assert.deepEqual(
    normalizeLookupIds([null, '', '   ', false, true, {}, [], -1, '-1', 1.5, '1.5', 'abc', 0, '123']),
    [0, 123]
  );
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

test('extractSheetRowsById uses strict explicit and fallback row id normalization', () => {
  const payload = {
    rows: [{ row_id: 10, fields: { Name: 'Potion' } }],
    data: {
      20: { id: null, fields: { Name: 'Ether' } },
      30: { id: 'bad', fields: { Name: 'Elixir' } },
      badKey: { id: 40, fields: { Name: 'Ignored because fallback keys are limited to numeric object entries' } }
    }
  };

  const rowsById = extractSheetRowsById(payload);

  assert.equal(rowName(rowsById.get('10')), 'Potion');
  assert.equal(rowName(rowsById.get('20')), 'Ether');
  assert.equal(rowName(rowsById.get('30')), 'Elixir');
  assert.equal(rowsById.has('40'), false);
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


test('collectReferencedIds ignores invalid preserved row ID values', () => {
  const categories = [{
    Rules: {
      AllowedItemIds: [null, '', false, true, -1, '123'],
      AllowedUiCategoryIds: ['   ', {}, [], '456']
    }
  }];
  const ensureShape = category => {
    category.Rules ||= {};
    category.Rules.AllowedItemIds ||= [];
    category.Rules.AllowedUiCategoryIds ||= [];
  };

  const ids = collectReferencedIds(categories, ensureShape);

  assert.deepEqual([...ids.Item], [123]);
  assert.deepEqual([...ids.ItemUICategory], [456]);
});

test('collectReferencedIds includes active and retained inactive Custom Item Order IDs', () => {
  const categories = [
    { ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [700, '701', null, -1], Rules: {} },
    { ItemSortCriteria: [{ Field: 0, Direction: 0 }], CustomItemOrder: [702, 700], Rules: {} },
    { CustomItemOrder: { malformed: true }, Rules: {} }
  ];
  const ensureShape = category => {
    category.Rules ||= {};
    category.Rules.AllowedItemIds ||= [];
    category.Rules.AllowedUiCategoryIds ||= [];
  };
  const ids = collectReferencedIds(categories, ensureShape);
  assert.deepEqual([...ids.Item].sort((a, b) => a - b), [700, 701, 702]);
});

test('countUncachedReferencedIds counts missing and unusable cached lookup names', () => {
  const ids = {
    Item: new Set([1, 2, 3, 4, 5]),
    ItemUICategory: new Set([10, 11])
  };
  const cache = {
    Item: { 1: 'Potion', 2: '(name unavailable)', 3: 'not looked up', 4: '(unnamed)', 5: 'unnamed' },
    ItemUICategory: { 10: 'Medicine' }
  };
  const lookupName = (sheet, id) => cache[sheet]?.[String(id)] || null;

  assert.equal(countUncachedReferencedIds(ids, lookupName), 5);
});

test('all four XIVAPI network functions use the shared injected request boundary', async () => {
  const urls = [];
  const signals = [];
  const fetchImpl = async (url, init) => {
    urls.push(String(url));
    signals.push(init.signal);
    if (String(url).includes('/search?')) return { ok: true, json: async () => ({ results: [{ row_id: 3 }] }) };
    return { ok: true, json: async () => ({ rows: [{ row_id: 1 }] }) };
  };

  await fetchLookupRows('Item', [1, 2], { fetchImpl });
  await fetchLookupRow('ItemUICategory', 7, { fetchImpl });
  assert.deepEqual(await searchXivapi('Item', 'grade IX', { fetchImpl }), [{ row_id: 3 }]);
  await fetchItemRowsPage('cursor', 250, { fetchImpl });

  assert.equal(urls.length, 4);
  assert.match(urls[0], /\/sheet\/Item\?rows=1%2C2&fields=Name&language=en$/);
  assert.match(urls[1], /\/sheet\/ItemUICategory\/7\?fields=Name&language=en$/);
  assert.match(urls[2], /\/search\?.*sheets=Item.*fields=Name.*limit=10.*language=en/);
  assert.match(urls[3], /\/sheet\/Item\?fields=Name&limit=250&language=en&after=cursor$/);
  assert.equal(signals.every(signal => signal instanceof AbortSignal), true);
});

test('XIVAPI network functions retain established HTTP error messages', async t => {
  const fetchImpl = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await t.test('batch', () => assert.rejects(fetchLookupRows('Item', [1], { fetchImpl }), /Item batch lookup failed: HTTP 429/));
  await t.test('row', () => assert.rejects(fetchLookupRow('Item', 1, { fetchImpl }), /Item 1 lookup failed: HTTP 429/));
  await t.test('search', () => assert.rejects(searchXivapi('Item', 'potion', { fetchImpl }), /Search failed: HTTP 429/));
  await t.test('scan', () => assert.rejects(fetchItemRowsPage(null, 100, { fetchImpl }), /Item sheet scan failed: HTTP 429/));
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

test('fetchLookupBatch caches only rows belonging to each current chunk', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const requestedUrls = [];
  globalThis.fetch = async url => {
    requestedUrls.push(String(url));
    const requestedRows = new URL(String(url)).searchParams.get('rows');
    if (requestedRows === '1,2') {
      return {
        ok: true,
        json: async () => ({ rows: [
          { row_id: 1, fields: { Name: 'Potion' } },
          { row_id: 2, fields: { Name: 'Ether' } },
          { row_id: 3, fields: { Name: 'Stale injected name' } }
        ] })
      };
    }
    return {
      ok: true,
      json: async () => ({ rows: [
        { row_id: 3, fields: { Name: 'Elixir' } },
        { row_id: 4, fields: { Name: 'Hi-Elixir' } }
      ] })
    };
  };
  const lookupCache = { Item: {} };

  const failures = await fetchLookupBatch('Item', [1, 2, 3, 4], {
    lookupCache,
    saveLookupCache() {},
    batchSize: 2
  });

  assert.deepEqual(failures, []);
  assert.deepEqual(lookupCache.Item, {
    1: 'Potion',
    2: 'Ether',
    3: 'Elixir',
    4: 'Hi-Elixir'
  });
  assert.equal(requestedUrls.length, 2);
});

test('fetchLookupBatch classifies a timed-out multi-ID chunk without retry bisection', async () => {
  const timers = fakeTimers();
  const lookupCache = { Item: { 9: 'Useful existing name', 2: '(name unavailable)' } };
  let fetchCalls = 0;
  let internalAbortCount = 0;
  const pending = fetchLookupBatch('Item', [1, 2, 3, 9], {
    lookupCache,
    saveLookupCache() {},
    batchSize: 50,
    deadlineMs: 10,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    fetchImpl: (url, init) => {
      fetchCalls++;
      init.signal.addEventListener('abort', () => { internalAbortCount++; });
      return new Promise(() => {});
    }
  });
  const timerId = [...timers.timers.keys()][0];

  timers.fire(timerId);
  const failures = await pending;

  assert.equal(fetchCalls, 1);
  assert.equal(internalAbortCount, 1);
  assert.deepEqual(failures.map(failure => failure.id), [1, 2, 3]);
  assert.equal(failures.every(failure => failure.error instanceof XivapiRequestTimeoutError), true);
  assert.deepEqual(lookupCache.Item, { 9: 'Useful existing name', 2: '(name unavailable)' });
});

test('fetchLookupBatch preserves earlier completed chunks when a later chunk times out', async () => {
  const timers = fakeTimers();
  const lookupCache = { Item: {} };
  let fetchCalls = 0;
  let notifySecondStarted;
  const secondStarted = new Promise(resolve => { notifySecondStarted = resolve; });
  const pending = fetchLookupBatch('Item', [1, 2, 3, 4], {
    lookupCache,
    saveLookupCache() {},
    batchSize: 2,
    deadlineMs: 10,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    fetchImpl: async (url, init) => {
      fetchCalls++;
      if (fetchCalls === 1) {
        return { ok: true, json: async () => ({ rows: [
          { row_id: 1, fields: { Name: 'Potion' } },
          { row_id: 2, fields: { Name: 'Ether' } }
        ] }) };
      }
      notifySecondStarted();
      return new Promise(() => {});
    }
  });

  await secondStarted;
  const timerId = [...timers.timers.keys()][0];
  timers.fire(timerId);
  const failures = await pending;

  assert.equal(fetchCalls, 2);
  assert.deepEqual(lookupCache.Item, { 1: 'Potion', 2: 'Ether' });
  assert.deepEqual(failures.map(failure => failure.id), [3, 4]);
  assert.equal(failures.every(failure => failure.error instanceof XivapiRequestTimeoutError), true);
});

test('fetchLookupBatch retains recursive bisection for ordinary batch failures', async () => {
  const requestedRows = [];
  const lookupCache = { Item: {} };
  const failures = await fetchLookupBatch('Item', [1, 2, 3, 4], {
    lookupCache,
    saveLookupCache() {},
    batchSize: 4,
    fetchImpl: async url => {
      const rows = new URL(String(url)).searchParams.get('rows');
      requestedRows.push(rows);
      if (rows === '1,2,3,4') return { ok: false, status: 503, json: async () => ({}) };
      const ids = rows.split(',').map(Number);
      return { ok: true, json: async () => ({ rows: ids.map(id => ({ row_id: id, fields: { Name: `Item ${id}` } })) }) };
    }
  });

  assert.deepEqual(failures, []);
  assert.deepEqual(requestedRows, ['1,2,3,4', '1,2', '3,4']);
  assert.deepEqual(lookupCache.Item, { 1: 'Item 1', 2: 'Item 2', 3: 'Item 3', 4: 'Item 4' });
});

test('fetchLookupBatch propagates caller cancellation without retrying', async () => {
  const timers = fakeTimers();
  const controller = new AbortController();
  let fetchCalls = 0;
  const pending = fetchLookupBatch('Item', [1, 2, 3], {
    lookupCache: { Item: {} },
    saveLookupCache() {},
    signal: controller.signal,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    fetchImpl: () => {
      fetchCalls++;
      return new Promise(() => {});
    }
  });
  const reason = new DOMException('user canceled', 'AbortError');

  controller.abort(reason);
  await assert.rejects(pending, error => error === reason);
  assert.equal(fetchCalls, 1);
});
