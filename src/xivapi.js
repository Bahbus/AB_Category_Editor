import { XIVAPI_BASE, LOOKUP_BATCH_SIZE } from './constants.js';

export function sheetLabel(sheet) {
  if (sheet === 'Item') return 'Item';
  if (sheet === 'ItemUICategory') return 'UI category';
  return sheet;
}

export function normalizeLookupIds(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids || []) {
    const n = Number(id);
    if (!Number.isInteger(n) || n < 0 || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function extractSheetRowsById(payload) {
  const map = new Map();
  const addRow = (row, fallbackId=null) => {
    if (!row || typeof row !== 'object') return;
    const id = rowId(row) ?? fallbackId;
    if (id === undefined || id === null || id === '') return;
    map.set(String(id), row);
  };
  for (const row of extractSheetRows(payload)) addRow(row);
  const rowContainers = [payload?.rows, payload?.data, payload?.results];
  for (const container of rowContainers) {
    if (!container || Array.isArray(container) || typeof container !== 'object') continue;
    for (const [id, row] of Object.entries(container)) if (/^\d+$/.test(id)) addRow(row, id);
  }
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    for (const [id, row] of Object.entries(payload)) if (/^\d+$/.test(id)) addRow(row, id);
  }
  return map;
}

export async function fetchLookupRows(sheet, ids) {
  const params = new URLSearchParams({ rows: ids.join(','), fields: 'Name', language: 'en' });
  const res = await fetch(`${XIVAPI_BASE}/sheet/${encodeURIComponent(sheet)}?${params.toString()}`);
  if (!res.ok) throw new Error(`${sheet} batch lookup failed: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchLookupRow(sheet, id) {
  const url = `${XIVAPI_BASE}/sheet/${encodeURIComponent(sheet)}/${encodeURIComponent(id)}?fields=Name&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${sheet} ${id} lookup failed: HTTP ${res.status}`);
  return await res.json();
}

export async function fetchLookupBatch(sheet, ids, options = {}) {
  const batchSize = Math.max(1, Number(options.batchSize) || LOOKUP_BATCH_SIZE);
  const lookupCache = options.lookupCache || {};
  const saveLookupCache = options.saveLookupCache || (() => {});
  const cache = lookupCache[sheet] || (lookupCache[sheet] = {});
  const missing = normalizeLookupIds(ids).filter(id => !cache[String(id)]);
  const failures = [];
  if (!missing.length) return failures;
  const cachePayloadRows = rowsById => {
    for (const id of missing) {
      if (cache[String(id)]) continue;
      const row = rowsById.get(String(id));
      if (row) cache[String(id)] = rowName(row) || '(name unavailable)';
    }
  };
  const fetchChunk = async chunk => {
    const before = new Set(Object.keys(cache));
    try {
      if (chunk.length === 1) cache[String(chunk[0])] = rowName(await fetchLookupRow(sheet, chunk[0])) || '(name unavailable)';
      else cachePayloadRows(extractSheetRowsById(await fetchLookupRows(sheet, chunk)));
    } catch (err) {
      if (chunk.length === 1) { failures.push({ sheet, id: chunk[0], error: err }); return; }
      const midpoint = Math.ceil(chunk.length / 2);
      await fetchChunk(chunk.slice(0, midpoint));
      await fetchChunk(chunk.slice(midpoint));
      return;
    }
    const unresolved = chunk.filter(id => !cache[String(id)] && !before.has(String(id)));
    if (unresolved.length && chunk.length > 1) for (const id of unresolved) await fetchChunk([id]);
    else for (const id of unresolved) failures.push({ sheet, id, error: new Error('No row returned') });
  };
  for (let i = 0; i < missing.length; i += batchSize) {
    await fetchChunk(missing.slice(i, i + batchSize));
    saveLookupCache();
    if (typeof options.onProgress === 'function') options.onProgress(Math.min(i + batchSize, missing.length), missing.length, sheet);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  saveLookupCache();
  return failures;
}

export function collectReferencedIds(categories, ensureShape) {
  const ids = { Item: new Set(), ItemUICategory: new Set() };
  for (const cat of categories) {
    ensureShape(cat);
    for (const id of cat.Rules.AllowedItemIds || []) if (Number.isInteger(Number(id))) ids.Item.add(Number(id));
    for (const id of cat.Rules.AllowedUiCategoryIds || []) if (Number.isInteger(Number(id))) ids.ItemUICategory.add(Number(id));
  }
  return ids;
}
export function countReferencedIds(ids) { return ids.Item.size + ids.ItemUICategory.size; }
export function countUncachedReferencedIds(ids, lookupName) {
  let count = 0;
  for (const id of ids.Item) if (!lookupName('Item', id)) count++;
  for (const id of ids.ItemUICategory) if (!lookupName('ItemUICategory', id)) count++;
  return count;
}
function quoteQueryValue(value) { return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"'); }
export async function searchXivapi(sheet, text) {
  const q = `Name~"${quoteQueryValue(text)}"`;
  const params = new URLSearchParams({ sheets: sheet, fields: 'Name', query: q, limit: '10', language: 'en' });
  const res = await fetch(`${XIVAPI_BASE}/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.results || [];
}
export async function fetchItemRowsPage(after=null, limit=3000, signal=null) {
  const params = new URLSearchParams({ fields: 'Name', limit: String(limit), language: 'en' });
  if (after !== null && after !== undefined) params.set('after', String(after));
  const res = await fetch(`${XIVAPI_BASE}/sheet/Item?${params.toString()}`, signal ? { signal } : undefined);
  if (!res.ok) throw new Error(`Item sheet scan failed: HTTP ${res.status}`);
  return await res.json();
}
export function extractSheetRows(payload) {
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}
export function extractNextCursor(payload, rows) {
  if (payload?.pagination?.next) return payload.pagination.next;
  if (payload?.next) return payload.next;
  if (payload?.next_after) return payload.next_after;
  if (payload?.cursor?.next) return payload.cursor.next;
  const last = rows[rows.length - 1];
  return last?.row_id ?? last?.rowId ?? last?.id ?? null;
}
export function rowId(row) { return row?.row_id ?? row?.rowId ?? row?.id; }
export function rowName(row) { return row?.fields?.Name || row?.fields?.Name_en || row?.Name || row?.Name_en || row?.name || ''; }
