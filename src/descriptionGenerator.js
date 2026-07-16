import { ALLOWED_RARITY_IDS } from './constants.js';
import { isUsefulLookupName } from './lookupNames.js';
import { analyzeItemOrdering } from './itemOrdering.js';

const FALLBACK_DESCRIPTION = "Groups items matching this category's selected rules.";

const STAT_PHRASES = {
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
};

const INTENTS = [
  { intent: 'materia', subject: 'materia', priority: 90, identityTerms: ['materia'], contextTerms: Object.keys(STAT_PHRASES) },
  { intent: 'meals', subject: 'meal consumables', priority: 80, identityTerms: ['food', 'meal', 'meals'], contextTerms: Object.keys(STAT_PHRASES) },
  { intent: 'potions', subject: 'potions', priority: 80, identityTerms: ['potion', 'potions'], contextTerms: Object.keys(STAT_PHRASES) },
  { intent: 'gear', subject: 'equippable gear', priority: 70, identityTerms: ['gear', 'equipment', 'weapon', 'weapons', 'armor', 'armour', 'accessory', 'accessories'], contextTerms: ['battle', 'combat', 'crafting', 'gathering'] },
  { intent: 'unlockables', subject: 'unlock items', priority: 75, identityTerms: ['mount', 'mounts', 'minion', 'minions', 'orchestrion roll', 'orchestrion rolls', 'orchestrion', 'triple triad card', 'triple triad cards', 'triple triad', 'card', 'cards', 'emote', 'emotes', 'hairstyle', 'hairstyles', 'fashion accessory', 'fashion accessories'], contextTerms: ['collection', 'cosmetic'] },
  { intent: 'tokens', subject: 'exchange items', priority: 65, identityTerms: ['token', 'tokens', 'totem', 'totems', 'book', 'books', 'tome', 'tomes', 'tomestone', 'tomestones', 'scrip', 'scrips', 'currency', 'currencies', 'voucher', 'vouchers', 'coin', 'coins', 'certificate', 'certificates'], contextTerms: ['extreme', 'savage', 'raid', 'trial', 'vendor', 'exchange'] },
  { intent: 'materials', subject: 'materials', priority: 60, identityTerms: ['material', 'materials', 'ingredient', 'ingredients', 'reagent', 'reagents', 'ore', 'ores', 'log', 'logs', 'cloth', 'leather', 'lumber', 'ingot', 'ingots', 'nugget', 'nuggets', 'gem', 'gems', 'sand', 'crystal', 'crystals', 'cluster', 'clusters', 'shard', 'shards'], contextTerms: ['crafting', 'gathering', 'gathered', ...Object.keys(STAT_PHRASES)] },
  { intent: 'appearance', subject: 'appearance customization items', priority: 55, identityTerms: ['dye', 'dyes', 'glamour', 'prism', 'prisms', 'dresser'], contextTerms: ['color', 'colour', 'cosmetic'] }
];

const ROLE_TERMS = {
  combat: ['strength', 'dexterity', 'intelligence', 'mind', 'vitality', 'critical hit', 'direct hit', 'determination', 'skill speed', 'spell speed', 'tenacity', 'piety'],
  crafting: ['craftsmanship', 'control', 'cp', 'crafting', 'synthesis'],
  gathering: ['gathering', 'perception', 'gp']
};

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

