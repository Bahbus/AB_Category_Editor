import { ALLOWED_RARITY_IDS } from './constants.js';

const FALLBACK_DESCRIPTION = "Groups items matching this category's selected rules.";

function rulesOf(category) { return category?.Rules || {}; }
function hasItems(value) { return Array.isArray(value) && value.length > 0; }
function activeRange(rules, key) { return Boolean(rules[key]?.Enabled); }
function stateValue(rules, key) { return Number(rules[key]?.State || 0); }
function uniq(values) { return [...new Set(values.filter(Boolean))]; }

function readableJoin(parts) {
  const values = uniq(parts);
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

function identityFromName(name = '') {
  const lower = String(name).toLowerCase();
  if (/materia/.test(lower)) return 'materia-related items';
  if (/\b(food|meal|consumable)s?\b/.test(lower)) return 'consumables';
  if (/\b(gear|weapon|armor|armour|accessor(?:y|ies))\b/.test(lower)) return 'equipment';
  if (/\b(mount|minion|orchestrion|card|emote|hairstyle)s?\b/.test(lower)) return 'unlockable or collectible items';
  if (/\b(tome|token|totem|book|currency|currencies)s?\b/.test(lower)) return 'tokens or exchange items';
  if (/\b(craft|crafted|crafting)\b/.test(lower)) return 'crafted items';
  return 'items';
}

function explicitIdeas(rules, identity) {
  const ideas = [];
  if (hasItems(rules.AllowedItemIds)) ideas.push(identity === 'items' ? 'manually selected items' : `manually selected ${identity}`);
  if (hasItems(rules.AllowedItemNamePatterns)) ideas.push('items matching name patterns');
  if (hasItems(rules.AllowedUiCategoryIds)) ideas.push('specific game item categories');
  return ideas;
}

function constraintIdeas(rules, identity) {
  const ideas = [];
  if (activeRange(rules, 'ItemLevel')) ideas.push(identity === 'equipment' ? 'item-level constraints' : 'item-level limits');
  if (activeRange(rules, 'Level')) ideas.push('level requirements');
  if (activeRange(rules, 'VendorPrice')) ideas.push('vendor price limits');
  const rarityCount = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities.filter(v => ALLOWED_RARITY_IDS.has(Number(v))).length : 0;
  if (rarityCount > 0 && rarityCount < ALLOWED_RARITY_IDS.size) ideas.push('rarity limits');
  return ideas;
}

function stateIdeas(rules) {
  const required = [];
  const excluded = [];
  if (stateValue(rules, 'Untradable') === 1) required.push('untradeable');
  if (stateValue(rules, 'Untradable') === 2) required.push('tradeable');
  for (const [key, phrase] of [['Dyeable', 'dyeable'], ['Repairable', 'repairable'], ['Glamourable', 'glamour-ready'], ['Desynthesizable', 'desynthesizable']]) {
    if (stateValue(rules, key) === 1) required.push(phrase);
    if (stateValue(rules, key) === 2) excluded.push(phrase);
  }
  if (stateValue(rules, 'Collectable') === 1) required.push('collectable');
  if (stateValue(rules, 'HighQuality') === 1) required.push('HQ');
  if (stateValue(rules, 'Unique') === 1) required.push('unique');

  const ideas = [];
  if (required.length) ideas.push(`${readableJoin(required.slice(0, 3))} items`);
  if (excluded.length) ideas.push(`items excluding ${readableJoin(excluded.slice(0, 2))} entries`);
  return ideas;
}

function cleanSentence(text) {
  return text
    .replace(/items items/g, 'items')
    .replace(/equipment items/g, 'equipment')
    .replace(/specific specific/g, 'specific')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isUsefulGeneratedDescription(text) {
  const cleaned = String(text || '').trim();
  return Boolean(cleaned) && cleaned !== FALLBACK_DESCRIPTION;
}

export function generateCategoryDescription(category, options = {}) {
  const rules = rulesOf(category);
  const identity = options.identity || identityFromName(category?.Name);
  const explicit = explicitIdeas(rules, identity).slice(0, 3);
  const constraints = constraintIdeas(rules, identity).slice(0, 3);
  const states = stateIdeas(rules).slice(0, 2);
  const sorting = hasItems(category?.CustomItemOrder) ? ['custom item ordering'] : [];

  let text = '';
  if (explicit.length && constraints.length) text = `Collects ${readableJoin(explicit)} with ${readableJoin(constraints.slice(0, 2))}.`;
  else if (explicit.length) text = `Collects ${readableJoin(explicit)}.`;
  else if (states.length && constraints.length) text = `Filters ${identity} for ${readableJoin(states)} with ${readableJoin(constraints.slice(0, 2))}.`;
  else if (states.length) text = `Filters ${identity} for ${readableJoin(states)}.`;
  else if (constraints.length) text = `Groups ${identity} with ${readableJoin(constraints.slice(0, 3))}.`;
  else if (identity !== 'items') text = `Groups ${identity} for easier organization.`;
  else if (sorting.length) text = `Groups items with ${sorting[0]}.`;
  else text = FALLBACK_DESCRIPTION;

  return cleanSentence(text);
}

export { FALLBACK_DESCRIPTION };
