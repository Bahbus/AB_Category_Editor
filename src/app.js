import { INITIAL_DATA, LOOKUP_BATCH_SIZE } from './constants.js';
import { el, escapeHtml, setSaveState, setStatus, showBusy, updateBusy, hideBusy } from './dom.js';
import { loadLookupCache, persistLookupCache, removeLookupCache, emptyLookupCache } from './state.js';
import { defaultCategory as makeDefaultCategory, ensureShape, validateConfig } from './config.js';
import { openModal, closeModal } from './modals.js';
import { renderCategoryList } from './ui/categoryList.js';
import { renderEditor as renderCategoryEditor } from './ui/categoryEditor.js';
import { showHelpModal } from './ui/helpModal.js';
import { showLookupCacheModal } from './ui/lookupCacheModal.js';
import { openRegexToItemIdsTool as openRegexTool } from './tools/regexToItemIds.js';
import { EXPORT_FILENAME, copyTextToClipboard, downloadText, makeBase64Export, parseImportedText } from './importExport.js';
import { sheetLabel, collectReferencedIds, countReferencedIds, countUncachedReferencedIds, fetchLookupBatch as xivapiFetchLookupBatch, searchXivapi } from './xivapi.js';

let data = JSON.parse(JSON.stringify(INITIAL_DATA));
let selectedIndex = -1;
let dirty = false;
let draggedIndex = null;
let lookupCache = loadLookupCache();

function saveLookupCache() { persistLookupCache(lookupCache); }
function lookupCacheCount(sheet) { return Object.keys(lookupCache[sheet] || {}).length; }
function lookupName(sheet, id) { const cache = lookupCache[sheet] || (lookupCache[sheet] = {}); return cache[String(id)] || null; }
function fetchLookupBatch(sheet, ids, options = {}) { return xivapiFetchLookupBatch(sheet, ids, { ...options, lookupCache, saveLookupCache }); }
function clearLookupCache() { lookupCache = emptyLookupCache(); removeLookupCache(); renderAll(); setStatus('Lookup cache cleared. Category data was not changed.', 'ok'); }
function getCategories() { if (!data.Categories) data.Categories = []; return data.Categories; }
function defaultCategory() { const maxOrder = getCategories().reduce((m, c) => Math.max(m, Number(c.Order || 0)), 0); return makeDefaultCategory(maxOrder); }
function renumberCategories() { getCategories().forEach((cat, i) => { cat.Order = i + 1; cat.Priority = i + 1; }); }
function markDirty() { dirty = true; setSaveState('Unsaved changes', 'warn'); renderList(); }
function markSaved(label='Saved') { dirty = false; setSaveState(label); }
function applyValidatedConfig(validation) { data = validation.config; return validation.summary; }
function openRegexToItemIdsTool() { openRegexTool({ getCategories, getSelectedIndex: () => selectedIndex, ensureShape, lookupCache, saveLookupCache, markDirty, renderAll }); }

function updateExportControls() {
  const disabled = getCategories().length === 0;
  for (const id of ['showExportCopy', 'downloadBase64']) {
    const button = el(id);
    if (!button) continue;
    button.disabled = disabled;
    button.title = disabled ? 'Add or import at least one category before exporting.' : '';
  }
}

function renderList() {
  renderCategoryList({
    data, getCategories, ensureShape,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    getDraggedIndex: () => draggedIndex,
    setDraggedIndex: value => { draggedIndex = value; },
    renumberCategories, markDirty, renderAll
  });
}

function renderEditor() {
  renderCategoryEditor({
    getCategories,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    ensureShape, markDirty, renderAll, renderList, renumberCategories, openRegexToItemIdsTool,
    listEditorDeps: { lookupName, fetchLookupBatch, searchXivapi, lookupCache, saveLookupCache, markDirty }
  });
}

function renderAll() { renderList(); renderEditor(); updateExportControls(); }