function normalizeText(text = '') {
  return String(text).toLowerCase().replace(/[_-]+/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function singularize(term) {
  return term.replace(/ies$/, 'y').replace(/s$/, '');
}

function escapeRegExp(text) { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function pluralize(term) {
  return /y$/.test(term) ? term.replace(/y$/, 'ies') : `${term}s`;
}

function termMatches(text, term) {
  const normalized = normalizeText(text);
  const singular = singularize(normalizeText(term));
  const variants = uniq([normalizeText(term), singular, pluralize(singular)]);
  return variants.some(value => new RegExp(`(^|\\b)${escapeRegExp(value)}(\\b|$)`, 'i').test(normalized));
}

function matchedTermsFor(text, terms) {
  const matches = [];
  for (const term of terms) {
    const concept = singularize(normalizeText(term));
    if (matches.some(match => singularize(normalizeText(match)) === concept)) continue;
    if (termMatches(text, term)) matches.push(term);
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
  return names.filter(Boolean).join(' ');
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
  return matches.length ? STAT_PHRASES[normalizeText(matches[0])] : '';
}

function scoreIntent(entry, nameText, patternText, lookupText) {
  const nameMatches = matchedTermsFor(nameText, entry.identityTerms);
  const exactName = nameMatches.find(term => normalizeText(term) === nameText || normalizeText(`${term}s`) === nameText);
  const patternMatches = matchedTermsFor(patternText, entry.identityTerms);
  const lookupMatches = matchedTermsFor(lookupText, entry.identityTerms);
  const matchedTerms = uniq([...nameMatches, ...patternMatches, ...lookupMatches]);
  if (!matchedTerms.length) return null;
  const longest = Math.max(...matchedTerms.map(term => normalizeText(term).length));
  const score = (exactName ? 1000 : 0) + (nameMatches.length ? 500 : 0) + (lookupMatches.length ? 90 : 0) + (patternMatches.length ? 40 : 0) + longest;
  return { ...entry, matchedTerms, nameMatches, exactName: Boolean(exactName), longest, score };
}

export function analyzeCategoryIntent(category, options = {}) {
  const rules = rulesOf(category);
  const nameText = normalizeText(category?.Name);
  const patternText = hasItems(rules.AllowedItemNamePatterns) ? normalizeText(rules.AllowedItemNamePatterns.join(' ')) : '';
  const lookupText = normalizeText(lookupRuleNames(rules, options));
  const combinedText = [nameText, patternText, lookupText].filter(Boolean).join(' ');
  const traits = inferTraits(combinedText);
  const statPhrase = bestStatPhrase(combinedText);

  const candidates = INTENTS.map(entry => scoreIntent(entry, nameText, patternText, lookupText)).filter(Boolean);
  candidates.sort((a, b) => b.score - a.score || Number(b.nameMatches.length > 0) - Number(a.nameMatches.length > 0) || b.longest - a.longest || b.priority - a.priority);
  const best = candidates[0];

  if (!best) {
    return { intent: 'generic', subject: 'items', phrase: 'items matched by selected rules', confidence: 'low', matchedTerms: [], traits, statPhrase };
  }

  const confidence = best.nameMatches.length ? 'high' : 'medium';
  return {
    intent: best.intent,
    subject: best.subject,
    phrase: phraseForIntent(best.intent, traits, statPhrase, combinedText),
    confidence,
    matchedTerms: best.matchedTerms,
    traits,
    statPhrase
  };
}

function phraseForIntent(intent, traits = [], statPhrase = '', text = '') {
  if (intent === 'materia') {
    if (traits.includes('crafting')) return `crafting materia used to improve ${statPhrase || 'crafting stats'} through melding`;
    if (traits.includes('gathering')) return statPhrase === 'Gathering' ? 'gathering materia used to improve gathering stats through melding' : `gathering materia used to improve ${statPhrase || 'gathering stats'} through melding`;
    return `combat materia used to improve ${statPhrase || 'combat stats'} through melding`;
  }
  if (intent === 'meals') return 'meal consumables that provide temporary stat bonuses';
  if (intent === 'potions') {
    if (traits.includes('crafting')) return statPhrase ? `${statPhrase} potions used for temporary crafting resource boosts` : 'crafting potions used for temporary crafting resource boosts';
    if (traits.includes('gathering')) return `${statPhrase || 'gathering'} potions used for temporary gathering boosts`;
    return `${statPhrase || 'stat'} potions used for temporary combat stat boosts`;
  }
  if (intent === 'gear') {
    if (termMatches(text, 'weapon')) return 'weapons and combat equipment';
    if (termMatches(text, 'armor') || termMatches(text, 'armour')) return 'protective armor and equipment';
    if (termMatches(text, 'accessory')) return 'equippable accessories';
    return 'equippable gear';
  }
  if (intent === 'unlockables') return unlockablePhrase(text);
  if (intent === 'tokens') return tokenPhrase(text);
  if (intent === 'materials') return traits.includes('gathering') ? 'gathered materials used in crafting recipes' : 'crafting materials and recipe components';
  if (intent === 'appearance') return termMatches(text, 'dye') ? 'dyes for color and appearance customization' : 'glamour items for appearance customization';
  return 'items matched by selected rules';
}

function unlockablePhrase(text) {
  if (termMatches(text, 'mount')) return 'mount unlock items for collection and character travel';
  if (termMatches(text, 'minion')) return 'minion unlock items for cosmetic companions and collection';
  if (termMatches(text, 'triple triad') || termMatches(text, 'card')) return 'Triple Triad card unlocks for collection and card play';
  if (termMatches(text, 'orchestrion')) return 'orchestrion roll unlocks for music collection';
  if (termMatches(text, 'emote')) return 'emote unlock items for character expression';
  if (termMatches(text, 'hairstyle')) return 'hairstyle unlock items for character customization';
  if (termMatches(text, 'fashion accessory')) return 'fashion accessory unlocks for cosmetic customization';
  return 'collectible unlock items for character collection';
}

function tokenPhrase(text) {
  if (termMatches(text, 'totem')) return 'trial totems used to exchange for weapons, mounts, or other rewards';
  if (termMatches(text, 'book')) return 'savage raid books used to exchange for raid gear and rewards';
  if (termMatches(text, 'tome') || termMatches(text, 'tomestone')) return 'tomestone currency and exchange items used for progression rewards';
  if (termMatches(text, 'scrip')) return 'crafting and gathering scrip items used for vendor exchanges';
  return 'exchange tokens and reward items used for vendors or progression turn-ins';
}

const EXPLICIT_CLASSIFIERS = [
  ['materia', ['materia']],
  ['potion', ['potion', 'tincture', 'draught', 'medicine']],
  ['meal', ['meal', 'food', 'dish', 'soup', 'salad']],
  ['mount', ['mount', 'whistle', 'horn', 'key']],
  ['minion', ['minion']],
  ['card', ['triple triad', 'card']],
  ['emote', ['emote', 'ballroom etiquette']],
  ['hairstyle', ['hairstyle', 'modern aesthetics']],
  ['token', ['token', 'totem', 'book', 'tomestone', 'scrip', 'coin', 'voucher', 'certificate']],
  ['material', ['material', 'ingredient', 'reagent', 'ore', 'log', 'cloth', 'leather', 'lumber', 'ingot', 'nugget', 'crystal', 'cluster', 'shard']],
  ['furnishing', ['furnishing', 'tabletop', 'wall-mounted', 'outdoor', 'housing']],
  ['dye', ['dye']],
  ['glamour', ['glamour', 'prism']],
  ['weapon', ['weapon', 'arms']],
  ['armor', ['armor', 'armour', 'shield', 'head', 'body', 'hands', 'legs', 'feet']],
  ['accessory', ['accessory', 'bracelet', 'ring', 'earring', 'necklace']]
];

function classifyNames(names = []) {
  const text = normalizeText(names.join(' '));
  const found = EXPLICIT_CLASSIFIERS.find(([, terms]) => terms.some(term => termMatches(text, term)));
  return found?.[0] || '';
}

function classLabel(kind, source) {
  if (!kind) return '';
  if (kind === 'potion') return source === 'category' ? 'medicine' : 'potion';
  if (kind === 'meal') return 'meal';
  if (kind === 'material') return source === 'category' ? 'crafting material' : 'material';
  if (kind === 'furnishing') return source === 'category' ? 'furnishing' : 'housing';
  if (['weapon', 'armor', 'accessory'].includes(kind)) return kind;
  return kind;
}

function shortNames(names, limit = 3) {
  return names.filter(name => name.length <= 42).slice(0, limit);
}

function itemPhrase(names, count) {
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

function patternPhrase(rules) {
  const examples = (rules.AllowedItemNamePatterns || []).map(String).filter(Boolean).slice(0, 2);
  return { count: rules.AllowedItemNamePatterns?.length || 0, examples, phrase: 'name-pattern matches' };
}

function combineExplicitPhrases(parts) {
  if (parts.length === 1) {
    if (parts[0].kind === 'patterns') return 'items matched by selected name patterns';
    if (parts[0].kind === 'ui') return parts[0].phrase.startsWith('items from') ? parts[0].phrase : parts[0].phrase;
    return parts[0].phrase;
  }
  return readableJoin(parts.map(part => part.shortPhrase || part.phrase));
}

export function analyzeExplicitSources(rules, options = {}) {
  const itemCount = rules.AllowedItemIds?.length || 0;
  const uiCount = rules.AllowedUiCategoryIds?.length || 0;
  const itemNames = cachedNames('Item', rules.AllowedItemIds || [], options);
  const uiNames = cachedNames('ItemUICategory', rules.AllowedUiCategoryIds || [], options);
  const patterns = patternPhrase(rules);
  const item = { count: itemCount, names: itemNames, uncachedCount: Math.max(0, itemCount - itemNames.length), label: classLabel(classifyNames(itemNames), 'item'), phrase: itemPhrase(itemNames, itemCount) };
  const ui = { count: uiCount, names: uiNames, uncachedCount: Math.max(0, uiCount - uiNames.length), label: classLabel(classifyNames(uiNames), 'category'), phrase: uiCategoryPhrase(uiNames, uiCount) };
  const parts = [];
  if (itemCount) parts.push({ kind: 'item', phrase: item.phrase, shortPhrase: item.label ? `selected ${item.label} entries` : 'selected item entries' });
  if (uiCount) parts.push({ kind: 'ui', phrase: ui.phrase, shortPhrase: ui.label ? `selected ${ui.label} categories` : 'item categories' });
  if (patterns.count) parts.push({ kind: 'patterns', phrase: 'items matched by selected name patterns', shortPhrase: 'name-pattern matches' });
  return {
    itemIds: item,
    uiCategoryIds: ui,
    namePatterns: patterns,
    hasExplicitRules: parts.length > 0,
    phrase: combineExplicitPhrases(parts),
    confidence: itemNames.length || uiNames.length ? 'medium' : 'low'
  };
}

function rangeIdeas(rules) {
  const hasLevel = activeRange(rules, 'Level');
  const hasItemLevel = activeRange(rules, 'ItemLevel');
  const ideas = [];
  if (hasLevel && hasItemLevel) ideas.push('within the selected level and item-level ranges');
  else if (hasItemLevel) ideas.push('within the selected item-level range');
  else if (hasLevel) ideas.push('within the selected level range');
  if (activeRange(rules, 'VendorPrice')) ideas.push('filtered by vendor value');
  return ideas;
}

function rarityIdea(rules) {
  const selected = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities.map(Number).filter(v => ALLOWED_RARITY_IDS.has(v)) : [];
  const unique = uniq(selected);
  if (!unique.length || unique.length >= ALLOWED_RARITY_IDS.size) return '';
  if (unique.every(v => v >= 3)) return 'higher-rarity';
  if (unique.length === 1 && unique[0] === 1) return 'common';
  return unique.length <= 2 ? 'selected-rarity' : '';
}

function stateAdjectives(rules, intent) {
  const adjectives = [];
  if (stateValue(rules, 'Dyeable') === 1) adjectives.push('dyeable');
  if (stateValue(rules, 'Glamourable') === 1) adjectives.push(intent === 'gear' ? 'glamour-ready' : 'glamour-ready');
  if (stateValue(rules, 'Repairable') === 1 && intent === 'gear') adjectives.push('repairable');
  if (stateValue(rules, 'HighQuality') === 1) adjectives.push('high-quality');
  const rarity = rarityIdea(rules);
  if (rarity) adjectives.push(rarity);
  return uniq(adjectives);
}

function stateObjects(rules) {
  const objects = [];
  if (stateValue(rules, 'Collectable') === 1) objects.push('collectable turn-in items');
  if (stateValue(rules, 'Untradable') === 2) objects.push('tradeable items');
  if (stateValue(rules, 'Untradable') === 1) objects.push('untradeable items');
  if (stateValue(rules, 'Desynthesizable') === 1) objects.push('desynthesizable items');
  return objects;
}

function applyAdjectives(phrase, adjectives, intent) {
  if (!adjectives.length) return phrase;
  const prefix = readableJoin(adjectives.slice(0, 3));
  if (intent === 'gear') {
    if (/^equippable gear$/.test(phrase)) return `${prefix} gear`;
    if (/equipment/.test(phrase)) return `${prefix} ${phrase}`;
    return `${prefix} ${phrase}`;
  }
  if (intent === 'appearance') return `${prefix} ${phrase}`;
  return `${prefix} ${phrase}`;
}

function appendQualifiers(sentence, qualifiers) {
  const values = uniq(qualifiers).slice(0, 3);
  if (!values.length) return sentence;
  return `${sentence.replace(/\.$/, '')} ${readableJoin(values)}.`;
}

function buildIntentDescription(analysis, rules, category, options = {}) {
  const ranges = rangeIdeas(rules);
  const objects = stateObjects(rules);
  const explicit = analyzeExplicitSources(rules, options);
  if (analysis.intent === 'generic') {
    const clues = [explicit.phrase, ...objects, ...ranges].filter(Boolean);
    if (analyzeItemOrdering(category).customOrderingApplied) clues.push('custom item ordering');
    return clues.length ? `Groups ${readableJoin(clues.slice(0, 3))}.` : FALLBACK_DESCRIPTION;
  }
  const phrase = applyAdjectives(analysis.phrase, stateAdjectives(rules, analysis.intent), analysis.intent);
  const qualifiers = [...objects, ...ranges];
  if (explicit.hasExplicitRules) {
    if (explicit.uiCategoryIds.count && !explicit.itemIds.count && !explicit.namePatterns.count) {
      qualifiers.push(explicit.uiCategoryIds.phrase.startsWith('items from') ? `from ${explicit.uiCategoryIds.phrase.replace(/^items from\s+/i, '')}` : `from ${explicit.uiCategoryIds.phrase}`);
    } else if (explicit.namePatterns.count && !explicit.itemIds.count && !explicit.uiCategoryIds.count) {
      qualifiers.push('matched by selected name patterns');
    } else {
      qualifiers.push(`limited to ${explicit.phrase}`);
    }
  }
  return appendQualifiers(`Groups ${phrase}.`, qualifiers);
}

function cleanSentence(text) {
  let cleaned = String(text)
    .replace(/\bitems items\b/gi, 'items')
    .replace(/\bgear gear\b/gi, 'gear')
    .replace(/\bfrom items from\b/gi, 'from')
    .replace(/\bthat are within\b/gi, 'within')
    .replace(/selected category rules/gi, 'selected rules')
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
  if (!cleaned.endsWith('.')) cleaned += '.';
  return cleaned;
}

export function isUsefulGeneratedDescription(text) {
  const cleaned = String(text || '').trim();
  return Boolean(cleaned) && cleaned !== FALLBACK_DESCRIPTION;
}

export function generateCategoryDescription(category, options = {}) {
  const analysis = analyzeCategoryIntent(category, options);
  const text = cleanSentence(buildIntentDescription(analysis, rulesOf(category), category, options));
  if (/\b(ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality)\b|\b(items items|gear gear)\b|specific game item categories|from manually selected items|from items from|items from selected in-game item categories|that are within/i.test(text)) {
    return analysis.intent === 'generic' ? FALLBACK_DESCRIPTION : `Groups ${analysis.phrase}.`;
  }
  return text;
}

export { FALLBACK_DESCRIPTION };
