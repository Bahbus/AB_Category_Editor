import { escapeHtml, requireScopedEl, setStatus, showBusy, updateBusy, hideBusy } from '../dom.js';
import { openModal, closeModal } from '../modals.js';
import { fetchItemRowsPage, extractSheetRows, extractNextCursor, rowId, rowName } from '../xivapi.js';
import { XivapiRequestTimeoutError } from '../xivapiRequest.js';
import { normalizeRowIdValue } from '../rowIds.js';
import { isUsefulLookupName } from '../lookupNames.js';
import { compileBrowserPattern, removeSavedPatternAtSourceIndex, selectUsableSavedPatterns } from '../patternSemantics.js';
import { regexAddMatchesAvailable, regexScanAvailable } from '../actionAvailability.js';
import {
  createRegexBatchEvaluator,
  evaluateCandidateBatches,
  RegexBatchTimeoutError,
  RegexWorkerCanceledError
} from './regexBatchEvaluator.js';
import { createRegexToItemIdsMessages } from './regexToItemIdsMessages.js';

export function openRegexToItemIdsTool(deps) {
  const {
    getCategories,
    getSelectedIndex,
    ensureShape,
    lookupCache,
    saveLookupCache,
    acquireLookupCacheProducer,
    markDirty,
    renderAll,
    translate,
    onAvailabilityChanged = null,
    createRegexEvaluator = createRegexBatchEvaluator
  } = deps;
  const cat = getCategories()[getSelectedIndex()];
  if (!cat) return;
  ensureShape(cat);
  const messages = createRegexToItemIdsMessages(translate);
  const patterns = cat.Rules.AllowedItemNamePatterns || [];
  const savedPatternSelection = selectUsableSavedPatterns(patterns);
  const savedPatternOptions = savedPatternSelection.options;
  const firstSavedPattern = savedPatternOptions[0] || null;
  const wrap = document.createElement('div');
  const options = savedPatternOptions.map(({ pattern, sourceIndex }) => `<option value="${sourceIndex}">${escapeHtml(pattern)}</option>`).join('');
  const omittedPatternCopy = savedPatternSelection.omittedCount
    ? `<p class="field-warning">${escapeHtml(messages.modal.omittedPatterns(savedPatternSelection.omittedCount.toLocaleString()))}</p>`
    : '';
  let matches = [];
  let activeScan = null;

  const stopActiveScan = () => {
    if (!activeScan || activeScan.canceled) return false;
    activeScan.canceled = true;
    activeScan.controller.abort();
    activeScan.evaluator.cancel();
    return true;
  };

  wrap.innerHTML = `
    <p class="hint">${escapeHtml(messages.modal.introduction)}</p>
    ${omittedPatternCopy}
    <div>
      <label for="regexPatternSelect">${escapeHtml(messages.modal.patternLabel)}</label>
      <select id="regexPatternSelect">
        <option value="custom">${escapeHtml(messages.modal.customPattern)}</option>
        ${options}
      </select>
    </div>
    <div class="modal-action-row">
      <label for="regexPatternInput">${escapeHtml(messages.modal.regexLabel)}</label>
      <input id="regexPatternInput" value="${escapeHtml(firstSavedPattern?.pattern || '')}" placeholder="${escapeHtml(messages.modal.placeholder)}">
    </div>
    <div class="grid cols-3 modal-action-row">
      <div>
        <label for="regexMaxMatches">${escapeHtml(messages.modal.maxMatchesLabel)}</label>
        <input id="regexMaxMatches" type="number" min="1" step="1" value="5000">
      </div>
      <div>
        <label for="regexPageSize">${escapeHtml(messages.modal.pageSizeLabel)}</label>
        <input id="regexPageSize" type="number" min="100" max="5000" step="100" value="3000">
      </div>
      <div>
        <label for="regexRemovePattern">${escapeHtml(messages.modal.addBehaviorLabel)}</label>
        <select id="regexRemovePattern">
          <option value="keep">${escapeHtml(messages.modal.keepPattern)}</option>
          <option value="remove">${escapeHtml(messages.modal.removePattern)}</option>
        </select>
      </div>
    </div>
    <div class="row modal-action-row modal-action-row-loose">
      <button id="runRegexScan" class="primary">${escapeHtml(messages.modal.scan)}</button>
      <button id="cancelRegexScan" disabled hidden>${escapeHtml(messages.modal.cancel)}</button>
      <button id="addRegexMatches" disabled>${escapeHtml(messages.modal.add)}</button>
    </div>
    <p class="hint" id="regexScanSummary"></p>
    <div class="regex-results" id="regexResults"></div>
  `;

  openModal(messages.modal.title, wrap, {
    onClose: () => {
      if (stopActiveScan()) updateBusy(messages.scan.cancelingBusy, null);
    }
  });

  const select = requireScopedEl(wrap, '#regexPatternSelect', messages.modal.bindingContext);
  const input = requireScopedEl(wrap, '#regexPatternInput', messages.modal.bindingContext);
  const runButton = requireScopedEl(wrap, '#runRegexScan', messages.modal.bindingContext);
  const cancelButton = requireScopedEl(wrap, '#cancelRegexScan', messages.modal.bindingContext);
  const maxMatchesInput = requireScopedEl(wrap, '#regexMaxMatches', messages.modal.bindingContext);
  const pageSizeInput = requireScopedEl(wrap, '#regexPageSize', messages.modal.bindingContext);
  const removePatternSelect = requireScopedEl(wrap, '#regexRemovePattern', messages.modal.bindingContext);
  const addButton = requireScopedEl(wrap, '#addRegexMatches', messages.modal.bindingContext);
  const resultsBox = requireScopedEl(wrap, '#regexResults', messages.modal.bindingContext);
  const summary = requireScopedEl(wrap, '#regexScanSummary', messages.modal.bindingContext);

  const selectedPatternCanBeRemoved = () => removePatternSelect.value === 'remove'
    && select.value !== 'custom'
    && savedPatternOptions.some(option => option.sourceIndex === Number(select.value));

  const syncAddButtonState = () => {
    addButton.disabled = !regexAddMatchesAvailable({
      matches,
      existingIds: cat.Rules.AllowedItemIds || [],
      canRemoveSelectedPattern: selectedPatternCanBeRemoved(),
      running: Boolean(activeScan)
    });
  };

  const syncRunButtonState = () => {
    runButton.disabled = !regexScanAvailable(input.value, Boolean(activeScan));
  };

  const setScanControls = running => {
    syncRunButtonState();
    cancelButton.disabled = !running;
    cancelButton.hidden = !running;
    select.disabled = running;
    input.disabled = running;
    maxMatchesInput.disabled = running;
    pageSizeInput.disabled = running;
    removePatternSelect.disabled = running;
    syncAddButtonState();
  };

  const renderRegexMatches = () => {
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
      more.textContent = messages.results.truncated(matches.length.toLocaleString());
      resultsBox.appendChild(more);
    }
  };

  const isAbortError = err => err?.name === 'AbortError';

  select.onchange = () => {
    if (select.value !== 'custom') {
      const selected = savedPatternOptions.find(option => option.sourceIndex === Number(select.value));
      input.value = selected?.pattern || '';
    }
    syncRunButtonState();
    syncAddButtonState();
  };
  if (firstSavedPattern) select.value = String(firstSavedPattern.sourceIndex);
  input.addEventListener('input', syncRunButtonState);
  removePatternSelect.addEventListener('change', syncAddButtonState);
  syncRunButtonState();
  syncAddButtonState();

  cancelButton.onclick = () => {
    if (!stopActiveScan()) return;
    cancelButton.disabled = true;
    summary.textContent = messages.scan.cancelingSummary;
    updateBusy(messages.scan.cancelingBusy, null);
  };

  runButton.onclick = async () => {
    if (activeScan) return;

    const compilation = compileBrowserPattern(input.value);
    if (compilation.status === 'blank') {
      setStatus(messages.scan.blankPattern, 'err');
      return;
    }
    if (compilation.status === 'incompatible') {
      setStatus(messages.scan.incompatiblePattern(compilation.error), 'err');
      return;
    }
    let evaluator;
    try {
      evaluator = createRegexEvaluator({ pattern: input.value });
    } catch (err) {
      setStatus(messages.scan.workerUnavailable(err), 'err');
      return;
    }

    matches = [];
    syncAddButtonState();
    resultsBox.innerHTML = '';
    summary.textContent = '';

    const maxMatches = Math.max(1, Math.floor(Number(maxMatchesInput.value) || 5000));
    const pageSize = Math.max(100, Math.min(5000, Number(pageSizeInput.value) || 3000));
    let after = null;
    let scanned = 0;
    let pages = 0;
    let keepGoing = true;
    let cacheChanged = false;
    const matchedIds = new Set();
    const scanState = { controller: new AbortController(), canceled: false, evaluator };
    activeScan = scanState;
    setScanControls(true);
    let releaseLookupCacheProducer = null;
    let busyShown = false;

    try {
      releaseLookupCacheProducer = acquireLookupCacheProducer();
      showBusy(messages.scan.busyTitle, messages.scan.busyStarting, 0);
      busyShown = true;
      while (keepGoing) {
        const payload = await fetchItemRowsPage(after, pageSize, { signal: scanState.controller.signal });
        const rows = extractSheetRows(payload);
        pages++;
        if (!rows.length) break;

        const candidates = [];
        for (const row of rows) {
          const id = normalizeRowIdValue(rowId(row));
          const name = rowName(row);
          if (id === null || typeof name !== 'string' || !name) continue;
          candidates.push({ id, name });
        }

        const pageResult = await evaluateCandidateBatches({
          evaluator,
          candidates,
          matches,
          matchedIds,
          maxMatches,
          onBatch: ({ evaluatedCount, addedMatches }) => {
            scanned += evaluatedCount;
            for (const { id, name } of addedMatches) {
              if (!isUsefulLookupName(name)) continue;
              const cache = lookupCache.Item || (lookupCache.Item = {});
              cache[String(id)] = name;
              cacheChanged = true;
            }
            summary.textContent = messages.scan.progressSummary(
              scanned.toLocaleString(),
              matches.length.toLocaleString(),
              pages.toLocaleString()
            );
            updateBusy(messages.scan.progressBusy(
              scanned.toLocaleString(),
              matches.length.toLocaleString(),
              pages.toLocaleString()
            ), null);
          }
        });
        if (pageResult.limitReached) keepGoing = false;

        saveLookupCache();
        cacheChanged = false;
        summary.textContent = messages.scan.progressSummary(
          scanned.toLocaleString(),
          matches.length.toLocaleString(),
          pages.toLocaleString()
        );
        updateBusy(messages.scan.progressBusy(
          scanned.toLocaleString(),
          matches.length.toLocaleString(),
          pages.toLocaleString()
        ), null);

        if (scanState.canceled) break;
        await new Promise(resolve => setTimeout(resolve, 0));

        const next = extractNextCursor(payload, rows);
        if (!next || next === after || !keepGoing) break;
        after = next;
      }

      if (scanState.canceled) {
        summary.textContent = messages.scan.canceledSummary(
          scanned.toLocaleString(),
          matches.length.toLocaleString()
        );
        setStatus(messages.scan.canceledStatus, 'ok');
      } else {
        summary.textContent = messages.scan.completeSummary(
          matches.length.toLocaleString(),
          scanned.toLocaleString()
        );
        setStatus(messages.scan.completeStatus, 'ok');
      }
      renderRegexMatches();
      syncAddButtonState();
    } catch (err) {
      if (cacheChanged) {
        saveLookupCache();
        cacheChanged = false;
      }
      if (err instanceof RegexBatchTimeoutError) {
        scanState.controller.abort();
        summary.textContent = messages.scan.batchTimeoutSummary(
          scanned.toLocaleString(),
          matches.length.toLocaleString()
        );
        renderRegexMatches();
        syncAddButtonState();
        setStatus(messages.scan.batchTimeoutStatus(err.deadlineMs / 1000), 'err');
      } else if (err instanceof XivapiRequestTimeoutError) {
        summary.textContent = messages.scan.xivapiTimeoutSummary(
          scanned.toLocaleString(),
          matches.length.toLocaleString()
        );
        renderRegexMatches();
        syncAddButtonState();
        setStatus(messages.scan.xivapiTimeoutStatus(err.deadlineMs / 1000), 'err');
      } else if (scanState.canceled || err instanceof RegexWorkerCanceledError || isAbortError(err)) {
        scanState.canceled = true;
        summary.textContent = messages.scan.canceledSummary(
          scanned.toLocaleString(),
          matches.length.toLocaleString()
        );
        renderRegexMatches();
        syncAddButtonState();
        setStatus(messages.scan.canceledStatus, 'ok');
      } else {
        if (matches.length) {
          summary.textContent = messages.scan.partialFailureSummary(
            scanned.toLocaleString(),
            matches.length.toLocaleString()
          );
          renderRegexMatches();
          syncAddButtonState();
        }
        setStatus(messages.scan.failed(err), 'err');
      }
    } finally {
      evaluator.dispose();
      releaseLookupCacheProducer?.();
      if (activeScan === scanState) activeScan = null;
      setScanControls(false);
      if (busyShown) hideBusy();
      if (typeof onAvailabilityChanged === 'function') onAvailabilityChanged();
    }
  };

  addButton.onclick = () => {
    const ids = cat.Rules.AllowedItemIds || (cat.Rules.AllowedItemIds = []);
    if (!regexAddMatchesAvailable({ matches, existingIds: ids, canRemoveSelectedPattern: selectedPatternCanBeRemoved(), running: Boolean(activeScan) })) return;
    const existing = new Set(ids.map(normalizeRowIdValue).filter(id => id !== null));
    let added = 0;
    let removedPattern = false;
    for (const item of matches) {
      const id = normalizeRowIdValue(item.id);
      if (id === null || existing.has(id)) continue;
      ids.push(id);
      existing.add(id);
      added++;
    }

    if (removePatternSelect.value === 'remove' && select.value !== 'custom') {
      const sourceIndex = Number(select.value);
      removedPattern = removeSavedPatternAtSourceIndex(cat.Rules.AllowedItemNamePatterns, sourceIndex);
    }

    if (!added && !removedPattern) {
      setStatus(messages.add.noop);
      closeModal();
      return;
    }

    markDirty();
    setStatus(
      added && removedPattern
        ? messages.add.addedAndRemoved(added.toLocaleString())
        : added
          ? messages.add.added(added.toLocaleString())
          : messages.add.removed,
      'ok'
    );
    closeModal();
    renderAll();
  };
}
