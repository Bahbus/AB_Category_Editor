import { INITIAL_DATA, LOOKUP_BATCH_SIZE } from './constants.js';
import { el, bindChange, bindClick, bindInput, escapeHtml, requireEl, requireScopedEl, setSaveState, setStatus, showBusy, updateBusy, hideBusy } from './dom.js';
import { loadLookupCache, persistLookupCache, removeLookupCache, emptyLookupCache, loadEditorPreferences, persistEditorPreferences } from './state.js';
import { defaultCategory as makeDefaultCategory, ensureShape, validateConfig, compareCategoriesForImport, nextCategorySortValue } from './config.js';
import { openModal, closeModal, isModalOpen, trapModalFocus } from './modals.js';
import { renderCategoryList } from './ui/categoryList.js';
import { renderEditor as renderCategoryEditor } from './ui/categoryEditor.js';
import { showHelpModal } from './ui/helpModal.js';
import { showLookupCacheModal } from './ui/lookupCacheModal.js';
import { showPreferencesModal } from './ui/preferencesModal.js';
import { applyApplicationChromeLocalization } from './ui/applicationChrome.js';
import { createApplicationDataMessages } from './ui/applicationDataMessages.js';
import { createApplicationExportMessages } from './ui/applicationExportMessages.js';
import { createApplicationOperationsMessages } from './ui/applicationOperationsMessages.js';
import { createItemOrderingMessages } from './ui/itemOrderingEditor.js';
import { createTranslator } from './localization.js';
import { openRegexToItemIdsTool as openRegexTool } from './tools/regexToItemIds.js';
import { EXPORT_FILENAME, assertJsonTextWithinLimit, copyTextToClipboard, downloadText, makeBase64Export, parseImportedText, parseJsonText, readImportFileText } from './importExport.js';
import { collectReferencedIds, countReferencedIds, countUncachedReferencedIds, fetchLookupBatch as xivapiFetchLookupBatch, searchXivapi } from './xivapi.js';
import { generateCategoryDescription, isUsefulGeneratedDescription } from './descriptionGenerator.js';
import { isUsefulLookupName } from './lookupNames.js';
import { analyzeImportedConfig, mergeValidationFindings } from './validation.js';
import { PRESETS } from './presets.js';
import { createLookupCacheOperationCoordinator, clearLookupCacheIfIdle } from './lookupCacheOperations.js';
import { applyConfigReplacement, applyFullConfigCandidate, renumberCategories as applyCategoryRenumber, sortCategoriesPreservingSelection } from './categoryChanges.js';
import { animateReorderMotion, captureReorderMotion } from './reorderMotion.js';
import { isSnapshotCurrent, makeRevisionedExportSnapshot, saveSnapshotIfCurrent } from './exportSnapshots.js';
import { runAetherBagsExportPreflight } from './exportCompatibility.js';
import { categoryRenumberAvailable, categorySortAvailable, referencedIdLookupAvailable, textActionAvailable } from './actionAvailability.js';
import {
  reviewableImportRepairs,
  reviewableImportFindings,
  shouldShowImportValidationModal,
  configValidationSummaryText,
  validationSummaryText,
  importStatusSeverity
} from './importValidationSummary.js';


let data = JSON.parse(JSON.stringify(INITIAL_DATA));
let selectedIndex = -1;
let dirty = false;
let dataRevision = 0;
let draggedIndex = null;
let lookupCache = loadLookupCache();
let editorPreferences = loadEditorPreferences();
const translate = createTranslator('en');
const applicationDataMessages = createApplicationDataMessages(translate);
const applicationExportMessages = createApplicationExportMessages(translate);
const applicationOperationsMessages = createApplicationOperationsMessages(translate);
const itemOrderingMessages = createItemOrderingMessages(translate);
const lookupCacheOperations = createLookupCacheOperationCoordinator();
let resolvingReferencedIds = false;

