const RANGE_FILTERS = ['Level', 'ItemLevel', 'VendorPrice'];
const STATE_FILTERS = ['Untradable', 'Unique', 'Collectable', 'Dyeable', 'Repairable', 'HighQuality', 'Desynthesizable', 'Glamourable', 'FullySpiritbonded'];

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function categoryLabel(category, index) {
  const order = finiteNumber(category?.Order);
  const orderLabel = order === null ? `#${index + 1}` : `Order ${order}`;
  const name = String(category?.Name || 'Unnamed category').trim() || 'Unnamed category';
  return `${orderLabel} · ${name}`;
}

function addUse(map, key, display, category, index) {
  if (!map.has(key)) map.set(key, { key, display, categories: [] });
  map.get(key).categories.push({ index, order: category?.Order, name: category?.Name || '', label: categoryLabel(category, index) });
}

function duplicateEntries(map) {
  return [...map.values()]
    .filter(entry => entry.categories.length > 1)
    .map(entry => ({ ...entry, count: entry.categories.length }));
}

function collectList(categories, field, normalize, display = String) {
  const map = new Map();
  categories.forEach((category, index) => {
    const values = category?.Rules?.[field];
    if (!Array.isArray(values)) return;
    const seenInCategory = new Set();
    for (const raw of values) {
      const normalized = normalize(raw);
      if (normalized === null || normalized === undefined || normalized === '') continue;
      const key = String(normalized);
      if (seenInCategory.has(key)) continue;
      seenInCategory.add(key);
      addUse(map, key, display(normalized), category, index);
    }
  });
  return duplicateEntries(map);
}

function normalizeInteger(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function normalizePattern(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function normalizeRaritySet(values) {
  if (!Array.isArray(values)) return null;
  const rarities = [...new Set(values.map(Number).filter(Number.isInteger))].sort((a, b) => a - b);
  return rarities.length ? rarities.join(',') : null;
}

function normalizeRange(name, value) {
  if (!value?.Enabled) return null;
  const min = finiteNumber(value.Min);
  const max = finiteNumber(value.Max);
  if (min === null && max === null) return null;
  return `${name}:${min ?? ''}-${max ?? ''}`;
}

function normalizeState(name, value) {
  const state = finiteNumber(value?.State);
  if (!state) return null;
  const filter = finiteNumber(value?.Filter) ?? 0;
  return `${name}:state=${state};filter=${filter}`;
}

function collectSignature(categories, names, normalize) {
  const map = new Map();
  categories.forEach((category, index) => {
    const rules = category?.Rules || {};
    for (const name of names) {
      const key = normalize(name, rules[name]);
      if (!key) continue;
      addUse(map, key, key, category, index);
    }
  });
  return duplicateEntries(map);
}

export function findDuplicateFilters(categories = []) {
  const safeCategories = Array.isArray(categories) ? categories : [];
  const rarityMap = new Map();
  safeCategories.forEach((category, index) => {
    const key = normalizeRaritySet(category?.Rules?.AllowedRarities);
    if (!key) return;
    addUse(rarityMap, key, key, category, index);
  });

  return {
    itemIds: collectList(safeCategories, 'AllowedItemIds', normalizeInteger, value => String(value)),
    uiCategoryIds: collectList(safeCategories, 'AllowedUiCategoryIds', normalizeInteger, value => String(value)),
    namePatterns: collectList(safeCategories, 'AllowedItemNamePatterns', normalizePattern, value => value),
    raritySets: duplicateEntries(rarityMap),
    rangeFilters: collectSignature(safeCategories, RANGE_FILTERS, normalizeRange),
    stateFilters: collectSignature(safeCategories, STATE_FILTERS, normalizeState)
  };
}

export function duplicateResultCount(results) {
  return Object.values(results || {}).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0);
}

export function getDuplicateFilterTypeLabels() {
  return {
    itemIds: 'Item IDs',
    uiCategoryIds: 'UI Category IDs',
    namePatterns: 'Name Patterns',
    raritySets: 'Rarity Sets',
    rangeFilters: 'Range Filters',
    stateFilters: 'State Filters'
  };
}
