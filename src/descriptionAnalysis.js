import { isUsefulLookupName } from './lookupNames.js';

const STAT_PHRASES = Object.freeze({
  'critical hit': 'Critical Hit',
  'direct hit': 'Direct Hit',
  determination: 'Determination',
  'skill speed': 'Skill Speed',
  'spell speed': 'Spell Speed',
  tenacity: 'Tenacity',
  piety: 'Piety',
  craftsmanship: 'Craftsmanship',
  control: 'Control',
  cp: 'CP',
  gathering: 'Gathering',
  perception: 'Perception',
  gp: 'GP',
  strength: 'Strength',
  dexterity: 'Dexterity',
  intelligence: 'Intelligence',
  mind: 'Mind'
});

const INTENT_CONCEPTS = Object.freeze([
  { intent: 'materiaClusters', subject: 'materia clusters', priority: 110, identityTerms: ['materia cluster', 'materia clusters'] },
  { intent: 'tools', subject: 'crafting and gathering tools', priority: 105, identityTerms: ['doh dol weapon', 'doh dol weapons', 'doh dol tool', 'doh dol tools'] },
  { intent: 'materia', subject: 'materia', priority: 90, identityTerms: ['materia'] },
  { intent: 'medicine', subject: 'medicine', priority: 85, identityTerms: ['medicine', 'medicines', 'drug', 'drugs'] },
  { intent: 'fishingSupplies', subject: 'fishing supplies', priority: 85, identityTerms: ['tacklebox', 'tackle box', 'fishing tackle', 'fishing supplies'] },
  { intent: 'furnishings', subject: 'furnishings', priority: 85, identityTerms: ['indoor furnishing', 'indoor furnishings', 'outdoor furnishing', 'outdoor furnishings', 'furnishing', 'furnishings'] },
  { intent: 'meals', subject: 'meal consumables', priority: 80, identityTerms: ['food', 'meal', 'meals'] },
  { intent: 'potions', subject: 'potions', priority: 80, identityTerms: ['potion', 'potions'] },
  { intent: 'tools', subject: 'tools', priority: 78, identityTerms: ['tool', 'tools'] },
  { intent: 'unlockables', subject: 'unlock items', priority: 75, identityTerms: ['mount', 'mounts', 'minion', 'minions', 'orchestrion roll', 'orchestrion rolls', 'orchestrion', 'triple triad card', 'triple triad cards', 'triple triad', 'card', 'cards', 'emote', 'emotes', 'hairstyle', 'hairstyles', 'fashion accessory', 'fashion accessories'] },
  { intent: 'gear', subject: 'equippable gear', priority: 70, identityTerms: ['gear', 'equipment', 'weapon', 'weapons', 'armor', 'armour', 'accessory', 'accessories'] },
  { intent: 'tokens', subject: 'exchange items', priority: 65, identityTerms: ['token', 'tokens', 'totem', 'totems', 'book', 'books', 'tome', 'tomes', 'tomestone', 'tomestones', 'scrip', 'scrips', 'currency', 'currencies', 'voucher', 'vouchers', 'coin', 'coins', 'certificate', 'certificates'] },
  { intent: 'materials', subject: 'materials', priority: 60, identityTerms: ['material', 'materials', 'ingredient', 'ingredients', 'reagent', 'reagents', 'ore', 'ores', 'log', 'logs', 'cloth', 'leather', 'lumber', 'ingot', 'ingots', 'nugget', 'nuggets'] },
  { intent: 'appearance', subject: 'appearance customization items', priority: 55, identityTerms: ['dye', 'dyes', 'glamour', 'prism', 'prisms', 'dresser'] }
]);

const ROLE_TERMS = Object.freeze({
  combat: ['strength', 'dexterity', 'intelligence', 'mind', 'vitality', 'critical hit', 'direct hit', 'determination', 'skill speed', 'spell speed', 'tenacity', 'piety', 'battle', 'combat'],
  crafting: ['craftsmanship', 'control', 'cp', 'crafting', 'synthesis', 'doh', 'disciple of hand', 'disciples of hand'],
  gathering: ['gathering', 'perception', 'gp', 'dol', 'disciple of land', 'disciples of land']
});

