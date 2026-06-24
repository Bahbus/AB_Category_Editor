import { RARITIES, ALLOWED_RARITY_IDS } from '../constants.js';
import { el, escapeHtml, requireEl, requireScopedEl, setStatus } from '../dom.js';
import { colorToHex, colorToHexRGBA, hexToRgb01, hexToRgba01, rgbaCss, componentTo255 } from '../color.js';
import { clone, makeId, getNormalizedAllowedRarities } from '../config.js';
import { openModal, closeModal } from '../modals.js';
import { STATE_FILTER_OPTIONS, numberInput, rangeSliderControl, segmentedControl, switchInput, textInput } from './formControls.js';
import { validateCategoryName, validateCategoryOrder, validateCategoryPriority, validateRegexPattern, validateCategory, validateRangeFilter, validateStateFilter } from '../validation.js';
import { listEditor } from './listEditor.js';


const RANGE_FILTER_NAMES = {
  Level: 'Level',
  ItemLevel: 'Item Level',
  VendorPrice: 'Vendor Price'
};

const STATE_FILTER_KEYS = ['Untradable', 'Unique', 'Collectable', 'Dyeable', 'Repairable', 'HighQuality', 'Desynthesizable', 'Glamourable', 'FullySpiritbonded'];

function issueCountLabel(count) {
  return `${count} ${count === 1 ? 'issue' : 'issues'}`;
}

export function countRangeFilterIssues(rules) {
  return Object.keys(RANGE_FILTER_NAMES).reduce((count, key) => (
    rules?.[key] && ('Min' in rules[key] || 'Max' in rules[key]) ? count + validateRangeFilter(key, rules[key]).filter(item => item.severity === 'error' || item.severity === 'warning').length : count
  ), 0);
}

export function countStateFilterIssues(rules) {
  return STATE_FILTER_KEYS.reduce((count, key) => (
    rules?.[key] ? count + validateStateFilter(key, rules[key]).filter(item => item.severity === 'error' || item.severity === 'warning').length : count
  ), 0);
}

export function getBasicSwitchWarnings(cat) {
  return validateCategoryName(cat).filter(item => item.field === 'Pinned' && item.severity === 'warning');
}

export function rangeFiltersSummaryParts(rules) {
  const activeNames = Object.entries(RANGE_FILTER_NAMES)
    .filter(([key]) => rules?.[key]?.Enabled === true)
    .map(([, name]) => name);
  const issueCount = countRangeFilterIssues(rules);
  const badges = [];
  if (activeNames.length === 1) badges.push({ label: activeNames[0], tone: 'success' });
  else if (activeNames.length === 2) activeNames.forEach(name => badges.push({ label: name, tone: 'success' }));
  else if (activeNames.length > 2) badges.push({ label: `${activeNames.length} active`, tone: 'success' });
  if (issueCount) badges.push({ label: issueCountLabel(issueCount), tone: 'warning' });
  return { title: 'Range Filters', badges, issueCount };
}

export function rangeFiltersSummary(rules) {
  const { title, badges } = rangeFiltersSummaryParts(rules);
  return [title, ...badges.map(badge => badge.label)].join(' · ');
}

export function stateFiltersSummaryParts(rules) {
  let required = 0;
  let excluded = 0;
  for (const key of STATE_FILTER_KEYS) {
    const state = Number(rules?.[key]?.State ?? 0);
    if (state === 1) required += 1;
    if (state === 2) excluded += 1;
  }
  const issueCount = countStateFilterIssues(rules);
  const badges = [];
  if (required) badges.push({ label: `${required} required`, tone: 'required' });
  if (excluded) badges.push({ label: `${excluded} excluded`, tone: 'excluded' });
  if (issueCount) badges.push({ label: issueCountLabel(issueCount), tone: 'warning' });
  return { title: 'State Filters', badges, issueCount };
}

export function stateFiltersSummary(rules) {
  const { title, badges } = stateFiltersSummaryParts(rules);
  return [title, ...badges.map(badge => badge.label)].join(' · ');
}