function applyEditorPreferences(preferences = editorPreferences) {
  editorPreferences = persistEditorPreferences(preferences);
  const root = document.documentElement;
  root.dataset.theme = editorPreferences.theme;
  root.dataset.density = editorPreferences.density;
  return editorPreferences;
}

function saveLookupCache() { persistLookupCache(lookupCache); }
function lookupCacheStats(sheet) {
  const values = Object.values(lookupCache[sheet] || {});
  const useful = values.filter(isUsefulLookupName).length;
  return { useful, unresolved: values.length - useful, total: values.length };
}
function lookupName(sheet, id) { const cache = lookupCache[sheet] || {}; return cache[String(id)] || null; }
function fetchLookupBatch(sheet, ids, options = {}) { return xivapiFetchLookupBatch(sheet, ids, { ...options, lookupCache, saveLookupCache }); }
function clearLookupCache() {
  return clearLookupCacheIfIdle({
    isActive: lookupCacheOperations.isActive,
    onRefused: () => setStatus(applicationOperationsMessages.cache.clearRefused, 'warn'),
    clear: () => { lookupCache = emptyLookupCache(); removeLookupCache(); renderAll(); setStatus(applicationOperationsMessages.cache.cleared, 'ok'); }
  });
}
function getCategories() { return data.Categories; }
function defaultCategory() {
  const category = makeDefaultCategory(nextCategorySortValue(getCategories()) - 1);
  if (editorPreferences.autoGenerateDescriptions) {
    const generated = generateCategoryDescription(category, { lookupName });
    if (isUsefulGeneratedDescription(generated)) category.Description = generated;
  }
  return category;
}
function renumberCategories() { return applyCategoryRenumber(getCategories()); }
function advanceDataRevision() { dataRevision += 1; }
function markDirty(options = {}) {
  advanceDataRevision();
  dirty = true;
  setSaveState(applicationExportMessages.savedState.changesNotExported, 'warn');
  if (options.renderList) renderList();
}
function markDirtyAndRenderList() { markDirty({ renderList: true }); }
function markSaved(label=applicationExportMessages.savedState.exported) { dirty = false; setSaveState(label); }
function applyValidatedConfig(validation) {
  return applyConfigReplacement(data, validation.config, candidate => {
    data = candidate;
    advanceDataRevision();
  });
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
  const message = repair.categoryName
    ? applicationDataMessages.validation.categoryRepair(repair.categoryName, repair.message)
    : repair.message;
  const canShowBeforeAfter = repair.showBeforeAfter !== false && repairFieldAllowsBeforeAfter(repair.field);
  if (canShowBeforeAfter && (repair.before !== undefined || repair.after !== undefined)) {
    return applicationDataMessages.validation.changedRepair(
      message,
      shortRepairValue(repair.before),
      shortRepairValue(repair.after)
    );
  }
  return message;
}

function showValidationSummary(title, analysis, repairs = []) {
  const reviewFindings = reviewableImportFindings(analysis.findings || []);
  const reviewRepairs = reviewableImportRepairs(repairs);
  if (!reviewFindings.length && !reviewRepairs.length) return;
  const wrap = document.createElement('div');
  const rows = reviewFindings.slice(0, 80).map(item => `<li class="field-${item.severity}"><strong>${escapeHtml(applicationDataMessages.validation.severity(item.severity))}:</strong> ${escapeHtml(item.categoryName ? `${item.categoryName} · ${item.field}` : item.field)} — ${escapeHtml(item.message)}</li>`).join('');
  const more = reviewFindings.length > 80 ? `<p class="hint">${escapeHtml(applicationDataMessages.validation.findingsMore(reviewFindings.length))}</p>` : '';
  const findingsSection = reviewFindings.length ? `<ul class="validation-list">${rows}</ul>${more}` : `<p class="hint">${escapeHtml(applicationDataMessages.validation.noFindings)}</p>`;
  const repairRows = reviewRepairs.slice(0, 80).map(repair => `<li>${escapeHtml(formatRepairMessage(repair))}</li>`).join('');
  const repairMore = reviewRepairs.length > 80 ? `<p class="hint">${escapeHtml(applicationDataMessages.validation.repairsMore(reviewRepairs.length))}</p>` : '';
  const repairSection = reviewRepairs.length ? `<h3>${escapeHtml(applicationDataMessages.validation.repairHeading)}</h3><ul class="validation-list">${repairRows}</ul>${repairMore}` : '';
  wrap.innerHTML = `<p class="hint">${escapeHtml(applicationDataMessages.validation.explanation)}</p>${findingsSection}${repairSection}<div class="row modal-action-row"><button id="closeValidationSummary" class="primary">${escapeHtml(applicationDataMessages.validation.continueEditing)}</button></div>`;
  openModal(title, wrap);
  try { requireScopedEl(wrap, '#closeValidationSummary', 'validation summary').addEventListener('click', closeModal); } catch (err) { reportModalBindingError(applicationDataMessages.validation.bindingContext, err); }
}

