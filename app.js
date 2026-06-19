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

function renumberCategories() {
  getCategories().forEach((cat, i) => {
    cat.Order = i + 1;
    cat.Priority = i + 1;
  });
}

function filteredCategoryEntries() {
  const cats = getCategories();
  const q = el('search').value.trim().toLowerCase();
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
  entries.forEach(({cat, idx}) => {
    const item = document.createElement('div');
    item.className = 'cat-item' + (idx === selectedIndex ? ' active' : '');
    item.draggable = true;
    item.dataset.index = String(idx);

    item.onclick = () => {
      selectedIndex = idx;
      renderAll();
    };

    item.ondragstart = ev => {
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
      ev.preventDefault();
      if (draggedIndex === null || draggedIndex === idx) return;
      clearDropClasses();
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      item.classList.add(before ? 'drop-before' : 'drop-after');
    };
    item.ondrop = ev => {
      ev.preventDefault();
      const from = draggedIndex ?? Number(ev.dataTransfer.getData('text/plain'));
      const to = idx;
      if (Number.isNaN(from) || from === to) return;
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      moveCategory(from, to, before);
    };

    item.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">☰</div>
      <div class="cat-text">
        <div class="cat-name" title="${escapeHtml(cat.Name || '(unnamed)')}" style="color:${rgbaCss(cat.Color)}">${escapeHtml(cat.Name || '(unnamed)')}</div>
        <div class="cat-desc" title="${escapeHtml(cat.Description || cat.Id || '')}">#${escapeHtml(cat.Order ?? '')} · ${escapeHtml(cat.Description || cat.Id || '')}</div>
      </div>
      <div class="badges">
        <span class="badge ${cat.Enabled ? 'on' : ''}">${cat.Enabled ? 'on' : 'off'}</span>
        ${cat.Pinned ? '<span class="badge pin">pin</span>' : ''}
      </div>
    `;
    list.appendChild(item);
  });

  el('listStatus').textContent = `${entries.length} shown · drag categories to reorder`;
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

  const url = `${XIVAPI_BASE}/sheet/${encodeURIComponent(sheet)}/${encodeURIComponent(idText)}?fields=Name&language=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${sheet} ${id} lookup failed: HTTP ${res.status}`);
  const json = await res.json();
  const name = json?.fields?.Name || json?.fields?.Name_en || json?.Name || '(name unavailable)';
  cache[idText] = name;
  saveLookupCache();
  return name;
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

  let done = 0;
  const failures = [];

  try {
    setStatus(`Looking up ${uncached} uncached referenced ID name(s)...`);
    showBusy(quiet ? 'Auto-looking up imported IDs' : 'Looking up referenced IDs', `${uncached} uncached ID name(s)`, 0);

    const work = [
      ['ItemUICategory', [...ids.ItemUICategory]],
      ['Item', [...ids.Item]]
    ];

    for (const [sheet, sheetIds] of work) {
      for (const id of sheetIds) {
        if (lookupName(sheet, id)) continue;
        try {
          await fetchLookup(sheet, id);
        } catch (err) {
          failures.push(`${sheet} ${id}`);
        }
        done++;
        const percent = uncached ? (done / uncached) * 100 : 100;
        setStatus(`ID lookup ${done}/${uncached} complete...`);
        updateBusy(`${done}/${uncached} complete · ${sheet} #${id}`, percent);
      }
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

async function fetchItemRowsPage(after, signal) {
  const params = new URLSearchParams({
    fields: 'Name',
    limit: '1000',
    language: 'en'
  });
  if (after !== null && after !== undefined) params.set('after', String(after));
  const res = await fetch(`${XIVAPI_BASE}/sheet/Item?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Item sheet fetch failed: HTTP ${res.status}`);
  const json = await res.json();
  return json.rows || [];
}

function itemNameFromRow(row) {
  return row?.fields?.Name || row?.Name || '';
}

function selectedCategory() {
  const cats = getCategories();
  if (selectedIndex < 0 || selectedIndex >= cats.length) return null;
  ensureShape(cats[selectedIndex]);
  return cats[selectedIndex];
}

async function scanItemIdsByRegex(pattern, options = {}) {
  const { caseInsensitive = true, maxMatches = 1000, signal, onProgress } = options;
  const flags = caseInsensitive ? 'i' : '';
  const rx = new RegExp(pattern, flags);
  const matches = [];
  let after = null;
  let scanned = 0;
  let pages = 0;
  let stoppedByLimit = false;

  while (true) {
    if (signal?.aborted) throw new DOMException('Canceled', 'AbortError');
    const rows = await fetchItemRowsPage(after, signal);
    if (!rows.length) break;
    pages++;

    for (const row of rows) {
      const id = row.row_id;
      const name = itemNameFromRow(row);
      after = id;
      scanned++;
      if (!name) continue;
      rx.lastIndex = 0;
      if (rx.test(name)) {
        matches.push({ id, name });
        const cache = lookupCache.Item || (lookupCache.Item = {});
        cache[String(id)] = name;
        if (maxMatches > 0 && matches.length >= maxMatches) {
          stoppedByLimit = true;
          saveLookupCache();
          onProgress?.({ scanned, pages, matches: matches.length, stoppedByLimit });
          return { matches, scanned, pages, stoppedByLimit };
        }
      }
    }

    saveLookupCache();
    onProgress?.({ scanned, pages, matches: matches.length, stoppedByLimit });
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  saveLookupCache();
  return { matches, scanned, pages, stoppedByLimit };
}

function renderRegexResults(box, matches) {
  box.innerHTML = '';
  if (!matches.length) {
    box.innerHTML = '<span class="hint">No matches yet.</span>';
    return;
  }
  for (const match of matches.slice(0, 500)) {
    const row = document.createElement('div');
    row.className = 'regex-result-row';
    row.innerHTML = `<span class="regex-id">#${escapeHtml(match.id)}</span><span>${escapeHtml(match.name)}</span>`;
    box.appendChild(row);
  }
  if (matches.length > 500) {
    const more = document.createElement('div');
    more.className = 'hint';
    more.textContent = `Showing first 500 of ${matches.length} matches. The IDs still get added if you choose Add.`;
    box.appendChild(more);
  }
}

function openRegexToItemIdsTool() {
  const cat = selectedCategory();
  if (!cat) {
    setStatus('Select a category first.', 'warn');
    return;
  }
  const patterns = cat.Rules.AllowedItemNamePatterns || [];
  let lastMatches = [];
  let aborter = null;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <p class="hint">This scans XIVAPI's Item sheet, tests English item names with JavaScript regex, then lets you add the matched Item IDs to this category. If the original filter uses .NET-only regex features, JavaScript may complain, because naturally regex has dialects like a cursed language family.</p>
    <div class="grid cols-2">
      <div>
        <label>Use an existing regex from this category</label>
        <select id="regexPatternSelect"></select>
      </div>
      <div>
        <label>Max matches to collect</label>
        <input id="regexMaxMatches" type="number" min="0" step="1" value="1000">
      </div>
    </div>
    <div style="margin-top:10px;">
      <label>Regex pattern</label>
      <input id="regexPatternInput" placeholder="Example: ^Grade (XI|XII) .*Materia$">
    </div>
    <div class="row" style="margin-top:10px;">
      <label class="check"><input id="regexCaseInsensitive" type="checkbox" checked> Case-insensitive</label>
      <span class="hint">Set max matches to 0 for unlimited.</span>
    </div>
    <div class="row" style="margin-top:12px;">
      <button id="regexStart" class="primary">Scan Items</button>
      <button id="regexCancel" disabled>Cancel</button>
      <button id="regexAddIds" disabled>Add matched IDs</button>
      <button id="regexAddAndRemove" disabled>Add IDs + remove this regex</button>
    </div>
    <p class="status" id="regexStatus" style="margin-top:10px;">Ready.</p>
    <div class="regex-results" id="regexResults"><span class="hint">No scan results yet.</span></div>
  `;

  openModal('Convert Regex Filter → Item IDs', wrap);

  const select = document.getElementById('regexPatternSelect');
  const patternInput = document.getElementById('regexPatternInput');
  const status = document.getElementById('regexStatus');
  const resultsBox = document.getElementById('regexResults');
  const startBtn = document.getElementById('regexStart');
  const cancelBtn = document.getElementById('regexCancel');
  const addBtn = document.getElementById('regexAddIds');
  const addRemoveBtn = document.getElementById('regexAddAndRemove');

  select.innerHTML = '';
  if (patterns.length) {
    patterns.forEach((pattern, i) => {
      const opt = document.createElement('option');
      opt.value = pattern;
      opt.textContent = `${i + 1}. ${pattern}`;
      select.appendChild(opt);
    });
  }
  const custom = document.createElement('option');
  custom.value = '__custom__';
  custom.textContent = 'Custom pattern...';
  select.appendChild(custom);
  patternInput.value = patterns[0] || '';
  select.onchange = () => {
    if (select.value !== '__custom__') patternInput.value = select.value;
  };

  function setRegexButtons(scanning) {
    startBtn.disabled = scanning;
    cancelBtn.disabled = !scanning;
    addBtn.disabled = scanning || !lastMatches.length;
    addRemoveBtn.disabled = scanning || !lastMatches.length;
  }

  startBtn.onclick = async () => {
    const pattern = patternInput.value.trim();
    if (!pattern) {
      status.textContent = 'Enter or choose a regex first.';
      status.className = 'status warn';
      return;
    }

    const maxRaw = Number(document.getElementById('regexMaxMatches').value);
    const maxMatches = Number.isFinite(maxRaw) ? Math.max(0, Math.floor(maxRaw)) : 1000;
    const caseInsensitive = document.getElementById('regexCaseInsensitive').checked;
    lastMatches = [];
    renderRegexResults(resultsBox, lastMatches);
    addBtn.disabled = true;
    addRemoveBtn.disabled = true;
    aborter = new AbortController();
    setRegexButtons(true);
    showBusy('Scanning Item names', 'Starting XIVAPI Item sheet scan...', null);

    try {
      // Compile once early so regex errors appear before we touch the network.
      new RegExp(pattern, caseInsensitive ? 'i' : '');
      const result = await scanItemIdsByRegex(pattern, {
        caseInsensitive,
        maxMatches,
        signal: aborter.signal,
        onProgress: p => {
          status.textContent = `Scanned ${p.scanned.toLocaleString()} items across ${p.pages} page(s); found ${p.matches.toLocaleString()} match(es).`;
          status.className = 'status';
          updateBusy(`Scanned ${p.scanned.toLocaleString()} items · ${p.matches.toLocaleString()} matches`, null);
        }
      });
      lastMatches = result.matches;
      renderRegexResults(resultsBox, lastMatches);
      const stopped = result.stoppedByLimit ? ' Stopped at max match limit.' : '';
      status.textContent = `Done. Scanned ${result.scanned.toLocaleString()} items; found ${lastMatches.length.toLocaleString()} match(es).${stopped}`;
      status.className = result.stoppedByLimit ? 'status warn' : 'status ok';
      updateBusy(`Done · ${lastMatches.length.toLocaleString()} matches`, 100);
      setStatus(`Regex scan complete: ${lastMatches.length.toLocaleString()} item ID(s) matched.`, 'ok');
    } catch (err) {
      if (err.name === 'AbortError') {
        status.textContent = 'Scan canceled.';
        status.className = 'status warn';
        setStatus('Regex scan canceled.', 'warn');
      } else {
        status.textContent = err.message;
        status.className = 'status err';
        setStatus('Regex scan failed: ' + err.message, 'err');
      }
    } finally {
      hideBusy();
      aborter = null;
      setRegexButtons(false);
    }
  };

  cancelBtn.onclick = () => {
    if (aborter) aborter.abort();
  };

  function addMatches(removePattern) {
    const ids = cat.Rules.AllowedItemIds || (cat.Rules.AllowedItemIds = []);
    const before = ids.length;
    const existing = new Set(ids.map(Number));
    for (const match of lastMatches) {
      if (!existing.has(Number(match.id))) {
        ids.push(Number(match.id));
        existing.add(Number(match.id));
      }
    }
    const added = ids.length - before;
    if (removePattern) {
      const current = patternInput.value.trim();
      cat.Rules.AllowedItemNamePatterns = (cat.Rules.AllowedItemNamePatterns || []).filter(p => p !== current);
    }
    markDirty(removePattern ? 'Matched item IDs added and regex removed' : 'Matched item IDs added');
    renderAll();
    closeModal();
    setStatus(`Added ${added.toLocaleString()} new Item ID(s) from regex match.`, 'ok');
  }

  addBtn.onclick = () => addMatches(false);
  addRemoveBtn.onclick = () => addMatches(true);
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
        setStatus(`Looking up ${arr.length} ${sheetLabel(lookupSheet)} ID(s)...`);
        showBusy(`Looking up ${sheetLabel(lookupSheet)} names`, `${arr.length} ID(s) queued`, 0);
        let count = 0;
        for (const id of arr) {
          if (!lookupName(lookupSheet, id)) {
            await fetchLookup(lookupSheet, id);
          }
          count++;
          const percent = arr.length ? (count / arr.length) * 100 : 100;
          setStatus(`Looked up ${count}/${arr.length} ${sheetLabel(lookupSheet)} ID(s)...`);
          updateBusy(`${count}/${arr.length} checked · #${id}`, percent);
        }
        setStatus(`${sheetLabel(lookupSheet)} lookup complete`, 'ok');
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

    };

    picker.oninput = e => {
      const rgb = hexToRgb01(e.target.value);
      cat.Color.X = rgb.X;
      cat.Color.Y = rgb.Y;
      cat.Color.Z = rgb.Z;
      updateColorVisuals();
      markDirty('RGB color changed');
    };
    picker.onchange = () => renderEditor();

    hexInput.oninput = e => {
      const value = e.target.value.trim();
      if (!validHex(value)) {
        setStatus('Hex color must be #RRGGBBAA', 'warn');
        return;
      }
      const rgba = hexToRgba01(value.startsWith('#') ? value : '#' + value);
      cat.Color.X = rgba.X;
      cat.Color.Y = rgba.Y;
      cat.Color.Z = rgba.Z;
      cat.Color.W = rgba.W;
      updateColorVisuals();
      markDirty('Hex RGBA color changed');
    };
    updateColorVisuals();
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
    listEditor('Allowed Rarities', rules.AllowedRarities, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('Rarities must be integers.');
      return Number(x);
    }, x => x, 'Rarity IDs, if used.')
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

function validateConfig(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Root must be a JSON object.');
  if (!Array.isArray(obj.Categories)) throw new Error('Root must contain a Categories array.');
  obj.Categories.forEach(ensureShape);
  return obj;
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

el('uploadFile').onclick = () => {
  const input = el('fileInput');
  input.value = '';
  input.click();
};

el('showExportCopy').onclick = async () => {
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
    await navigator.clipboard.writeText(document.getElementById('rawFull').value);
    setStatus('Copied full JSON', 'ok');
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
