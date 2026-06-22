const INITIAL_DATA = {
  "Format": "AetherBags_Category",
  "Version": 1,
  "Categories": []
};

let data = JSON.parse(JSON.stringify(INITIAL_DATA));
let selectedIndex = -1;
let dirty = false;
let draggedIndex = null;
let lookupCache = loadLookupCache();

const XIVAPI_BASE = 'https://v2.xivapi.com/api';
const LOOKUP_BATCH_SIZE = 100;

const RARITIES = [
  { id: 1, label: 'Common', color: 'White' },
  { id: 2, label: 'Uncommon', color: 'Green' },
  { id: 3, label: 'Rare', color: 'Blue' },
  { id: 4, label: 'Relic', color: 'Purple' },
  { id: 7, label: 'Aetherial', color: 'Pink' }
];
const ALLOWED_RARITY_IDS = new Set(RARITIES.map(rarity => rarity.id));

const el = id => document.getElementById(id);

function loadLookupCache() {
  try {
    const raw = localStorage.getItem('aetherbagsEditorLookupCache');
    return raw ? JSON.parse(raw) : { Item: {}, ItemUICategory: {} };
  } catch {
    return { Item: {}, ItemUICategory: {} };
  }
}

function saveLookupCache() {
  try {
    localStorage.setItem('aetherbagsEditorLookupCache', JSON.stringify(lookupCache));
  } catch {
    // If storage is full or blocked, lookup caching is skipped.
  }
}

function lookupCacheCount(sheet) {
  return Object.keys(lookupCache[sheet] || {}).length;
}

function clearLookupCache() {
  lookupCache = { Item: {}, ItemUICategory: {} };
  try {
    localStorage.removeItem('aetherbagsEditorLookupCache');
  } catch {
    // If storage is blocked, the in-memory cache is still cleared.
  }
  renderAll();
  setStatus('Lookup cache cleared. Category data was not changed.', 'ok');
}

function setSaveState(text='Saved', cls='') {
  const node = el('saveState');
  if (!node) return;
  node.textContent = text;
  node.className = 'save-state' + (cls ? ' ' + cls : '');
}

function showToast(msg, cls='') {
  if (!msg) return;
  const box = el('toastContainer');
  if (!box) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + cls;
  toast.textContent = msg;
  box.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'opacity .18s ease, transform .18s ease';
  }, 3200);
  setTimeout(() => toast.remove(), 3500);
}

function setStatus(msg, cls='') {
  const s = el('status');
  if (s) {
    s.className = 'hidden';
    s.textContent = msg;
  }
  if (cls === 'err') console.error(msg);
  else if (cls === 'warn') console.warn(msg);
  else console.log(msg);

  if (cls === 'ok' || cls === 'err' || cls === 'warn') {
    showToast(msg, cls);
  }
}

let busyCount = 0;

function showBusy(title, detail='', percent=null) {
  busyCount++;
  const box = el('busyOverlay');
  el('busyTitle').textContent = title || 'Working';
  updateBusy(detail, percent);
  box.classList.remove('hidden');
}

function updateBusy(detail='', percent=null) {
  const box = el('busyOverlay');
  const fill = el('busyProgressFill');
  if (!box || box.classList.contains('hidden')) return;
  el('busyDetail').textContent = detail || '';
  if (percent === null || Number.isNaN(Number(percent))) {
    fill.classList.add('indeterminate');
    fill.style.width = '35%';
  } else {
    const clamped = Math.max(0, Math.min(100, Number(percent)));
    fill.classList.remove('indeterminate');
    fill.style.transform = 'none';
    fill.style.width = clamped + '%';
  }
}

function hideBusy(force=false) {
  busyCount = force ? 0 : Math.max(0, busyCount - 1);
  if (busyCount === 0) {
    const box = el('busyOverlay');
    if (box) box.classList.add('hidden');
  }
}

function markDirty(msg='Changed') {
  dirty = true;
  setSaveState('Unsaved changes', 'warn');
  renderList();
}

function getCategories() {
  if (!data.Categories) data.Categories = [];
  return data.Categories;
}

