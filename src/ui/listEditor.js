import { escapeHtml, setStatus, showBusy, updateBusy, hideBusy, syncButtonTooltip } from '../dom.js';
import { sheetLabel, normalizeLookupIds, rowId, rowName } from '../xivapi.js';
import { normalizeRowIdValue } from '../rowIds.js';
import { isUsefulLookupName } from '../lookupNames.js';
import { listMutationFocusPlan } from '../itemOrdering.js';
import { lookupResultAddAvailable, textActionAvailable } from '../actionAvailability.js';
import {
  animateReorderMotion,
  cancelReorderMotion,
  captureReorderMotion,
  createOccurrenceMotionKeys,
  moveOccurrenceMotionKey,
  syncOccurrenceMotionKeys
} from '../reorderMotion.js';

export function tokenizeListInput(rawInput, splitOnCommas = true) {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) return [];
  if (!splitOnCommas) return [trimmedInput];
  return trimmedInput.split(',').map(value => value.trim()).filter(Boolean);
}

export function createListEditorMessages(translate, { title, sheet = '' }) {
  return Object.freeze({
    empty: translate('listEditor.empty'),
    defaultPlaceholder: translate('listEditor.input.placeholder'),
    addLabel: translate('listEditor.add.label', { title }),
    moveUpLabel: (value, rank) => translate('listEditor.moveUp.label', { value, rank, title }),
    moveDownLabel: (value, rank) => translate('listEditor.moveDown.label', { value, rank, title }),
    removeLabel: value => translate('listEditor.remove.label', { value, title }),
    unresolvedName: translate('listEditor.lookup.unresolved'),
    duplicateAll: translate('listEditor.duplicate.all'),
    duplicatePartial: (added, duplicates) => translate('listEditor.duplicate.partial', { added, duplicates }),
    lookupLabel: translate('listEditor.lookup.names.label', { sheet }),
    allCached: total => translate('listEditor.lookup.allCached', { total, sheet }),
    lookupBusyTitle: translate('listEditor.lookup.busy.title', { sheet }),
    lookupProgress: (done, total) => translate('listEditor.lookup.busy.progress', { done, total }),
    lookupStatus: (done, total) => translate('listEditor.lookup.status.progress', { done, total, sheet }),
    failureMore: count => translate('listEditor.lookup.failure.more', { count }),
    lookupFailure: (count, details) => translate('listEditor.lookup.failure', { sheet, count, details }),
    lookupComplete: translate('listEditor.lookup.complete', { sheet }),
    searchLabel: translate('listEditor.search.label', { sheet }),
    searchPlaceholder: translate('listEditor.search.placeholder'),
    searchAction: translate('listEditor.search.action'),
    searchProgress: translate('listEditor.search.progress'),
    noResults: translate('listEditor.search.noResults'),
    nameUnavailable: translate('listEditor.search.nameUnavailable'),
    addResultLabel: (name, id) => translate('listEditor.search.addResult', { name, id, title }),
    addResultFallback: translate('listEditor.search.addResultFallback'),
    noUsableResults: translate('listEditor.search.noUsableResults'),
    noUsableStatus: translate('listEditor.search.noUsableStatus'),
    searchComplete: translate('listEditor.search.complete')
  });
}

