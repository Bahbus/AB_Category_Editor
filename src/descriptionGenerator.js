import { ALLOWED_RARITY_IDS } from './constants.js';

const FALLBACK_DESCRIPTION = "Groups items matching this category's selected rules.";

const INTENTS = [
  { intent: 'materia', subject: 'materia', terms: ['materia','critical hit','direct hit','determination','skill speed','spell speed','tenacity','piety','craftsmanship','control','gathering','perception','gp'] },
  { intent: 'meals', subject: 'meal consumables', terms: ['food','meal','meals'] },
  { intent: 'potions', subject: 'stat potions', terms: ['potion','potions','strength potion','dexterity potion','intelligence potion','mind potion','craftsmanship potion','control potion','cp potion'] },
  { intent: 'gear', subject: 'equippable gear', terms: ['gear','equipment','weapon','weapons','armor','armour','accessory','accessories'] },
  { intent: 'unlockables', subject: 'collectible unlock items', terms: ['mount','mounts','minion','minions','orchestrion','triple triad','card','cards','emote','emotes','hairstyle','hairstyles','fashion accessory','fashion accessories'] },
  { intent: 'tokens', subject: 'exchange tokens and reward items', terms: ['token','tokens','totem','totems','book','books','tome','tomes','scrip','scrips','currency','currencies','voucher','vouchers','coin','coins','certificate','certificates'] },
  { intent: 'materials', subject: 'crafting materials', terms: ['material','materials','ingredient','ingredients','reagent','reagents','ore','ores','log','logs','cloth','leather','lumber','ingot','ingots','nugget','nuggets','gem','gems','sand','crystal','crystals','cluster','clusters','shard','shards'] },
  { intent: 'appearance', subject: 'appearance customization items', terms: ['dye','dyes','glamour','prism','prisms','dresser'] }
];