function showExportCompatibilitySummary(decision) {
  const findings = decision.blockingFindings || [];
  const rows = findings.slice(0, 80).map(item => {
    const location = item.categoryName ? `${item.categoryName} · ${item.field}` : item.field;
    return `<li class="field-error"><strong>${escapeHtml(location)}:</strong> ${escapeHtml(item.message)}</li>`;
  }).join('');
  const more = findings.length > 80 ? `<p class="hint">${escapeHtml(applicationExportMessages.compatibility.truncated(findings.length))}</p>` : '';
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div role="alert"><p><strong>${escapeHtml(applicationExportMessages.compatibility.heading)}</strong> ${escapeHtml(applicationExportMessages.compatibility.explanation(findings.length))}</p><p class="hint">${escapeHtml(applicationExportMessages.compatibility.guidance)}</p></div><ul class="validation-list">${rows}</ul>${more}<div class="row modal-action-row"><button id="closeExportCompatibility" class="primary">${escapeHtml(applicationExportMessages.compatibility.continueEditing)}</button></div>`;
  openModal(applicationExportMessages.compatibility.title, wrap);
  try { requireScopedEl(wrap, '#closeExportCompatibility', applicationExportMessages.compatibility.bindingContext).addEventListener('click', closeModal); }
  catch (err) { reportModalBindingError(applicationExportMessages.compatibility.bindingContext, err); }
  setStatus(applicationExportMessages.compatibility.status(findings.length), 'err');
}

async function makeCompatibleRevisionedExportSnapshot(busyTitle, busyMessage, onBusy = () => {}) {
  const result = await runAetherBagsExportPreflight(data, async () => {
    onBusy();
    showBusy(busyTitle, busyMessage, null);
    return makeRevisionedExportSnapshot(data, () => dataRevision, makeBase64Export);
  }, itemOrderingMessages.findings);
  if (!result.allowed) {
    showExportCompatibilitySummary(result);
    return null;
  }
  return result.value;
}
function openRegexToItemIdsTool() { commitActiveField(); openRegexTool({ getCategories, getSelectedIndex: () => selectedIndex, ensureShape, lookupCache, saveLookupCache, acquireLookupCacheProducer: lookupCacheOperations.acquire, markDirty, renderAll, onAvailabilityChanged: updateGlobalActionAvailability, translate }); }

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

function reportModalBindingError(context, err) {
  setStatus(`${context}: ${err instanceof Error ? err.message : String(err)}`, 'err');
}

function confirmReplacingCurrentWork() {
  if (!dirty) return Promise.resolve(true);
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">${escapeHtml(applicationDataMessages.replacement.warning)}</p><div class="row modal-action-row"><button id="confirmReplaceWork" class="danger">${escapeHtml(applicationDataMessages.replacement.confirm)}</button><button id="cancelReplaceWork">${escapeHtml(applicationDataMessages.replacement.cancel)}</button></div>`;
  return new Promise(resolve => {
    let confirmed = false;
    openModal(applicationDataMessages.replacement.title, wrap, { onClose: () => resolve(confirmed) });
    try {
      requireScopedEl(wrap, '#confirmReplaceWork', 'replace confirmation').addEventListener('click', () => { confirmed = true; closeModal(); });
      requireScopedEl(wrap, '#cancelReplaceWork', 'replace confirmation').addEventListener('click', () => closeModal());
    } catch (err) {
      reportModalBindingError(applicationDataMessages.replacement.bindingContext, err);
    }
  });
}