export function listEditor(title, arr, parser, formatter, options = {}) {
  const {
    hint = '',
    lookupSheet = null,
    lookupName,
    fetchLookupBatch,
    searchXivapi,
    lookupCache,
    saveLookupCache,
    acquireLookupCacheProducer,
    markDirty,
    validateValue = null,
    validateList = null,
    onItemsChanged = null,
    dedupeValues = false,
    dedupeKey = value => value,
    splitInputOnCommas = true,
    inputPlaceholder = null,
    ordered = false,
    preserveInputOnNoop = false,
    onAvailabilityChanged = null,
    translate
  } = options;
  const sheet = lookupSheet ? sheetLabel(lookupSheet) : '';
  const messages = createListEditorMessages(translate, { title, sheet });

  const card = document.createElement('div');
  card.className = 'card';
  const validationId = `list-validation-${Math.random().toString(36).slice(2)}`;
  card.innerHTML = `<h3>${escapeHtml(title)}</h3>${hint ? `<p class="hint">${escapeHtml(hint)}</p>` : ''}`;

  const validationBox = document.createElement('div');
  validationBox.id = validationId;
  validationBox.className = 'validation-list';
  validationBox.hidden = true;

  function renderValidation(extraFindings = []) {
    const findings = [...(validateList ? validateList(arr) : []), ...extraFindings];
    validationBox.hidden = findings.length === 0;
    validationBox.innerHTML = findings.map(item => `<p class="field-${item.severity}">${escapeHtml(item.message)}</p>`).join('');
    input?.classList?.toggle('invalid', extraFindings.some(item => item.severity === 'error'));
    if (extraFindings.some(item => item.severity === 'error')) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', validationId);
    } else if (input) {
      input.setAttribute('aria-invalid', 'false');
      input.removeAttribute('aria-describedby');
    }
  }

  const pills = document.createElement('div');
  pills.className = 'pill-list';
  const pillMotionKeys = createOccurrenceMotionKeys(arr.length, 'list-item');
  const pillsWrap = document.createElement('div');
  pillsWrap.className = 'pill-list-shell';
  pillsWrap.appendChild(pills);
  let lookupButton = null;

  function updateLookupButtonVisibility() {
    if (!lookupButton) return;
    const missing = normalizeLookupIds(arr).filter(id => !isUsefulLookupName(lookupName(lookupSheet, id)));
    const showLookup = missing.length > 0;
    lookupButton.hidden = !showLookup;
    pillsWrap.classList.toggle('has-pill-lookup', showLookup);
  }

  function focusOrderedControl(keys) {
    if (!ordered) return;
    for (const key of keys) {
      const target = card.querySelector(`[data-list-focus="${key}"]`);
      if (target && !target.disabled && !target.hidden) {
        target.focus();
        break;
      }
    }
  }

  function notifyItemsChanged() {
    if (typeof onItemsChanged === 'function') onItemsChanged(arr);
  }

  function notifyAvailabilityChanged() {
    if (typeof onAvailabilityChanged === 'function') onAvailabilityChanged();
  }

  function renderPills() {
    cancelReorderMotion(pills);
    pills.innerHTML = '';
    syncOccurrenceMotionKeys(pillMotionKeys, arr.length, 'list-item');

    arr.forEach((v, i) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      if (ordered) pill.dataset.reorderMotionKey = pillMotionKeys[i];
      let extra = '';

      if (lookupSheet) {
        const name = lookupName(lookupSheet, v);
        extra = isUsefulLookupName(name) ? ` <span class="pill-name">— ${escapeHtml(name)}</span>` : ` <span class="pill-name">— ${escapeHtml(messages.unresolvedName)}</span>`;
      }

      const valueLabel = formatter(v);
      pill.innerHTML = `<span>${escapeHtml(valueLabel)}</span>${extra}`;
      if (ordered) {
        const rank = i + 1;
        const moveUp = document.createElement('button');
        moveUp.type = 'button';
        moveUp.className = 'pill-icon-button pill-move';
        moveUp.textContent = '↑';
        moveUp.disabled = i === 0;
        const moveUpLabel = messages.moveUpLabel(valueLabel, rank);
        syncButtonTooltip(moveUp, moveUpLabel);
        moveUp.setAttribute('aria-label', moveUpLabel);
        moveUp.dataset.listFocus = `move-up-${i}`;
        moveUp.onclick = () => {
          if (i === 0) return;
          const plan = listMutationFocusPlan('move', i, arr.length, -1);
          const positions = captureReorderMotion(pills);
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          moveOccurrenceMotionKey(pillMotionKeys, i, -1);
          markDirty();
          renderPills();
          animateReorderMotion(pills, positions);
          focusOrderedControl([`move-up-${plan.indices[0]}`, `move-down-${plan.indices[0]}`, `remove-${plan.indices[0]}`, 'input']);
          notifyItemsChanged();
        };
        const moveDown = document.createElement('button');
        moveDown.type = 'button';
        moveDown.className = 'pill-icon-button pill-move';
        moveDown.textContent = '↓';
        moveDown.disabled = i === arr.length - 1;
        const moveDownLabel = messages.moveDownLabel(valueLabel, rank);
        syncButtonTooltip(moveDown, moveDownLabel);
        moveDown.setAttribute('aria-label', moveDownLabel);
        moveDown.dataset.listFocus = `move-down-${i}`;
        moveDown.onclick = () => {
          if (i === arr.length - 1) return;
          const plan = listMutationFocusPlan('move', i, arr.length, 1);
          const positions = captureReorderMotion(pills);
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          moveOccurrenceMotionKey(pillMotionKeys, i, 1);
          markDirty();
          renderPills();
          animateReorderMotion(pills, positions);
          focusOrderedControl([`move-down-${plan.indices[0]}`, `move-up-${plan.indices[0]}`, `remove-${plan.indices[0]}`, 'input']);
          notifyItemsChanged();
        };
        pill.append(moveUp, moveDown);
      }
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'pill-icon-button pill-remove';
      const removeLabel = messages.removeLabel(valueLabel);
      removeButton.title = removeLabel;
      removeButton.setAttribute('aria-label', removeLabel);
      removeButton.textContent = '×';
      if (ordered) removeButton.dataset.listFocus = `remove-${i}`;
      removeButton.onclick = () => {
        const plan = listMutationFocusPlan('remove', i, arr.length - 1);
        arr.splice(i, 1);
        pillMotionKeys.splice(i, 1);
        markDirty();
        renderPills();
        focusOrderedControl([...plan.indices.map(position => `remove-${position}`), 'input']);
        notifyItemsChanged();
      };
      pill.appendChild(removeButton);
      pills.appendChild(pill);
    });

    renderValidation();

    if (!arr.length) {
      const empty = document.createElement('span');
      empty.className = 'hint';
      empty.textContent = messages.empty;
      pills.appendChild(empty);
    }
    updateLookupButtonVisibility();
  }

  const row = document.createElement('div');
  row.className = 'row list-editor-row';

  const inputId = `list-editor-input-${Math.random().toString(36).slice(2)}`;
  const inputLabel = document.createElement('label');
  inputLabel.className = 'sr-only';
  inputLabel.htmlFor = inputId;
  inputLabel.textContent = messages.addLabel;

  const input = document.createElement('input');
  input.id = inputId;
  input.className = 'inline-input';
  input.placeholder = inputPlaceholder ?? messages.defaultPlaceholder;
  if (ordered) input.dataset.listFocus = 'input';

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'icon-button add-icon-button input-paired-icon';
  add.textContent = '+';
  add.setAttribute('aria-label', messages.addLabel);
  const addLabel = messages.addLabel;
  function syncAddButtonState() {
    add.disabled = input.value.trim().length === 0;
    syncButtonTooltip(add, addLabel);
  }
  syncAddButtonState();
  add.onclick = () => {
    const raw = input.value.trim();
    if (!raw) return;

    const parts = tokenizeListInput(raw, splitInputOnCommas);

    try {
      const parsedParts = [];
      for (const part of parts) {
        const findingList = validateValue ? validateValue(part) : [];
        if (findingList.some(item => item.severity === 'error')) {
          renderValidation(findingList);
          return;
        }
        parsedParts.push(parser(part));
      }
      let added = 0;
      let skippedDuplicates = 0;
      for (const part of parsedParts) {
        if (dedupeValues) {
          const key = dedupeKey(part);
          if (arr.some(existing => dedupeKey(existing) === key)) {
            skippedDuplicates++;
            continue;
          }
        }
        arr.push(part);
        added++;
      }
      if (!added) {
        if (!preserveInputOnNoop) {
          input.value = '';
          syncAddButtonState();
        }
        setStatus(messages.duplicateAll);
        renderValidation();
        return;
      }
      input.value = '';
      syncAddButtonState();
      markDirty();
      renderPills();
      focusOrderedControl(['input']);
      notifyItemsChanged();
      if (skippedDuplicates) {
        setStatus(messages.duplicatePartial(added, skippedDuplicates));
      }
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
  input.addEventListener('input', syncAddButtonState);

  row.append(inputLabel, input, add);

  if (lookupSheet) {
    lookupButton = document.createElement('button');
    lookupButton.type = 'button';
    lookupButton.className = 'icon-button pill-lookup-button';
    lookupButton.textContent = '🔍';
    const lookupLabel = messages.lookupLabel;
    lookupButton.setAttribute('aria-label', lookupLabel);
    syncButtonTooltip(lookupButton, lookupLabel);
    lookupButton.onclick = async () => {
      let busyShown = false;
      let releaseLookupCacheProducer = null;
      try {
        lookupButton.disabled = true;
        syncButtonTooltip(lookupButton, lookupLabel);
        const ids = normalizeLookupIds(arr);
        const missing = ids.filter(id => !isUsefulLookupName(lookupName(lookupSheet, id)));

        if (!missing.length) {
          setStatus(messages.allCached(ids.length), 'ok');
          renderPills();
          return;
        }

        releaseLookupCacheProducer = acquireLookupCacheProducer();
        showBusy(messages.lookupBusyTitle, messages.lookupProgress(0, missing.length), 0);
        busyShown = true;

        {
          const failures = await fetchLookupBatch(lookupSheet, missing, {
            onProgress(done, total) {
              const percent = total ? (done / total) * 100 : 100;
              setStatus(messages.lookupStatus(done, total));
              updateBusy(messages.lookupProgress(done, total), percent);
            }
          });

          if (failures.length) {
            const shown = failures.slice(0, 5).map(failure => `#${failure.id}`).join(', ');
            const more = failures.length > 5 ? messages.failureMore(failures.length - 5) : '';
            setStatus(messages.lookupFailure(failures.length, `${shown}${more}`), 'warn');
          } else {
            setStatus(messages.lookupComplete, 'ok');
          }
        }

        renderPills();
        notifyAvailabilityChanged();
      } catch (err) {
        setStatus(err.message, 'err');
      } finally {
        releaseLookupCacheProducer?.();
        if (busyShown) hideBusy();
        lookupButton.disabled = false;
        syncButtonTooltip(lookupButton, lookupLabel);
      }
    };
    pillsWrap.appendChild(lookupButton);
    updateLookupButtonVisibility();

    const searchWrap = document.createElement('div');
    searchWrap.className = 'lookup-search-block';
    const searchId = `lookup-search-${Math.random().toString(36).slice(2)}`;
    searchWrap.innerHTML = `<label for="${searchId}">${escapeHtml(messages.searchLabel)}</label><div class="row lookup-search-row"><input id="${searchId}" class="lookupSearchInput inline-input" placeholder="${escapeHtml(messages.searchPlaceholder)}"><button class="lookupSearchButton">${escapeHtml(messages.searchAction)}</button></div><div class="lookup-results"></div>`;

    const searchInput = searchWrap.querySelector('.lookupSearchInput');
    const searchButton = searchWrap.querySelector('.lookupSearchButton');
    const resultsBox = searchWrap.querySelector('.lookup-results');
    let searchRunning = false;

    function syncSearchButtonState() {
      searchButton.disabled = !textActionAvailable(searchInput.value, searchRunning);
    }

    function syncRenderedResultActions() {
      for (const button of resultsBox.querySelectorAll('button[data-lookup-row-id]')) {
        const id = normalizeRowIdValue(button.dataset.lookupRowId);
        button.disabled = !lookupResultAddAvailable(id, arr);
        syncButtonTooltip(button, button.dataset.enabledTitle || messages.addResultFallback);
      }
    }

    syncSearchButtonState();
    searchInput.addEventListener('input', syncSearchButtonState);
    searchInput.addEventListener('keydown', event => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      if (!searchButton.disabled) searchButton.click();
    });

    searchButton.onclick = async () => {
      const query = searchInput.value.trim();
      if (!textActionAvailable(query, searchRunning)) return;
      searchRunning = true;
      syncSearchButtonState();
      const releaseLookupCacheProducer = acquireLookupCacheProducer();

      try {
        resultsBox.innerHTML = `<span class="hint">${escapeHtml(messages.searchProgress)}</span>`;

        const results = await searchXivapi(lookupSheet, query);
        resultsBox.innerHTML = '';

        if (!results.length) {
          resultsBox.innerHTML = `<span class="hint">${escapeHtml(messages.noResults)}</span>`;
          return;
        }

        let rendered = 0;
        for (const result of results) {
          const id = normalizeRowIdValue(rowId(result));
          if (id === null) continue;

          const name = rowName(result);
          const displayName = isUsefulLookupName(name) ? name : messages.nameUnavailable;
          if (isUsefulLookupName(name)) {
            const cache = lookupCache[lookupSheet] || (lookupCache[lookupSheet] = {});
            cache[String(id)] = name;
            saveLookupCache();
            notifyAvailabilityChanged();
          }

          const r = document.createElement('div');
          r.className = 'lookup-row';
          r.innerHTML = `<span>#${escapeHtml(id)}</span><span>${escapeHtml(displayName)}</span><button class="icon-button add-icon-button">+</button>`;
          const addButton = r.querySelector('button');
          const addLabel = messages.addResultLabel(displayName, id);
          addButton.setAttribute('aria-label', addLabel);
          addButton.dataset.lookupRowId = String(id);
          addButton.dataset.enabledTitle = addLabel;
          addButton.disabled = !lookupResultAddAvailable(id, arr);
          syncButtonTooltip(addButton, addLabel);
          addButton.onclick = () => {
            if (!lookupResultAddAvailable(id, arr)) { syncRenderedResultActions(); return; }
            arr.push(id);
            markDirty();
            renderPills();
            syncRenderedResultActions();
            notifyItemsChanged();
          };
          resultsBox.appendChild(r);
          rendered++;
        }

        if (!rendered) {
          resultsBox.innerHTML = `<span class="hint">${escapeHtml(messages.noUsableResults)}</span>`;
          setStatus(messages.noUsableStatus);
          return;
        }

        setStatus(messages.searchComplete, 'ok');
      } catch (err) {
        resultsBox.innerHTML = '';
        setStatus(err.message, 'err');
      } finally {
        releaseLookupCacheProducer();
        searchRunning = false;
        syncSearchButtonState();
        notifyAvailabilityChanged();
      }
    };

    card.append(pillsWrap, validationBox, row, searchWrap);
  } else {
    card.append(pillsWrap, validationBox, row);
  }

  renderPills();
  return card;
}
