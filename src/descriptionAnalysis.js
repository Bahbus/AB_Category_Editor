import { isUsefulLookupName } from './lookupNames.js';

const STAT_KEYS = Object.freeze({
  'critical hit': 'criticalHit',
  'direct hit': 'directHit',
  determination: 'determination',
  'skill speed': 'skillSpeed',
  'spell speed': 'spellSpeed',
  tenacity: 'tenacity',
  piety: 'piety',
  craftsmanship: 'craftsmanship',
  control: 'control',
  cp: 'cp',
  gathering: 'gathering',
  perception: 'perception',
  gp: 'gp',
  strength: 'strength',
  dexterity: 'dexterity',
  intelligence: 'intelligence',
  mind: 'mind'
});

const INTENT_CONCEPTS = Object.freeze([
  { intent: 'materiaClusters', subject: 'materia clusters', priority: 110, identityTerms: ['materia cluster', 'materia clusters'] },
  { intent: 'tools', subject: 'crafting and gathering tools', priority: 105, identityTerms: ['doh dol weapon', 'doh dol weapons', 'doh dol tool', 'doh dol tools'] },
  { intent: 'augmentMaterials', subject: 'gear augmentation materials', priority: 100, identityTerms: ['augment material', 'augment materials'] },
  { intent: 'buffs', subject: 'company buffs', priority: 95, identityTerms: ['buff', 'buffs', 'company buff', 'company buffs'] },
  { intent: 'coffers', subject: 'item coffers', priority: 92, identityTerms: ['coffer', 'coffers'] },
  { intent: 'allianceRaidCoins', subject: 'alliance raid coins', priority: 92, identityTerms: ['alliance raid coin', 'alliance raid coins'] },
  { intent: 'treasureMaps', subject: 'treasure maps', priority: 92, identityTerms: ['treasure map', 'treasure maps'] },
  { intent: 'gacha', subject: 'materiel containers', priority: 92, identityTerms: ['gacha', 'materiel container', 'materiel containers'] },
  { intent: 'umbrite', subject: 'Umbrite', priority: 92, identityTerms: ['umbrite'] },
  { intent: 'unsung', subject: 'Unsung tokens', priority: 92, identityTerms: ['unsung'] },
  { intent: 'manuals', subject: 'manuals', priority: 88, exactNameOnly: true, identityTerms: ['manual', 'manuals'] },
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

const AUGMENT_MATERIAL_TERMS = Object.freeze(['solvent', 'twine', 'glaze', 'ester']);

const UI_CATEGORY_COVERAGE = Object.freeze({
  allCombatWeapons: Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 84, 87, 88, 89, 96, 97, 98, 105, 106, 107, 108, 109, 110, 111]),
  allCraftingGatheringTools: Object.freeze([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 99]),
  allArmor: Object.freeze([34, 35, 36, 37, 38]),
  allAccessories: Object.freeze([11, 40, 41, 42, 43])
});

const SAVAGE_RAID_SCOPES = Object.freeze([
  { term: 'lhw', seriesKey: 'arcadion', tierKey: 'lightHeavyweight', messageKey: 'intent.tokens.savageBook.proof' },
  { term: 'cw', seriesKey: 'arcadion', tierKey: 'cruiserweight', messageKey: 'intent.tokens.savageBook.proof' },
  { term: 'hw', seriesKey: 'arcadion', tierKey: 'heavyweight', messageKey: 'intent.tokens.savageBook.proof' },
  { term: 'asphodelos', seriesKey: 'pandaemonium', tierKey: 'asphodelos', messageKey: 'intent.tokens.savageBook.earned' },
  { term: 'abyssos', seriesKey: 'pandaemonium', tierKey: 'abyssos', messageKey: 'intent.tokens.savageBook.earned' },
  { term: 'anabaseios', seriesKey: 'pandaemonium', tierKey: 'anabaseios', messageKey: 'intent.tokens.savageBook.earned' },
  { term: 'gate', seriesKey: 'eden', tierKey: 'gate', messageKey: 'intent.tokens.savageBook.awarded' },
  { term: 'verse', seriesKey: 'eden', tierKey: 'verse', messageKey: 'intent.tokens.savageBook.awarded' },
  { term: 'promise', seriesKey: 'eden', tierKey: 'promise', messageKey: 'intent.tokens.savageBook.awarded' },
  { term: 'deltascape', seriesKey: 'omega', tierKey: 'deltascape', messageKey: 'intent.tokens.savageBook.exchange' },
  { term: 'sigmascape', seriesKey: 'omega', tierKey: 'sigmascape', messageKey: 'intent.tokens.savageBook.exchange' },
  { term: 'alphascape', seriesKey: 'omega', tierKey: 'alphascape', messageKey: 'intent.tokens.savageBook.exchange' },
  { term: 'gordias', seriesKey: 'alexander', tierKey: 'gordias', messageKey: 'intent.tokens.savageBook.records' },
  { term: 'midas', seriesKey: 'alexander', tierKey: 'midas', messageKey: 'intent.tokens.savageBook.records' },
  { term: 'creator', seriesKey: 'alexander', tierKey: 'creator', messageKey: 'intent.tokens.savageBook.records' }
]);