function setDetailsSummary(details, parts) {
  const summary = details.querySelector('summary');
  if (!summary) return;
  summary.innerHTML = '';
  const title = document.createElement('span');
  title.className = 'details-summary-title';
  title.textContent = parts.title;
  summary.appendChild(title);

  const badges = Array.isArray(parts.badges) ? parts.badges : [];
  if (badges.length) {
    const badgeBox = document.createElement('span');
    badgeBox.className = 'details-summary-badges';
    for (const badge of badges) {
      const badgeEl = document.createElement('span');
      badgeEl.className = `details-summary-badge${badge.tone ? ` ${badge.tone}` : ''}`;
      badgeEl.textContent = badge.label;
      badgeBox.appendChild(badgeEl);
    }
    summary.appendChild(badgeBox);
  }
  details.classList.toggle('has-validation-issues', (parts.issueCount || 0) > 0);
}

function debounce(fn, delay = 160) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function displayFilterName(value) {
  return String(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function renderAllowedRaritiesEditor(cat, deps) {
  const { markDirty } = deps;
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h3>Allowed Rarities</h3>
    <p class="hint">Select the item rarities this category accepts. Leave all unchecked to ignore rarity.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'rarity-checkbox-grid';
  const selected = new Set(getNormalizedAllowedRarities(cat));

  for (const rarity of RARITIES) {
    const label = document.createElement('label');
    label.className = 'check rarity-check';
    label.innerHTML = `
      <input type="checkbox" value="${rarity.id}" ${selected.has(rarity.id) ? 'checked' : ''}>
      <span>${escapeHtml(rarity.label)}</span>
    `;
    label.querySelector('input').onchange = () => {
      cat.Rules.AllowedRarities = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => Number(input.value))
        .filter(value => ALLOWED_RARITY_IDS.has(value))
        .sort((a, b) => a - b);
      markDirty();
    };
    grid.appendChild(label);
  }

  card.appendChild(grid);
  return card;
}

function renderColorSection(cat, deps) {
  const { markDirty, markDirtyAndRenderList = () => markDirty({ renderList: true }) } = deps;
  const color = document.createElement('div');
  color.className = 'card color-card';
  color.innerHTML = '<h3>Color</h3>';

  const layout = document.createElement('div');
  layout.className = 'color-layout';

  const left = document.createElement('div');
  left.className = 'color-preview-field';
  left.innerHTML = `
    <div class="color-preview" title="Click to open the color picker">
      <div class="color-fill"></div>
      <input class="color-native-input" type="color" value="${colorToHex(cat.Color)}" aria-label="Pick RGB color">
    </div>
  `;

  const right = document.createElement('div');
  right.className = 'grid';

  const hexWrap = document.createElement('div');
  const hexInputId = `hex-color-input-${Math.random().toString(36).slice(2)}`;
  hexWrap.innerHTML = `<label for="${hexInputId}">Hex RGBA</label><input id="${hexInputId}" class="hex-color-input" placeholder="#RRGGBBAA" value="${colorToHexRGBA(cat.Color).toUpperCase()}">`;

  const nums = document.createElement('div');
  nums.className = 'grid cols-3 rgb-grid';

  function makeRgbaNumber(label, getValue, setValue) {
    const wrap = document.createElement('div');
    const id = `rgba-${label.toLowerCase()}-${Math.random().toString(36).slice(2)}`;
    wrap.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="number" min="0" max="255" step="1" value="${escapeHtml(getValue())}">`;
    const input = wrap.querySelector('input');
    function commitFinite(rawValue, options = {}) {
      if (String(rawValue).trim() === '') return false;
      const raw = Number(rawValue);
      if (!Number.isFinite(raw)) return false;
      const n = Math.max(0, Math.min(255, Math.round(raw)));
      if (options.writeBack) input.value = String(n);
      setValue(n);
      updateColorVisuals();
      markDirtyAndRenderList();
      return true;
    }
    input.oninput = e => {
      commitFinite(e.target.value);
    };
    input.onblur = e => {
      const raw = Number(e.target.value);
      const n = Number.isNaN(raw) ? getValue() : Math.max(0, Math.min(255, Math.round(raw)));
      commitFinite(n, { writeBack: true });
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') e.currentTarget.blur();
    });
    return wrap;
  }

  nums.append(
    makeRgbaNumber('R', () => componentTo255(cat.Color.X), n => { cat.Color.X = n / 255; }),
    makeRgbaNumber('G', () => componentTo255(cat.Color.Y), n => { cat.Color.Y = n / 255; }),
    makeRgbaNumber('B', () => componentTo255(cat.Color.Z), n => { cat.Color.Z = n / 255; })
  );

  const alphaWrap = document.createElement('div');
  alphaWrap.className = 'alpha-slider-wrap';
  const alphaSliderId = `alpha-slider-${Math.random().toString(36).slice(2)}`;
  alphaWrap.innerHTML = `
    <div class="alpha-slider-label">
      <label for="${alphaSliderId}">A</label>
      <output class="alpha-value" for="${alphaSliderId}">${escapeHtml(componentTo255(cat.Color.W))}</output>
    </div>
    <input id="${alphaSliderId}" class="alpha-slider" type="range" min="0" max="255" step="1" value="${escapeHtml(componentTo255(cat.Color.W))}" aria-label="Alpha">
  `;

  right.append(hexWrap, nums, alphaWrap);
  layout.append(left, right);
  color.append(layout);

  const fill = requireScopedEl(color, '.color-fill', 'color editor');
  const picker = requireScopedEl(color, '.color-native-input', 'color editor');
  const hexInput = requireScopedEl(color, '.hex-color-input', 'color editor');
  const alphaSlider = requireScopedEl(color, '.alpha-slider', 'color editor');
  const alphaValue = requireScopedEl(color, '.alpha-value', 'color editor');

  function validHex(value) {
    return /^#?[0-9a-fA-F]{8}$/.test(value.trim());
  }

  function updateColorVisuals() {
    const hex = colorToHexRGBA(cat.Color).toUpperCase();
    const a255 = componentTo255(cat.Color.W);
    fill.style.background = rgbaCss(cat.Color);
    picker.value = colorToHex(cat.Color);
    hexInput.value = hex;
    alphaSlider.value = String(a255);
    alphaValue.textContent = String(a255);
  }

  picker.oninput = e => {
    const rgb = hexToRgb01(e.target.value);
    cat.Color.X = rgb.X;
    cat.Color.Y = rgb.Y;
    cat.Color.Z = rgb.Z;
    updateColorVisuals();
    markDirtyAndRenderList();
  };

  function setHexValidity(value) {
    const trimmed = value.trim();
    const valid = validHex(trimmed);
    hexInput.setCustomValidity(valid ? '' : 'Use #RRGGBBAA or RRGGBBAA.');
    hexInput.classList.toggle('invalid', Boolean(trimmed) && !valid);
    return valid;
  }

  function applyHexInput() {
    const value = hexInput.value.trim();
    if (!setHexValidity(value)) {
      hexInput.reportValidity();
      return false;
    }
    const rgba = hexToRgba01(value.startsWith('#') ? value : '#' + value);
    cat.Color.X = rgba.X;
    cat.Color.Y = rgba.Y;
    cat.Color.Z = rgba.Z;
    cat.Color.W = rgba.W;
    updateColorVisuals();
    markDirtyAndRenderList();
    return true;
  }

  hexInput.oninput = e => {
    setHexValidity(e.target.value);
  };
  hexInput.onblur = applyHexInput;
  hexInput.onchange = applyHexInput;
  hexInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyHexInput();
    }
  });

  alphaSlider.oninput = e => {
    const n = Number(e.target.value);
    cat.Color.W = n / 255;
    alphaValue.textContent = String(n);
    updateColorVisuals();
    markDirtyAndRenderList();
  };

  updateColorVisuals();
  setHexValidity(hexInput.value);

  return color;
}

export function renderEditor(deps) {
  const { getCategories, getSelectedIndex, setSelectedIndex, ensureShape, markDirty, markDirtyAndRenderList = () => markDirty({ renderList: true }), renderAll, renderList, renumberCategories, openRegexToItemIdsTool, listEditorDeps, commitActiveField = () => {} } = deps;
  let selectedIndex = getSelectedIndex();
  const cats = getCategories();
  const root = requireEl('editor');
  root.innerHTML = '';

  if (!cats.length) {
    setSelectedIndex(-1); selectedIndex = -1;
    root.innerHTML = `<div class="card"><h2>No category selected</h2><p class="hint">Start with <strong>Import/Paste</strong> or <strong>Upload</strong> to load an existing AetherBags export, or add a category manually. Use <strong>About / Help</strong> if you are unsure what to paste or how to export back to AetherBags.</p></div>`;
    return;
  }
  if (selectedIndex < 0 || selectedIndex >= cats.length) { setSelectedIndex(0); selectedIndex = 0; }

  const cat = cats[selectedIndex];
  ensureShape(cat);

  const header = document.createElement('div');
  header.className = 'card';
  header.innerHTML = `
    <div class="row section-header-row">
      <div class="category-header-title">
        <div class="category-header-title-row">
          <h2 class="flush-heading">${escapeHtml(cat.Name || '(unnamed)')}</h2>
          <span class="validation-badge category-validation-summary" hidden></span>
        </div>
      </div>
      <div class="row category-header-actions">
        <button id="moveUp" class="small">Move up</button>
        <button id="moveDown" class="small">Move down</button>
        <button id="duplicateCat" class="small">Duplicate</button>
        <button id="deleteCat" class="small danger">Delete</button>
      </div>
    </div>
  `;
  root.appendChild(header);

  const basics = document.createElement('div');
  basics.className = 'card basics-card';
  const basicsTitle = document.createElement('div');
  basicsTitle.className = 'filter-card-title';
  basicsTitle.innerHTML = '<h3>Basics</h3>';
  function updateHeaderTitle() {
    const title = requireScopedEl(header, '.flush-heading', 'category header');
    title.textContent = cat.Name || '(unnamed)';
  }

  function getCategoryIssueFindings(category = cat, allCategories = cats) {
    return validateCategory(category, allCategories).filter(item => item.severity === 'error' || item.severity === 'warning');
  }

  function updateCategoryIssueSummary() {
    const summary = requireScopedEl(header, '.category-validation-summary', 'category header');
    const findings = getCategoryIssueFindings();
    summary.hidden = findings.length === 0;
    summary.textContent = findings.length ? `${findings.length} validation ${findings.length === 1 ? 'issue' : 'issues'}` : '';
  }

  function updateBasicSwitchWarnings() {
    const box = requireScopedEl(basics, '.basic-switch-validation', 'basic switch validation');
    const findings = getBasicSwitchWarnings(cat);
    box.hidden = findings.length === 0;
    box.innerHTML = findings.map(item => `<p class="field-${item.severity}">${escapeHtml(item.message)}</p>`).join('');
  }

  function updateValidationUi() {
    updateCategoryIssueSummary();
    updateBasicSwitchWarnings();
  }

  const basicsActions = document.createElement('div');
  basicsActions.className = 'filter-card-actions';
  basicsActions.append(
    switchInput('Enabled', cat.Enabled, v => { cat.Enabled = v; updateValidationUi(); markDirtyAndRenderList(); }),
    switchInput('Pinned', cat.Pinned, v => { cat.Pinned = v; updateValidationUi(); markDirtyAndRenderList(); })
  );
  const basicSwitchArea = document.createElement('div');
  basicSwitchArea.className = 'basic-switch-area';
  basicSwitchArea.appendChild(basicsActions);
  const basicSwitchValidation = document.createElement('div');
  basicSwitchValidation.className = 'validation-list basic-switch-validation';
  basicSwitchValidation.hidden = true;
  basicSwitchArea.appendChild(basicSwitchValidation);
  basicsTitle.appendChild(basicSwitchArea);
  const debouncedRenderList = debounce(renderList);
  function updateSidebarText(valueSetter, options = {}) {
    valueSetter();
    if (options.updateHeaderTitle) updateHeaderTitle();
    updateValidationUi();
    markDirty();
    debouncedRenderList();
  }

  const grid = document.createElement('div');
  grid.className = 'grid basic-fields-grid';
  grid.append(
    textInput('Name', cat.Name, v => updateSidebarText(() => { cat.Name = v; }, { updateHeaderTitle: true }), { validate: () => validateCategoryName(cat).filter(item => item.field === 'Name'), validateOnInput: true }),
    textInput('Description', cat.Description, v => updateSidebarText(() => { cat.Description = v; }), { validate: () => validateCategoryName(cat).filter(item => item.field === 'Description'), validateOnInput: true })
  );

  const metaGrid = document.createElement('div');
  metaGrid.className = 'grid basic-meta-grid';
  metaGrid.append(
    numberInput('Order', cat.Order, v => { cat.Order = v; updateValidationUi(); markDirtyAndRenderList(); }, '1', null, null, { validate: () => validateCategoryOrder(cat, cats) }),
    numberInput('Priority', cat.Priority, v => { cat.Priority = v; updateValidationUi(); markDirtyAndRenderList(); }, '1', null, null, { validate: () => validateCategoryPriority(cat, cats) })
  );

  basics.append(basicsTitle, grid, metaGrid);
  updateValidationUi();

  const topEditorGrid = document.createElement('div');
  topEditorGrid.className = 'top-editor-grid';
  const colorCard = renderColorSection(cat, deps);
  topEditorGrid.append(basics, colorCard);
  root.appendChild(topEditorGrid);

  const rules = cat.Rules;
  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'grid cols-2';
  ruleGrid.append(
    listEditor('Allowed UI Category IDs', rules.AllowedUiCategoryIds, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('UI category IDs must be integers.');
      return Number(x);
    }, x => x, { hint: 'Game ItemUICategory row IDs accepted by this category.', lookupSheet: 'ItemUICategory', validateList: () => validateCategory(cat, cats).filter(item => item.field === 'AllowedUiCategoryIds'), ...listEditorDeps }),
    listEditor('Allowed Item IDs', rules.AllowedItemIds, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('Item IDs must be integers.');
      return Number(x);
    }, x => x, { hint: 'Specific Item row IDs accepted by this category.', lookupSheet: 'Item', validateList: () => validateCategory(cat, cats).filter(item => item.field === 'AllowedItemIds'), ...listEditorDeps }),
    listEditor('Allowed Item Name Patterns', rules.AllowedItemNamePatterns, x => x, x => x, { hint: 'Regex/name patterns matched against item names.', markDirty, validateValue: validateRegexPattern, validateList: () => validateCategory(cat, cats).filter(item => item.field === 'AllowedItemNamePatterns') }),
    renderAllowedRaritiesEditor(cat, deps)
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
  requireScopedEl(regexTool, '#openRegexToItemIds', 'regex converter').onclick = openRegexToItemIdsTool;

  const ranges = document.createElement('details');
  ranges.className = 'card';
  ranges.innerHTML = '<summary></summary><div class="details-body"></div>';
  setDetailsSummary(ranges, rangeFiltersSummaryParts(rules));
  const rangeGrid = document.createElement('div');
  rangeGrid.className = 'grid cols-3 range-filter-grid';
  for (const key of ['Level','ItemLevel','VendorPrice']) {
    const obj = rules[key];
    const box = document.createElement('div');
    box.className = 'nested-card';
    const defaults = key === 'VendorPrice' ? { min: 0, max: 100000 } : { min: 0, max: key === 'Level' ? 100 : 800 };
    const title = document.createElement('div');
    title.className = 'filter-card-title';
    title.innerHTML = `<h3>${escapeHtml(displayFilterName(key))}</h3>`;
    const titleActions = document.createElement('div');
    titleActions.className = 'filter-card-actions';
    titleActions.appendChild(switchInput('Enabled', obj.Enabled, v => { obj.Enabled = v; markDirty(); setDetailsSummary(ranges, rangeFiltersSummaryParts(rules)); updateCategoryIssueSummary(); }));
    title.appendChild(titleActions);
    box.append(
      title,
      rangeSliderControl(displayFilterName(key), obj, () => { markDirty(); setDetailsSummary(ranges, rangeFiltersSummaryParts(rules)); updateCategoryIssueSummary(); }, defaults)
    );
    rangeGrid.appendChild(box);
  }
  requireScopedEl(ranges, '.details-body', 'range filters').appendChild(rangeGrid);
  root.appendChild(ranges);

  const bools = document.createElement('details');
  bools.className = 'card';
  bools.innerHTML = '<summary></summary><div class="details-body"></div>';
  setDetailsSummary(bools, stateFiltersSummaryParts(rules));
  const boolGrid = document.createElement('div');
  boolGrid.className = 'grid cols-3';

  function renderStateFilterCard(filterName, obj) {
    if (typeof obj.Filter !== 'number') obj.Filter = 0;

    const box = document.createElement('div');
    box.className = 'nested-card state-filter-card';
    const title = document.createElement('div');
    title.className = 'filter-card-title';
    title.innerHTML = `<h3>${escapeHtml(displayFilterName(filterName))}</h3>`;
    const titleActions = document.createElement('div');
    titleActions.className = 'filter-card-actions';
    titleActions.appendChild(segmentedControl(displayFilterName(filterName), obj.State ?? 0, STATE_FILTER_OPTIONS, next => {
      obj.State = next;
      markDirty();
      setDetailsSummary(bools, stateFiltersSummaryParts(rules)); updateCategoryIssueSummary();
    }));
    title.appendChild(titleActions);
    box.appendChild(title);

    return box;
  }

  for (const key of STATE_FILTER_KEYS) {
    boolGrid.appendChild(renderStateFilterCard(key, rules[key]));
  }

  requireScopedEl(bools, '.details-body', 'state filters').appendChild(boolGrid);
  root.appendChild(bools);

  const advanced = document.createElement('details');
  advanced.className = 'card';
  advanced.innerHTML = `
    <summary><span class="details-summary-title">Advanced</span></summary>
    <div class="details-body">
      <p class="hint">Edit the selected category directly. Click “Apply raw category JSON” after changes.</p>
      <textarea class="raw" id="rawCategory">${escapeHtml(JSON.stringify(cat, null, 2))}</textarea>
      <div class="row modal-action-row">
        <button id="applyRawCategory">Apply raw category JSON</button>
      </div>
    </div>
  `;
  root.appendChild(advanced);

  el('moveUp').disabled = selectedIndex <= 0;
  el('moveDown').disabled = selectedIndex >= cats.length - 1;

  el('moveUp').onclick = () => {
    commitActiveField();
    if (selectedIndex <= 0) return;
    [cats[selectedIndex - 1], cats[selectedIndex]] = [cats[selectedIndex], cats[selectedIndex - 1]];
    selectedIndex--; setSelectedIndex(selectedIndex);
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty();
    renderAll();
  };
  el('moveDown').onclick = () => {
    commitActiveField();
    if (selectedIndex >= cats.length - 1) return;
    [cats[selectedIndex + 1], cats[selectedIndex]] = [cats[selectedIndex], cats[selectedIndex + 1]];
    selectedIndex++; setSelectedIndex(selectedIndex);
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty();
    renderAll();
  };
  el('duplicateCat').onclick = () => {
    commitActiveField();
    const copy = clone(cat);
    copy.Id = makeId();
    copy.Name = (copy.Name || 'Category') + ' Copy';
    copy.Order = Number(copy.Order || 0) + 1;
    copy.Priority = Number(copy.Priority || 0) + 1;
    cats.splice(selectedIndex + 1, 0, copy);
    selectedIndex++; setSelectedIndex(selectedIndex);
    markDirty();
    renderAll();
  };
  el('deleteCat').onclick = () => {
    commitActiveField();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p>Delete <strong>${escapeHtml(cat.Name || '(unnamed)')}</strong>?</p>
      <p class="hint">This only affects the browser copy until you download or export.</p>
      <div class="row modal-action-row modal-action-row-loose">
        <button id="confirmDeleteCat" class="danger">Delete category</button>
        <button id="cancelDeleteCat">Cancel</button>
      </div>
    `;
    openModal('Delete category', wrap);
    requireScopedEl(wrap, '#confirmDeleteCat', 'delete category confirmation').onclick = () => {
      commitActiveField();
      cats.splice(selectedIndex, 1);
      selectedIndex = Math.min(selectedIndex, cats.length - 1); setSelectedIndex(selectedIndex);
      closeModal();
      markDirty();
      renderAll();
    };
    requireScopedEl(wrap, '#cancelDeleteCat', 'delete category confirmation').onclick = closeModal;
  };
  el('applyRawCategory').onclick = () => {
    commitActiveField();
    try {
      const parsed = JSON.parse(el('rawCategory').value);
      cats[selectedIndex] = parsed;
      ensureShape(cats[selectedIndex]);
      markDirty();
      renderAll();
    } catch (err) {
      setStatus('Invalid category JSON: ' + err.message, 'err');
    }
  };
}