const EXPLICIT_CLASSIFIERS = Object.freeze([
  ['materia', ['materia']],
  ['potion', ['potion', 'tincture', 'draught', 'medicine']],
  ['meal', ['meal', 'food', 'dish', 'soup', 'salad']],
  ['mount', ['mount', 'whistle', 'horn', 'key']],
  ['minion', ['minion']],
  ['card', ['triple triad', 'card']],
  ['emote', ['emote', 'ballroom etiquette']],
  ['hairstyle', ['hairstyle', 'modern aesthetics']],
  ['token', ['token', 'totem', 'book', 'tomestone', 'scrip', 'coin', 'voucher', 'certificate']],
  ['material', ['material', 'ingredient', 'reagent', 'ore', 'log', 'cloth', 'leather', 'lumber', 'ingot', 'nugget']],
  ['furnishing', ['furnishing', 'tabletop', 'wall-mounted', 'outdoor', 'housing']],
  ['dye', ['dye']],
  ['glamour', ['glamour', 'prism']],
  ['weapon', ['weapon', 'arms']],
  ['armor', ['armor', 'armour', 'shield', 'head', 'body', 'hands', 'legs', 'feet']],
  ['accessory', ['accessory', 'bracelet', 'ring', 'earring', 'necklace']]
]);

function rulesOf(category) { return category?.Rules || {}; }
function hasItems(value) { return Array.isArray(value) && value.length > 0; }
function uniq(values) { return [...new Set(values.filter(Boolean))]; }

