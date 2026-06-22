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

export function ensureShape(cat) {
  if (!cat.Color) cat.Color = { X: 1, Y: 1, Z: 1, W: 1 };
  for (const key of ['X','Y','Z','W']) {
    if (typeof cat.Color[key] !== 'number') cat.Color[key] = 1;
  }
  if (!cat.Rules) cat.Rules = defaultRules();
  const r = cat.Rules;
  for (const key of ['AllowedItemIds','AllowedItemNamePatterns','AllowedUiCategoryIds','AllowedRarities']) {
    if (!Array.isArray(r[key])) r[key] = [];
  }
  for (const [key, val] of Object.entries(defaultRules())) {
    if (r[key] === undefined) r[key] = clone(val);
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
  obj.Categories.forEach(cat => {
    ensureShape(cat);
    if (normalizeAllowedRaritiesWithReport(cat).changed) normalizedRarityCategoryCount++;
  });
  sortImportedCategories(obj);
  return { config: obj, summary: buildImportSummary(obj.Categories.length, normalizedRarityCategoryCount) };
}
