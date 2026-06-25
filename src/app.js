import { INITIAL_DATA, LOOKUP_BATCH_SIZE } from './constants.js';
import { el, bindChange, bindClick, bindInput, escapeHtml, requireEl, requireScopedEl, setSaveState, setStatus, showBusy, updateBusy, hideBusy } from './dom.js';
import { loadLookupCache, persistLookupCache, removeLookupCache, emptyLookupCache, loadEditorPreferences, persistEditorPreferences } from './state.js';
import { defaultCategory as makeDefaultCategory, ensureShape, validateConfig, compareCategoriesForImport } from './config.js';
import { openModal, closeModal, trapModalFocus } from './modals.js';
import { renderCategoryList } from './ui/categoryList.js';
import { renderEditor as renderCategoryEditor } from './ui/categoryEditor.js';
import { showHelpModal } from './ui/helpModal.js';
import { showLookupCacheModal } from './ui/lookupCacheModal.js';
import { showAppearanceModal } from './ui/appearanceModal.js';
import { openRegexToItemIdsTool as openRegexTool } from './tools/regexToItemIds.js';
import { EXPORT_FILENAME, copyTextToClipboard, downloadText, makeBase64Export, parseImportedText } from './importExport.js';
import { sheetLabel, collectReferencedIds, countReferencedIds, countUncachedReferencedIds, fetchLookupBatch as xivapiFetchLookupBatch, searchXivapi } from './xivapi.js';
import { analyzeImportedConfig, countFindings } from './validation.js';

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
  return editorPreferences;
}

function saveLookupCache() { persistLookupCache(lookupCache); }
function lookupCacheCount(sheet) { return Object.keys(lookupCache[sheet] || {}).length; }
function lookupName(sheet, id) { const cache = lookupCache[sheet] || (lookupCache[sheet] = {}); return cache[String(id)] || null; }
function fetchLookupBatch(sheet, ids, options = {}) { return xivapiFetchLookupBatch(sheet, ids, { ...options, lookupCache, saveLookupCache }); }
function clearLookupCache() { lookupCache = emptyLookupCache(); removeLookupCache(); renderAll(); setStatus('Lookup cache cleared. Category data was not changed.', 'ok'); }
function getCategories() { if (!data.Categories) data.Categories = []; return data.Categories; }
function defaultCategory() { const maxOrder = getCategories().reduce((m, c) => Math.max(m, Number(c.Order || 0)), 0); return makeDefaultCategory(maxOrder); }
function renumberCategories() { getCategories().forEach((cat, i) => { cat.Order = i + 1; cat.Priority = i + 1; }); }
function markDirty(options = {}) {
  dirty = true;
  setSaveState('Changes not exported', 'warn');
  if (options.renderList) renderList();
}
function markDirtyAndRenderList() { markDirty({ renderList: true }); }
function markSaved(label='Exported') { dirty = false; setSaveState(label); }
function applyValidatedConfig(validation) { data = validation.config; return validation.summary; }