function updateExportControls() {
  const disabled = getCategories().length === 0;
  for (const id of ['showExportCopy', 'downloadBase64']) {
    const button = el(id);
    if (!button) continue;
    button.disabled = disabled;
    button.title = disabled ? 'Add or import at least one category before exporting.' : '';
  }
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function makeId() {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function defaultRules() {
  return {
    AllowedItemIds: [],
    AllowedItemNamePatterns: [],
    AllowedUiCategoryIds: [],
    AllowedRarities: [],
    Level: { Enabled: false, Min: 0, Max: 200 },
    ItemLevel: { Enabled: false, Min: 0, Max: 2000 },
    VendorPrice: { Enabled: false, Min: 0, Max: 9999999 },
    Untradable: { State: 0, Filter: 0 },
    Unique: { State: 0, Filter: 0 },
    Collectable: { State: 0, Filter: 0 },
    Dyeable: { State: 0, Filter: 0 },
    Repairable: { State: 0, Filter: 0 },
    HighQuality: { State: 0, Filter: 0 },
    Desynthesizable: { State: 0, Filter: 0 },
    Glamourable: { State: 0, Filter: 0 },
    FullySpiritbonded: { State: 0, Filter: 0 }
  };
}

function defaultCategory() {
  const cats = getCategories();
  const maxOrder = cats.reduce((m, c) => Math.max(m, Number(c.Order || 0)), 0);
  return {
    Enabled: true,
    Pinned: false,
    Id: makeId(),
    Name: 'New Category',
    Description: '',
    Order: maxOrder + 1,
    Priority: maxOrder + 1,
    Color: { X: 1, Y: 1, Z: 1, W: 1 },
    ItemSortCriteria: [{ Field: 0, Direction: 0 }],
    CustomItemOrder: [],
    Rules: defaultRules()
  };
}

function ensureShape(cat) {
  if (!cat.Color) cat.Color = { X: 1, Y: 1, Z: 1, W: 1 };
  for (const key of ['X','Y','Z','W']) {
    if (typeof cat.Color[key] !== 'number') cat.Color[key] = key === 'W' ? 1 : 1;
  }
  if (!cat.Rules) cat.Rules = defaultRules();
  const r = cat.Rules;
  for (const key of ['AllowedItemIds','AllowedItemNamePatterns','AllowedUiCategoryIds','AllowedRarities']) {
    if (!Array.isArray(r[key])) r[key] = [];
  }
  for (const [key, val] of Object.entries(defaultRules())) {
    if (r[key] === undefined) r[key] = clone(val);
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function componentTo255(v) {
  return Math.round(clamp01(v) * 255);
}

function componentToHex(v) {
  return componentTo255(v).toString(16).padStart(2, '0');
}

function colorToHex(color) {
  return '#' + componentToHex(color.X) + componentToHex(color.Y) + componentToHex(color.Z);
}

function colorToHexRGBA(color) {
  return '#' + componentToHex(color.X) + componentToHex(color.Y) + componentToHex(color.Z) + componentToHex(color.W);
}

function hexToRgb01(hex) {
  const clean = hex.replace('#', '');
  return {
    X: parseInt(clean.slice(0,2), 16) / 255,
    Y: parseInt(clean.slice(2,4), 16) / 255,
    Z: parseInt(clean.slice(4,6), 16) / 255
  };
}

function hexToRgba01(hex) {
  const clean = hex.replace('#', '');
  return {
    X: parseInt(clean.slice(0,2), 16) / 255,
    Y: parseInt(clean.slice(2,4), 16) / 255,
    Z: parseInt(clean.slice(4,6), 16) / 255,
    W: parseInt(clean.slice(6,8), 16) / 255
  };
}

function rgbaCss(color) {
  return `rgba(${componentTo255(color.X)}, ${componentTo255(color.Y)}, ${componentTo255(color.Z)}, ${clamp01(color.W)})`;
}

function rgbaCssWithMinimumAlpha(color, minimumAlpha) {
  const alpha = Math.max(clamp01(color.W), minimumAlpha);
  return `rgba(${componentTo255(color.X)}, ${componentTo255(color.Y)}, ${componentTo255(color.Z)}, ${alpha})`;
}


function numericValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function compareOptionalNumber(a, b) {
  const aNumber = numericValue(a);
  const bNumber = numericValue(b);
  if (aNumber !== null && bNumber !== null && aNumber !== bNumber) return aNumber - bNumber;
  if ((aNumber !== null) !== (bNumber !== null)) return aNumber !== null ? -1 : 1;
  return 0;
}

function compareCategoriesForImport(a, b) {
  return compareOptionalNumber(a.Order, b.Order)
    || compareOptionalNumber(a.Priority, b.Priority)
    || String(a.Name || '').localeCompare(String(b.Name || ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(a.Id || '').localeCompare(String(b.Id || ''), undefined, { numeric: true, sensitivity: 'base' });
}

function sortImportedCategories(config) {
  if (!config || !Array.isArray(config.Categories)) return config;
  config.Categories.sort(compareCategoriesForImport);
  return config;
}

function normalizeAllowedRarities(cat) {
  const rules = cat.Rules || (cat.Rules = {});
  const original = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities : [];
  const normalized = [];
  const seen = new Set();

  for (const raw of original) {
    const value = Number(raw);
    if (!ALLOWED_RARITY_IDS.has(value) || seen.has(value)) continue;
    normalized.push(value);
    seen.add(value);
  }

  normalized.sort((a, b) => a - b);
  rules.AllowedRarities = normalized;
  return normalized;
}

function renumberCategories() {
  getCategories().forEach((cat, i) => {
    cat.Order = i + 1;
    cat.Priority = i + 1;
  });
}

function getCategorySearchText() {
  const search = el('search');
  return search ? search.value.trim() : '';
}

function isCategorySearchActive() {
  return getCategorySearchText().length > 0;
}

function getCategoryDisplayName(cat) {
  return cat.Name || '(unnamed)';
}

function getCategoryDescriptionText(cat) {
  return String(cat.Description ?? '').trim();
}

function getCategorySubtitle(cat) {
  const order = `#${cat.Order ?? ''}`;
  const description = getCategoryDescriptionText(cat);
  return description ? `${order} · ${description}` : `${order} · No description`;
}

function getCategorySubtitleTitle(cat) {
  return getCategoryDescriptionText(cat) || 'No description';
}

function filteredCategoryEntries() {
  const cats = getCategories();
  const q = getCategorySearchText().toLowerCase();
  return cats.map((cat, idx) => { ensureShape(cat); return {cat, idx}; }).filter(({cat}) => {
    const hay = [
      cat.Name, cat.Description, cat.Id,
      ...(cat.Rules?.AllowedItemNamePatterns || []),
      ...(cat.Rules?.AllowedUiCategoryIds || []).map(String),
      ...(cat.Rules?.AllowedItemIds || []).map(String)
    ].join(' ').toLowerCase();
    return !q || hay.includes(q);
  });
}

function renderList() {
  const cats = getCategories();
  el('format').textContent = `${data.Format || 'Unknown format'} v${data.Version ?? '?' }`;
  el('count').textContent = cats.length;
  const list = el('categoryList');
  list.innerHTML = '';

  const entries = filteredCategoryEntries();
  const searchActive = isCategorySearchActive();
  entries.forEach(({cat, idx}) => {
    const item = document.createElement('div');
    const displayName = getCategoryDisplayName(cat);
    const subtitle = getCategorySubtitle(cat);
    const subtitleTitle = getCategorySubtitleTitle(cat);

    item.className = 'cat-item' + (idx === selectedIndex ? ' active' : '') + (searchActive ? ' reorder-disabled' : '');
    item.draggable = !searchActive;
    item.dataset.index = String(idx);
    item.style.setProperty('--category-color', rgbaCssWithMinimumAlpha(cat.Color, 0.35));
    item.style.setProperty('--category-tint', rgbaCssWithMinimumAlpha({...cat.Color, W: Math.min(clamp01(cat.Color.W) * 0.16, 0.12)}, 0.035));

    item.onclick = () => {
      selectedIndex = idx;
      renderAll();
    };

    item.ondragstart = ev => {
      if (searchActive) {
        ev.preventDefault();
        return;
      }
      draggedIndex = idx;
      item.classList.add('dragging');
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', String(idx));
    };
    item.ondragend = () => {
      draggedIndex = null;
      clearDropClasses();
      item.classList.remove('dragging');
    };
    item.ondragover = ev => {
      if (searchActive) return;
      ev.preventDefault();
      if (draggedIndex === null || draggedIndex === idx) return;
      clearDropClasses();
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      item.classList.add(before ? 'drop-before' : 'drop-after');
    };
    item.ondrop = ev => {
      if (searchActive) return;
      ev.preventDefault();
      const from = draggedIndex ?? Number(ev.dataTransfer.getData('text/plain'));
      const to = idx;
      if (Number.isNaN(from) || from === to) return;
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      moveCategory(from, to, before);
    };

    item.innerHTML = `
      <div class="drag-handle" title="${searchActive ? 'Clear search to reorder' : 'Drag to reorder'}">☰</div>
      <div class="cat-text">
        <div class="cat-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
        <div class="cat-desc" title="${escapeHtml(subtitleTitle)}">${escapeHtml(subtitle)}</div>
      </div>
      <div class="badges">
        <span class="badge ${cat.Enabled ? 'on' : ''}">${cat.Enabled ? 'on' : 'off'}</span>
        ${cat.Pinned ? '<span class="badge pin">pin</span>' : ''}
      </div>
    `;
    list.appendChild(item);
  });

  el('listStatus').textContent = searchActive
    ? `${entries.length} shown · clear search to reorder`
    : `${entries.length} shown · drag categories to reorder`;
}

function clearDropClasses() {
  document.querySelectorAll('.cat-item.drop-before, .cat-item.drop-after').forEach(node => {
    node.classList.remove('drop-before', 'drop-after');
  });
}

function moveCategory(from, to, before) {
  const cats = getCategories();
  if (from < 0 || from >= cats.length || to < 0 || to >= cats.length) return;
  const [moved] = cats.splice(from, 1);
  let insertAt = to;
  if (from < to) insertAt--;
  if (!before) insertAt++;
  insertAt = Math.max(0, Math.min(cats.length, insertAt));
  cats.splice(insertAt, 0, moved);
  selectedIndex = insertAt;
  if (el('autoRenumberDrag').checked) renumberCategories();
  markDirty('Category reordered');
  renderAll();
}

function numberInput(label, value, onChange, step='1', min=null, max=null) {
  const wrap = document.createElement('div');
  const minAttr = min === null ? '' : ` min="${min}"`;
  const maxAttr = max === null ? '' : ` max="${max}"`;
  wrap.innerHTML = `<label>${label}</label><input type="number" step="${step}"${minAttr}${maxAttr} value="${escapeHtml(value)}">`;
  wrap.querySelector('input').oninput = e => onChange(Number(e.target.value));
  return wrap;
}

function textInput(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<label>${label}</label><input value="${escapeHtml(value)}">`;
  wrap.querySelector('input').oninput = e => onChange(e.target.value);
  return wrap;
}

function checkbox(label, value, onChange) {
  const l = document.createElement('label');
  l.className = 'check';
  l.innerHTML = `<input type="checkbox" ${value ? 'checked' : ''}> ${escapeHtml(label)}`;
  l.querySelector('input').onchange = e => onChange(e.target.checked);
  return l;
}

function lookupName(sheet, id) {
  const cache = lookupCache[sheet] || (lookupCache[sheet] = {});
  return cache[String(id)] || null;
}

function sheetLabel(sheet) {
  if (sheet === 'Item') return 'Item';
  if (sheet === 'ItemUICategory') return 'UI category';
  return sheet;
}

async function fetchLookup(sheet, id) {
  const idText = String(id);
  const cache = lookupCache[sheet] || (lookupCache[sheet] = {});
  if (cache[idText]) return cache[idText];

  const failures = await fetchLookupBatch(sheet, [Number(id)], { batchSize: 1 });
  if (failures.length) throw new Error(`${sheet} ${id} lookup failed`);
  return cache[idText] || '(name unavailable)';
}

function normalizeLookupIds(ids) {
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

function extractSheetRowsById(payload) {
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
    for (const [id, row] of Object.entries(container)) addRow(row, id);
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    for (const [id, row] of Object.entries(payload)) {
      if (/^\d+$/.test(id)) addRow(row, id);
    }
  }

  return map;
}

async function fetchLookupRows(sheet, ids) {
  const params = new URLSearchParams({
    rows: ids.join(','),
    fields: 'Name',
    language: 'en'
  });
  const res = await fetch(`${XIVAPI_BASE}/sheet/${encodeURIComponent(sheet)}?${params.toString()}`);
  if (!res.ok) throw new Error(`${sheet} batch lookup failed: HTTP ${res.status}`);
  return await res.json();
}

async function fetchLookupRow(sheet, id) {
  const url = `${XIVAPI_BASE}/sheet/${encodeURIComponent(sheet)}/${encodeURIComponent(id)}?fields=Name&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${sheet} ${id} lookup failed: HTTP ${res.status}`);
  return await res.json();
}

async function fetchLookupBatch(sheet, ids, options = {}) {
  const batchSize = Math.max(1, Number(options.batchSize) || LOOKUP_BATCH_SIZE);
  const cache = lookupCache[sheet] || (lookupCache[sheet] = {});
  const missing = normalizeLookupIds(ids).filter(id => !cache[String(id)]);
  const failures = [];
  if (!missing.length) return failures;

  const cachePayloadRows = rowsById => {
    for (const id of missing) {
      if (cache[String(id)]) continue;
      const row = rowsById.get(String(id));
      if (!row) continue;
      cache[String(id)] = rowName(row) || '(name unavailable)';
    }
  };

  const fetchChunk = async chunk => {
    const before = new Set(Object.keys(cache));
    try {
      if (chunk.length === 1) {
        const row = await fetchLookupRow(sheet, chunk[0]);
        cache[String(chunk[0])] = rowName(row) || '(name unavailable)';
      } else {
        const payload = await fetchLookupRows(sheet, chunk);
        cachePayloadRows(extractSheetRowsById(payload));
      }
    } catch (err) {
      if (chunk.length === 1) {
        failures.push({ sheet, id: chunk[0], error: err });
        return;
      }
      const midpoint = Math.ceil(chunk.length / 2);
      await fetchChunk(chunk.slice(0, midpoint));
      await fetchChunk(chunk.slice(midpoint));
      return;
    }

    const unresolved = chunk.filter(id => !cache[String(id)] && !before.has(String(id)));
    if (unresolved.length && chunk.length > 1) {
      for (const id of unresolved) await fetchChunk([id]);
    } else {
      for (const id of unresolved) failures.push({ sheet, id, error: new Error('No row returned') });
    }
  };

  for (let i = 0; i < missing.length; i += batchSize) {
    await fetchChunk(missing.slice(i, i + batchSize));
    saveLookupCache();
    if (typeof options.onProgress === 'function') {
      options.onProgress(Math.min(i + batchSize, missing.length), missing.length, sheet);
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  saveLookupCache();
  return failures;
}

function collectReferencedIds() {
  const ids = {
    Item: new Set(),
    ItemUICategory: new Set()
  };

  for (const cat of getCategories()) {
    ensureShape(cat);
    for (const id of cat.Rules.AllowedItemIds || []) {
      if (Number.isInteger(Number(id))) ids.Item.add(Number(id));
    }
    for (const id of cat.Rules.AllowedUiCategoryIds || []) {
      if (Number.isInteger(Number(id))) ids.ItemUICategory.add(Number(id));
    }
  }

  return ids;
}

function countReferencedIds(ids) {
  return ids.Item.size + ids.ItemUICategory.size;
}

function countUncachedReferencedIds(ids) {
  let count = 0;
  for (const id of ids.Item) {
    if (!lookupName('Item', id)) count++;
  }
  for (const id of ids.ItemUICategory) {
    if (!lookupName('ItemUICategory', id)) count++;
  }
  return count;
}

async function lookupReferencedIds(options = {}) {
  const { quiet = false } = options;
  const ids = collectReferencedIds();
  const total = countReferencedIds(ids);
  const uncached = countUncachedReferencedIds(ids);

  if (!total) {
    if (!quiet) setStatus('No referenced Item/UI Category IDs to look up.', 'warn');
    return;
  }

  if (!uncached) {
    if (!quiet) setStatus(`All ${total} referenced ID name(s) already cached.`, 'ok');
    renderAll();
    return;
  }

  const lookupButton = el('lookupReferencedIds');
  if (lookupButton) lookupButton.disabled = true;

  const failures = [];

  try {
    showBusy('Looking up IDs', `0/${uncached} complete`, 0);

    const work = [
      ['ItemUICategory', [...ids.ItemUICategory]],
      ['Item', [...ids.Item]]
    ];

    for (const [sheet, sheetIds] of work) {
      const missing = sheetIds.filter(id => !lookupName(sheet, id));
      if (!missing.length) continue;
      const priorCached = uncached - countUncachedReferencedIds(ids);
      const batchFailures = await fetchLookupBatch(sheet, missing, {
        onProgress(doneForSheet, totalForSheet) {
          const done = Math.min(uncached, priorCached + doneForSheet);
          const percent = uncached ? (done / uncached) * 100 : 100;
          updateBusy(`${done}/${uncached} checked · ${sheetLabel(sheet)} batch ${Math.ceil(doneForSheet / LOOKUP_BATCH_SIZE)}/${Math.ceil(totalForSheet / LOOKUP_BATCH_SIZE)}`, percent);
        }
      });
      failures.push(...batchFailures.map(failure => `${failure.sheet} ${failure.id}`));
    }

    saveLookupCache();
    renderAll();

    if (failures.length) {
      const shown = failures.slice(0, 5).join(', ');
      const more = failures.length > 5 ? `, +${failures.length - 5} more` : '';
      setStatus(`Lookup finished with ${failures.length} failure(s): ${shown}${more}`, 'warn');
    } else {
      setStatus(`Lookup complete: ${uncached} new name(s) cached.`, 'ok');
    }
  } finally {
    hideBusy();
    if (lookupButton) lookupButton.disabled = false;
  }
}

function maybeAutoLookupImportedIds() {
  const auto = el('autoLookupImport');
  if (!auto || !auto.checked) return;
  lookupReferencedIds({ quiet: true }).catch(err => {
    hideBusy(true);
    setStatus('Automatic ID lookup failed: ' + err.message, 'warn');
  });
}

function quoteQueryValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

async function searchXivapi(sheet, text) {
  const q = `Name~"${quoteQueryValue(text)}"`;
  const params = new URLSearchParams({
    sheets: sheet,
    fields: 'Name',
    query: q,
    limit: '10',
    language: 'en'
  });
  const res = await fetch(`${XIVAPI_BASE}/search?${params.toString()}`);
  if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.results || [];
}


function renderAllowedRaritiesEditor(cat) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h3>Allowed Rarities</h3>
    <p class="hint">Select the item rarities this category accepts. Leave all unchecked to ignore rarity.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'rarity-checkbox-grid';
  const selected = new Set(normalizeAllowedRarities(cat));

  for (const rarity of RARITIES) {
    const label = document.createElement('label');
    label.className = 'check rarity-check';
    label.innerHTML = `
      <input type="checkbox" value="${rarity.id}" ${selected.has(rarity.id) ? 'checked' : ''}>
      <span>${escapeHtml(rarity.label)} (${escapeHtml(rarity.color)})</span>
    `;
    label.querySelector('input').onchange = () => {
      cat.Rules.AllowedRarities = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => Number(input.value))
        .filter(value => ALLOWED_RARITY_IDS.has(value))
        .sort((a, b) => a - b);
      markDirty('Allowed rarities changed');
    };
    grid.appendChild(label);
  }

  card.appendChild(grid);
  return card;
}

function listEditor(title, arr, parser, formatter, hint='', lookupSheet=null) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h3>${escapeHtml(title)}</h3>${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ''}`;
  const pills = document.createElement('div');
  pills.className = 'pill-list';

  function renderPills() {
    pills.innerHTML = '';
    arr.forEach((v, i) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      let extra = '';
      if (lookupSheet) {
        const name = lookupName(lookupSheet, v);
        extra = name ? ` <span class="pill-name">— ${escapeHtml(name)}</span>` : ' <span class="pill-name">— not looked up</span>';
      }
      pill.innerHTML = `<span>${escapeHtml(formatter(v))}</span>${extra}<button title="Remove">×</button>`;
      pill.querySelector('button').onclick = () => {
        arr.splice(i, 1);
        markDirty(`${title} updated`);
        renderPills();
      };
      pills.appendChild(pill);
    });
    if (!arr.length) {
      const empty = document.createElement('span');
      empty.className = 'hint';
      empty.textContent = 'Empty';
      pills.appendChild(empty);
    }
  }

  const row = document.createElement('div');
  row.className = 'row';
  row.style.marginTop = '10px';

  const input = document.createElement('input');
  input.style.width = 'min(420px, 100%)';
  input.placeholder = 'Add one value, or comma-separated values';

  const add = document.createElement('button');
  add.textContent = 'Add';
  add.onclick = () => {
    const raw = input.value.trim();
    if (!raw) return;
    const parts = raw.includes(',') ? raw.split(',').map(x => x.trim()).filter(Boolean) : [raw];
    try {
      for (const part of parts) arr.push(parser(part));
      input.value = '';
      markDirty(`${title} updated`);
      renderPills();
    } catch (err) {
      setStatus(err.message, 'err');
    }
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      add.click();
    }
  });

  row.append(input, add);

  if (lookupSheet) {
    const lookupButton = document.createElement('button');
    lookupButton.textContent = `Lookup ${sheetLabel(lookupSheet)} names`;
    lookupButton.onclick = async () => {
      try {
        lookupButton.disabled = true;
        const ids = normalizeLookupIds(arr);
        const missing = ids.filter(id => !lookupName(lookupSheet, id));
        showBusy(`Looking up ${sheetLabel(lookupSheet)} names`, `0/${missing.length} uncached checked`, 0);
        if (missing.length) {
          const failures = await fetchLookupBatch(lookupSheet, missing, {
            onProgress(done, total) {
              const percent = total ? (done / total) * 100 : 100;
              setStatus(`Looked up ${done}/${total} uncached ${sheetLabel(lookupSheet)} ID(s)...`);
              updateBusy(`${done}/${total} uncached checked`, percent);
            }
          });
          if (failures.length) {
            const shown = failures.slice(0, 5).map(failure => `#${failure.id}`).join(', ');
            const more = failures.length > 5 ? `, +${failures.length - 5} more` : '';
            setStatus(`${sheetLabel(lookupSheet)} lookup finished with ${failures.length} failure(s): ${shown}${more}`, 'warn');
          } else {
            setStatus(`${sheetLabel(lookupSheet)} lookup complete`, 'ok');
          }
        } else {
          setStatus(`All ${ids.length} ${sheetLabel(lookupSheet)} name(s) already cached.`, 'ok');
        }
        renderPills();
      } catch (err) {
        setStatus(err.message, 'err');
      } finally {
        hideBusy();
        lookupButton.disabled = false;
      }
    };
    row.append(lookupButton);

    const searchWrap = document.createElement('div');
    searchWrap.style.marginTop = '10px';
    searchWrap.innerHTML = `
      <label>Search ${escapeHtml(sheetLabel(lookupSheet))} by English name</label>
      <div class="row">
        <input class="lookupSearchInput" style="width:min(420px, 100%)" placeholder="Example: potion, materia, weapon">
        <button class="lookupSearchButton">Search</button>
      </div>
      <div class="lookup-results"></div>
    `;
    const searchInput = searchWrap.querySelector('.lookupSearchInput');
    const searchButton = searchWrap.querySelector('.lookupSearchButton');
    const resultsBox = searchWrap.querySelector('.lookup-results');

    searchButton.onclick = async () => {
      const query = searchInput.value.trim();
      if (!query) return;
      try {
        searchButton.disabled = true;
        resultsBox.innerHTML = '<span class="hint">Searching...</span>';
        const results = await searchXivapi(lookupSheet, query);
        resultsBox.innerHTML = '';
        if (!results.length) {
          resultsBox.innerHTML = '<span class="hint">No results.</span>';
          return;
        }
        for (const result of results) {
          const id = result.row_id;
          const name = result.fields?.Name || '(unnamed)';
          const cache = lookupCache[lookupSheet] || (lookupCache[lookupSheet] = {});
          cache[String(id)] = name;
          saveLookupCache();

          const r = document.createElement('div');
          r.className = 'lookup-row';
          r.innerHTML = `
            <span>#${escapeHtml(id)}</span>
            <span>${escapeHtml(name)}</span>
            <button class="small">Add</button>
          `;
          r.querySelector('button').onclick = () => {
            if (!arr.includes(id)) {
              arr.push(id);
              markDirty(`${title} updated`);
              renderPills();
            }
          };
          resultsBox.appendChild(r);
        }
        setStatus(`Search complete`, 'ok');
      } catch (err) {
        resultsBox.innerHTML = '';
        setStatus(err.message, 'err');
      } finally {
        searchButton.disabled = false;
      }
    };

    card.append(pills, row, searchWrap);
  } else {
    card.append(pills, row);
  }

  renderPills();
  return card;
}

async function fetchItemRowsPage(after=null, limit=3000) {
  const params = new URLSearchParams({
    fields: 'Name',
    limit: String(limit),
    language: 'en'
  });
  if (after !== null && after !== undefined) params.set('after', String(after));
  const res = await fetch(`${XIVAPI_BASE}/sheet/Item?${params.toString()}`);
  if (!res.ok) throw new Error(`Item sheet scan failed: HTTP ${res.status}`);
  return await res.json();
}

function extractSheetRows(payload) {
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function extractNextCursor(payload, rows) {
  if (payload?.pagination?.next) return payload.pagination.next;
  if (payload?.next) return payload.next;
  if (payload?.next_after) return payload.next_after;
  if (payload?.cursor?.next) return payload.cursor.next;
  const last = rows[rows.length - 1];
  const lastId = last?.row_id ?? last?.rowId ?? last?.id;
  return lastId ?? null;
}

function rowId(row) {
  return row?.row_id ?? row?.rowId ?? row?.id;
}

function rowName(row) {
  return row?.fields?.Name || row?.fields?.Name_en || row?.Name || row?.Name_en || row?.name || '';
}

function uniqueById(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function openRegexToItemIdsTool() {
  const cat = getCategories()[selectedIndex];
  if (!cat) return;
  ensureShape(cat);
  const patterns = cat.Rules.AllowedItemNamePatterns || [];
  const wrap = document.createElement('div');
  const options = patterns.map((pattern, index) => `<option value="${index}">${escapeHtml(pattern)}</option>`).join('');
  wrap.innerHTML = `
    <p class="hint">Select an existing regex or type a custom one. The scan matches JavaScript regex against English Item names from XIVAPI.</p>
    <div class="grid cols-2">
      <div>
        <label>Existing pattern</label>
        <select id="regexPatternSelect">
          <option value="custom">Custom regex</option>
          ${options}
        </select>
      </div>
      <div>
        <label>Regex flags</label>
        <input id="regexFlags" value="i" placeholder="Example: i">
      </div>
    </div>
    <div style="margin-top:10px;">
      <label>Regex</label>
      <input id="regexPatternInput" value="${escapeHtml(patterns[0] || '')}" placeholder="Example: ^Augmented .*">
    </div>
    <div class="grid cols-3" style="margin-top:10px;">
      <div>
        <label>Max matches to collect</label>
        <input id="regexMaxMatches" type="number" min="1" step="1" value="5000">
      </div>
      <div>
        <label>Page size</label>
        <input id="regexPageSize" type="number" min="100" max="5000" step="100" value="3000">
      </div>
      <div>
        <label>When adding IDs</label>
        <select id="regexRemovePattern">
          <option value="keep">Keep regex filter</option>
          <option value="remove">Remove selected regex filter</option>
        </select>
      </div>
    </div>
    <div class="row" style="margin-top:12px;">
      <button id="runRegexScan" class="primary">Scan matching items</button>
      <button id="addRegexMatches" disabled>Add matched IDs</button>
    </div>
    <p class="hint" id="regexScanSummary"></p>
    <div class="regex-results" id="regexResults"></div>
  `;

  openModal('Regex → Item IDs', wrap);

  const select = document.getElementById('regexPatternSelect');
  const input = document.getElementById('regexPatternInput');
  const addButton = document.getElementById('addRegexMatches');
  const resultsBox = document.getElementById('regexResults');
  const summary = document.getElementById('regexScanSummary');
  let matches = [];

  select.onchange = () => {
    if (select.value === 'custom') return;
    input.value = patterns[Number(select.value)] || '';
  };
  if (patterns.length) select.value = '0';

  document.getElementById('runRegexScan').onclick = async () => {
    matches = [];
    addButton.disabled = true;
    resultsBox.innerHTML = '';
    summary.textContent = '';

    let regex;
    try {
      regex = new RegExp(input.value, document.getElementById('regexFlags').value || '');
    } catch (err) {
      setStatus('Invalid regex: ' + err.message, 'err');
      return;
    }

    const maxMatches = Math.max(1, Number(document.getElementById('regexMaxMatches').value) || 5000);
    const pageSize = Math.max(100, Math.min(5000, Number(document.getElementById('regexPageSize').value) || 3000));
    let after = null;
    let scanned = 0;
    let pages = 0;
    let keepGoing = true;

    showBusy('Scanning items', 'Starting Item sheet scan...', 0);
    try {
      while (keepGoing) {
        const payload = await fetchItemRowsPage(after, pageSize);
        const rows = extractSheetRows(payload);
        pages++;
        if (!rows.length) break;

        for (const row of rows) {
          const id = rowId(row);
          const name = rowName(row);
          if (id === undefined || !name) continue;
          scanned++;
          regex.lastIndex = 0;
          if (regex.test(name)) {
            matches.push({ id: Number(id), name });
            const cache = lookupCache.Item || (lookupCache.Item = {});
            cache[String(id)] = name;
            if (matches.length >= maxMatches) {
              keepGoing = false;
              break;
            }
          }
        }

        saveLookupCache();
        updateBusy(`${scanned.toLocaleString()} items scanned · ${matches.length.toLocaleString()} matches`, null);

        const next = extractNextCursor(payload, rows);
        if (!next || next === after || !keepGoing) break;
        after = next;
      }

      matches = uniqueById(matches);
      summary.textContent = `${matches.length.toLocaleString()} match(es) found after scanning ${scanned.toLocaleString()} item row(s).`;
      resultsBox.innerHTML = '';
      for (const item of matches.slice(0, 300)) {
        const row = document.createElement('div');
        row.className = 'regex-result-row';
        row.innerHTML = `<span class="regex-id">#${escapeHtml(item.id)}</span><span>${escapeHtml(item.name)}</span>`;
        resultsBox.appendChild(row);
      }
      if (matches.length > 300) {
        const more = document.createElement('p');
        more.className = 'hint';
        more.textContent = `Showing first 300 of ${matches.length.toLocaleString()} matches.`;
        resultsBox.appendChild(more);
      }
      addButton.disabled = matches.length === 0;
      setStatus('Regex scan complete', 'ok');
    } catch (err) {
      setStatus('Regex scan failed: ' + err.message, 'err');
    } finally {
      hideBusy();
    }
  };

  addButton.onclick = () => {
    if (!matches.length) return;
    const ids = cat.Rules.AllowedItemIds || (cat.Rules.AllowedItemIds = []);
    const existing = new Set(ids.map(Number));
    let added = 0;
    for (const item of matches) {
      if (existing.has(Number(item.id))) continue;
      ids.push(Number(item.id));
      existing.add(Number(item.id));
      added++;
    }

    if (document.getElementById('regexRemovePattern').value === 'remove' && select.value !== 'custom') {
      const idx = Number(select.value);
      if (!Number.isNaN(idx)) cat.Rules.AllowedItemNamePatterns.splice(idx, 1);
    }

    markDirty(`Added ${added} item IDs`);
    setStatus(`Added ${added} item ID(s).`, 'ok');
    closeModal();
    renderAll();
  };
}

function renderColorSection(cat) {
  const color = document.createElement('div');
  color.className = 'card';
  color.innerHTML = '<h3>Color</h3>';

  const layout = document.createElement('div');
  layout.className = 'color-layout';

  const left = document.createElement('div');
  left.innerHTML = `
    <label>Preview / color picker</label>
    <div class="color-preview" title="Click to open the color picker">
      <div class="color-fill" id="colorFill"></div>
      <input class="color-native-input" id="rgbPicker" type="color" value="${colorToHex(cat.Color)}" aria-label="Pick RGB color">
    </div>
    <p class="hint" id="colorReadout" style="margin-bottom:0;"></p>
  `;

  const right = document.createElement('div');
  right.className = 'grid';

  const hexWrap = document.createElement('div');
  hexWrap.innerHTML = `<label>Hex RGBA</label><input id="hexColorInput" placeholder="#RRGGBBAA" value="${colorToHexRGBA(cat.Color).toUpperCase()}">`;

  const nums = document.createElement('div');
  nums.className = 'grid cols-4';

  function makeRgbaNumber(label, getValue, setValue) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<label>${label}</label><input type="number" min="0" max="255" step="1" value="${escapeHtml(getValue())}">`;
    const input = wrap.querySelector('input');
    input.oninput = e => {
      const raw = Number(e.target.value);
      const n = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(255, Math.round(raw)));
      setValue(n);
      markDirty(`${label} changed`);
      updateColorVisuals();
    };
    input.onchange = () => renderEditor();
    return wrap;
  }

  nums.append(
    makeRgbaNumber('R', () => componentTo255(cat.Color.X), n => { cat.Color.X = n / 255; }),
    makeRgbaNumber('G', () => componentTo255(cat.Color.Y), n => { cat.Color.Y = n / 255; }),
    makeRgbaNumber('B', () => componentTo255(cat.Color.Z), n => { cat.Color.Z = n / 255; }),
    makeRgbaNumber('A', () => componentTo255(cat.Color.W), n => { cat.Color.W = n / 255; })
  );

  right.append(hexWrap, nums);
  layout.append(left, right);
  color.append(layout);

  setTimeout(() => {
    const fill = el('colorFill');
    const readout = el('colorReadout');
    const picker = el('rgbPicker');
    const hexInput = el('hexColorInput');

    function validHex(value) {
      return /^#?[0-9a-fA-F]{8}$/.test(value.trim());
    }

    function updateColorVisuals() {
      const hex = colorToHexRGBA(cat.Color).toUpperCase();
      const a255 = componentTo255(cat.Color.W);
      fill.style.background = rgbaCss(cat.Color);
      readout.textContent = `${hex} · RGBA(${componentTo255(cat.Color.X)}, ${componentTo255(cat.Color.Y)}, ${componentTo255(cat.Color.Z)}, ${a255})`;
      picker.value = colorToHex(cat.Color);
      hexInput.value = hex;
    }

    picker.oninput = e => {
      const rgb = hexToRgb01(e.target.value);
      cat.Color.X = rgb.X;
      cat.Color.Y = rgb.Y;
      cat.Color.Z = rgb.Z;
      updateColorVisuals();
      markDirty('RGB color changed');
    };
    picker.onchange = () => renderEditor();

    function setHexValidity(value) {
      const trimmed = value.trim();
      const valid = validHex(trimmed);
      hexInput.setCustomValidity(valid ? '' : 'Use #RRGGBBAA or RRGGBBAA.');
      hexInput.classList.toggle('invalid', Boolean(trimmed) && !valid);
      return valid;
    }

    function applyHexInput() {
      const value = hexInput.value.trim();
      if (!setHexValidity(value)) {
        hexInput.reportValidity();
        return false;
      }
      const rgba = hexToRgba01(value.startsWith('#') ? value : '#' + value);
      cat.Color.X = rgba.X;
      cat.Color.Y = rgba.Y;
      cat.Color.Z = rgba.Z;
      cat.Color.W = rgba.W;
      updateColorVisuals();
      markDirty('Hex RGBA color changed');
      return true;
    }

    hexInput.oninput = e => {
      setHexValidity(e.target.value);
    };
    hexInput.onblur = applyHexInput;
    hexInput.onchange = applyHexInput;
    hexInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyHexInput();
      }
    });

    updateColorVisuals();
    setHexValidity(hexInput.value);
  }, 0);

  return color;
}

function renderEditor() {
  const cats = getCategories();
  const root = el('editor');
  root.innerHTML = '';

  if (!cats.length) {
    selectedIndex = -1;
    root.innerHTML = `<div class="card"><h2>No category selected</h2><p class="hint">Import an existing AetherBags config, paste gzip+Base64, or add a new category from scratch. Referenced Item/UI Category IDs can be auto-matched to English names on import.</p></div>`;
    return;
  }
  if (selectedIndex < 0 || selectedIndex >= cats.length) selectedIndex = 0;

  const cat = cats[selectedIndex];
  ensureShape(cat);

  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = `
    <div class="row" style="justify-content: space-between;">
      <h2 style="margin:0;">${escapeHtml(cat.Name || '(unnamed)')}</h2>
      <div class="row">
        <button id="moveUp" class="small">Move up</button>
        <button id="moveDown" class="small">Move down</button>
        <button id="duplicateCat" class="small">Duplicate</button>
        <button id="deleteCat" class="small danger">Delete</button>
      </div>
    </div>
  `;
  root.appendChild(header);

  const basics = document.createElement('div');
  basics.className = 'card';
  basics.innerHTML = '<h3>Basics</h3>';
  const checks = document.createElement('div');
  checks.className = 'row';
  checks.append(
    checkbox('Enabled', cat.Enabled, v => { cat.Enabled = v; markDirty('Enabled changed'); }),
    checkbox('Pinned', cat.Pinned, v => { cat.Pinned = v; markDirty('Pinned changed'); })
  );

  const grid = document.createElement('div');
  grid.className = 'grid cols-2';
  grid.append(
    textInput('Name', cat.Name, v => { cat.Name = v; markDirty('Name changed'); }),
    textInput('Description', cat.Description, v => { cat.Description = v; markDirty('Description changed'); }),
    numberInput('Order', cat.Order, v => { cat.Order = v; markDirty('Order changed'); }),
    numberInput('Priority', cat.Priority, v => { cat.Priority = v; markDirty('Priority changed'); })
  );
  basics.append(checks, grid);
  root.appendChild(basics);

  root.appendChild(renderColorSection(cat));

  const rules = cat.Rules;
  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'grid cols-2';
  ruleGrid.append(
    listEditor('Allowed UI Category IDs', rules.AllowedUiCategoryIds, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('UI category IDs must be integers.');
      return Number(x);
    }, x => x, 'Game ItemUICategory row IDs accepted by this category.', 'ItemUICategory'),
    listEditor('Allowed Item IDs', rules.AllowedItemIds, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('Item IDs must be integers.');
      return Number(x);
    }, x => x, 'Specific Item row IDs accepted by this category.', 'Item'),
    listEditor('Allowed Item Name Patterns', rules.AllowedItemNamePatterns, x => x, x => x, 'Regex/name patterns matched against item names.'),
    renderAllowedRaritiesEditor(cat)
  );
  root.appendChild(ruleGrid);

  const regexTool = document.createElement('div');
  regexTool.className = 'card';
  regexTool.innerHTML = `
    <h3>Regex → Item IDs</h3>
    <p class="hint">Convert this category's item-name regex filters into explicit Item IDs by scanning XIVAPI's English Item names locally in your browser.</p>
    <div class="row">
      <button id="openRegexToItemIds">Open converter</button>
    </div>
  `;
  root.appendChild(regexTool);
  setTimeout(() => {
    const btn = el('openRegexToItemIds');
    if (btn) btn.onclick = openRegexToItemIdsTool;
  }, 0);

  const ranges = document.createElement('details');
  ranges.className = 'card';
  ranges.innerHTML = '<summary>Range Filters</summary><div class="details-body"></div>';
  const rangeGrid = document.createElement('div');
  rangeGrid.className = 'grid cols-3';
  for (const key of ['Level','ItemLevel','VendorPrice']) {
    const obj = rules[key];
    const box = document.createElement('div');
    box.className = 'nested-card';
    box.innerHTML = `<h3>${escapeHtml(key)}</h3>`;
    box.append(
      checkbox('Enabled', obj.Enabled, v => { obj.Enabled = v; markDirty(`${key} range changed`); }),
      numberInput('Min', obj.Min, v => { obj.Min = v; markDirty(`${key} range changed`); }),
      numberInput('Max', obj.Max, v => { obj.Max = v; markDirty(`${key} range changed`); })
    );
    rangeGrid.appendChild(box);
  }
  ranges.querySelector('.details-body').appendChild(rangeGrid);
  root.appendChild(ranges);

  const bools = document.createElement('details');
  bools.className = 'card';
  bools.innerHTML = '<summary>State Filters</summary><div class="details-body"></div>';
  const boolGrid = document.createElement('div');
  boolGrid.className = 'grid cols-3';

  function stateSelect(filterName, obj) {
    if (typeof obj.State !== 'number') obj.State = 0;
    if (typeof obj.Filter !== 'number') obj.Filter = 0;

    const box = document.createElement('div');
    box.className = 'nested-card';
    box.innerHTML = `
      <h3>${escapeHtml(filterName)}</h3>
      <label>State</label>
      <select>
        <option value="0">0 - Ignored</option>
        <option value="1">1 - Required</option>
        <option value="2">2 - Excluded</option>
      </select>
    `;

    const select = box.querySelector('select');
    select.value = String(obj.State ?? 0);
    select.onchange = e => {
      obj.State = Number(e.target.value);
      markDirty(`${filterName} state changed`);
      renderList();
    };

    return box;
  }

  for (const key of ['Untradable','Unique','Collectable','Dyeable','Repairable','HighQuality','Desynthesizable','Glamourable','FullySpiritbonded']) {
    boolGrid.appendChild(stateSelect(key, rules[key]));
  }

  bools.querySelector('.details-body').appendChild(boolGrid);
  root.appendChild(bools);

  const advanced = document.createElement('details');
  advanced.className = 'card';
  advanced.innerHTML = `
    <summary>Advanced: raw selected category JSON</summary>
    <div class="details-body">
      <p class="hint">Edit the selected category directly. Click “Apply raw category JSON” after changes.</p>
      <textarea class="raw" id="rawCategory">${escapeHtml(JSON.stringify(cat, null, 2))}</textarea>
      <div class="row" style="margin-top:8px;">
        <button id="applyRawCategory">Apply raw category JSON</button>
      </div>
    </div>
  `;
  root.appendChild(advanced);

  el('moveUp').disabled = selectedIndex <= 0;
  el('moveDown').disabled = selectedIndex >= cats.length - 1;

  el('moveUp').onclick = () => {
    if (selectedIndex <= 0) return;
    [cats[selectedIndex - 1], cats[selectedIndex]] = [cats[selectedIndex], cats[selectedIndex - 1]];
    selectedIndex--;
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty('Category moved');
    renderAll();
  };
  el('moveDown').onclick = () => {
    if (selectedIndex >= cats.length - 1) return;
    [cats[selectedIndex + 1], cats[selectedIndex]] = [cats[selectedIndex], cats[selectedIndex + 1]];
    selectedIndex++;
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty('Category moved');
    renderAll();
  };
  el('duplicateCat').onclick = () => {
    const copy = clone(cat);
    copy.Id = makeId();
    copy.Name = (copy.Name || 'Category') + ' Copy';
    copy.Order = Number(copy.Order || 0) + 1;
    copy.Priority = Number(copy.Priority || 0) + 1;
    cats.splice(selectedIndex + 1, 0, copy);
    selectedIndex++;
    markDirty('Category duplicated');
    renderAll();
  };
  el('deleteCat').onclick = () => {
    if (!confirm(`Delete "${cat.Name}"? This only affects the browser copy until you download/export.`)) return;
    cats.splice(selectedIndex, 1);
    selectedIndex = Math.min(selectedIndex, cats.length - 1);
    markDirty('Category deleted');
    renderAll();
  };
  el('applyRawCategory').onclick = () => {
    try {
      const parsed = JSON.parse(el('rawCategory').value);
      cats[selectedIndex] = parsed;
      ensureShape(cats[selectedIndex]);
      markDirty('Raw category JSON applied');
      renderAll();
    } catch (err) {
      setStatus('Invalid category JSON: ' + err.message, 'err');
    }
  };
}

function renderAll() {
  renderList();
  renderEditor();
  updateExportControls();
}

function downloadText(filename, text, type='application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  dirty = false;
  setSaveState('Saved');
  setStatus(`Downloaded ${filename}`, 'ok');
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function makeBase64Export() {
  const json = JSON.stringify(data);
  const gz = await gzipString(json);
  return bytesToBase64(gz);
}

async function gzipString(str) {
  if (!('CompressionStream' in window)) {
    throw new Error('This browser does not support CompressionStream, which is needed for gzip+Base64 export. Use a newer Firefox/Chromium.');
  }
  const stream = new Blob([str], {type: 'application/json'}).stream().pipeThrough(new CompressionStream('gzip'));
  const compressed = await new Response(stream).arrayBuffer();
  return new Uint8Array(compressed);
}

async function gunzipBytes(bytes) {
  if (!('DecompressionStream' in window)) {
    throw new Error('This browser does not support DecompressionStream. Try importing JSON instead.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const clean = b64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function openModal(title, contentNode) {
  el('modalTitle').textContent = title;
  const box = el('modalContent');
  box.innerHTML = '';
  box.appendChild(contentNode);
  el('modalBackdrop').classList.remove('hidden');
}

function closeModal() {
  el('modalBackdrop').classList.add('hidden');
}

function showLookupCacheModal() {
  const wrap = document.createElement('div');
  wrap.className = 'lookup-cache-modal';
  wrap.innerHTML = `
    <p class="hint">Only Item IDs, ItemUICategory IDs, and item search/scan queries are sent to XIVAPI. Your full imported category config is never uploaded.</p>
    <div class="cache-counts">
      <div><strong>Cached Item names:</strong> <span>${lookupCacheCount('Item').toLocaleString()}</span></div>
      <div><strong>Cached UI category names:</strong> <span>${lookupCacheCount('ItemUICategory').toLocaleString()}</span></div>
    </div>
    <div class="row" style="margin-top: 14px;">
      <button id="clearLookupCache" class="danger">Clear lookup cache</button>
    </div>
  `;
  wrap.querySelector('#clearLookupCache').onclick = () => {
    clearLookupCache();
    closeModal();
  };
  openModal('Lookup Cache', wrap);
}

function validateConfig(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Root must be a JSON object.');
  if (!Array.isArray(obj.Categories)) throw new Error('Root must contain a Categories array.');
  obj.Categories.forEach(ensureShape);
  return sortImportedCategories(obj);
}

el('search').oninput = renderList;
el('search').addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    e.currentTarget.value = '';
    renderList();
  }
});

el('addCategory').onclick = () => {
  getCategories().push(defaultCategory());
  selectedIndex = getCategories().length - 1;
  markDirty('Category added');
  renderAll();
};

el('sortByOrder').onclick = () => {
  getCategories().sort((a,b) => Number(a.Order || 0) - Number(b.Order || 0) || String(a.Name || '').localeCompare(String(b.Name || '')));
  selectedIndex = 0;
  markDirty('Sorted by Order');
  renderAll();
};

el('renumber').onclick = () => {
  renumberCategories();
  markDirty('Order/Priority renumbered');
  renderAll();
};

el('lookupReferencedIds').onclick = () => {
  lookupReferencedIds().catch(err => {
    setStatus('ID lookup failed: ' + err.message, 'err');
  });
};

el('showLookupCache').onclick = showLookupCacheModal;

el('uploadFile').onclick = () => {
  const input = el('fileInput');
  input.value = '';
  input.click();
};

el('showExportCopy').onclick = async () => {
  if (getCategories().length === 0) {
    updateExportControls();
    setStatus('Add or import at least one category before exporting.', 'warn');
    return;
  }
  showBusy('Generating export', 'Compressing JSON to gzip+Base64...', null);
  try {
    const b64 = await makeBase64Export();
    hideBusy();

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p class="hint">Current gzip+Base64 export. This was automatically copied to your clipboard if the browser allowed it.</p>
      <textarea id="exportText" class="raw" readonly>${escapeHtml(b64)}</textarea>
      <div class="row" style="margin-top:8px;">
        <button id="copyExportAgain" class="primary">Copy again</button>
      </div>
      <p class="hint" id="exportCopyStatus"></p>
    `;
    openModal('Export / Copy', wrap);

    const copied = await copyTextToClipboard(b64);
    dirty = false;
    setSaveState('Saved');
    document.getElementById('exportCopyStatus').textContent = copied
      ? 'Copied to clipboard.'
      : 'Automatic copy was blocked by the browser. Use “Copy again” or select the text manually.';

    document.getElementById('copyExportAgain').onclick = async () => {
      const ok = await copyTextToClipboard(document.getElementById('exportText').value);
      document.getElementById('exportCopyStatus').textContent = ok
        ? 'Copied to clipboard.'
        : 'Copy failed. Select the text manually.';
    };
  } catch (err) {
    hideBusy(true);
    setStatus(err.message, 'err');
    alert('Export failed: ' + err.message);
  }
};

el('downloadBase64').onclick = async () => {
  if (getCategories().length === 0) {
    updateExportControls();
    setStatus('Add or import at least one category before downloading.', 'warn');
    return;
  }
  showBusy('Generating download', 'Compressing JSON to gzip+Base64...', null);
  try {
    const b64 = await makeBase64Export();
    downloadText('aetherbags_categories.txt', b64, 'text/plain');
  } catch (err) {
    setStatus(err.message, 'err');
    alert('Download failed: ' + err.message);
  } finally {
    hideBusy();
  }
};

el('fileInput').onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    let parsed;
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      parsed = JSON.parse(trimmed);
    } else {
      const bytes = base64ToBytes(trimmed);
      const decoded = await gunzipBytes(bytes);
      parsed = JSON.parse(decoded);
    }
    data = validateConfig(parsed);
    selectedIndex = getCategories().length ? 0 : -1;
    dirty = false;
    setSaveState('Saved');
    setStatus(`Loaded ${file.name}`, 'ok');
    renderAll();
    maybeAutoLookupImportedIds();
  } catch (err) {
    setStatus('Could not load file: ' + err.message, 'err');
    alert('Could not load file: ' + err.message);
  }
};

el('showImport').onclick = () => {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <p class="hint">Paste either formatted JSON or the gzip+Base64 blob. Then click Import.</p>
    <textarea id="importText" class="raw" placeholder="Paste JSON or gzip+Base64 here"></textarea>
    <div class="row" style="margin-top:8px;">
      <button id="importNow" class="primary">Import</button>
    </div>
  `;
  openModal('Import / Paste', wrap);
  document.getElementById('importNow').onclick = async () => {
    try {
      const text = document.getElementById('importText').value.trim();
      let parsed;
      if (text.startsWith('{') || text.startsWith('[')) {
        parsed = JSON.parse(text);
      } else {
        const decoded = await gunzipBytes(base64ToBytes(text));
        parsed = JSON.parse(decoded);
      }
      data = validateConfig(parsed);
      selectedIndex = getCategories().length ? 0 : -1;
      dirty = false;
      setSaveState('Saved');
      closeModal();
      setStatus('Imported data', 'ok');
      renderAll();
      maybeAutoLookupImportedIds();
    } catch (err) {
      setStatus('Import failed: ' + err.message, 'err');
      alert('Import failed: ' + err.message);
    }
  };
};

el('showRaw').onclick = () => {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <p class="hint">This is the full JSON config. Edit carefully; invalid JSON cannot be applied.</p>
    <textarea id="rawFull" class="raw">${escapeHtml(JSON.stringify(data, null, 2))}</textarea>
    <div class="row" style="margin-top:8px;">
      <button id="applyRawFull" class="primary">Apply full JSON</button>
      <button id="copyRawFull">Copy</button>
    </div>
    <p class="hint" id="rawCopyStatus"></p>
  `;
  openModal('Raw JSON', wrap);
  document.getElementById('applyRawFull').onclick = () => {
    try {
      data = validateConfig(JSON.parse(document.getElementById('rawFull').value));
      selectedIndex = getCategories().length ? 0 : -1;
      closeModal();
      markDirty('Full raw JSON applied');
      renderAll();
      maybeAutoLookupImportedIds();
    } catch (err) {
      setStatus('Invalid full JSON: ' + err.message, 'err');
    }
  };
  document.getElementById('copyRawFull').onclick = async () => {
    const ok = await copyTextToClipboard(document.getElementById('rawFull').value);
    document.getElementById('rawCopyStatus').textContent = ok
      ? 'Copied to clipboard.'
      : 'Copy failed. Select the text manually.';
    setStatus(ok ? 'Copied full JSON' : 'Copy failed. Select the text manually.', ok ? 'ok' : 'warn');
  };
};

el('closeModal').onclick = closeModal;
el('modalBackdrop').onclick = e => {
  if (e.target === el('modalBackdrop')) closeModal();
};

window.addEventListener('beforeunload', e => {
  if (!dirty) return;
  e.preventDefault();
  e.returnValue = '';
});

renderAll();
