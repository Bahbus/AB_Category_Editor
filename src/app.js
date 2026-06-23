import { INITIAL_DATA, LOOKUP_BATCH_SIZE } from './constants.js';
import { el, escapeHtml, setSaveState, setStatus, showBusy, updateBusy, hideBusy } from './dom.js';
import { loadLookupCache, persistLookupCache, removeLookupCache, emptyLookupCache, loadEditorPreferences, persistEditorPreferences } from './state.js';
import { defaultCategory as makeDefaultCategory, ensureShape, validateConfig, compareCategoriesForImport } from './config.js';
import { openModal, closeModal, trapModalFocus } from './modals.js';
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
let editorPreferences = loadEditorPreferences();

function applyEditorPreferences(preferences = editorPreferences) {
  editorPreferences = persistEditorPreferences(preferences);
  const root = document.documentElement;
  root.dataset.theme = editorPreferences.theme;
  root.dataset.density = editorPreferences.density;
  root.dataset.checkboxStyle = editorPreferences.checkboxStyle;
}

function preferenceSelect(id, label, value, options) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <label for="${id}">${label}</label>
    <select id="${id}">
      ${options.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
    </select>
    <p class="hint">${options.find(option => option.value === value)?.hint || ''}</p>
  `;
  wrap.querySelector('select').value = value;
  return wrap;
}

function showAppearanceModal() {
  commitActiveField();
  const themeOptions = [
    { value: 'system', label: 'System', hint: 'Follow your OS/browser color preference.' },
    { value: 'dark', label: 'Dark', hint: 'Neutral dark panels with a calm blue accent.' },
    { value: 'light', label: 'Light', hint: 'Simple light panels with readable dark text.' },
    { value: 'high-contrast', label: 'High Contrast', hint: 'Stronger contrast for improved readability.' },
    { value: 'aetherial', label: 'Aetherial', hint: 'Cool luminous blues, cyan, and violet.' },
    { value: 'dalamud', label: 'Dalamud', hint: 'Restrained plugin-panel charcoal, purple, and warm red tones.' }
  ];
  const densityOptions = [
    { value: 'comfortable', label: 'Comfortable', hint: 'Current spacing and relaxed layout.' },
    { value: 'compact', label: 'Compact', hint: 'Tighter cards, groups, and controls while keeping hit targets usable.' }
  ];
  const checkboxOptions = [
    { value: 'standard', label: 'Standard', hint: 'Clean native checkboxes.' },
    { value: 'large', label: 'Large', hint: 'Larger native checkboxes and clearer hit targets.' },
    { value: 'pills', label: 'Pills', hint: 'Chip-style rarity choices with real checkbox inputs.' }
  ];

  const wrap = document.createElement('div');
  wrap.className = 'preferences-modal';
  wrap.innerHTML = `
    <p class="hint">These appearance preferences are stored locally in this browser only. They affect the editor UI and are never included in exported AetherBags category data.</p>
    <div class="grid cols-3" id="appearancePreferenceGrid"></div>
  `;
  const grid = wrap.querySelector('#appearancePreferenceGrid');
  grid.append(
    preferenceSelect('themePreference', 'Theme', editorPreferences.theme, themeOptions),
    preferenceSelect('densityPreference', 'Density', editorPreferences.density, densityOptions),
    preferenceSelect('checkboxStylePreference', 'Checkbox style', editorPreferences.checkboxStyle, checkboxOptions)
  );
  openModal('Appearance Preferences', wrap);
  const bind = (id, key) => {
    const select = document.getElementById(id);
    select.onchange = e => {
      applyEditorPreferences({ ...editorPreferences, [key]: e.target.value });
      setStatus('Appearance preferences saved locally.', 'ok');
    };
  };
  bind('themePreference', 'theme');
  bind('densityPreference', 'density');
  bind('checkboxStylePreference', 'checkboxStyle');
}

function saveLookupCache() { persistLookupCache(lookupCache); }
function lookupCacheCount(sheet) { return Object.keys(lookupCache[sheet] || {}).length; }
function lookupName(sheet, id) { const cache = lookupCache[sheet] || (lookupCache[sheet] = {}); return cache[String(id)] || null; }
function fetchLookupBatch(sheet, ids, options = {}) { return xivapiFetchLookupBatch(sheet, ids, { ...options, lookupCache, saveLookupCache }); }
function clearLookupCache() { lookupCache = emptyLookupCache(); removeLookupCache(); renderAll(); setStatus('Lookup cache cleared. Category data was not changed.', 'ok'); }
function getCategories() { if (!data.Categories) data.Categories = []; return data.Categories; }
function defaultCategory() { const maxOrder = getCategories().reduce((m, c) => Math.max(m, Number(c.Order || 0)), 0); return makeDefaultCategory(maxOrder); }
function renumberCategories() { getCategories().forEach((cat, i) => { cat.Order = i + 1; cat.Priority = i + 1; }); }
function markDirty() { dirty = true; setSaveState('Changes not exported', 'warn'); renderList(); }
function markSaved(label='Exported') { dirty = false; setSaveState(label); }
function applyValidatedConfig(validation) { data = validation.config; return validation.summary; }
function openRegexToItemIdsTool() { commitActiveField(); openRegexTool({ getCategories, getSelectedIndex: () => selectedIndex, ensureShape, lookupCache, saveLookupCache, markDirty, renderAll }); }

function commitActiveField() {
  const active = document.activeElement;
  if (!active || active === document.body || !document.contains(active)) return;
  const tag = active.tagName ? active.tagName.toLowerCase() : '';
  const editable = tag === 'input' || tag === 'select' || tag === 'textarea' || active.isContentEditable;
  if (editable && typeof active.blur === 'function') active.blur();
}

function setInlineError(id, message) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('hidden', !message);
}

function errorMessage(prefix, err) {
  return `${prefix}: ${err.message}`;
}

function confirmReplacingCurrentWork() {
  if (!dirty) return Promise.resolve(true);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">Current unexported changes will be replaced. Export or download them first if you want to keep them.</p><div class="row" style="margin-top:8px;"><button id="confirmReplaceWork" class="danger">Replace current data</button><button id="cancelReplaceWork">Cancel</button></div>`;
  return new Promise(resolve => {
    let confirmed = false;
    openModal('Replace current data?', wrap, { onClose: () => resolve(confirmed) });
    document.getElementById('confirmReplaceWork').onclick = () => { confirmed = true; closeModal(); };
    document.getElementById('cancelReplaceWork').onclick = () => closeModal();
  });
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

function renderList() {
  renderCategoryList({
    data, getCategories, ensureShape,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    getDraggedIndex: () => draggedIndex,
    setDraggedIndex: value => { draggedIndex = value; },
    renumberCategories, markDirty, renderAll, commitActiveField
  });
}

function renderEditor() {
  renderCategoryEditor({
    getCategories,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    ensureShape, markDirty, renderAll, renderList, renumberCategories, openRegexToItemIdsTool, commitActiveField,
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
  if (!uncached) { if (!quiet) setStatus(`All ${total} referenced ID name(s) already cached.`, 'ok'); commitActiveField(); renderAll(); return; }
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
    saveLookupCache(); commitActiveField(); renderAll();
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
  const validation = validateConfig(parsed);
  if (!(await confirmReplacingCurrentWork())) return false;
  const importSummary = applyValidatedConfig(validation);
  selectedIndex = getCategories().length ? 0 : -1;
  markSaved('No changes');
  setStatus(sourceLabel ? `${sourceLabel}: ${importSummary}` : importSummary, 'ok');
  commitActiveField();
  renderAll();
  maybeAutoLookupImportedIds();
  return true;
}

el('search').oninput = renderList;
el('search').addEventListener('keydown', e => { if (e.key === 'Escape') { e.currentTarget.value = ''; renderList(); } });
el('addCategory').onclick = () => { commitActiveField(); getCategories().push(defaultCategory()); selectedIndex = getCategories().length - 1; markDirty(); renderAll(); };
el('sortByOrder').onclick = () => { commitActiveField(); getCategories().sort(compareCategoriesForImport); selectedIndex = 0; markDirty(); renderAll(); };
el('renumber').onclick = () => { commitActiveField(); renumberCategories(); markDirty(); renderAll(); };
el('lookupReferencedIds').onclick = () => { commitActiveField(); lookupReferencedIds().catch(err => setStatus('ID lookup failed: ' + err.message, 'err')); };
el('showLookupCache').onclick = () => { commitActiveField(); showLookupCacheModal({ lookupCacheCount, clearLookupCache }); };
el('showHelp').onclick = () => { commitActiveField(); showHelpModal(); };
el('showAppearance').onclick = showAppearanceModal;
el('uploadFile').onclick = () => { commitActiveField(); const input = el('fileInput'); input.value = ''; input.click(); };

el('showExportCopy').onclick = async () => {
  commitActiveField();
  if (getCategories().length === 0) { updateExportControls(); setStatus('Add or import at least one category before exporting.', 'warn'); return; }
  showBusy('Generating export', 'Compressing JSON to gzip+Base64...', null);
  try {
    const b64 = await makeBase64Export(data); hideBusy();
    const wrap = document.createElement('div');
    wrap.innerHTML = `<p class="hint">Current gzip+Base64 export. This was automatically copied to your clipboard if the browser allowed it.</p><div id="exportError" class="modal-error hidden" role="alert"></div><textarea id="exportText" class="raw" readonly>${escapeHtml(b64)}</textarea><div class="row" style="margin-top:8px;"><button id="copyExportAgain" class="primary">Copy again</button></div><p class="hint" id="exportCopyStatus"></p>`;
    openModal('Export / Copy', wrap);
    const copied = await copyTextToClipboard(b64); markSaved('Exported');
    document.getElementById('exportCopyStatus').textContent = copied ? 'Copied to clipboard.' : 'Automatic copy was blocked by the browser. Use “Copy again” or select the text manually.';
    document.getElementById('copyExportAgain').onclick = async () => {
      commitActiveField();
      const ok = await copyTextToClipboard(document.getElementById('exportText').value);
      document.getElementById('exportCopyStatus').textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text manually.';
      setInlineError('exportError', ok ? '' : 'Copy failed. Select the export text manually.');
    };
  } catch (err) { hideBusy(true); setStatus(errorMessage('Export failed', err), 'err'); }
};

el('downloadBase64').onclick = async () => {
  commitActiveField();
  if (getCategories().length === 0) { updateExportControls(); setStatus('Add or import at least one category before downloading.', 'warn'); return; }
  showBusy('Generating download', 'Compressing JSON to gzip+Base64...', null);
  try { downloadText(EXPORT_FILENAME, await makeBase64Export(data), 'text/plain', { onDownloaded(filename) { markSaved('Downloaded'); setStatus(`Downloaded ${filename}`, 'ok'); } }); }
  catch (err) { setStatus('Download failed: ' + err.message, 'err'); }
  finally { hideBusy(); }
};

el('fileInput').onchange = async e => {
  commitActiveField();
  const file = e.target.files[0];
  if (!file) return;
  try {
    await importText(await file.text(), file.name);
  } catch (err) { setStatus(errorMessage('Could not load file', err), 'err'); }
};

function showImportModal(initialText = '') {
  commitActiveField();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">Paste either formatted JSON or the gzip+Base64 blob. Then click Import.</p><div id="importError" class="modal-error hidden" role="alert"></div><textarea id="importText" class="raw" placeholder="Paste JSON or gzip+Base64 here">${escapeHtml(initialText)}</textarea><div class="row" style="margin-top:8px;"><button id="importNow" class="primary">Import</button></div>`;
  openModal('Import / Paste', wrap);
  document.getElementById('importNow').onclick = async () => {
    commitActiveField();
    const text = document.getElementById('importText').value.trim();
    try {
      setInlineError('importError', '');
      if (!(await importText(text, ''))) { showImportModal(text); return; }
      closeModal();
    } catch (err) { const message = errorMessage('Import failed', err); setInlineError('importError', message); setStatus(message, 'err'); }
  };
}

el('showImport').onclick = () => showImportModal();

function showRawModal(initialText = JSON.stringify(data, null, 2), initialError = '') {
  commitActiveField();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">This is the full JSON config. Edit carefully; invalid JSON cannot be applied.</p><div id="rawError" class="modal-error hidden" role="alert"></div><textarea id="rawFull" class="raw">${escapeHtml(initialText)}</textarea><div class="row" style="margin-top:8px;"><button id="applyRawFull" class="primary">Apply full JSON</button><button id="copyRawFull">Copy</button></div><p class="hint" id="rawCopyStatus"></p>`;
  openModal('Raw JSON', wrap);
  setInlineError('rawError', initialError);
  document.getElementById('applyRawFull').onclick = async () => {
    commitActiveField();
    const text = document.getElementById('rawFull').value;
    let validation;
    try { validation = validateConfig(JSON.parse(text)); }
    catch (err) { const message = errorMessage('Invalid full JSON', err); setInlineError('rawError', message); setStatus(message, 'err'); return; }
    setInlineError('rawError', '');
    if (!(await confirmReplacingCurrentWork())) { showRawModal(text); return; }
    applyValidatedConfig(validation);
    selectedIndex = getCategories().length ? 0 : -1;
    closeModal();
    markDirty();
    commitActiveField();
    renderAll();
    maybeAutoLookupImportedIds();
  };
  document.getElementById('copyRawFull').onclick = async () => { commitActiveField(); const ok = await copyTextToClipboard(document.getElementById('rawFull').value); document.getElementById('rawCopyStatus').textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text manually.'; setStatus(ok ? 'Copied full JSON' : 'Copy failed. Select the text manually.', ok ? 'ok' : 'warn'); };
}

el('showRaw').onclick = () => showRawModal();

el('closeModal').onclick = closeModal;
el('modalBackdrop').onclick = e => { if (e.target === el('modalBackdrop')) closeModal(); };
document.addEventListener('keydown', e => { trapModalFocus(e); if (e.key === 'Escape' && !el('modalBackdrop').classList.contains('hidden')) closeModal(); });
window.addEventListener('beforeunload', e => { commitActiveField(); if (!dirty) return; e.preventDefault(); e.returnValue = ''; });
applyEditorPreferences();
renderAll();
