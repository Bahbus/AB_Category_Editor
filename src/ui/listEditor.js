import { escapeHtml, setStatus, showBusy, updateBusy, hideBusy } from '../dom.js';
import { sheetLabel, normalizeLookupIds } from '../xivapi.js';

export function listEditor(title, arr, parser, formatter, options = {}) {
  const {
    hint = '',
    lookupSheet = null,
    lookupName,
    fetchLookupBatch,
    searchXivapi,
    lookupCache,
    saveLookupCache,
    markDirty,
    validateValue = null,
    validateList = null,
    onItemsChanged = null
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
        extra = name ? ` <span class="pill-name">— ${escapeHtml(name)}</span>` : ' <span class="pill-name">— not looked up</span>';
      }

      pill.innerHTML = `<span>${escapeHtml(formatter(v))}</span>${extra}<button title="Remove">×</button>`;
      pill.querySelector('button').onclick = () => {
        arr.splice(i, 1);
        markDirty();
        renderPills();
        notifyItemsChanged();
      };
      pills.appendChild(pill);
    });

    renderValidation();

    if (!arr.length) {
      const empty = document.createElement('span');
      empty.className = 'hint';
      empty.textContent = 'Empty';
      pills.appendChild(empty);
    }
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
  input.placeholder = 'Add one value, or comma-separated values';

  const add = document.createElement('button');
  add.textContent = 'Add';
  add.onclick = () => {
    const raw = input.value.trim();
    if (!raw) return;

    const parts = raw.includes(',')
      ? raw.split(',').map(x => x.trim()).filter(Boolean)
      : [raw];

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
      for (const part of parsedParts) arr.push(part);
      input.value = '';
      markDirty();
      renderPills();
      notifyItemsChanged();
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

  row.append(inputLabel, input, add);

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
    searchWrap.className = 'lookup-search-block';
    const searchId = `lookup-search-${Math.random().toString(36).slice(2)}`;
    searchWrap.innerHTML = `<label for="${searchId}">Search ${escapeHtml(sheetLabel(lookupSheet))} by English name</label><div class="row lookup-search-row"><input id="${searchId}" class="lookupSearchInput inline-input" placeholder="Example: potion, materia, weapon"><button class="lookupSearchButton">Search</button></div><div class="lookup-results"></div>`;

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
          r.innerHTML = `<span>#${escapeHtml(id)}</span><span>${escapeHtml(name)}</span><button class="small">Add</button>`;
          r.querySelector('button').onclick = () => {
            if (!arr.includes(id)) {
              arr.push(id);
              markDirty();
              renderPills();
              notifyItemsChanged();
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

    card.append(pills, validationBox, row, searchWrap);
  } else {
    card.append(pills, validationBox, row);
  }

  renderPills();
  return card;
}
