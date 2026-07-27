import { ALLOWED_RARITY_IDS } from './constants.js';
import { analyzeCategoryIntent, analyzeExplicitSources, readableJoin } from './descriptionAnalysis.js';
import { analyzeItemOrdering } from './itemOrdering.js';

const FALLBACK_DESCRIPTION = "Groups items matching this category's selected rules.";

function rulesOf(category) { return category?.Rules || {}; }
function activeRange(rules, key) { return Boolean(rules[key]?.Enabled); }
function stateValue(rules, key) { return Number(rules[key]?.State || 0); }
function uniq(values) { return [...new Set(values.filter(Boolean))]; }

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
  if (stateValue(rules, 'Glamourable') === 1) adjectives.push('glamour-ready');
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

function applyAdjectives(phrase, adjectives) {
  if (!adjectives.length) return phrase;
  return `${readableJoin(adjectives.slice(0, 3))} ${phrase}`;
}

function appendQualifiers(sentence, qualifiers) {
  const values = uniq(qualifiers).slice(0, 3);
  if (!values.length) return sentence;
  return `${sentence.replace(/\.$/, '')} ${readableJoin(values)}.`;
}

function buildDescription(analysis, rules, category, options = {}) {
  const ranges = rangeIdeas(rules);
  const objects = stateObjects(rules);
  const explicit = analyzeExplicitSources(rules, options);
  if (analysis.intent === 'generic') {
    const clues = [explicit.phrase, ...objects, ...ranges].filter(Boolean);
    if (analyzeItemOrdering(category).customOrderingApplied) clues.push('custom item ordering');
    return clues.length ? `Groups ${readableJoin(clues.slice(0, 3))}.` : FALLBACK_DESCRIPTION;
  }

  const phrase = applyAdjectives(analysis.phrase, stateAdjectives(rules, analysis.intent));
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
  const text = cleanSentence(buildDescription(analysis, rulesOf(category), category, options));
  if (/\b(ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality)\b|\b(items items|gear gear)\b|specific game item categories|from manually selected items|from items from|items from selected in-game item categories|that are within/i.test(text)) {
    return analysis.intent === 'generic' ? FALLBACK_DESCRIPTION : `Groups ${analysis.phrase}.`;
  }
  return text;
}

export { analyzeCategoryIntent, analyzeExplicitSources, FALLBACK_DESCRIPTION };