const ROLE_TERMS = {
  combat: ['strength','dexterity','intelligence','mind','vitality','critical hit','direct hit','determination','skill speed','spell speed','tenacity','piety'],
  crafting: ['craftsmanship','control','cp','crafting','synthesis'],
  gathering: ['gathering','perception','gp']
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
  return String(text).toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function termMatches(text, term) {
  return new RegExp(`(^|\\b)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s)?(\\b|$)`, 'i').test(text);
}

function matchedTermsFor(text, terms) {
  return terms.filter(term => termMatches(text, term));
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

export function analyzeCategoryIntent(category, options = {}) {
  const rules = rulesOf(category);
  const nameText = normalizeText(category?.Name);
  const patternText = hasItems(rules.AllowedItemNamePatterns) ? normalizeText(rules.AllowedItemNamePatterns.join(' ')) : '';
  const lookupText = normalizeText(lookupRuleNames(rules, options));
  const text = [nameText, patternText, lookupText].filter(Boolean).join(' ');
  const traits = inferTraits(text);

  let best = null;
  for (const entry of INTENTS) {
    const matchedTerms = matchedTermsFor(text, entry.terms);
    if (!matchedTerms.length) continue;
    const score = matchedTerms.length + (matchedTerms.some(term => termMatches(nameText, term)) ? 2 : 0);
    if (!best || score > best.score) best = { ...entry, matchedTerms, score };
  }

  if (!best) {
    return { intent: 'generic', subject: 'items', phrase: 'items matched by the selected category rules', confidence: 'low', matchedTerms: [], traits };
  }

  const confidence = best.matchedTerms.some(term => termMatches(nameText, term)) ? 'high' : 'medium';
  return {
    intent: best.intent,
    subject: best.subject,
    phrase: phraseForIntent(best.intent, traits),
    confidence,
    matchedTerms: best.matchedTerms,
    traits
  };
}

function phraseForIntent(intent, traits = []) {
  if (intent === 'materia') {
    if (traits.includes('crafting')) return 'crafting materia used for melding and synthesis stat customization';
    if (traits.includes('gathering')) return 'gathering materia used for melding and gathering stat customization';
    return 'combat materia used for melding and stat customization';
  }
  if (intent === 'meals') return traits.includes('crafting') || traits.includes('gathering') ? 'crafting and gathering meals used for temporary performance bonuses' : 'meal consumables that provide temporary stat buffs';
  if (intent === 'potions') {
    if (traits.includes('crafting')) return 'crafting potions that improve synthesis-related stats';
    if (traits.includes('gathering')) return 'gathering potions used for temporary gathering boosts';
    return 'stat potions used for temporary combat boosts';
  }
  if (intent === 'gear') return 'equippable gear';
  if (intent === 'unlockables') return 'collectible unlock items such as mounts, minions, cards, emotes, or hairstyles';
  if (intent === 'tokens') return 'exchange tokens and reward items used for vendors or progression turn-ins';
  if (intent === 'materials') return traits.includes('gathering') ? 'gathered materials used in crafting recipes' : 'crafting materials and recipe components';
  if (intent === 'appearance') return 'appearance customization items for glamour or color changes';
  return 'items matched by the selected category rules';
}

function explicitIdeas(rules, intent) {
  const ideas = [];
  if (hasItems(rules.AllowedItemIds)) ideas.push('manually selected items');
  if (hasItems(rules.AllowedItemNamePatterns)) ideas.push('items matched by name patterns');
  if (hasItems(rules.AllowedUiCategoryIds)) ideas.push('items from selected in-game categories');
  return intent === 'generic' ? ideas : ideas.filter(idea => idea !== 'items matched by name patterns').slice(0, 2);
}

function rangeIdeas(rules, intent) {
  const ideas = [];
  if (activeRange(rules, 'ItemLevel')) ideas.push(intent === 'gear' ? 'within the selected item-level range' : 'limited by item level');
  if (activeRange(rules, 'Level')) ideas.push('within the selected level range');
  if (activeRange(rules, 'VendorPrice') && ideas.length === 0) ideas.push('filtered by vendor value');
  return ideas;
}

function rarityIdea(rules) {
  const selected = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities.map(Number).filter(v => ALLOWED_RARITY_IDS.has(v)) : [];
  const unique = uniq(selected);
  if (!unique.length || unique.length >= ALLOWED_RARITY_IDS.size) return '';
  if (unique.every(v => v >= 3)) return 'restricted to higher-rarity items';
  if (unique.length === 1 && unique[0] === 1) return 'restricted to common items';
  return unique.length <= 2 ? 'limited to selected rarities' : '';
}

function stateTraits(rules, intent) {
  const traits = [];
  if (stateValue(rules, 'Dyeable') === 1) traits.push(intent === 'gear' ? 'dyeable gear' : 'dyeable items');
  if (stateValue(rules, 'Glamourable') === 1) traits.push('items usable for glamour');
  if (stateValue(rules, 'Collectable') === 1) traits.push('collectable turn-in items');
  if (stateValue(rules, 'Untradable') === 2) traits.push('tradeable items');
  if (stateValue(rules, 'Untradable') === 1) traits.push('bound or untradeable items');
  if (stateValue(rules, 'Desynthesizable') === 1) traits.push('items that can be desynthesized');
  if (stateValue(rules, 'Repairable') === 1 && intent === 'gear') traits.push('repairable gear');
  if (stateValue(rules, 'HighQuality') === 1) traits.push('high-quality items');
  return traits;
}

function constraintPhrase(constraints) {
  const joined = readableJoin(constraints);
  if (/^(within|limited|filtered|restricted)\b/i.test(joined)) return joined;
  return `that are ${joined}`;
}

function buildIntentDescription(analysis, rules, category) {
  const constraints = [...stateTraits(rules, analysis.intent), ...rangeIdeas(rules, analysis.intent)];
  const rarity = rarityIdea(rules);
  if (rarity) constraints.push(rarity);
  const explicit = explicitIdeas(rules, analysis.intent);
  if (analysis.intent === 'generic') {
    const clues = [...explicit, ...constraints];
    if (hasItems(category?.CustomItemOrder)) clues.push('custom item ordering');
    return clues.length ? `Groups ${readableJoin(clues.slice(0, 3))}.` : FALLBACK_DESCRIPTION;
  }
  if (constraints.length) return `Groups ${analysis.phrase} ${constraintPhrase(constraints.slice(0, 2))}.`;
  if (explicit.length) return `Groups ${analysis.phrase} from ${readableJoin(explicit.slice(0, 2))}.`;
  return `Groups ${analysis.phrase}.`;
}

function cleanSentence(text) {
  return String(text)
    .replace(/\bitems items\b/gi, 'items')
    .replace(/\bgear gear\b/gi, 'gear')
    .replace(/\bwith within\b/gi, 'within')
    .replace(/\s+(within|limited|filtered|restricted)/, ' $1')
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();
}

export function isUsefulGeneratedDescription(text) {
  const cleaned = String(text || '').trim();
  return Boolean(cleaned) && cleaned !== FALLBACK_DESCRIPTION;
}

export function generateCategoryDescription(category, options = {}) {
  const analysis = analyzeCategoryIntent(category, options);
  const text = buildIntentDescription(analysis, rulesOf(category), category);
  return cleanSentence(text);
}

export { FALLBACK_DESCRIPTION };
