import { ALLOWED_RARITY_IDS } from './constants.js';
import { analyzeCategoryIntent, analyzeExplicitSources } from './descriptionAnalysis.js';
import { DEFAULT_DESCRIPTION_MESSAGES } from './descriptionMessages.js';
import { analyzeItemOrdering } from './itemOrdering.js';

const FALLBACK_DESCRIPTION = DEFAULT_DESCRIPTION_MESSAGES.text('fallback');
const MAX_DESCRIPTION_LENGTH = 140;

function rulesOf(category) { return category?.Rules || {}; }
function activeRange(rules, key) { return Boolean(rules[key]?.Enabled); }
function stateValue(rules, key) { return Number(rules[key]?.State || 0); }
function uniq(values) { return [...new Set(values.filter(Boolean))]; }

function rangeKeys(rules) {
  const hasLevel = activeRange(rules, 'Level');
  const hasItemLevel = activeRange(rules, 'ItemLevel');
  const keys = [];
  if (hasLevel && hasItemLevel) keys.push('qualifier.levelAndItemLevel');
  else if (hasItemLevel) keys.push('qualifier.itemLevel');
  else if (hasLevel) keys.push('qualifier.level');
  if (activeRange(rules, 'VendorPrice')) keys.push('qualifier.vendorPrice');
  return keys;
}

function rarityKey(rules) {
  const selected = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities.map(Number).filter(v => ALLOWED_RARITY_IDS.has(v)) : [];
  const unique = uniq(selected);
  if (!unique.length || unique.length >= ALLOWED_RARITY_IDS.size) return '';
  if (unique.every(v => v >= 3)) return 'qualifier.rarity.high';
  if (unique.length === 1 && unique[0] === 1) return 'qualifier.rarity.common';
  return 'qualifier.rarity.selected';
}

function qualifierKeys(rules, intent) {
  const keys = [];
  if (stateValue(rules, 'Dyeable') === 1) keys.push('qualifier.dyeable');
  if (stateValue(rules, 'Glamourable') === 1) keys.push('qualifier.glamourable');
  if (stateValue(rules, 'Repairable') === 1 && intent === 'gear') keys.push('qualifier.repairable');
  if (stateValue(rules, 'HighQuality') === 1) keys.push('qualifier.highQuality');
  if (stateValue(rules, 'Collectable') === 1) keys.push('qualifier.collectable');
  if (stateValue(rules, 'Untradable') === 2) keys.push('qualifier.tradeable');
  if (stateValue(rules, 'Untradable') === 1) keys.push('qualifier.untradeable');
  if (stateValue(rules, 'Desynthesizable') === 1) keys.push('qualifier.desynthesizable');
  keys.push(...rangeKeys(rules));
  const rarity = rarityKey(rules);
  if (rarity) keys.push(rarity);
  return uniq(keys);
}

function shortExamples(names, limit, maxLength) {
  const result = [];
  for (const name of names) {
    if (name.length > 42) continue;
    const candidate = [...result, name];
    if (candidate.join(', ').length > maxLength) break;
    result.push(name);
    if (result.length === limit) break;
  }
  return result;
}

function genericItemDescription(item, messages) {
  const examples = shortExamples(item.names, 2, 72);
  if (!examples.length) return messages.text('generic.items.none', { count: item.count });
  const names = messages.list(examples);
  if (item.count === 1 && examples.length === 1) return messages.text('generic.items.one', { name: examples[0] });
  if (examples.length === item.count) return messages.text('generic.items.complete', { names });
  return messages.text('generic.items.more', { names, remaining: item.count - examples.length });
}

function genericUiDescription(ui, messages) {
  const examples = shortExamples(ui.names, 3, 76);
  if (!examples.length) return messages.text('generic.ui.none', { count: ui.count });
  const names = messages.list(examples);
  if (ui.count === 1 && examples.length === 1) return messages.text('generic.ui.one', { name: examples[0] });
  if (examples.length === ui.count) return messages.text('generic.ui.complete', { names });
  return messages.text('generic.ui.more', { names, remaining: ui.count - examples.length });
}

