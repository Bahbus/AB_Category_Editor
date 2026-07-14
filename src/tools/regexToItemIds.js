import { escapeHtml, requireScopedEl, setStatus, showBusy, updateBusy, hideBusy } from '../dom.js';
import { openModal, closeModal } from '../modals.js';
import { fetchItemRowsPage, extractSheetRows, extractNextCursor, rowId, rowName } from '../xivapi.js';
import { normalizeRowIdValue } from '../rowIds.js';
import { compileBrowserPattern, removeSavedPatternAtSourceIndex, selectUsableSavedPatterns } from '../patternSemantics.js';

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

export function openRegexToItemIdsTool(deps) {
  const { getCategories, getSelectedIndex, ensureShape, lookupCache, saveLookupCache, acquireLookupCacheProducer, markDirty, renderAll } = deps;
  const cat = getCategories()[getSelectedIndex()];
  if (!cat) return;
  ensureShape(cat);
  const patterns = cat.Rules.AllowedItemNamePatterns || [];
  const savedPatternSelection = selectUsableSavedPatterns(patterns);
  const savedPatternOptions = savedPatternSelection.options;
  const firstSavedPattern = savedPatternOptions[0] || null;
  const wrap = document.createElement('div');
  const options = savedPatternOptions.map(({ pattern, sourceIndex }) => `<option value="${sourceIndex}">${escapeHtml(pattern)}</option>`).join('');
  const omittedPatternCopy = savedPatternSelection.omittedCount
    ? `<p class="field-warning">${savedPatternSelection.omittedCount.toLocaleString()} saved pattern(s) were omitted because they are non-string, empty, or whitespace-only. Correct them in Allowed Item Name Patterns or Raw JSON.</p>`
    : '';
  wrap.innerHTML = `
    <p class="hint">AetherBags matches patterns with case-insensitive, culture-invariant .NET regex. This browser converter approximates that behavior with fixed case-insensitive JavaScript regex against English Item names from XIVAPI; some valid AetherBags patterns cannot be scanned here.</p>
    ${omittedPatternCopy}
    <div>
      <label for="regexPatternSelect">Saved pattern or custom regex</label>
      <select id="regexPatternSelect">
        <option value="custom">Custom regex</option>
        ${options}
      </select>
    </div>
    <div class="modal-action-row">
      <label for="regexPatternInput">Regex</label>
      <input id="regexPatternInput" value="${escapeHtml(firstSavedPattern?.pattern || '')}" placeholder="Example: ^Augmented .*">
    </div>
    <div class="grid cols-3 modal-action-row">
      <div>
        <label for="regexMaxMatches">Max matches to collect</label>
        <input id="regexMaxMatches" type="number" min="1" step="1" value="5000">
      </div>
      <div>
        <label for="regexPageSize">Page size</label>
        <input id="regexPageSize" type="number" min="100" max="5000" step="100" value="3000">
      </div>
      <div>
        <label for="regexRemovePattern">When adding IDs</label>
        <select id="regexRemovePattern">
          <option value="keep">Keep regex filter</option>
          <option value="remove">Remove selected regex filter</option>
        </select>
      </div>
    </div>
    <div class="row modal-action-row modal-action-row-loose">
      <button id="runRegexScan" class="primary">Scan matching items</button>
      <button id="cancelRegexScan" disabled hidden>Cancel scan</button>
      <button id="addRegexMatches" disabled>Add matched IDs</button>
    </div>
    <p class="hint" id="regexScanSummary"></p>
    <div class="regex-results" id="regexResults"></div>
  `;

  openModal('Regex → Item IDs', wrap, {
    onClose: () => {
      if (!activeScan) return;
      activeScan.canceled = true;
      activeScan.controller.abort();
      updateBusy('Canceling Item sheet scan...', null);
    }
  });

  const select = requireScopedEl(wrap, '#regexPatternSelect', 'regex scan');
  const input = requireScopedEl(wrap, '#regexPatternInput', 'regex scan');
  const runButton = requireScopedEl(wrap, '#runRegexScan', 'regex scan');
  const cancelButton = requireScopedEl(wrap, '#cancelRegexScan', 'regex scan');
  const maxMatchesInput = requireScopedEl(wrap, '#regexMaxMatches', 'regex scan');
  const pageSizeInput = requireScopedEl(wrap, '#regexPageSize', 'regex scan');
  const removePatternSelect = requireScopedEl(wrap, '#regexRemovePattern', 'regex scan');
  const addButton = requireScopedEl(wrap, '#addRegexMatches', 'regex scan');
  const resultsBox = requireScopedEl(wrap, '#regexResults', 'regex scan');
  const summary = requireScopedEl(wrap, '#regexScanSummary', 'regex scan');
  let matches = [];
  let activeScan = null;

  const setScanControls = running => {
    runButton.disabled = running;
    cancelButton.disabled = !running;
    cancelButton.hidden = !running;
    select.disabled = running;
    input.disabled = running;
    maxMatchesInput.disabled = running;
    pageSizeInput.disabled = running;
    removePatternSelect.disabled = running;
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
      more.textContent = `Showing first 300 of ${matches.length.toLocaleString()} matches.`;
      resultsBox.appendChild(more);
    }
  };

  const isAbortError = err => err?.name === 'AbortError';

  select.onchange = () => {
    if (select.value === 'custom') return;
    const selected = savedPatternOptions.find(option => option.sourceIndex === Number(select.value));
    input.value = selected?.pattern || '';
  };
  if (firstSavedPattern) select.value = String(firstSavedPattern.sourceIndex);

  cancelButton.onclick = () => {
    if (!activeScan) return;
    activeScan.canceled = true;
    activeScan.controller.abort();
    cancelButton.disabled = true;
    summary.textContent = 'Canceling scan... keeping matches found so far.';
    updateBusy('Canceling Item sheet scan...', null);
  };

  runButton.onclick = async () => {
    if (activeScan) return;

    const compilation = compileBrowserPattern(input.value);
    if (compilation.status === 'blank') {
      setStatus('Enter a nonblank AetherBags pattern before scanning.', 'err');
      return;
    }
    if (compilation.status === 'incompatible') {
      setStatus(`This AetherBags/.NET pattern cannot be scanned by the browser converter because JavaScript regex syntax is incompatible: ${compilation.error.message}`, 'err');
      return;
    }
    const regex = compilation.regex;

    matches = [];
    addButton.disabled = true;
    resultsBox.innerHTML = '';
    summary.textContent = '';

    const maxMatches = Math.max(1, Number(maxMatchesInput.value) || 5000);
    const pageSize = Math.max(100, Math.min(5000, Number(pageSizeInput.value) || 3000));
    let after = null;
    let scanned = 0;
    let pages = 0;
    let keepGoing = true;
    const scanState = { controller: new AbortController(), canceled: false };
    activeScan = scanState;
    setScanControls(true);
    const releaseLookupCacheProducer = acquireLookupCacheProducer();

    showBusy('Scanning items', 'Starting Item sheet scan...', 0);
    try {
      while (keepGoing) {
        const payload = await fetchItemRowsPage(after, pageSize, scanState.controller.signal);
        const rows = extractSheetRows(payload);
        pages++;
        if (!rows.length) break;

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          if (scanState.canceled) {
            keepGoing = false;
            break;
          }
          const row = rows[rowIndex];
          const id = normalizeRowIdValue(rowId(row));
          const name = rowName(row);
          if (id === null || !name) continue;
          scanned++;
          regex.lastIndex = 0;
          if (regex.test(name)) {
            matches.push({ id, name });
            const cache = lookupCache.Item || (lookupCache.Item = {});
            cache[String(id)] = name;
            if (matches.length >= maxMatches) {
              keepGoing = false;
              break;
            }
          }
          if ((rowIndex + 1) % 250 === 0) {
            summary.textContent = `${scanned.toLocaleString()} item rows scanned · ${matches.length.toLocaleString()} matches found · ${pages.toLocaleString()} page(s) fetched`;
            updateBusy(`${scanned.toLocaleString()} items scanned · ${matches.length.toLocaleString()} matches · ${pages.toLocaleString()} page(s)`, null);
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }

        saveLookupCache();
        summary.textContent = `${scanned.toLocaleString()} item rows scanned · ${matches.length.toLocaleString()} matches found · ${pages.toLocaleString()} page(s) fetched`;
        updateBusy(`${scanned.toLocaleString()} items scanned · ${matches.length.toLocaleString()} matches · ${pages.toLocaleString()} page(s)`, null);

        if (scanState.canceled) break;
        await new Promise(resolve => setTimeout(resolve, 0));

        const next = extractNextCursor(payload, rows);
        if (!next || next === after || !keepGoing) break;
        after = next;
      }

      matches = uniqueById(matches);
      if (scanState.canceled) {
        summary.textContent = `Scan canceled after ${scanned.toLocaleString()} item row(s). ${matches.length.toLocaleString()} match(es) found.`;
        setStatus('Regex scan canceled', 'ok');
      } else {
        summary.textContent = `${matches.length.toLocaleString()} match(es) found after scanning ${scanned.toLocaleString()} item row(s).`;
        setStatus('Regex scan complete', 'ok');
      }
      renderRegexMatches();
      addButton.disabled = matches.length === 0;
    } catch (err) {
      if (scanState.canceled || isAbortError(err)) {
        scanState.canceled = true;
        matches = uniqueById(matches);
        summary.textContent = `Scan canceled after ${scanned.toLocaleString()} item row(s). ${matches.length.toLocaleString()} match(es) found.`;
        renderRegexMatches();
        addButton.disabled = matches.length === 0;
        setStatus('Regex scan canceled', 'ok');
      } else {
        setStatus('Regex scan failed: ' + err.message, 'err');
      }
    } finally {
      releaseLookupCacheProducer();
      if (activeScan === scanState) activeScan = null;
      setScanControls(false);
      hideBusy();
    }
  };

  addButton.onclick = () => {
    if (!matches.length) return;
    const ids = cat.Rules.AllowedItemIds || (cat.Rules.AllowedItemIds = []);
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
      setStatus('No new item IDs added; all matches were already present.');
      closeModal();
      return;
    }

    markDirty();
    setStatus(
      added && removedPattern
        ? `Added ${added} item ID(s) and removed selected regex filter.`
        : added
          ? `Added ${added} item ID(s).`
          : 'Removed selected regex filter.',
      'ok'
    );
    closeModal();
    renderAll();
  };
}
