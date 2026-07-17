import { ALLOWED_RARITY_IDS, RARITIES } from '../constants.js';
import { getNormalizedAllowedRarities } from '../config.js';
import { escapeHtml, requireScopedEl } from '../dom.js';
import { normalizeRowIdValue, parseTypedRowIdValue } from '../rowIds.js';
import { validateCategory, validateRegexPattern } from '../validation.js';
import { listEditor } from './listEditor.js';

function renderAllowedRaritiesEditor(category, deps) {
  const { markDirty, onRulesChanged = () => {} } = deps;
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h3>Allowed Rarities</h3>
    <p class="hint">Select the item rarities this category accepts. Leave all unchecked to ignore rarity.</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'rarity-checkbox-grid';
  const selected = new Set(getNormalizedAllowedRarities(category));

  for (const rarity of RARITIES) {
    const label = document.createElement('label');
    label.className = 'check rarity-check';
    label.innerHTML = `
      <input type="checkbox" value="${rarity.id}" ${selected.has(rarity.id) ? 'checked' : ''}>
      <span>${escapeHtml(rarity.label)}</span>
    `;
    label.querySelector('input').onchange = () => {
      category.Rules.AllowedRarities = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked'))
        .map(input => Number(input.value))
        .filter(value => ALLOWED_RARITY_IDS.has(value))
        .sort((a, b) => a - b);
      markDirty();
      onRulesChanged('rarities changed');
    };
    grid.appendChild(label);
  }

  card.appendChild(grid);
  return card;
}

export function renderMatchingRulesEditor(category, deps = {}) {
  const {
    categories,
    markDirty,
    onRulesChanged = () => {},
    openRegexToItemIdsTool,
    listEditorDeps = {}
  } = deps;
  const rules = category.Rules;
  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'grid cols-2';

  const patternsCard = listEditor('Allowed Item Name Patterns', rules.AllowedItemNamePatterns, x => x, x => x, {
    hint: 'Regex/name patterns matched against item names.',
    markDirty,
    validateValue: validateRegexPattern,
    validateList: () => validateCategory(category, categories).filter(item => item.field === 'AllowedItemNamePatterns'),
    splitInputOnCommas: false,
    inputPlaceholder: 'Add one regex/name pattern',
    onItemsChanged: () => onRulesChanged('name patterns changed')
  });
  const converterButton = document.createElement('button');
  converterButton.type = 'button';
  converterButton.className = 'pattern-converter-action';
  converterButton.textContent = 'Convert patterns to Item IDs';
  converterButton.onclick = openRegexToItemIdsTool;
  requireScopedEl(patternsCard, '.list-editor-row', 'name patterns').appendChild(converterButton);

  ruleGrid.append(
    listEditor('Allowed UI Category IDs', rules.AllowedUiCategoryIds, x => {
      const value = parseTypedRowIdValue(x);
      if (value === null) throw new Error('UI category IDs must be exact integers from 0 through 4294967295.');
      return value;
    }, x => x, {
      hint: 'Game ItemUICategory row IDs accepted by this category.',
      lookupSheet: 'ItemUICategory',
      validateList: () => validateCategory(category, categories).filter(item => item.field === 'AllowedUiCategoryIds'),
      dedupeValues: true,
      dedupeKey: normalizeRowIdValue,
      onItemsChanged: () => onRulesChanged('allowed UI category IDs changed'),
      ...listEditorDeps
    }),
    listEditor('Allowed Item IDs', rules.AllowedItemIds, x => {
      const value = parseTypedRowIdValue(x);
      if (value === null) throw new Error('Item IDs must be exact integers from 0 through 4294967295.');
      return value;
    }, x => x, {
      hint: 'Specific Item row IDs accepted by this category.',
      lookupSheet: 'Item',
      validateList: () => validateCategory(category, categories).filter(item => item.field === 'AllowedItemIds'),
      dedupeValues: true,
      dedupeKey: normalizeRowIdValue,
      onItemsChanged: () => onRulesChanged('allowed item IDs changed'),
      ...listEditorDeps
    }),
    patternsCard,
    renderAllowedRaritiesEditor(category, { markDirty, onRulesChanged })
  );

  return ruleGrid;
}