function genericDescription(explicit, category, messages) {
  const sources = [];
  if (explicit.itemIds.count) sources.push('explicit item IDs');
  if (explicit.uiCategoryIds.count) sources.push('item categories');
  if (explicit.namePatterns.count) sources.push('name patterns');
  if (sources.length > 1) return messages.text('generic.mixed', { sources: messages.list(sources) });
  if (explicit.itemIds.count) return genericItemDescription(explicit.itemIds, messages);
  if (explicit.uiCategoryIds.count) return genericUiDescription(explicit.uiCategoryIds, messages);
  if (explicit.namePatterns.count) {
    return messages.text(explicit.namePatterns.count === 1 ? 'generic.patterns.one' : 'generic.patterns.many', { count: explicit.namePatterns.count });
  }
  if (analyzeItemOrdering(category).customOrderingApplied) return messages.text('generic.customOrder');
  return '';
}

function intentMessageKey(analysis, rules, qualifiers) {
  const narrowed = qualifiers.length
    || (rules.AllowedItemIds?.length || 0) > 0
    || (rules.AllowedItemNamePatterns?.length || 0) > 0;
  if (!narrowed) return analysis.messageKey;
  return analysis.messageKey
    .replace('intent.tools.all', 'intent.tools.general')
    .replace('intent.gear.weapons.all', 'intent.gear.weapons.general')
    .replace('intent.gear.armor.all', 'intent.gear.armor.general')
    .replace('intent.gear.accessories.all', 'intent.gear.accessories.general');
}

function appendQualifiers(base, keys, messages) {
  if (!keys.length) return base;
  const values = keys.slice(0, 4).map(key => messages.text(key));
  const qualifier = messages.text('qualifiers', { values: messages.list(values) });
  const combined = `${base} ${qualifier}`;
  return combined.length <= MAX_DESCRIPTION_LENGTH ? combined : base;
}

function buildDescription(analysis, rules, category, options = {}) {
  const messages = options.descriptionMessages || DEFAULT_DESCRIPTION_MESSAGES;
  const explicit = analyzeExplicitSources(rules, options);
  const qualifiers = qualifierKeys(rules, analysis.intent);
  if (analysis.intent === 'generic') {
    const base = genericDescription(explicit, category, messages);
    if (!base && !qualifiers.length) return messages.text('fallback');
    return appendQualifiers(base || messages.text('generic.rules'), qualifiers, messages);
  }
  const key = intentMessageKey(analysis, rules, qualifiers);
  const base = messages.text(key, {
    stat: messages.statName(analysis.statKey),
    stats: messages.list((analysis.statKeys || []).map(statKey => messages.statName(statKey))),
    raid: analysis.raidSeriesKey
      ? messages.savageRaidName(analysis.raidSeriesKey, analysis.raidTierKey)
      : ''
  });
  return appendQualifiers(base, qualifiers, messages);
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

export function isUsefulGeneratedDescription(text, options = {}) {
  const cleaned = String(text || '').trim();
  const fallback = cleanSentence((options.descriptionMessages || DEFAULT_DESCRIPTION_MESSAGES).text('fallback'));
  return Boolean(cleaned) && cleaned !== fallback && cleaned !== FALLBACK_DESCRIPTION;
}

export function generateCategoryDescription(category, options = {}) {
  const analysis = analyzeCategoryIntent(category, options);
  const messages = options.descriptionMessages || DEFAULT_DESCRIPTION_MESSAGES;
  const text = cleanSentence(buildDescription(analysis, rulesOf(category), category, options));
  if (text.length > MAX_DESCRIPTION_LENGTH || /\b(ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality)\b|\b(items items|gear gear)\b|specific game item categories|from manually selected items|from items from|items from selected in-game item categories|that are within/i.test(text)) {
    return analysis.intent === 'generic' ? cleanSentence(messages.text('fallback')) : cleanSentence(messages.text(analysis.messageKey, {
      stat: messages.statName(analysis.statKey),
      stats: messages.list((analysis.statKeys || []).map(statKey => messages.statName(statKey))),
      raid: analysis.raidSeriesKey
        ? messages.savageRaidName(analysis.raidSeriesKey, analysis.raidTierKey)
        : ''
    }));
  }
  return text;
}

export { FALLBACK_DESCRIPTION };
