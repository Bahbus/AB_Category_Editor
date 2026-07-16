import { escapeHtml, setStatus, showBusy, updateBusy, hideBusy } from '../dom.js';
import { sheetLabel, normalizeLookupIds, rowId, rowName } from '../xivapi.js';
import { normalizeRowIdValue } from '../rowIds.js';
import { isUsefulLookupName } from '../lookupNames.js';
import { listMutationFocusPlan } from '../itemOrdering.js';

export function tokenizeListInput(rawInput, splitOnCommas = true) {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) return [];
  if (!splitOnCommas) return [trimmedInput];
  return trimmedInput.split(',').map(value => value.trim()).filter(Boolean);
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
    inputPlaceholder = 'Add one value, or comma-separated values',
    ordered = false,
    preserveInputOnNoop = false
  } = options;

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

  function renderPills() {
    pills.innerHTML = '';

    arr.forEach((v, i) => {
      const pill = document.createElement('span');
      pill.className = 'pill';
      let extra = '';

      if (lookupSheet) {
        const name = lookupName(lookupSheet, v);
        extra = isUsefulLookupName(name) ? ` <span class="pill-name">— ${escapeHtml(name)}</span>` : ' <span class="pill-name">— not looked up</span>';
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
        const moveUpLabel = `Move ${valueLabel} from rank ${rank} up in ${title}`;
        moveUp.title = moveUpLabel;
        moveUp.setAttribute('aria-label', moveUpLabel);
        moveUp.dataset.listFocus = `move-up-${i}`;
        moveUp.onclick = () => {
          if (i === 0) return;
          const plan = listMutationFocusPlan('move', i, arr.length, -1);
          [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
          markDirty();
          renderPills();
          focusOrderedControl([`move-up-${plan.indices[0]}`, `move-down-${plan.indices[0]}`, `remove-${plan.indices[0]}`, 'input']);
          notifyItemsChanged();
        };
        const moveDown = document.createElement('button');
        moveDown.type = 'button';
        moveDown.className = 'pill-icon-button pill-move';
        moveDown.textContent = '↓';
        moveDown.disabled = i === arr.length - 1;
        const moveDownLabel = `Move ${valueLabel} from rank ${rank} down in ${title}`;
        moveDown.title = moveDownLabel;
        moveDown.setAttribute('aria-label', moveDownLabel);
        moveDown.dataset.listFocus = `move-down-${i}`;
        moveDown.onclick = () => {
          if (i === arr.length - 1) return;
          const plan = listMutationFocusPlan('move', i, arr.length, 1);
          [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
          markDirty();
          renderPills();
          focusOrderedControl([`move-down-${plan.indices[0]}`, `move-up-${plan.indices[0]}`, `remove-${plan.indices[0]}`, 'input']);
          notifyItemsChanged();
        };
        pill.append(moveUp, moveDown);
      }
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'pill-icon-button pill-remove';
      const removeLabel = `Remove ${valueLabel} from ${title}`;
      removeButton.title = removeLabel;
      removeButton.setAttribute('aria-label', removeLabel);
      removeButton.textContent = '×';
      if (ordered) removeButton.dataset.listFocus = `remove-${i}`;
      removeButton.onclick = () => {
        const plan = listMutationFocusPlan('remove', i, arr.length - 1);
        arr.splice(i, 1);
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
      empty.textContent = 'Empty';
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
  inputLabel.textContent = `Add value to ${title}`;

  const input = document.createElement('input');
  input.id = inputId;
  input.className = 'inline-input';
  input.placeholder = inputPlaceholder;
  if (ordered) input.dataset.listFocus = 'input';

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'icon-button add-icon-button';
  add.textContent = '+';
  add.setAttribute('aria-label', `Add value to ${title}`);
  add.title = `Add value to ${title}`;
  function syncAddButtonState() {
    add.disabled = input.value.trim().length === 0;
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
        setStatus('No new values added; all were already present.');
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
        setStatus(`Added ${added} value(s); skipped ${skippedDuplicates} duplicate(s).`);
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
    const lookupLabel = `Lookup ${sheetLabel(lookupSheet)} names`;
    lookupButton.setAttribute('aria-label', lookupLabel);
    lookupButton.title = lookupLabel;
    lookupButton.onclick = async () => {
      let busyShown = false;
      let releaseLookupCacheProducer = null;
      try {
        lookupButton.disabled = true;
        const ids = normalizeLookupIds(arr);
        const missing = ids.filter(id => !isUsefulLookupName(lookupName(lookupSheet, id)));

        if (!missing.length) {
          setStatus(`All ${ids.length} ${sheetLabel(lookupSheet)} name(s) already cached.`, 'ok');
          renderPills();
          return;
        }

        releaseLookupCacheProducer = acquireLookupCacheProducer();
        showBusy(`Looking up ${sheetLabel(lookupSheet)} names`, `0/${missing.length} uncached checked`, 0);
        busyShown = true;

        {
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
        }

        renderPills();
      } catch (err) {
        setStatus(err.message, 'err');
      } finally {
        releaseLookupCacheProducer?.();
        if (busyShown) hideBusy();
        lookupButton.disabled = false;
      }
    };
    pillsWrap.appendChild(lookupButton);
    updateLookupButtonVisibility();

    const searchWrap = document.createElement('div');
    searchWrap.className = 'lookup-search-block';
    const searchId = `lookup-search-${Math.random().toString(36).slice(2)}`;
    searchWrap.innerHTML = `<label for="${searchId}">Search ${escapeHtml(sheetLabel(lookupSheet))} by English name</label><div class="row lookup-search-row"><input id="${searchId}" class="lookupSearchInput inline-input" placeholder="Example: potion, materia, weapon"><button class="lookupSearchButton">Search</button></div><div class="lookup-results"></div>`;

    const searchInput = searchWrap.querySelector('.lookupSearchInput');
    const searchButton = searchWrap.querySelector('.lookupSearchButton');
    const resultsBox = searchWrap.querySelector('.lookup-results');

    searchButton.onclick = async () => {
      const query = searchInput.value.trim();
      if (!query) return;
      const releaseLookupCacheProducer = acquireLookupCacheProducer();

      try {
        searchButton.disabled = true;
        resultsBox.innerHTML = '<span class="hint">Searching...</span>';

        const results = await searchXivapi(lookupSheet, query);
        resultsBox.innerHTML = '';

        if (!results.length) {
          resultsBox.innerHTML = '<span class="hint">No results.</span>';
          return;
        }

        let rendered = 0;
        for (const result of results) {
          const id = normalizeRowIdValue(rowId(result));
          if (id === null) continue;

          const name = rowName(result);
          const displayName = isUsefulLookupName(name) ? name : '(name unavailable)';
          if (isUsefulLookupName(name)) {
            const cache = lookupCache[lookupSheet] || (lookupCache[lookupSheet] = {});
            cache[String(id)] = name;
            saveLookupCache();
          }

          const r = document.createElement('div');
          r.className = 'lookup-row';
          r.innerHTML = `<span>#${escapeHtml(id)}</span><span>${escapeHtml(displayName)}</span><button class="icon-button add-icon-button">+</button>`;
          const addButton = r.querySelector('button');
          addButton.setAttribute('aria-label', `Add ${displayName} #${id} to ${title}`);
          addButton.title = `Add ${displayName} #${id} to ${title}`;
          addButton.onclick = () => {
            if (!arr.some(value => normalizeRowIdValue(value) === id)) {
              arr.push(id);
              markDirty();
              renderPills();
              notifyItemsChanged();
            }
          };
          resultsBox.appendChild(r);
          rendered++;
        }

        if (!rendered) {
          resultsBox.innerHTML = '<span class="hint">No usable results with valid row IDs.</span>';
          setStatus('No usable search results with valid row IDs.');
          return;
        }

        setStatus(`Search complete`, 'ok');
      } catch (err) {
        resultsBox.innerHTML = '';
        setStatus(err.message, 'err');
      } finally {
        releaseLookupCacheProducer();
        searchButton.disabled = false;
      }
    };

    card.append(pillsWrap, validationBox, row, searchWrap);
  } else {
    card.append(pillsWrap, validationBox, row);
  }

  renderPills();
  return card;
}
