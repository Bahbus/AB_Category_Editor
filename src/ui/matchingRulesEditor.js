import { ALLOWED_RARITY_IDS, RARITIES } from '../constants.js';
import { getNormalizedAllowedRarities } from '../config.js';
import { escapeHtml, requireScopedEl } from '../dom.js';
import { normalizeRowIdValue, parseTypedRowIdValue } from '../rowIds.js';
import { validateCategory, validateRegexPattern } from '../validation.js';
import { listEditor } from './listEditor.js';

const RARITY_MESSAGE_KEYS = new Map([
  [1, 'matchingRules.rarity.common'],
  [2, 'matchingRules.rarity.uncommon'],
  [3, 'matchingRules.rarity.rare'],
  [4, 'matchingRules.rarity.relic'],
  [7, 'matchingRules.rarity.aetherial']
]);

export function createMatchingRuleMessages(translate) {
  return Object.freeze({
    allowedUiCategoryIds: Object.freeze({
      title: translate('matchingRules.allowedUiCategoryIds.title'),
      hint: translate('matchingRules.allowedUiCategoryIds.hint'),
      error: translate('matchingRules.allowedUiCategoryIds.error')
    }),
    allowedItemIds: Object.freeze({
      title: translate('matchingRules.allowedItemIds.title'),
      hint: translate('matchingRules.allowedItemIds.hint'),
      error: translate('matchingRules.allowedItemIds.error')
    }),
    allowedItemNamePatterns: Object.freeze({
      title: translate('matchingRules.allowedItemNamePatterns.title'),
      hint: translate('matchingRules.allowedItemNamePatterns.hint'),
      placeholder: translate('matchingRules.allowedItemNamePatterns.placeholder'),
      convert: translate('matchingRules.allowedItemNamePatterns.convert')
    }),
    allowedRarities: Object.freeze({
      title: translate('matchingRules.allowedRarities.title'),
      hint: translate('matchingRules.allowedRarities.hint'),
      label: rarityId => translate(RARITY_MESSAGE_KEYS.get(rarityId))
    })
  });
}

function renderAllowedRaritiesEditor(category, deps) {
  const { markDirty, onRulesChanged = () => {}, messages } = deps;
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <h3>${escapeHtml(messages.title)}</h3>
    <p class="hint">${escapeHtml(messages.hint)}</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'rarity-checkbox-grid';
  const selected = new Set(getNormalizedAllowedRarities(category));

  for (const rarity of RARITIES) {
    const label = document.createElement('label');
    label.className = 'check rarity-check';
    label.innerHTML = `
      <input type="checkbox" value="${rarity.id}" ${selected.has(rarity.id) ? 'checked' : ''}>
      <span>${escapeHtml(messages.label(rarity.id))}</span>
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
    listEditorDeps = {},
    translate
  } = deps;
  const messages = createMatchingRuleMessages(translate);
  const rules = category.Rules;
  const ruleGrid = document.createElement('div');
  ruleGrid.className = 'grid cols-2';

  const patternsCard = listEditor(messages.allowedItemNamePatterns.title, rules.AllowedItemNamePatterns, x => x, x => x, {
    hint: messages.allowedItemNamePatterns.hint,
    markDirty,
    validateValue: validateRegexPattern,
    validateList: () => validateCategory(category, categories).filter(item => item.field === 'AllowedItemNamePatterns'),
    splitInputOnCommas: false,
    inputPlaceholder: messages.allowedItemNamePatterns.placeholder,
    translate,
    onItemsChanged: () => onRulesChanged('name patterns changed')
  });
  const converterButton = document.createElement('button');
  converterButton.type = 'button';
  converterButton.className = 'pattern-converter-action';
  converterButton.textContent = messages.allowedItemNamePatterns.convert;
  converterButton.onclick = openRegexToItemIdsTool;
  requireScopedEl(patternsCard, '.list-editor-row', 'name patterns').appendChild(converterButton);

  ruleGrid.append(
    listEditor(messages.allowedUiCategoryIds.title, rules.AllowedUiCategoryIds, x => {
      const value = parseTypedRowIdValue(x);
      if (value === null) throw new Error(messages.allowedUiCategoryIds.error);
      return value;
    }, x => x, {
      hint: messages.allowedUiCategoryIds.hint,
      lookupSheet: 'ItemUICategory',
      validateList: () => validateCategory(category, categories).filter(item => item.field === 'AllowedUiCategoryIds'),
      dedupeValues: true,
      dedupeKey: normalizeRowIdValue,
      onItemsChanged: () => onRulesChanged('allowed UI category IDs changed'),
      translate,
      ...listEditorDeps
    }),
    listEditor(messages.allowedItemIds.title, rules.AllowedItemIds, x => {
      const value = parseTypedRowIdValue(x);
      if (value === null) throw new Error(messages.allowedItemIds.error);
      return value;
    }, x => x, {
      hint: messages.allowedItemIds.hint,
      lookupSheet: 'Item',
      validateList: () => validateCategory(category, categories).filter(item => item.field === 'AllowedItemIds'),
      dedupeValues: true,
      dedupeKey: normalizeRowIdValue,
      onItemsChanged: () => onRulesChanged('allowed item IDs changed'),
      translate,
      ...listEditorDeps
    }),
    patternsCard,
    renderAllowedRaritiesEditor(category, { markDirty, onRulesChanged, messages: messages.allowedRarities })
  );

  return ruleGrid;
}