function updateExportControls() {
  const disabled = getCategories().length === 0;
  for (const id of ['showExportCopy', 'downloadBase64']) {
    const button = el(id);
    if (!button) continue;
    button.disabled = disabled;
    button.removeAttribute('title');
  }
}

function updateGlobalActionAvailability() {
  const categories = getCategories();
  const sortButton = el('sortByOrder');
  const renumberButton = el('renumber');
  const lookupButton = el('lookupReferencedIds');
  if (sortButton) sortButton.disabled = !categorySortAvailable(categories, compareCategoriesForImport);
  if (renumberButton) renumberButton.disabled = !categoryRenumberAvailable(categories);
  if (lookupButton) {
    const ids = collectReferencedIds(categories, ensureShape);
    const uncached = countUncachedReferencedIds(ids, lookupName);
    lookupButton.disabled = !referencedIdLookupAvailable(uncached, resolvingReferencedIds);
  }
}

function renderList() {
  renderCategoryList({
    data, getCategories, ensureShape,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    getDraggedIndex: () => draggedIndex,
    setDraggedIndex: value => { draggedIndex = value; },
    renumberCategories, markDirty: markDirtyAndRenderList, renderAll, commitActiveField, translate,
    itemOrderingFindingMessages: itemOrderingMessages.findings
  });
  updateGlobalActionAvailability();
}

function loadPreset(preset, sourceLabel) {
  if (!preset?.data) {
    setStatus(applicationDataMessages.import.presetUnavailable, 'err');
    return false;
  }
  return importText(preset.data, sourceLabel || preset.sourceLabel || 'Preset');
}

function loadBasicPresets() {
  return loadPreset(PRESETS.find(preset => preset.id === 'basic'), applicationDataMessages.import.basicPresetSource);
}

function loadAdvancedPresets() {
  return loadPreset(PRESETS.find(preset => preset.id === 'advanced'), applicationDataMessages.import.advancedPresetSource);
}

function renderEditor() {
  renderCategoryEditor({
    getCategories,
    getSelectedIndex: () => selectedIndex,
    setSelectedIndex: value => { selectedIndex = value; },
    ensureShape, markDirty, markDirtyAndRenderList, renderAll, renderList, renumberCategories, openRegexToItemIdsTool, lookupName, commitActiveField, getEditorPreferences: () => editorPreferences, copyTextToClipboard, loadBasicPresets, loadAdvancedPresets, translate, itemOrderingMessages,
    listEditorDeps: { lookupName, fetchLookupBatch, searchXivapi, lookupCache, saveLookupCache, acquireLookupCacheProducer: lookupCacheOperations.acquire, markDirty, onAvailabilityChanged: updateGlobalActionAvailability }
  });
}

// Use renderAll only for structural changes; local field edits should update local UI/list instead.
function renderAll() { renderList(); renderEditor(); updateExportControls(); updateGlobalActionAvailability(); }