function rulesOf(category) { return category?.Rules || {}; }
function hasItems(value) { return Array.isArray(value) && value.length > 0; }
function uniq(values) { return [...new Set(values.filter(Boolean))]; }

function deterministicVariant(text, count = 3) {
  let hash = 2166136261;
  for (const character of String(text)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % count;
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

function cachedNames(sheet, ids = [], options = {}) {
  if (typeof options.lookupName !== 'function') return [];
  return ids
    .map(id => options.lookupName(sheet, id))
    .map(name => String(name || '').trim())
    .filter(isUsefulLookupName);
}

function representativeLookupMatches(names, totalCount, terms) {
  const matches = names.filter(name => matchedTermsFor(name, terms).length);
  if (totalCount <= 1) return matches;
  return matches.length >= 2 && matches.length / totalCount > 0.5 ? matches : [];
}

function evidenceSupportsTerms(nameText, patternText, lookupEvidence, terms) {
  if (matchedTermsFor(`${nameText} ${patternText}`, terms).length) return true;
  return Boolean(
    representativeLookupMatches(lookupEvidence.itemNames, lookupEvidence.itemCount, terms).length
    || representativeLookupMatches(lookupEvidence.uiNames, lookupEvidence.uiCount, terms).length
  );
}

function inferTraits(nameText, patternText, lookupEvidence) {
  return Object.entries(ROLE_TERMS)
    .filter(([, terms]) => evidenceSupportsTerms(nameText, patternText, lookupEvidence, terms))
    .map(([trait]) => trait);
}

function matchingStatKeys(nameText, patternText, lookupEvidence) {
  const directText = `${nameText} ${patternText}`.trim();
  const matches = Object.keys(STAT_KEYS)
    .filter(term => evidenceSupportsTerms(nameText, patternText, lookupEvidence, [term]))
    .sort((a, b) => {
      const aIndex = directText.indexOf(normalizeDescriptionEvidence(a));
      const bIndex = directText.indexOf(normalizeDescriptionEvidence(b));
      if (aIndex >= 0 && bIndex >= 0 && aIndex !== bIndex) return aIndex - bIndex;
      if (aIndex >= 0 && bIndex < 0) return -1;
      if (bIndex >= 0 && aIndex < 0) return 1;
      return b.length - a.length;
    });
  return uniq(matches.map(term => STAT_KEYS[normalizeDescriptionEvidence(term)]));
}

function scoreIntent(entry, nameText, patternText, lookupEvidence) {
  const nameMatches = matchedTermsFor(nameText, entry.identityTerms);
  const exactName = nameMatches.find(term => normalizeDescriptionEvidence(term) === nameText || normalizeDescriptionEvidence(`${term}s`) === nameText);
  const patternMatches = matchedTermsFor(patternText, entry.identityTerms);
  const itemLookupMatches = representativeLookupMatches(lookupEvidence.itemNames, lookupEvidence.itemCount, entry.identityTerms);
  const uiLookupMatches = representativeLookupMatches(lookupEvidence.uiNames, lookupEvidence.uiCount, entry.identityTerms);
  const lookupMatches = matchedTermsFor([...itemLookupMatches, ...uiLookupMatches].join(' '), entry.identityTerms);
  const matchedTerms = uniq([...nameMatches, ...patternMatches, ...lookupMatches]);
  if (!matchedTerms.length) return null;
  if (entry.exactNameOnly && !exactName) return null;
  const longest = Math.max(...matchedTerms.map(term => normalizeDescriptionEvidence(term).length));
  const score = (exactName ? 1000 : 0) + (nameMatches.length ? 500 : 0) + (patternMatches.length ? 300 : 0) + (lookupMatches.length ? 90 : 0) + longest;
  return { ...entry, matchedTerms, nameMatches, exactName: Boolean(exactName), longest, score };
}

function messageKeyForIntent(intent, traits = [], statKey = '', evidence = {}) {
  const { combinedText = '', nameText = '', itemNames = [], itemCount = itemNames.length } = evidence;
  if (intent === 'materiaClusters') return 'intent.materiaClusters';
  if (intent === 'augmentMaterials') {
    const supportingNames = representativeLookupMatches(itemNames, itemCount, AUGMENT_MATERIAL_TERMS);
    return supportingNames.length ? 'intent.augmentMaterials.tome' : 'intent.augmentMaterials.general';
  }
  if (intent === 'buffs') return 'intent.buffs';
  if (intent === 'coffers') return 'intent.coffers';
  if (intent === 'allianceRaidCoins') return 'intent.allianceRaidCoins';
  if (intent === 'treasureMaps') return 'intent.treasureMaps';
  if (intent === 'manuals') return 'intent.manuals';
  if (intent === 'gacha') return 'intent.gacha';
  if (intent === 'umbrite') return 'intent.umbrite';
  if (intent === 'unsung') return 'intent.unsung';
  if (intent === 'materia') {
    if (evidence.statKeys.length > 1) return `intent.materia.stats.v${evidence.variant + 1}`;
    const role = traits.includes('crafting') ? 'crafting' : traits.includes('gathering') ? 'gathering' : 'combat';
    return `intent.materia.${role}.${statKey ? `stat.v${evidence.variant + 1}` : 'general'}`;
  }
  if (intent === 'medicine') return 'intent.medicine';
  if (intent === 'fishingSupplies') return 'intent.fishingSupplies';
  if (intent === 'furnishings') {
    if (descriptionTermMatches(combinedText, 'outdoor') && descriptionTermMatches(combinedText, 'indoor')) {
      return 'intent.furnishings.general';
    }
    if (descriptionTermMatches(combinedText, 'outdoor')) return 'intent.furnishings.outdoor';
    if (descriptionTermMatches(combinedText, 'indoor')) return 'intent.furnishings.indoor';
    return 'intent.furnishings.general';
  }
  if (intent === 'meals') return 'intent.meals';
  if (intent === 'potions') {
    if (evidence.statKeys.length > 1) return `intent.potions.stats.v${evidence.variant + 1}`;
    if (statKey) return `intent.potions.stat.v${evidence.variant + 1}`;
    if (traits.includes('crafting')) return 'intent.potions.crafting';
    if (traits.includes('gathering')) return 'intent.potions.gathering';
    return 'intent.potions.combat';
  }
  if (intent === 'tools') {
    return evidence.coverage === 'allCraftingGatheringTools' ? 'intent.tools.all' : 'intent.tools.general';
  }
  if (intent === 'gear') {
    const hasWeapons = descriptionTermMatches(combinedText, 'weapon');
    const hasArmor = descriptionTermMatches(combinedText, 'armor') || descriptionTermMatches(combinedText, 'armour');
    const hasAccessories = descriptionTermMatches(combinedText, 'accessory');
    const gearSubtypeCount = [hasWeapons, hasArmor, hasAccessories].filter(Boolean).length;
    if (descriptionTermMatches(nameText, 'weapon') && (descriptionTermMatches(nameText, 'armor') || descriptionTermMatches(nameText, 'armour')) && !hasAccessories) {
      return 'intent.gear.combatSet';
    }
    if (gearSubtypeCount > 1) return 'intent.gear.general';
    if (hasWeapons) {
      if (descriptionTermMatches(nameText, 'blu')) return 'intent.gear.weapons.blueMage';
      if (traits.includes('crafting') || traits.includes('gathering')) {
        return evidence.coverage === 'allCraftingGatheringTools' ? 'intent.tools.all' : 'intent.tools.general';
      }
      return evidence.coverage === 'allCombatWeapons' ? 'intent.gear.weapons.all' : 'intent.gear.weapons.general';
    }
    if (hasArmor) {
      return evidence.coverage === 'allArmor' ? 'intent.gear.armor.all' : 'intent.gear.armor.general';
    }
    if (hasAccessories) {
      return evidence.coverage === 'allAccessories' ? 'intent.gear.accessories.all' : 'intent.gear.accessories.general';
    }
    return 'intent.gear.general';
  }
  if (intent === 'unlockables') return unlockableMessageKey(combinedText);
  if (intent === 'tokens') return tokenMessageKey(nameText, combinedText, evidence.savageScope);
  if (intent === 'materials') {
    if (descriptionTermMatches(nameText, 'extreme')) return 'intent.materials.extreme';
    return traits.includes('gathering') ? 'intent.materials.gathered' : 'intent.materials.crafting';
  }
  if (intent === 'appearance') return descriptionTermMatches(combinedText, 'dye') ? 'intent.appearance.dye' : 'intent.appearance.glamour';
  return '';
}

function unlockableMessageKey(text) {
  const matches = [
    [descriptionTermMatches(text, 'mount'), 'intent.unlockables.mount'],
    [descriptionTermMatches(text, 'minion'), 'intent.unlockables.minion'],
    [descriptionTermMatches(text, 'triple triad') || descriptionTermMatches(text, 'card'), 'intent.unlockables.card'],
    [descriptionTermMatches(text, 'orchestrion'), 'intent.unlockables.orchestrion'],
    [descriptionTermMatches(text, 'emote'), 'intent.unlockables.emote'],
    [descriptionTermMatches(text, 'hairstyle'), 'intent.unlockables.hairstyle'],
    [descriptionTermMatches(text, 'fashion accessory'), 'intent.unlockables.fashionAccessory']
  ].filter(([matched]) => matched);
  return matches.length === 1 ? matches[0][1] : 'intent.unlockables.general';
}

function tokenMessageKey(nameText, combinedText, savageScope) {
  const ultimateTotem = descriptionTermMatches(nameText, 'ultimate') && descriptionTermMatches(nameText, 'totem');
  const extremeTotem = descriptionTermMatches(nameText, 'extreme') && descriptionTermMatches(nameText, 'totem');
  if (ultimateTotem && extremeTotem) return 'intent.tokens.totem';
  if (ultimateTotem) return 'intent.tokens.ultimate';
  if (extremeTotem) return 'intent.tokens.extreme';
  if (descriptionTermMatches(combinedText, 'totem')) return 'intent.tokens.totem';
  if (descriptionTermMatches(combinedText, 'book')) return savageScope?.messageKey || 'intent.tokens.savageBook';
  if (descriptionTermMatches(nameText, 'irregular') && (descriptionTermMatches(combinedText, 'tome') || descriptionTermMatches(combinedText, 'tomestone'))) return 'intent.tokens.irregularTomestone';
  if (descriptionTermMatches(combinedText, 'tome') || descriptionTermMatches(combinedText, 'tomestone')) return 'intent.tokens.tomestone';
  if (descriptionTermMatches(combinedText, 'scrip')) return 'intent.tokens.scrip';
  return 'intent.tokens.general';
}

function savageRaidScope(nameText) {
  if (!descriptionTermMatches(nameText, 'savage') || !descriptionTermMatches(nameText, 'book')) return null;
  const matches = SAVAGE_RAID_SCOPES.filter(scope => descriptionTermMatches(nameText, scope.term));
  return matches.length === 1 ? matches[0] : null;
}

function hasAmbiguousNamedIntents(candidates, best, nameText) {
  if (best.exactName) return false;
  const intents = uniq(candidates.filter(candidate => candidate.nameMatches.length).map(candidate => candidate.intent));
  if (intents.length <= 1) return false;
  const pair = intents.sort().join('|');
  if (pair === 'gear|unlockables' && descriptionTermMatches(nameText, 'fashion accessory')) return false;
  if (pair === 'appearance|gear' && (descriptionTermMatches(nameText, 'dye') || descriptionTermMatches(nameText, 'glamour'))) return false;
  const allowed = new Set([
    'augmentMaterials|materials',
    'materia|materiaClusters'
  ]);
  return !allowed.has(pair);
}

function exactIdCoverage(ids = []) {
  const normalized = [...new Set(ids.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
  for (const [key, expected] of Object.entries(UI_CATEGORY_COVERAGE)) {
    if (normalized.length === expected.length && normalized.every((id, index) => id === expected[index])) return key;
  }
  return '';
}

export function analyzeCategoryIntent(category, options = {}) {
  const rules = rulesOf(category);
  const nameText = normalizeDescriptionEvidence(category?.Name);
  const patternText = hasItems(rules.AllowedItemNamePatterns) ? normalizeDescriptionEvidence(rules.AllowedItemNamePatterns.join(' ')) : '';
  const itemNames = cachedNames('Item', rules.AllowedItemIds || [], options);
  const uiNames = cachedNames('ItemUICategory', rules.AllowedUiCategoryIds || [], options);
  const lookupEvidence = {
    itemNames,
    itemCount: rules.AllowedItemIds?.length || 0,
    uiNames,
    uiCount: rules.AllowedUiCategoryIds?.length || 0
  };
  const lookupText = normalizeDescriptionEvidence([...itemNames, ...uiNames].join(' '));
  const combinedText = [nameText, patternText, lookupText].filter(Boolean).join(' ');
  const traits = inferTraits(nameText, patternText, lookupEvidence);
  const statKeys = matchingStatKeys(nameText, patternText, lookupEvidence);
  const statKey = statKeys[0] || '';
  const coverage = exactIdCoverage(rules.AllowedUiCategoryIds || []);
  const variant = deterministicVariant(nameText);
  const savageScope = savageRaidScope(nameText);
  const candidates = INTENT_CONCEPTS.map(entry => scoreIntent(entry, nameText, patternText, lookupEvidence)).filter(Boolean);
  candidates.sort((a, b) => b.score - a.score || Number(b.nameMatches.length > 0) - Number(a.nameMatches.length > 0) || b.longest - a.longest || b.priority - a.priority);
  const best = candidates[0];

  if (!best || hasAmbiguousNamedIntents(candidates, best, nameText)) {
    return { intent: 'generic', subject: 'items', messageKey: '', confidence: 'low', matchedTerms: [], traits, statKey, statKeys, coverage, variant };
  }

  return {
    intent: best.intent,
    subject: best.subject,
    messageKey: messageKeyForIntent(best.intent, traits, statKey, {
      combinedText,
      nameText,
      itemNames,
      itemCount: lookupEvidence.itemCount,
      coverage,
      variant,
      savageScope,
      statKeys
    }),
    confidence: best.nameMatches.length ? 'high' : 'medium',
    matchedTerms: best.matchedTerms,
    traits,
    statKey,
    statKeys,
    coverage,
    variant,
    raidSeriesKey: savageScope?.seriesKey || '',
    raidTierKey: savageScope?.tierKey || ''
  };
}

export function analyzeExplicitSources(rules, options = {}) {
  const itemCount = rules.AllowedItemIds?.length || 0;
  const uiCount = rules.AllowedUiCategoryIds?.length || 0;
  const itemNames = cachedNames('Item', rules.AllowedItemIds || [], options);
  const uiNames = cachedNames('ItemUICategory', rules.AllowedUiCategoryIds || [], options);
  const patternCount = rules.AllowedItemNamePatterns?.length || 0;
  const item = { count: itemCount, names: itemNames, uncachedCount: Math.max(0, itemCount - itemNames.length) };
  const ui = { count: uiCount, names: uiNames, uncachedCount: Math.max(0, uiCount - uiNames.length) };
  ui.coverage = exactIdCoverage(rules.AllowedUiCategoryIds || []);
  const patterns = { count: patternCount, examples: (rules.AllowedItemNamePatterns || []).map(String).filter(Boolean).slice(0, 2) };
  return {
    itemIds: item,
    uiCategoryIds: ui,
    namePatterns: patterns,
    hasExplicitRules: itemCount + uiCount + patternCount > 0,
    confidence: itemNames.length || uiNames.length ? 'medium' : 'low'
  };
}
