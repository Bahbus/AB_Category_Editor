import { ALLOWED_RARITY_IDS } from './constants.js';

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function makeId() {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function defaultRules() {
  return {
    AllowedItemIds: [],
    AllowedItemNamePatterns: [],
    AllowedUiCategoryIds: [],
    AllowedRarities: [],
    Level: { Enabled: false, Min: 0, Max: 200 },
    ItemLevel: { Enabled: false, Min: 0, Max: 2000 },
    VendorPrice: { Enabled: false, Min: 0, Max: 9999999 },
    Untradable: { State: 0, Filter: 0 },
    Unique: { State: 0, Filter: 0 },
    Collectable: { State: 0, Filter: 0 },
    Dyeable: { State: 0, Filter: 0 },
    Repairable: { State: 0, Filter: 0 },
    HighQuality: { State: 0, Filter: 0 },
    Desynthesizable: { State: 0, Filter: 0 },
    Glamourable: { State: 0, Filter: 0 },
    FullySpiritbonded: { State: 0, Filter: 0 }
  };
}

export function defaultCategory(maxOrder = 0) {
  return {
    Enabled: true,
    Pinned: false,
    Id: makeId(),
    Name: 'New Category',
    Description: '',
    Order: maxOrder + 1,
    Priority: maxOrder + 1,
    Color: { X: 1, Y: 1, Z: 1, W: 1 },
    ItemSortCriteria: [{ Field: 0, Direction: 0 }],
    CustomItemOrder: [],
    Rules: defaultRules()
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const RANGE_RULE_KEYS = ['Level', 'ItemLevel', 'VendorPrice'];
const STATE_RULE_KEYS = ['Untradable', 'Unique', 'Collectable', 'Dyeable', 'Repairable', 'HighQuality', 'Desynthesizable', 'Glamourable', 'FullySpiritbonded'];
const LIST_RULE_KEYS = ['AllowedItemIds','AllowedItemNamePatterns','AllowedUiCategoryIds','AllowedRarities'];
const VALID_STATE_VALUES = new Set([0, 1, 2]);

function finiteOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function ensureShape(cat) {
  if (!cat.Color) cat.Color = { X: 1, Y: 1, Z: 1, W: 1 };
  for (const key of ['X','Y','Z','W']) {
    if (typeof cat.Color[key] !== 'number') cat.Color[key] = 1;
  }
  if (!isPlainObject(cat.Rules)) cat.Rules = defaultRules();
  const r = cat.Rules;
  for (const key of ['AllowedItemIds','AllowedItemNamePatterns','AllowedUiCategoryIds','AllowedRarities']) {
    if (!Array.isArray(r[key])) r[key] = [];
  }
  const defaults = defaultRules();
  for (const [key, val] of Object.entries(defaults)) {
    if (r[key] === undefined) r[key] = clone(val);
  }
  for (const key of RANGE_RULE_KEYS) {
    const fallback = defaults[key];
    if (!isPlainObject(r[key])) r[key] = clone(fallback);
    else {
      r[key].Enabled = typeof r[key].Enabled === 'boolean' ? r[key].Enabled : Boolean(r[key].Enabled);
      r[key].Min = finiteOrDefault(r[key].Min, fallback.Min);
      r[key].Max = finiteOrDefault(r[key].Max, fallback.Max);
    }
  }
  for (const key of STATE_RULE_KEYS) {
    const fallback = defaults[key];
    if (!isPlainObject(r[key])) r[key] = clone(fallback);
    else {
      const state = Number(r[key].State);
      r[key].State = Number.isFinite(state) && VALID_STATE_VALUES.has(state) ? state : 0;
      r[key].Filter = finiteOrDefault(r[key].Filter, fallback.Filter);
    }
  }
}


export function numericValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function compareOptionalNumber(a, b) {
  const aNumber = numericValue(a);
  const bNumber = numericValue(b);
  if (aNumber !== null && bNumber !== null && aNumber !== bNumber) return aNumber - bNumber;
  if ((aNumber !== null) !== (bNumber !== null)) return aNumber !== null ? -1 : 1;
  return 0;
}

export function compareCategoriesForImport(a, b) {
  return compareOptionalNumber(a.Order, b.Order)
    || compareOptionalNumber(a.Priority, b.Priority)
    || String(a.Name || '').localeCompare(String(b.Name || ''), undefined, { numeric: true, sensitivity: 'base' })
    || String(a.Id || '').localeCompare(String(b.Id || ''), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortImportedCategories(config) {
  if (!config || !Array.isArray(config.Categories)) return config;
  config.Categories.sort(compareCategoriesForImport);
  return config;
}

export function getNormalizedAllowedRarities(cat) {
  const rules = cat.Rules || {};
  const original = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities : [];
  const normalized = [];
  const seen = new Set();

  for (const raw of original) {
    const value = Number(raw);
    if (!ALLOWED_RARITY_IDS.has(value) || seen.has(value)) continue;
    normalized.push(value);
    seen.add(value);
  }

  normalized.sort((a, b) => a - b);
  return normalized;
}

export function normalizeAllowedRarities(cat) {
  const rules = cat.Rules || (cat.Rules = {});
  const normalized = getNormalizedAllowedRarities(cat);
  rules.AllowedRarities = normalized;
  return normalized;
}

export function normalizeAllowedRaritiesWithReport(cat) {
  const rules = cat.Rules || (cat.Rules = {});
  const original = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities.slice() : [];
  const normalized = normalizeAllowedRarities(cat);
  const changed = original.length !== normalized.length
    || original.some((value, index) => Number(value) !== normalized[index]);
  return { normalized, changed };
}

function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function snapshotCategoryForRepairs(cat, index = null) {
  const rules = isPlainObject(cat?.Rules) ? cat.Rules : {};
  const snapshot = {
    categoryName: cat?.Name,
    categoryId: cat?.Id,
    categoryIndex: index,
    RulesWasPlainObject: isPlainObject(cat?.Rules),
    Rules: cat?.Rules
  };
  for (const key of LIST_RULE_KEYS) snapshot[key] = Array.isArray(rules[key]) ? rules[key].slice() : rules[key];
  for (const key of RANGE_RULE_KEYS) snapshot[key] = isPlainObject(rules[key]) ? clone(rules[key]) : rules[key];
  for (const key of STATE_RULE_KEYS) snapshot[key] = isPlainObject(rules[key]) ? clone(rules[key]) : rules[key];
  return snapshot;
}

function displayCategoryName(cat, before) {
  const name = String(cat?.Name ?? before?.categoryName ?? '').trim();
  if (name) return name;
  return Number.isInteger(before?.categoryIndex) ? `Category ${before.categoryIndex + 1}` : '(unnamed category)';
}

function repairRecord(cat, before, field, beforeValue, afterValue, message) {
  return {
    categoryName: displayCategoryName(cat, before),
    categoryId: cat?.Id || before?.categoryId,
    field,
    before: beforeValue,
    after: afterValue,
    message
  };
}

function collectCategoryRepairs(cat, before) {
  const repairs = [];
  if (!before.RulesWasPlainObject) {
    repairs.push(repairRecord(cat, before, 'Rules', before.Rules, cat.Rules, 'Rules were missing or malformed and replaced with defaults.'));
    return repairs;
  }
  for (const key of LIST_RULE_KEYS) {
    if (!valuesEqual(before[key], cat.Rules[key])) {
      const message = key === 'AllowedRarities'
        ? 'Allowed Rarities changed during import normalization.'
        : `${key} was malformed and replaced with an empty array.`;
      repairs.push(repairRecord(cat, before, key, before[key], cat.Rules[key], message));
    }
  }
  for (const key of RANGE_RULE_KEYS) {
    if (!valuesEqual(before[key], cat.Rules[key])) {
      const malformed = !isPlainObject(before[key]);
      repairs.push(repairRecord(cat, before, key, before[key], cat.Rules[key], malformed ? `${key} filter was malformed and replaced with defaults.` : `${key} filter values were normalized.`));
    }
  }
  for (const key of STATE_RULE_KEYS) {
    if (!valuesEqual(before[key], cat.Rules[key])) {
      const malformed = !isPlainObject(before[key]);
      repairs.push(repairRecord(cat, before, key, before[key], cat.Rules[key], malformed ? `${key} filter was malformed and replaced with defaults.` : `${key} filter values were normalized.`));
    }
  }
  return repairs;
}

export function buildImportSummary(categoryCount, normalizedRarityCategoryCount) {
  let message = `Imported ${categoryCount.toLocaleString()} ${categoryCount === 1 ? 'category' : 'categories'} and sorted ${categoryCount === 1 ? 'it' : 'them'} by Order.`;
  if (normalizedRarityCategoryCount > 0) {
    message += ` Normalized rarity values in ${normalizedRarityCategoryCount.toLocaleString()} ${normalizedRarityCategoryCount === 1 ? 'category' : 'categories'}.`;
  }
  return message;
}

export function validateConfig(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Root must be a JSON object.');
  if (!Array.isArray(obj.Categories)) throw new Error('Root must contain a Categories array.');
  let normalizedRarityCategoryCount = 0;
  const repairs = [];
  const originalOrder = obj.Categories.map(cat => String(cat?.Id ?? cat?.Name ?? ''));
  obj.Categories.forEach((cat, index) => {
    const before = snapshotCategoryForRepairs(cat, index);
    ensureShape(cat);
    if (normalizeAllowedRaritiesWithReport(cat).changed) normalizedRarityCategoryCount++;
    repairs.push(...collectCategoryRepairs(cat, before));
  });
  sortImportedCategories(obj);
  const sortedOrder = obj.Categories.map(cat => String(cat?.Id ?? cat?.Name ?? ''));
  if (!valuesEqual(originalOrder, sortedOrder)) {
    repairs.push({
      field: 'Categories',
      before: originalOrder,
      after: sortedOrder,
      showBeforeAfter: false,
      message: 'Categories were sorted by Order, Priority, Name, and internal fallback.'
    });
  }
  return { config: obj, summary: buildImportSummary(obj.Categories.length, normalizedRarityCategoryCount), repairs };
}