async function lookupReferencedIds(options = {}) {
  const { quiet = false } = options;
  const ids = collectReferencedIds(getCategories(), ensureShape);
  const total = countReferencedIds(ids);
  const uncached = countUncachedReferencedIds(ids, lookupName);
  if (!total) { if (!quiet) setStatus(applicationOperationsMessages.lookup.noneReferenced, 'warn'); return; }
  if (!uncached) { if (!quiet) setStatus(applicationOperationsMessages.lookup.allCached(total), 'ok'); commitActiveField(); renderAll(); return; }
  resolvingReferencedIds = true;
  updateGlobalActionAvailability();
  const failures = [];
  const releaseLookupCacheProducer = lookupCacheOperations.acquire();
  try {
    showBusy(
      applicationOperationsMessages.lookup.busyTitle,
      applicationOperationsMessages.lookup.busyInitial(uncached),
      0
    );
    for (const [sheet, sheetIds] of [['ItemUICategory', [...ids.ItemUICategory]], ['Item', [...ids.Item]]]) {
      const missing = sheetIds.filter(id => !isUsefulLookupName(lookupName(sheet, id)));
      if (!missing.length) continue;
      const priorCached = uncached - countUncachedReferencedIds(ids, lookupName);
      const batchFailures = await fetchLookupBatch(sheet, missing, { onProgress(doneForSheet, totalForSheet) {
        const done = Math.min(uncached, priorCached + doneForSheet);
        const percent = uncached ? (done / uncached) * 100 : 100;
        updateBusy(applicationOperationsMessages.lookup.busyProgress(
          done,
          uncached,
          sheet,
          Math.ceil(doneForSheet / LOOKUP_BATCH_SIZE),
          Math.ceil(totalForSheet / LOOKUP_BATCH_SIZE)
        ), percent);
      } });
      failures.push(...batchFailures.map(failure => `${failure.sheet} ${failure.id}`));
    }
    saveLookupCache(); commitActiveField(); renderAll();
    if (failures.length) {
      const shown = failures.slice(0, 5).join(', ');
      const more = failures.length > 5
        ? applicationOperationsMessages.lookup.failureMore(failures.length - 5)
        : '';
      const message = applicationOperationsMessages.lookup.partialFailure(
        failures.length,
        `${shown}${more}`
      );
      if (quiet) setStatus(applicationOperationsMessages.lookup.automaticUnresolved(failures.length));
      else setStatus(message, 'warn');
    }
    else if (quiet) setStatus(applicationOperationsMessages.lookup.automaticCached(uncached));
    else setStatus(applicationOperationsMessages.lookup.complete(uncached), 'ok');
  } finally { releaseLookupCacheProducer(); hideBusy(); resolvingReferencedIds = false; updateGlobalActionAvailability(); }
}

function maybeAutoLookupImportedIds() {
  if (!editorPreferences.autoLookupImportedIds) return;
  lookupReferencedIds({ quiet: true }).catch(err => {
    setStatus(applicationOperationsMessages.lookup.automaticFailed(err), 'warn');
  });
}

async function importText(text, sourceLabel='Import') {
  const parsed = await parseImportedText(text);
  const preAnalysis = analyzeImportedConfig(parsed, itemOrderingMessages.findings);
  const validation = validateConfig(parsed);
  const postAnalysis = analyzeImportedConfig(validation.config, itemOrderingMessages.findings);
  const importAnalysis = mergeValidationFindings(preAnalysis, postAnalysis);
  if (!(await confirmReplacingCurrentWork())) return false;
  applyValidatedConfig(validation);
  selectedIndex = getCategories().length ? 0 : -1;
  markSaved(applicationDataMessages.import.noChanges);
  const guardrailSummary = validationSummaryText(getCategories().length, importAnalysis, validation.repairs || [], applicationDataMessages.summary);
  setStatus(sourceLabel ? applicationDataMessages.import.status(sourceLabel, guardrailSummary) : guardrailSummary, importStatusSeverity(importAnalysis, validation.repairs || []));
  commitActiveField();
  renderAll();
  if (shouldShowImportValidationModal({ analysis: importAnalysis, repairs: validation.repairs || [] })) setTimeout(() => showValidationSummary(applicationDataMessages.import.validationTitle, importAnalysis, validation.repairs || []), 0);
  maybeAutoLookupImportedIds();
  return true;
}