export function readableJoin(parts) {
  const values = uniq(parts);
  if (values.length <= 1) return values[0] || '';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

export function normalizeDescriptionEvidence(text = '') {
  return String(text).toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singularize(term) {
  return term.replace(/ies$/, 'y').replace(/s$/, '');
}

function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function pluralize(term) {
  return /y$/.test(term) ? term.replace(/y$/, 'ies') : `${term}s`;
}

export function descriptionTermMatches(text, term) {
  const normalized = normalizeDescriptionEvidence(text);
  const singular = singularize(normalizeDescriptionEvidence(term));
  const variants = uniq([normalizeDescriptionEvidence(term), singular, pluralize(singular)]);
  return variants.some(value => new RegExp(`(^|\\b)${escapeRegExp(value)}(\\b|$)`, 'i').test(normalized));
}

function matchedTermsFor(text, terms) {
  const matches = [];
  for (const term of terms) {
    const concept = singularize(normalizeDescriptionEvidence(term));
    if (matches.some(match => singularize(normalizeDescriptionEvidence(match)) === concept)) continue;
    if (descriptionTermMatches(text, term)) matches.push(term);
  }
  return matches;
}

function inferTraits(text) {
  return Object.entries(ROLE_TERMS)
    .filter(([, terms]) => matchedTermsFor(text, terms).length)
    .map(([trait]) => trait);
}

function lookupRuleNames(rules, options) {
  if (typeof options.lookupName !== 'function') return '';
  const names = [];
  for (const id of rules.AllowedUiCategoryIds || []) names.push(options.lookupName('ItemUICategory', id));
  for (const id of rules.AllowedItemIds || []) names.push(options.lookupName('Item', id));
  return names.filter(isUsefulLookupName).join(' ');
}

function cachedNames(sheet, ids = [], options = {}) {
  if (typeof options.lookupName !== 'function') return [];
  return ids
    .map(id => options.lookupName(sheet, id))
    .map(name => String(name || '').trim())
    .filter(isUsefulLookupName);
}

function bestStatPhrase(text) {
  const matches = matchedTermsFor(text, Object.keys(STAT_PHRASES));
  matches.sort((a, b) => b.length - a.length);
  return matches.length ? STAT_PHRASES[normalizeDescriptionEvidence(matches[0])] : '';
}

function scoreIntent(entry, nameText, patternText, lookupText) {
  const nameMatches = matchedTermsFor(nameText, entry.identityTerms);
  const exactName = nameMatches.find(term => normalizeDescriptionEvidence(term) === nameText || normalizeDescriptionEvidence(`${term}s`) === nameText);
  const patternMatches = matchedTermsFor(patternText, entry.identityTerms);
  const lookupMatches = matchedTermsFor(lookupText, entry.identityTerms);
  const matchedTerms = uniq([...nameMatches, ...patternMatches, ...lookupMatches]);
  if (!matchedTerms.length) return null;
  const longest = Math.max(...matchedTerms.map(term => normalizeDescriptionEvidence(term).length));
  const score = (exactName ? 1000 : 0) + (nameMatches.length ? 500 : 0) + (lookupMatches.length ? 90 : 0) + (patternMatches.length ? 40 : 0) + longest;
  return { ...entry, matchedTerms, nameMatches, exactName: Boolean(exactName), longest, score };
}

function phraseForIntent(intent, traits = [], statPhrase = '', text = '') {
  if (intent === 'materiaClusters') return 'clusters exchanged for materia';
  if (intent === 'materia') {
    if (traits.includes('crafting')) return `crafting materia used to improve ${statPhrase || 'crafting stats'} through melding`;
    if (traits.includes('gathering')) return statPhrase === 'Gathering' ? 'gathering materia used to improve gathering stats through melding' : `gathering materia used to improve ${statPhrase || 'gathering stats'} through melding`;
    return `combat materia used to improve ${statPhrase || 'combat stats'} through melding`;
  }
  if (intent === 'medicine') return 'medicine consumables';
  if (intent === 'fishingSupplies') return 'fishing tackle and supplies';
  if (intent === 'furnishings') {
    if (descriptionTermMatches(text, 'outdoor')) return 'furnishings for outdoor housing spaces';
    if (descriptionTermMatches(text, 'indoor')) return 'furnishings for indoor housing spaces';
    return 'furnishings for housing spaces';
  }
  if (intent === 'meals') return 'meal consumables that provide temporary stat bonuses';
  if (intent === 'potions') {
    if (traits.includes('crafting')) return statPhrase ? `${statPhrase} potions used for temporary crafting resource boosts` : 'crafting potions used for temporary crafting resource boosts';
    if (traits.includes('gathering')) return `${statPhrase || 'gathering'} potions used for temporary gathering boosts`;
    return `${statPhrase || 'stat'} potions used for temporary combat stat boosts`;
  }
  if (intent === 'tools') {
    if (traits.includes('crafting') && traits.includes('gathering')) return 'crafting and gathering tools';
    if (traits.includes('crafting')) return 'crafting tools';
    if (traits.includes('gathering')) return 'gathering tools';
    return 'crafting and gathering tools';
  }
  if (intent === 'gear') {
    if (descriptionTermMatches(text, 'weapon')) {
      if (traits.includes('crafting') && traits.includes('gathering')) return 'crafting and gathering tools';
      if (traits.includes('crafting')) return 'crafting tools';
      if (traits.includes('gathering')) return 'gathering tools';
      return 'weapons and combat equipment';
    }
    if (descriptionTermMatches(text, 'armor') || descriptionTermMatches(text, 'armour')) return 'protective armor and equipment';
    if (descriptionTermMatches(text, 'accessory')) return 'equippable accessories';
    return 'equippable gear';
  }
  if (intent === 'unlockables') return unlockablePhrase(text);
  if (intent === 'tokens') return tokenPhrase(text);
  if (intent === 'materials') return traits.includes('gathering') ? 'gathered materials used in crafting recipes' : 'crafting materials and recipe components';
  if (intent === 'appearance') return descriptionTermMatches(text, 'dye') ? 'dyes for color and appearance customization' : 'glamour items for appearance customization';
  return 'items matched by selected rules';
}

function unlockablePhrase(text) {
  if (descriptionTermMatches(text, 'mount')) return 'mount unlock items for collection and character travel';
  if (descriptionTermMatches(text, 'minion')) return 'minion unlock items for cosmetic companions and collection';
  if (descriptionTermMatches(text, 'triple triad') || descriptionTermMatches(text, 'card')) return 'Triple Triad card unlocks for collection and card play';
  if (descriptionTermMatches(text, 'orchestrion')) return 'orchestrion roll unlocks for music collection';
  if (descriptionTermMatches(text, 'emote')) return 'emote unlock items for character expression';
  if (descriptionTermMatches(text, 'hairstyle')) return 'hairstyle unlock items for character customization';
  if (descriptionTermMatches(text, 'fashion accessory')) return 'fashion accessory unlocks for cosmetic customization';
  return 'collectible unlock items for character collection';
}

function tokenPhrase(text) {
  if (descriptionTermMatches(text, 'totem')) return 'trial totems used to exchange for weapons, mounts, or other rewards';
  if (descriptionTermMatches(text, 'book')) return 'savage raid books used to exchange for raid gear and rewards';
  if (descriptionTermMatches(text, 'tome') || descriptionTermMatches(text, 'tomestone')) return 'tomestone currency and exchange items used for progression rewards';
  if (descriptionTermMatches(text, 'scrip')) return 'crafting and gathering scrip items used for vendor exchanges';
  return 'exchange tokens and reward items used for vendors or progression turn-ins';
}

export function analyzeCategoryIntent(category, options = {}) {
  const rules = rulesOf(category);
  const nameText = normalizeDescriptionEvidence(category?.Name);
  const patternText = hasItems(rules.AllowedItemNamePatterns) ? normalizeDescriptionEvidence(rules.AllowedItemNamePatterns.join(' ')) : '';
  const lookupText = normalizeDescriptionEvidence(lookupRuleNames(rules, options));
  const combinedText = [nameText, patternText, lookupText].filter(Boolean).join(' ');
  const traits = inferTraits(combinedText);
  const statPhrase = bestStatPhrase(combinedText);
  const candidates = INTENT_CONCEPTS.map(entry => scoreIntent(entry, nameText, patternText, lookupText)).filter(Boolean);
  candidates.sort((a, b) => b.score - a.score || Number(b.nameMatches.length > 0) - Number(a.nameMatches.length > 0) || b.longest - a.longest || b.priority - a.priority);
  const best = candidates[0];

  if (!best) {
    return { intent: 'generic', subject: 'items', phrase: 'items matched by selected rules', confidence: 'low', matchedTerms: [], traits, statPhrase };
  }

  return {
    intent: best.intent,
    subject: best.subject,
    phrase: phraseForIntent(best.intent, traits, statPhrase, combinedText),
    confidence: best.nameMatches.length ? 'high' : 'medium',
    matchedTerms: best.matchedTerms,
    traits,
    statPhrase
  };
}

function classifyNames(names = []) {
  const text = normalizeDescriptionEvidence(names.join(' '));
  const found = EXPLICIT_CLASSIFIERS.find(([, terms]) => terms.some(term => descriptionTermMatches(text, term)));
  return found?.[0] || '';
}

function classLabel(kind, source) {
  if (!kind) return '';
  if (kind === 'potion') return source === 'category' ? 'medicine' : 'potion';
  if (kind === 'meal') return 'meal';
  if (kind === 'material') return source === 'category' ? 'crafting material' : 'material';
  if (kind === 'furnishing') return source === 'category' ? 'furnishing' : 'housing';
  return kind;
}

function shortNames(names, limit = 3) {
  return names.filter(name => name.length <= 42).slice(0, limit);
}

function itemPhrase(names) {
  const kind = classLabel(classifyNames(names), 'item');
  if (names.length === 1 && names[0].length <= 60) return `the selected item ${names[0]}`;
  const examples = shortNames(names, 3);
  if (examples.length >= 2 && examples.join(', ').length <= 120) return `selected items such as ${readableJoin(examples)}`;
  if (kind === 'mount' || kind === 'minion') return `selected ${kind} unlock items`;
  if (kind) return `selected ${kind} entries`;
  return names.length ? 'selected cached item entries' : 'selected item entries';
}

function uiCategoryPhrase(names, count) {
  const kind = classLabel(classifyNames(names), 'category');
  const examples = shortNames(names, 3);
  if (examples.length === 1 && count === 1) return `items from the ${examples[0]} category`;
  if (examples.length >= 2 && examples.join(', ').length <= 90) return `items from ${readableJoin(examples)} categories`;
  if (kind) return `selected ${kind} categories`;
  return names.length ? 'selected cached item categories' : 'selected item categories';
}

function combineExplicitPhrases(parts) {
  if (parts.length === 1) {
    if (parts[0].kind === 'patterns') return 'items matched by selected name patterns';
    return parts[0].phrase;
  }
  return readableJoin(parts.map(part => part.shortPhrase || part.phrase));
}

export function analyzeExplicitSources(rules, options = {}) {
  const itemCount = rules.AllowedItemIds?.length || 0;
  const uiCount = rules.AllowedUiCategoryIds?.length || 0;
  const itemNames = cachedNames('Item', rules.AllowedItemIds || [], options);
  const uiNames = cachedNames('ItemUICategory', rules.AllowedUiCategoryIds || [], options);
  const patternCount = rules.AllowedItemNamePatterns?.length || 0;
  const item = { count: itemCount, names: itemNames, uncachedCount: Math.max(0, itemCount - itemNames.length), label: classLabel(classifyNames(itemNames), 'item'), phrase: itemPhrase(itemNames) };
  const ui = { count: uiCount, names: uiNames, uncachedCount: Math.max(0, uiCount - uiNames.length), label: classLabel(classifyNames(uiNames), 'category'), phrase: uiCategoryPhrase(uiNames, uiCount) };
  const patterns = { count: patternCount, examples: (rules.AllowedItemNamePatterns || []).map(String).filter(Boolean).slice(0, 2), phrase: 'name-pattern matches' };
  const parts = [];
  if (itemCount) parts.push({ kind: 'item', phrase: item.phrase, shortPhrase: item.label ? `selected ${item.label} entries` : 'selected item entries' });
  if (uiCount) parts.push({ kind: 'ui', phrase: ui.phrase, shortPhrase: ui.label ? `selected ${ui.label} categories` : 'item categories' });
  if (patternCount) parts.push({ kind: 'patterns', phrase: 'items matched by selected name patterns', shortPhrase: 'name-pattern matches' });
  return {
    itemIds: item,
    uiCategoryIds: ui,
    namePatterns: patterns,
    hasExplicitRules: parts.length > 0,
    phrase: combineExplicitPhrases(parts),
    confidence: itemNames.length || uiNames.length ? 'medium' : 'low'
  };
}