async function lookupReferencedIds(options = {}) {
  const { quiet = false } = options;
  const ids = collectReferencedIds(getCategories(), ensureShape);
  const total = countReferencedIds(ids);
  const uncached = countUncachedReferencedIds(ids, lookupName);
  if (!total) { if (!quiet) setStatus('No referenced Item/UI Category IDs to look up.', 'warn'); return; }
  if (!uncached) { if (!quiet) setStatus(`All ${total} referenced ID name(s) already cached.`, 'ok'); renderAll(); return; }
  const lookupButton = el('lookupReferencedIds');
  if (lookupButton) lookupButton.disabled = true;
  const failures = [];
  try {
    showBusy('Looking up IDs', `0/${uncached} complete`, 0);
    for (const [sheet, sheetIds] of [['ItemUICategory', [...ids.ItemUICategory]], ['Item', [...ids.Item]]]) {
      const missing = sheetIds.filter(id => !lookupName(sheet, id));
      if (!missing.length) continue;
      const priorCached = uncached - countUncachedReferencedIds(ids, lookupName);
      const batchFailures = await fetchLookupBatch(sheet, missing, { onProgress(doneForSheet, totalForSheet) { const done = Math.min(uncached, priorCached + doneForSheet); const percent = uncached ? (done / uncached) * 100 : 100; updateBusy(`${done}/${uncached} checked · ${sheetLabel(sheet)} batch ${Math.ceil(doneForSheet / LOOKUP_BATCH_SIZE)}/${Math.ceil(totalForSheet / LOOKUP_BATCH_SIZE)}`, percent); } });
      failures.push(...batchFailures.map(failure => `${failure.sheet} ${failure.id}`));
    }
    saveLookupCache(); renderAll();
    if (failures.length) { const shown = failures.slice(0, 5).join(', '); const more = failures.length > 5 ? `, +${failures.length - 5} more` : ''; setStatus(`Lookup finished with ${failures.length} failure(s): ${shown}${more}`, 'warn'); }
    else setStatus(`Lookup complete: ${uncached} new name(s) cached.`, 'ok');
  } finally { hideBusy(); if (lookupButton) lookupButton.disabled = false; }
}

function maybeAutoLookupImportedIds() {
  const auto = el('autoLookupImport');
  if (!auto || !auto.checked) return;
  lookupReferencedIds({ quiet: true }).catch(err => { hideBusy(true); setStatus('Automatic ID lookup failed: ' + err.message, 'warn'); });
}

async function importText(text, sourceLabel='Import') {
  const parsed = await parseImportedText(text);
  const importSummary = applyValidatedConfig(validateConfig(parsed));
  selectedIndex = getCategories().length ? 0 : -1;
  markSaved();
  setStatus(sourceLabel ? `${sourceLabel}: ${importSummary}` : importSummary, 'ok');
  renderAll();
  maybeAutoLookupImportedIds();
}

el('search').oninput = renderList;
el('search').addEventListener('keydown', e => { if (e.key === 'Escape') { e.currentTarget.value = ''; renderList(); } });
el('addCategory').onclick = () => { getCategories().push(defaultCategory()); selectedIndex = getCategories().length - 1; markDirty('Category added'); renderAll(); };
el('sortByOrder').onclick = () => { getCategories().sort((a,b) => Number(a.Order || 0) - Number(b.Order || 0) || String(a.Name || '').localeCompare(String(b.Name || ''))); selectedIndex = 0; markDirty('Sorted by Order'); renderAll(); };
el('renumber').onclick = () => { renumberCategories(); markDirty('Order/Priority renumbered'); renderAll(); };
el('lookupReferencedIds').onclick = () => lookupReferencedIds().catch(err => setStatus('ID lookup failed: ' + err.message, 'err'));
el('showLookupCache').onclick = () => showLookupCacheModal({ lookupCacheCount, clearLookupCache });
el('showHelp').onclick = showHelpModal;
el('uploadFile').onclick = () => { const input = el('fileInput'); input.value = ''; input.click(); };