function showImportModal(initialText = '') {
  commitActiveField();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">${escapeHtml(applicationDataMessages.import.guidance)}</p><div id="importError" class="modal-error hidden" role="alert"></div><textarea id="importText" class="raw" placeholder="${escapeHtml(applicationDataMessages.import.placeholder)}">${escapeHtml(initialText)}</textarea><div class="row modal-action-row"><button id="importNow" class="primary">${escapeHtml(applicationDataMessages.import.action)}</button></div>`;
  openModal(applicationDataMessages.import.title, wrap);
  try {
    const importTextNode = requireScopedEl(wrap, '#importText', 'import');
    const importButton = requireScopedEl(wrap, '#importNow', 'import');
    const syncImportAvailability = () => { importButton.disabled = !textActionAvailable(importTextNode.value); };
    syncImportAvailability();
    importTextNode.addEventListener('input', syncImportAvailability);
    importButton.addEventListener('click', async () => {
      commitActiveField();
      const text = importTextNode.value;
      try {
        setInlineError('importError', '');
        if (!(await importText(text, ''))) { showImportModal(text); return; }
        closeModal();
      } catch (err) { const message = applicationDataMessages.import.failed(err); setInlineError('importError', message); setStatus(message, 'err'); }
    });
  } catch (err) {
    setStatus(applicationDataMessages.import.unavailable(err), 'err');
  }
}

