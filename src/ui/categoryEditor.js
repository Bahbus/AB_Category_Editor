import { RARITIES, ALLOWED_RARITY_IDS } from '../constants.js';
import { el, escapeHtml, setStatus } from '../dom.js';
import { colorToHex, colorToHexRGBA, hexToRgb01, hexToRgba01, rgbaCss, componentTo255 } from '../color.js';
import { clone, makeId, getNormalizedAllowedRarities } from '../config.js';
import { openModal, closeModal } from '../modals.js';
import { checkbox, numberInput, textInput } from './formControls.js';
import { listEditor } from './listEditor.js';

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
      <span>${escapeHtml(rarity.label)} (${escapeHtml(rarity.color)})</span>
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
  const { renderAll, markDirty } = deps;
  const color = document.createElement('div');
  color.className = 'card';
  color.innerHTML = '<h3>Color</h3>';

  const layout = document.createElement('div');
  layout.className = 'color-layout';

  const left = document.createElement('div');
  left.innerHTML = `
    <label for="rgbPicker">Preview / color picker</label>
    <div class="color-preview" title="Click to open the color picker">
      <div class="color-fill" id="colorFill"></div>
      <input class="color-native-input" id="rgbPicker" type="color" value="${colorToHex(cat.Color)}" aria-label="Pick RGB color">
    </div>
    <p class="hint" id="colorReadout" style="margin-bottom:0;"></p>
  `;

  const right = document.createElement('div');
  right.className = 'grid';

  const hexWrap = document.createElement('div');
  hexWrap.innerHTML = `<label for="hexColorInput">Hex RGBA</label><input id="hexColorInput" placeholder="#RRGGBBAA" value="${colorToHexRGBA(cat.Color).toUpperCase()}">`;

  const nums = document.createElement('div');
  nums.className = 'grid cols-4';

  function makeRgbaNumber(label, getValue, setValue) {
    const wrap = document.createElement('div');
    const id = `rgba-${label.toLowerCase()}-${Math.random().toString(36).slice(2)}`;
    wrap.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="number" min="0" max="255" step="1" value="${escapeHtml(getValue())}">`;
    const input = wrap.querySelector('input');
    input.onblur = e => {
      const raw = Number(e.target.value);
      const n = Number.isNaN(raw) ? getValue() : Math.max(0, Math.min(255, Math.round(raw)));
      e.target.value = String(n);
      setValue(n);
      markDirty();
      updateColorVisuals();
      renderAll();
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') e.currentTarget.blur();
    });
    return wrap;
  }

  nums.append(
    makeRgbaNumber('R', () => componentTo255(cat.Color.X), n => { cat.Color.X = n / 255; }),
    makeRgbaNumber('G', () => componentTo255(cat.Color.Y), n => { cat.Color.Y = n / 255; }),
    makeRgbaNumber('B', () => componentTo255(cat.Color.Z), n => { cat.Color.Z = n / 255; }),
    makeRgbaNumber('A', () => componentTo255(cat.Color.W), n => { cat.Color.W = n / 255; })
  );

  right.append(hexWrap, nums);
  layout.append(left, right);
  color.append(layout);

  setTimeout(() => {
    const fill = el('colorFill');
    const readout = el('colorReadout');
    const picker = el('rgbPicker');
    const hexInput = el('hexColorInput');

    function validHex(value) {
      return /^#?[0-9a-fA-F]{8}$/.test(value.trim());
    }

    function updateColorVisuals() {
      const hex = colorToHexRGBA(cat.Color).toUpperCase();
      const a255 = componentTo255(cat.Color.W);
      fill.style.background = rgbaCss(cat.Color);
      readout.textContent = `${hex} · RGBA(${componentTo255(cat.Color.X)}, ${componentTo255(cat.Color.Y)}, ${componentTo255(cat.Color.Z)}, ${a255})`;
      picker.value = colorToHex(cat.Color);
      hexInput.value = hex;
    }

    picker.oninput = e => {
      const rgb = hexToRgb01(e.target.value);
      cat.Color.X = rgb.X;
      cat.Color.Y = rgb.Y;
      cat.Color.Z = rgb.Z;
      updateColorVisuals();
      markDirty();
    };
    picker.onchange = () => renderAll();

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
      markDirty();
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

    updateColorVisuals();
    setHexValidity(hexInput.value);
  }, 0);

  return color;
}

export function renderEditor(deps) {
  const { getCategories, getSelectedIndex, setSelectedIndex, ensureShape, markDirty, renderAll, renderList, renumberCategories, openRegexToItemIdsTool, listEditorDeps } = deps;
  let selectedIndex = getSelectedIndex();
  const cats = getCategories();
  const root = el('editor');
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
    <div class="row" style="justify-content: space-between;">
      <h2 style="margin:0;">${escapeHtml(cat.Name || '(unnamed)')}</h2>
      <div class="row">
        <button id="moveUp" class="small">Move up</button>
        <button id="moveDown" class="small">Move down</button>
        <button id="duplicateCat" class="small">Duplicate</button>
        <button id="deleteCat" class="small danger">Delete</button>
      </div>
    </div>
  `;
  root.appendChild(header);

  const basics = document.createElement('div');
  basics.className = 'card';
  basics.innerHTML = '<h3>Basics</h3>';
  const checks = document.createElement('div');
  checks.className = 'row';
  checks.append(
    checkbox('Enabled', cat.Enabled, v => { cat.Enabled = v; markDirty(); }),
    checkbox('Pinned', cat.Pinned, v => { cat.Pinned = v; markDirty(); })
  );

  const grid = document.createElement('div');
  grid.className = 'grid cols-2';
  grid.append(
    textInput('Name', cat.Name, v => { cat.Name = v; markDirty(); }),
    textInput('Description', cat.Description, v => { cat.Description = v; markDirty(); }),
    numberInput('Order', cat.Order, v => { cat.Order = v; markDirty(); }),
    numberInput('Priority', cat.Priority, v => { cat.Priority = v; markDirty(); })
  );
  basics.append(checks, grid);
  root.appendChild(basics);

  root.appendChild(renderColorSection(cat, deps));

  const rules = cat.Rules;
  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'grid cols-2';
  ruleGrid.append(
    listEditor('Allowed UI Category IDs', rules.AllowedUiCategoryIds, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('UI category IDs must be integers.');
      return Number(x);
    }, x => x, { hint: 'Game ItemUICategory row IDs accepted by this category.', lookupSheet: 'ItemUICategory', ...listEditorDeps }),
    listEditor('Allowed Item IDs', rules.AllowedItemIds, x => {
      if (!/^-?\d+$/.test(x)) throw new Error('Item IDs must be integers.');
      return Number(x);
    }, x => x, { hint: 'Specific Item row IDs accepted by this category.', lookupSheet: 'Item', ...listEditorDeps }),
    listEditor('Allowed Item Name Patterns', rules.AllowedItemNamePatterns, x => x, x => x, { hint: 'Regex/name patterns matched against item names.', markDirty }),
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
  setTimeout(() => {
    const btn = el('openRegexToItemIds');
    if (btn) btn.onclick = openRegexToItemIdsTool;
  }, 0);

  const ranges = document.createElement('details');
  ranges.className = 'card';
  ranges.innerHTML = '<summary>Range Filters</summary><div class="details-body"></div>';
  const rangeGrid = document.createElement('div');
  rangeGrid.className = 'grid cols-3';
  for (const key of ['Level','ItemLevel','VendorPrice']) {
    const obj = rules[key];
    const box = document.createElement('div');
    box.className = 'nested-card';
    box.innerHTML = `<h3>${escapeHtml(key)}</h3>`;
    box.append(
      checkbox('Enabled', obj.Enabled, v => { obj.Enabled = v; markDirty(); }),
      numberInput('Min', obj.Min, v => { obj.Min = v; markDirty(); }),
      numberInput('Max', obj.Max, v => { obj.Max = v; markDirty(); })
    );
    rangeGrid.appendChild(box);
  }
  ranges.querySelector('.details-body').appendChild(rangeGrid);
  root.appendChild(ranges);

  const bools = document.createElement('details');
  bools.className = 'card';
  bools.innerHTML = '<summary>State Filters</summary><div class="details-body"></div>';
  const boolGrid = document.createElement('div');
  boolGrid.className = 'grid cols-3';

  function stateSelect(filterName, obj) {
    if (typeof obj.State !== 'number') obj.State = 0;
    if (typeof obj.Filter !== 'number') obj.Filter = 0;

    const box = document.createElement('div');
    box.className = 'nested-card';
    box.innerHTML = `
      <h3>${escapeHtml(filterName)}</h3>
      <label for="stateSelect-${escapeHtml(filterName)}">State</label>
      <select id="stateSelect-${escapeHtml(filterName)}">
        <option value="0">0 - Ignored</option>
        <option value="1">1 - Required</option>
        <option value="2">2 - Excluded</option>
      </select>
    `;

    const select = box.querySelector('select');
    select.value = String(obj.State ?? 0);
    select.onchange = e => {
      obj.State = Number(e.target.value);
      markDirty();
      renderList();
    };

    return box;
  }

  for (const key of ['Untradable','Unique','Collectable','Dyeable','Repairable','HighQuality','Desynthesizable','Glamourable','FullySpiritbonded']) {
    boolGrid.appendChild(stateSelect(key, rules[key]));
  }

  bools.querySelector('.details-body').appendChild(boolGrid);
  root.appendChild(bools);

  const advanced = document.createElement('details');
  advanced.className = 'card';
  advanced.innerHTML = `
    <summary>Advanced: raw selected category JSON</summary>
    <div class="details-body">
      <p class="hint">Edit the selected category directly. Click “Apply raw category JSON” after changes.</p>
      <textarea class="raw" id="rawCategory">${escapeHtml(JSON.stringify(cat, null, 2))}</textarea>
      <div class="row" style="margin-top:8px;">
        <button id="applyRawCategory">Apply raw category JSON</button>
      </div>
    </div>
  `;
  root.appendChild(advanced);

  el('moveUp').disabled = selectedIndex <= 0;
  el('moveDown').disabled = selectedIndex >= cats.length - 1;

  el('moveUp').onclick = () => {
    if (selectedIndex <= 0) return;
    [cats[selectedIndex - 1], cats[selectedIndex]] = [cats[selectedIndex], cats[selectedIndex - 1]];
    selectedIndex--; setSelectedIndex(selectedIndex);
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty();
    renderAll();
  };
  el('moveDown').onclick = () => {
    if (selectedIndex >= cats.length - 1) return;
    [cats[selectedIndex + 1], cats[selectedIndex]] = [cats[selectedIndex], cats[selectedIndex + 1]];
    selectedIndex++; setSelectedIndex(selectedIndex);
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty();
    renderAll();
  };
  el('duplicateCat').onclick = () => {
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
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p>Delete <strong>${escapeHtml(cat.Name || '(unnamed)')}</strong>?</p>
      <p class="hint">This only affects the browser copy until you download or export.</p>
      <div class="row" style="margin-top:12px;">
        <button id="confirmDeleteCat" class="danger">Delete category</button>
        <button id="cancelDeleteCat">Cancel</button>
      </div>
    `;
    openModal('Delete category', wrap);
    document.getElementById('confirmDeleteCat').onclick = () => {
      cats.splice(selectedIndex, 1);
      selectedIndex = Math.min(selectedIndex, cats.length - 1); setSelectedIndex(selectedIndex);
      closeModal();
      markDirty();
      renderAll();
    };
    document.getElementById('cancelDeleteCat').onclick = closeModal;
  };
  el('applyRawCategory').onclick = () => {
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