function mergeValidationFindings(...analyses) {
  const seen = new Set();
  const findings = [];
  for (const analysis of analyses) {
    for (const item of analysis?.findings || []) {
      const key = `${item.severity}|${item.field}|${item.categoryId || ''}|${item.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(item);
    }
  }
  return { findings, counts: countFindings(findings) };
}

function validationSummaryText(categoryCount, analysis) {
  const counts = analysis.counts || {};
  const parts = [`Imported ${categoryCount.toLocaleString()} ${categoryCount === 1 ? 'category' : 'categories'}`];
  if (counts.error) parts.push(`${counts.error} ${counts.error === 1 ? 'error' : 'errors'}`);
  if (counts.warning) parts.push(`${counts.warning} ${counts.warning === 1 ? 'warning' : 'warnings'}`);
  if (counts.note) parts.push(`${counts.note} ${counts.note === 1 ? 'note' : 'notes'}`);
  if (!counts.error && !counts.warning && !counts.note) parts.push('no validation issues');
  return parts.join(' · ');
}

function shortRepairValue(value) {
  const text = JSON.stringify(value);
  if (text === undefined) return String(value);
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function repairFieldAllowsBeforeAfter(field) {
  return field === 'AllowedRarities'
    || field === 'Level'
    || field === 'ItemLevel'
    || field === 'VendorPrice'
    || field === 'Untradable'
    || field === 'Unique'
    || field === 'Collectable'
    || field === 'Dyeable'
    || field === 'Repairable'
    || field === 'HighQuality'
    || field === 'Desynthesizable'
    || field === 'Glamourable'
    || field === 'FullySpiritbonded';
}

function formatRepairMessage(repair) {
  const prefix = repair.categoryName ? `“${repair.categoryName}”: ` : '';
  const canShowBeforeAfter = repair.showBeforeAfter !== false && repairFieldAllowsBeforeAfter(repair.field);
  if (canShowBeforeAfter && (repair.before !== undefined || repair.after !== undefined)) {
    return `${prefix}${repair.message} Changed from ${shortRepairValue(repair.before)} to ${shortRepairValue(repair.after)}.`;
  }
  return `${prefix}${repair.message}`;
}

function showValidationSummary(title, analysis, repairs = []) {
  if (!analysis.findings.length && !repairs.length) return;
  const wrap = document.createElement('div');
  const rows = analysis.findings.slice(0, 80).map(item => `<li class="field-${item.severity}"><strong>${escapeHtml(item.severity)}:</strong> ${escapeHtml(item.categoryName ? `${item.categoryName} · ${item.field}` : item.field)} — ${escapeHtml(item.message)}</li>`).join('');
  const more = analysis.findings.length > 80 ? `<p class="hint">Showing first 80 of ${analysis.findings.length} findings.</p>` : '';
  const findingsSection = analysis.findings.length ? `<ul class="validation-list">${rows}</ul>${more}` : '<p class="hint">No validation guardrail findings.</p>';
  const repairRows = repairs.slice(0, 80).map(repair => `<li>${escapeHtml(formatRepairMessage(repair))}</li>`).join('');
  const repairMore = repairs.length > 80 ? `<p class="hint">Showing first 80 of ${repairs.length} import changes.</p>` : '';
  const repairSection = repairs.length ? `<h3>Changes made during import</h3><ul class="validation-list">${repairRows}</ul>${repairMore}` : '';
  wrap.innerHTML = `<p class="hint">Warnings and notes do not block import; they are guardrails for cleanup while editing.</p>${findingsSection}${repairSection}<div class="row modal-action-row"><button id="closeValidationSummary" class="primary">Continue editing</button></div>`;
  openModal(title, wrap);
  try { requireScopedEl(wrap, '#closeValidationSummary', 'validation summary').addEventListener('click', closeModal); } catch (err) { reportModalBindingError('Validation summary unavailable', err); }
}
function openRegexToItemIdsTool() { commitActiveField(); openRegexTool({ getCategories, getSelectedIndex: () => selectedIndex, ensureShape, lookupCache, saveLookupCache, markDirty, renderAll }); }

function commitActiveField() {
  const active = document.activeElement;
  if (!active || active === document.body || !document.contains(active)) return;
  const tag = active.tagName ? active.tagName.toLowerCase() : '';
  const editable = tag === 'input' || tag === 'select' || tag === 'textarea' || active.isContentEditable;
  if (editable && typeof active.blur === 'function') active.blur();
}

function setInlineError(id, message) {
  const node = el(id);
  if (!node) return;
  node.textContent = message || '';
  node.classList.toggle('hidden', !message);
}

function errorMessage(prefix, err) {
  const message = err instanceof Error ? err.message : String(err);
  return `${prefix}: ${message}`;
}


function reportModalBindingError(context, err) {
  setStatus(`${context}: ${err instanceof Error ? err.message : String(err)}`, 'err');
}

function confirmReplacingCurrentWork() {
  if (!dirty) return Promise.resolve(true);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">Current unexported changes will be replaced. Export or download them first if you want to keep them.</p><div class="row modal-action-row"><button id="confirmReplaceWork" class="danger">Replace current data</button><button id="cancelReplaceWork">Cancel</button></div>`;
  return new Promise(resolve => {
    let confirmed = false;
    openModal('Replace current data?', wrap, { onClose: () => resolve(confirmed) });
    try {
      requireScopedEl(wrap, '#confirmReplaceWork', 'replace confirmation').addEventListener('click', () => { confirmed = true; closeModal(); });
      requireScopedEl(wrap, '#cancelReplaceWork', 'replace confirmation').addEventListener('click', () => closeModal());
    } catch (err) {
      reportModalBindingError('Replace confirmation unavailable', err);
    }
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
    renumberCategories, markDirty: markDirtyAndRenderList, renderAll, commitActiveField
  });
}

function renderEditor() {
  renderCategoryEditor({
    getCategories,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    ensureShape, markDirty, markDirtyAndRenderList, renderAll, renderList, renumberCategories, openRegexToItemIdsTool, commitActiveField,
    listEditorDeps: { lookupName, fetchLookupBatch, searchXivapi, lookupCache, saveLookupCache, markDirty }
  });
}

// Use renderAll only for structural changes; local field edits should update local UI/list instead.
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
  lookupReferencedIds({ quiet: true }).catch(err => { hideBusy(true); setStatus(errorMessage('Automatic ID lookup failed', err), 'warn'); });
}

async function importText(text, sourceLabel='Import') {
  const parsed = await parseImportedText(text);
  const preAnalysis = analyzeImportedConfig(parsed);
  const validation = validateConfig(parsed);
  const postAnalysis = analyzeImportedConfig(validation.config);
  const importAnalysis = mergeValidationFindings(preAnalysis, postAnalysis);
  if (!(await confirmReplacingCurrentWork())) return false;
  applyValidatedConfig(validation);
  selectedIndex = getCategories().length ? 0 : -1;
  markSaved('No changes');
  const guardrailSummary = validationSummaryText(getCategories().length, importAnalysis);
  setStatus(sourceLabel ? `${sourceLabel}: ${guardrailSummary}` : guardrailSummary, importAnalysis.counts.error || importAnalysis.counts.warning ? 'warn' : 'ok');
  commitActiveField();
  renderAll();
  if (importAnalysis.findings.length || validation.repairs?.length) setTimeout(() => showValidationSummary('Import validation summary', importAnalysis, validation.repairs || []), 0);
  maybeAutoLookupImportedIds();
  return true;
}

function showImportModal(initialText = '') {
  commitActiveField();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">Paste either formatted JSON or the gzip+Base64 blob. Then click Import.</p><div id="importError" class="modal-error hidden" role="alert"></div><textarea id="importText" class="raw" placeholder="Paste JSON or gzip+Base64 here">${escapeHtml(initialText)}</textarea><div class="row modal-action-row"><button id="importNow" class="primary">Import</button></div>`;
  openModal('Import / Paste', wrap);
  try {
    const importTextNode = requireScopedEl(wrap, '#importText', 'import');
    requireScopedEl(wrap, '#importNow', 'import').addEventListener('click', async () => {
      commitActiveField();
      const text = importTextNode.value.trim();
      try {
        setInlineError('importError', '');
        if (!(await importText(text, ''))) { showImportModal(text); return; }
        closeModal();
      } catch (err) { const message = errorMessage('Import failed', err); setInlineError('importError', message); setStatus(message, 'err'); }
    });
  } catch (err) {
    reportModalBindingError('Import unavailable', err);
  }
}

function showRawModal(initialText = JSON.stringify(data, null, 2), initialError = '') {
  commitActiveField();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">This is the full JSON config. Edit carefully; invalid JSON cannot be applied.</p><div id="rawError" class="modal-error hidden" role="alert"></div><textarea id="rawFull" class="raw">${escapeHtml(initialText)}</textarea><div class="row modal-action-row"><button id="applyRawFull" class="primary">Apply full JSON</button><button id="copyRawFull">Copy</button></div><p class="hint" id="rawCopyStatus"></p>`;
  openModal('Raw JSON', wrap);
  setInlineError('rawError', initialError);
  try {
    const rawFull = requireScopedEl(wrap, '#rawFull', 'raw JSON');
    const rawCopyStatus = requireScopedEl(wrap, '#rawCopyStatus', 'raw JSON');
    requireScopedEl(wrap, '#applyRawFull', 'raw JSON').addEventListener('click', async () => {
      commitActiveField();
      const text = rawFull.value;
      let validation;
      let preAnalysis;
      try { const parsed = JSON.parse(text); preAnalysis = analyzeImportedConfig(parsed); validation = validateConfig(parsed); }
      catch (err) { const message = errorMessage('Invalid full JSON', err); setInlineError('rawError', message); setStatus(message, 'err'); return; }
      setInlineError('rawError', '');
      if (!(await confirmReplacingCurrentWork())) { showRawModal(text); return; }
      const rawAnalysis = mergeValidationFindings(preAnalysis, analyzeImportedConfig(validation.config));
      applyValidatedConfig(validation);
      selectedIndex = getCategories().length ? 0 : -1;
      closeModal();
      markDirty();
      commitActiveField();
      renderAll();
      const rawSummary = validationSummaryText(getCategories().length, rawAnalysis);
      setStatus(rawSummary, rawAnalysis.counts.error || rawAnalysis.counts.warning ? 'warn' : 'ok');
      if (rawAnalysis.findings.length || validation.repairs?.length) setTimeout(() => showValidationSummary('Raw JSON validation summary', rawAnalysis, validation.repairs || []), 0);
      maybeAutoLookupImportedIds();
    });
    requireScopedEl(wrap, '#copyRawFull', 'raw JSON').addEventListener('click', async () => {
      commitActiveField();
      const ok = await copyTextToClipboard(rawFull.value);
      rawCopyStatus.textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text manually.';
      setStatus(ok ? 'Copied full JSON' : 'Copy failed. Select the text manually.', ok ? 'ok' : 'warn');
    });
  } catch (err) {
    reportModalBindingError('Raw JSON unavailable', err);
  }
}

let started = false;

function bindAppEvents() {
  const searchInput = bindInput('search', () => { updateSearchClearButton(); renderList(); });
  const clearSearchButton = el('clearSearch');
  function updateSearchClearButton() {
    if (!searchInput || !clearSearchButton) return;
    clearSearchButton.disabled = searchInput.value.length === 0;
  }
  function clearSearch() {
    if (!searchInput) return;
    searchInput.value = '';
    updateSearchClearButton();
    renderList();
    searchInput.focus();
  }
  updateSearchClearButton();
  if (searchInput) searchInput.addEventListener('keydown', e => { if (e.key === 'Escape' && e.currentTarget.value) { e.preventDefault(); clearSearch(); } });
  if (clearSearchButton) clearSearchButton.addEventListener('click', clearSearch);
  bindClick('addCategory', () => { commitActiveField(); getCategories().push(defaultCategory()); selectedIndex = getCategories().length - 1; markDirty(); renderAll(); });
  bindClick('sortByOrder', () => { commitActiveField(); getCategories().sort(compareCategoriesForImport); selectedIndex = 0; markDirty(); renderAll(); });
  bindClick('renumber', () => { commitActiveField(); renumberCategories(); markDirty(); renderAll(); });
  bindClick('lookupReferencedIds', () => { commitActiveField(); lookupReferencedIds().catch(err => setStatus(errorMessage('ID lookup failed', err), 'err')); });
  bindClick('showLookupCache', () => { commitActiveField(); showLookupCacheModal({ lookupCacheCount, clearLookupCache }); });
  bindClick('showHelp', () => { commitActiveField(); showHelpModal(); });
  bindClick('showAppearance', () => showAppearanceModal({
    getEditorPreferences: () => editorPreferences,
    applyEditorPreferences,
    setStatus,
    openModal,
    commitActiveField
  }));
  bindClick('uploadFile', () => {
    commitActiveField();
    try {
      const input = requireEl('fileInput');
      input.value = '';
      input.click();
    } catch (err) {
      setStatus(errorMessage('Upload unavailable', err), 'err');
    }
  });

  bindClick('showExportCopy', async () => {
    commitActiveField();
    if (getCategories().length === 0) { updateExportControls(); setStatus('Add or import at least one category before exporting.', 'warn'); return; }
    showBusy('Generating export', 'Compressing JSON to gzip+Base64...', null);
    try {
      const b64 = await makeBase64Export(data); hideBusy();
      const wrap = document.createElement('div');
      wrap.innerHTML = `<p class="hint">Current gzip+Base64 export. This was automatically copied to your clipboard if the browser allowed it.</p><div id="exportError" class="modal-error hidden" role="alert"></div><textarea id="exportText" class="raw" readonly>${escapeHtml(b64)}</textarea><div class="row modal-action-row"><button id="copyExportAgain" class="primary">Copy again</button></div><p class="hint" id="exportCopyStatus"></p>`;
      openModal('Export / Copy', wrap);
      const copied = await copyTextToClipboard(b64); markSaved('Exported');
      const exportCopyStatus = requireScopedEl(wrap, '#exportCopyStatus', 'export');
      const exportText = requireScopedEl(wrap, '#exportText', 'export');
      const copyExportAgain = requireScopedEl(wrap, '#copyExportAgain', 'export');
      exportCopyStatus.textContent = copied ? 'Copied to clipboard.' : 'Automatic copy was blocked by the browser. Use “Copy again” or select the text manually.';
      copyExportAgain.addEventListener('click', async () => {
        commitActiveField();
        const ok = await copyTextToClipboard(exportText.value);
        exportCopyStatus.textContent = ok ? 'Copied to clipboard.' : 'Copy failed. Select the text manually.';
        setInlineError('exportError', ok ? '' : 'Copy failed. Select the export text manually.');
      });
    } catch (err) { hideBusy(true); setStatus(errorMessage('Export failed', err), 'err'); }
  });

  bindClick('downloadBase64', async () => {
    commitActiveField();
    if (getCategories().length === 0) { updateExportControls(); setStatus('Add or import at least one category before downloading.', 'warn'); return; }
    showBusy('Generating download', 'Compressing JSON to gzip+Base64...', null);
    try { downloadText(EXPORT_FILENAME, await makeBase64Export(data), 'text/plain', { onDownloaded(filename) { markSaved('Downloaded'); setStatus(`Downloaded ${filename}`, 'ok'); } }); }
    catch (err) { setStatus(errorMessage('Download failed', err), 'err'); }
    finally { hideBusy(); }
  });

  bindChange('fileInput', async e => {
    commitActiveField();
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importText(await file.text(), file.name);
    } catch (err) { setStatus(errorMessage('Could not load file', err), 'err'); }
  });

  bindClick('showImport', () => showImportModal());
  bindClick('showRaw', () => showRawModal());

  bindClick('closeModal', closeModal);
  bindClick('modalBackdrop', e => { if (e.target === e.currentTarget) closeModal(); });
  document.addEventListener('keydown', e => {
    const backdrop = el('modalBackdrop');
    trapModalFocus(e);
    if (e.key === 'Escape' && backdrop && !backdrop.classList.contains('hidden')) closeModal();
  });
  window.addEventListener('beforeunload', e => { commitActiveField(); if (!dirty) return; e.preventDefault(); e.returnValue = ''; });
}

function getStylesheetLink() {
  const link = document.getElementById('appStylesheet');
  return link instanceof HTMLLinkElement ? link : null;
}

function isStylesheetReady(link) {
  if (!link) return true;
  try {
    return [...document.styleSheets].some(sheet => sheet.ownerNode === link);
  } catch {
    return false;
  }
}

function waitForStylesheetReady() {
  const link = getStylesheetLink();
  if (isStylesheetReady(link)) return Promise.resolve();
  return new Promise(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      link?.removeEventListener('load', finish);
      link?.removeEventListener('error', finish);
      resolve();
    };
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
    setTimeout(finish, 250);
  });
}

function startApp() {
  if (started) return;
  started = true;
  bindAppEvents();
  applyEditorPreferences();
  waitForStylesheetReady().then(renderAll);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true });
} else {
  startApp();
}