el('showExportCopy').onclick = async () => {
  if (getCategories().length === 0) { updateExportControls(); setStatus('Add or import at least one category before exporting.', 'warn'); return; }
  showBusy('Generating export', 'Compressing JSON to gzip+Base64...', null);
  try {
    const b64 = await makeBase64Export(data); hideBusy();
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p class="hint">Current gzip+Base64 export. This was automatically copied to your clipboard if the browser allowed it.</p><textarea id="exportText" class="raw" readonly>${escapeHtml(b64)}</textarea><div class="row" style="margin-top:8px;"><button id="copyExportAgain" class="primary">Copy again</button></div><p class="hint" id="exportCopyStatus"></p>`;
    openModal('Export / Copy', wrap);
    const copied = await copyTextToClipboard(b64); markSaved();
    document.getElementById('exportCopyStatus').textContent = copied ? 'Copied to clipboard.' : 'Automatic copy was blocked by the browser. Use “Copy again” or select the text manually.';
    document.getElementById('copyExportAgain').onclick = async () => { const ok = await copyTextToClipboard(document.getElementById('exportText').value); document.getElementById('exportCopyStatus').textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text manually.'; };
  } catch (err) { hideBusy(true); setStatus(err.message, 'err'); alert('Export failed: ' + err.message); }
};

el('downloadBase64').onclick = async () => {
  if (getCategories().length === 0) { updateExportControls(); setStatus('Add or import at least one category before downloading.', 'warn'); return; }
  showBusy('Generating download', 'Compressing JSON to gzip+Base64...', null);
  try { downloadText(EXPORT_FILENAME, await makeBase64Export(data), 'text/plain', { onDownloaded(filename) { markSaved(); setStatus(`Downloaded ${filename}`, 'ok'); } }); }
  catch (err) { setStatus(err.message, 'err'); alert('Download failed: ' + err.message); }
  finally { hideBusy(); }
};

el('fileInput').onchange = async e => { const file = e.target.files[0]; if (!file) return; try { await importText(await file.text(), file.name); } catch (err) { setStatus('Could not load file: ' + err.message, 'err'); alert('Could not load file: ' + err.message); } };

el('showImport').onclick = () => {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">Paste either formatted JSON or the gzip+Base64 blob. Then click Import.</p><textarea id="importText" class="raw" placeholder="Paste JSON or gzip+Base64 here"></textarea><div class="row" style="margin-top:8px;"><button id="importNow" class="primary">Import</button></div>`;
  openModal('Import / Paste', wrap);
  document.getElementById('importNow').onclick = async () => { try { await importText(document.getElementById('importText').value.trim(), ''); closeModal(); } catch (err) { setStatus('Import failed: ' + err.message, 'err'); alert('Import failed: ' + err.message); } };
};

el('showRaw').onclick = () => {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">This is the full JSON config. Edit carefully; invalid JSON cannot be applied.</p><textarea id="rawFull" class="raw">${escapeHtml(JSON.stringify(data, null, 2))}</textarea><div class="row" style="margin-top:8px;"><button id="applyRawFull" class="primary">Apply full JSON</button><button id="copyRawFull">Copy</button></div><p class="hint" id="rawCopyStatus"></p>`;
  openModal('Raw JSON', wrap);
  document.getElementById('applyRawFull').onclick = () => { try { applyValidatedConfig(validateConfig(JSON.parse(document.getElementById('rawFull').value))); selectedIndex = getCategories().length ? 0 : -1; closeModal(); markDirty('Full raw JSON applied'); renderAll(); maybeAutoLookupImportedIds(); } catch (err) { setStatus('Invalid full JSON: ' + err.message, 'err'); } };
  document.getElementById('copyRawFull').onclick = async () => { const ok = await copyTextToClipboard(document.getElementById('rawFull').value); document.getElementById('rawCopyStatus').textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text manually.'; setStatus(ok ? 'Copied full JSON' : 'Copy failed. Select the text manually.', ok ? 'ok' : 'warn'); };
};

el('closeModal').onclick = closeModal;
el('modalBackdrop').onclick = e => { if (e.target === el('modalBackdrop')) closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !el('modalBackdrop').classList.contains('hidden')) closeModal(); });
window.addEventListener('beforeunload', e => { if (!dirty) return; e.preventDefault(); e.returnValue = ''; });
renderAll();