function showRawModal(initialText = JSON.stringify(data, null, 2), initialError = '') {
  commitActiveField();
  const wrap = document.createElement('div');
  wrap.innerHTML = `<p class="hint">${escapeHtml(applicationDataMessages.raw.warning)}</p><div id="rawError" class="modal-error hidden" role="alert"></div><textarea id="rawFull" class="raw">${escapeHtml(initialText)}</textarea><div class="row modal-action-row"><button id="applyRawFull" class="primary">${escapeHtml(applicationDataMessages.raw.apply)}</button><button id="copyRawFull">${escapeHtml(applicationDataMessages.raw.copy)}</button></div><p class="hint" id="rawCopyStatus"></p>`;
  openModal(applicationDataMessages.raw.title, wrap);
  setInlineError('rawError', initialError);
  try {
    const rawFull = requireScopedEl(wrap, '#rawFull', 'raw JSON');
    const rawCopyStatus = requireScopedEl(wrap, '#rawCopyStatus', 'raw JSON');
    const applyRawFull = requireScopedEl(wrap, '#applyRawFull', 'raw JSON');
    const copyRawFull = requireScopedEl(wrap, '#copyRawFull', 'raw JSON');
    const syncRawAvailability = () => {
      const available = textActionAvailable(rawFull.value);
      applyRawFull.disabled = !available;
      copyRawFull.disabled = !available;
    };
    syncRawAvailability();
    rawFull.addEventListener('input', syncRawAvailability);
    applyRawFull.addEventListener('click', async () => {
      commitActiveField();
      const text = rawFull.value;
      let validation;
      let preAnalysis;
      try { const parsed = parseJsonText(text, { label: applicationDataMessages.raw.inputLimitLabel }); preAnalysis = analyzeImportedConfig(parsed, itemOrderingMessages.findings); validation = validateConfig(parsed); }
      catch (err) { const message = applicationDataMessages.raw.invalid(err); setInlineError('rawError', message); setStatus(message, 'err'); return; }
      setInlineError('rawError', '');
      const rawAnalysis = mergeValidationFindings(preAnalysis, analyzeImportedConfig(validation.config, itemOrderingMessages.findings));
      const rawSummary = configValidationSummaryText(validation.config, rawAnalysis, validation.repairs || [], applicationDataMessages.summary);
      const showRawSummary = () => {
        setStatus(rawSummary, importStatusSeverity(rawAnalysis, validation.repairs || []));
        if (shouldShowImportValidationModal({ analysis: rawAnalysis, repairs: validation.repairs || [] })) setTimeout(() => showValidationSummary(applicationDataMessages.raw.validationTitle, rawAnalysis, validation.repairs || []), 0);
      };
      const result = await applyFullConfigCandidate({
        currentData: data,
        candidate: validation.config,
        confirmReplace: confirmReplacingCurrentWork,
        onNoChange: () => {
          closeModal();
          setStatus(`${rawSummary} ${applicationDataMessages.raw.noChangeSuffix}`, importStatusSeverity(rawAnalysis, validation.repairs || []));
          if (shouldShowImportValidationModal({ analysis: rawAnalysis, repairs: validation.repairs || [] })) setTimeout(() => showValidationSummary(applicationDataMessages.raw.validationTitle, rawAnalysis, validation.repairs || []), 0);
        },
        onChanged: () => {
          applyValidatedConfig(validation);
          selectedIndex = getCategories().length ? 0 : -1;
          closeModal();
          markDirty();
          commitActiveField();
          renderAll();
          showRawSummary();
          maybeAutoLookupImportedIds();
        }
      });
      if (result === null) showRawModal(text);
    });
    copyRawFull.addEventListener('click', async () => {
      commitActiveField();
      try {
        assertJsonTextWithinLimit(rawFull.value, { label: applicationDataMessages.raw.inputLimitLabel });
      } catch (err) {
        const message = applicationDataMessages.raw.copyError(err);
        setInlineError('rawError', message);
        setStatus(message, 'err');
        return;
      }
      const ok = await copyTextToClipboard(rawFull.value);
      rawCopyStatus.textContent = ok ? applicationDataMessages.raw.copiedInline : applicationDataMessages.raw.copyFailed;
      setStatus(ok ? applicationDataMessages.raw.copiedStatus : applicationDataMessages.raw.copyFailed, ok ? 'ok' : 'warn');
    });
  } catch (err) {
    reportModalBindingError(applicationDataMessages.raw.bindingContext, err);
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
  bindClick('sortByOrder', () => {
    commitActiveField();
    const positions = captureReorderMotion(el('categoryList'));
    const result = sortCategoriesPreservingSelection(getCategories(), selectedIndex, compareCategoriesForImport);
    selectedIndex = result.selectedIndex;
    if (result.changed) markDirty();
    else setStatus(applicationOperationsMessages.categories.sortNoop, 'ok');
    renderAll();
    if (result.changed) animateReorderMotion(el('categoryList'), positions);
  });
  bindClick('renumber', () => {
    commitActiveField();
    if (renumberCategories()) markDirty();
    else setStatus(applicationOperationsMessages.categories.renumberNoop, 'ok');
    renderAll();
  });
  bindClick('lookupReferencedIds', () => {
    commitActiveField();
    lookupReferencedIds().catch(err => setStatus(applicationOperationsMessages.lookup.failed(err), 'err'));
  });
  bindClick('showLookupCache', () => { commitActiveField(); showLookupCacheModal({ lookupCacheStats, clearLookupCache, isLookupCacheProducerActive: lookupCacheOperations.isActive, onLookupCacheProducerChange: lookupCacheOperations.subscribe, translate }); });
  bindClick('showHelp', () => { commitActiveField(); showHelpModal({ translate }); });
  bindClick('showPreferences', () => showPreferencesModal({
    getEditorPreferences: () => editorPreferences,
    applyEditorPreferences,
    setStatus,
    openModal,
    commitActiveField,
    translate
  }));
  bindClick('uploadFile', () => {
    commitActiveField();
    try {
      const input = requireEl('fileInput');
      input.value = '';
      input.click();
    } catch (err) {
      setStatus(applicationDataMessages.import.uploadUnavailable(err), 'err');
    }
  });

  bindClick('showExportCopy', async () => {
    commitActiveField();
    if (getCategories().length === 0) { updateExportControls(); setStatus(applicationExportMessages.availability.exportEmpty, 'warn'); return; }
    let busyShown = false;
    try {
      const snapshot = await makeCompatibleRevisionedExportSnapshot(applicationExportMessages.busy.exportTitle, applicationExportMessages.busy.compression, () => { busyShown = true; });
      if (!snapshot) return;
      const b64 = snapshot.value;
      hideBusy(); busyShown = false;
      if (isModalOpen()) {
        setStatus(applicationExportMessages.export.activeDialog, 'warn');
        return;
      }
      const snapshotCurrent = isSnapshotCurrent(snapshot.revision, dataRevision);
      const wrap = document.createElement('div');
      const snapshotExplanation = snapshotCurrent
        ? applicationExportMessages.export.currentExplanation
        : applicationExportMessages.export.staleExplanation;
      wrap.innerHTML = `<p class="hint">${escapeHtml(snapshotExplanation)}</p><div id="exportError" class="modal-error hidden" role="alert"></div><textarea id="exportText" class="raw" readonly>${escapeHtml(b64)}</textarea><div class="row modal-action-row"><button id="copyExportAgain" class="primary">${escapeHtml(applicationExportMessages.export.copyAgain)}</button></div><p class="hint" id="exportCopyStatus"></p>`;
      openModal(applicationExportMessages.export.title, wrap);
      saveSnapshotIfCurrent(snapshot.revision, dataRevision, {
        onSaved: () => markSaved(applicationExportMessages.savedState.exported),
        onStale: () => setStatus(
          dirty
            ? applicationExportMessages.export.staleDirtyStatus
            : applicationExportMessages.export.staleSavedStatus,
          'warn'
        )
      });
      const copied = await copyTextToClipboard(b64);
      const exportCopyStatus = requireScopedEl(wrap, '#exportCopyStatus', applicationExportMessages.export.bindingContext);
      const exportText = requireScopedEl(wrap, '#exportText', applicationExportMessages.export.bindingContext);
      const copyExportAgain = requireScopedEl(wrap, '#copyExportAgain', applicationExportMessages.export.bindingContext);
      exportCopyStatus.textContent = copied ? applicationExportMessages.export.copied : applicationExportMessages.export.automaticCopyBlocked;
      copyExportAgain.addEventListener('click', async () => {
        commitActiveField();
        const ok = await copyTextToClipboard(exportText.value);
        exportCopyStatus.textContent = ok ? applicationExportMessages.export.copied : applicationExportMessages.export.retryCopyFailed;
        setInlineError('exportError', ok ? '' : applicationExportMessages.export.retryCopyError);
      });
    } catch (err) { if (busyShown) hideBusy(); setStatus(applicationExportMessages.failure.export(err), 'err'); }
  });

  bindClick('downloadBase64', async () => {
    commitActiveField();
    if (getCategories().length === 0) { updateExportControls(); setStatus(applicationExportMessages.availability.downloadEmpty, 'warn'); return; }
    let busyShown = false;
    try {
      const snapshot = await makeCompatibleRevisionedExportSnapshot(applicationExportMessages.busy.downloadTitle, applicationExportMessages.busy.compression, () => { busyShown = true; });
      if (!snapshot) return;
      downloadText(EXPORT_FILENAME, snapshot.value, 'text/plain', { onDownloaded(filename) {
        saveSnapshotIfCurrent(snapshot.revision, dataRevision, {
          onSaved() { markSaved(applicationExportMessages.savedState.downloaded); setStatus(applicationExportMessages.download.success(filename), 'ok'); },
          onStale() {
            setStatus(
              dirty
                ? applicationExportMessages.download.staleDirty(filename)
                : applicationExportMessages.download.staleSaved(filename),
              'warn'
            );
          }
        });
      } });
    }
    catch (err) { setStatus(applicationExportMessages.failure.download(err), 'err'); }
    finally { if (busyShown) hideBusy(); }
  });

  bindChange('fileInput', async e => {
    commitActiveField();
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importText(await readImportFileText(file), file.name);
    } catch (err) { setStatus(applicationDataMessages.import.fileFailed(err), 'err'); }
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
  applyApplicationChromeLocalization(translate);
  setSaveState(applicationDataMessages.import.noChanges);
  bindAppEvents();
  applyEditorPreferences();
  waitForStylesheetReady().then(renderAll);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp, { once: true });
} else {
  startApp();
}
