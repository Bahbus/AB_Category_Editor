import { ALLOWED_RARITY_IDS, RANGE_FILTERS, RANGE_FILTER_KEYS, STATE_FILTERS, STATE_FILTER_KEYS } from './constants.js';

const VALID_STATE_VALUES = new Set([0, 1, 2]);
const RANGE_FILTER_LABELS = Object.fromEntries(RANGE_FILTERS.map(filter => [filter.key, filter.label]));
const STATE_FILTER_LABELS = Object.fromEntries(STATE_FILTERS.map(filter => [filter.key, filter.label]));

function finding(severity, field, message) { return { severity, field, message }; }
function label(category, index = null) {
  const name = String(category?.Name ?? '').trim();
  if (name) return name;
  return Number.isInteger(index) ? `Category ${index + 1}` : '(unnamed category)';
}
function rulesOf(category) { return category?.Rules && typeof category.Rules === 'object' ? category.Rules : {}; }
function isFiniteValue(value) { return Number.isFinite(Number(value)); }

export function isIssueFinding(item) {
  return item?.severity === 'error' || item?.severity === 'warning';
}

export function validateCategoryName(category) {
  const findings = [];
  if (!String(category?.Name ?? '').trim()) findings.push(finding('warning', 'Name', 'Category name is blank.'));
  if (!String(category?.Description ?? '').trim()) findings.push(finding('note', 'Description', 'Description is blank.'));
  if (category?.Enabled === false && category?.Pinned === true) findings.push(finding('warning', 'Pinned', 'Disabled categories should usually not be pinned.'));
  return findings;
}

function validateFiniteNumber(category, key) {
  if (!isFiniteValue(category?.[key])) return [finding('error', key, `${key} must be a finite number.`)];
  return [];
}

export function validateCategoryOrder(category) { return validateFiniteNumber(category, 'Order'); }
export function validateCategoryPriority(category) { return validateFiniteNumber(category, 'Priority'); }

export function validateCategorySortPosition(category, allCategories = []) {
  if (!isFiniteValue(category?.Order) || !isFiniteValue(category?.Priority)) return [];
  const order = Number(category.Order);
  const priority = Number(category.Priority);
  const dupes = (allCategories || []).filter(other => (
    other !== category
    && isFiniteValue(other?.Order)
    && isFiniteValue(other?.Priority)
    && Number(other.Order) === order
    && Number(other.Priority) === priority
  ));
  return dupes.length ? [finding('warning', 'SortPosition', `Duplicate sort position: Order ${order} / Priority ${priority}.`)] : [];
}


export function groupedDuplicateSortPositionFindings(categories = []) {
  const groups = new Map();
  for (const [index, category] of (categories || []).entries()) {
    if (!isFiniteValue(category?.Order) || !isFiniteValue(category?.Priority)) continue;
    const order = Number(category.Order);
    const priority = Number(category.Priority);
    const key = `${order}:${priority}`;
    const group = groups.get(key) || { order, priority, names: [] };
    group.names.push(label(category, index));
    groups.set(key, group);
  }

  return [...groups.values()]
    .filter(group => group.names.length >= 2)
    .map(group => {
      const stableNames = group.names.slice().sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
      );
      const visibleNames = stableNames.slice(0, 8);
      const remainingCount = stableNames.length - visibleNames.length;
      const namesText = `${visibleNames.join(', ')}${remainingCount > 0 ? `, +${remainingCount} more` : ''}`;
      return {
        ...finding(
          'warning',
          'SortPosition',
          `Duplicate sort position: Order ${group.order} / Priority ${group.priority} is shared by ${stableNames.length} categories: ${namesText}.`
        ),
        order: group.order,
        priority: group.priority,
        sortPositionKey: `${group.order}:${group.priority}`,
        categoryNames: stableNames
      };
    });
}

export function validateRegexPattern(pattern) {
  try { new RegExp(String(pattern)); return []; }
  catch (err) { return [finding('error', 'AllowedItemNamePatterns', `Invalid regex pattern: ${err.message}`)]; }
}

export function validateRangeFilter(field, range, labelText = field) {
  const findings = [];
  const min = Number(range?.Min);
  const max = Number(range?.Max);
  if (!Number.isFinite(min)) findings.push(finding('error', field, `${labelText} minimum must be a finite number.`));
  if (!Number.isFinite(max)) findings.push(finding('error', field, `${labelText} maximum must be a finite number.`));
  if (Number.isFinite(min) && Number.isFinite(max) && min > max) findings.push(finding('warning', field, `${labelText} minimum is greater than maximum.`));
  return findings;
}

export function validateStateFilter(field, stateFilter, labelText = field) {
  const state = Number(stateFilter?.State);
  return Number.isFinite(state) && VALID_STATE_VALUES.has(state) ? [] : [finding('warning', field, `${labelText} uses an unsupported state and will be treated as Ignored.`)];
}

export function validateRarities(category) {
  const values = rulesOf(category).AllowedRarities;
  if (!Array.isArray(values)) return [finding('warning', 'AllowedRarities', 'Allowed rarities list is malformed and will be normalized.')];
  const unsupported = values.filter(value => !ALLOWED_RARITY_IDS.has(Number(value)));
  return unsupported.length ? [finding('warning', 'AllowedRarities', `Unsupported rarity value(s) will be ignored: ${unsupported.join(', ')}.`)] : [];
}

export function invalidRowIds(values) {
  if (!Array.isArray(values)) return [];
  return values.filter(value => {
    const number = Number(value);
    return !Number.isInteger(number) || number < 0;
  });
}

const INVALID_ROW_ID_MESSAGES = {
  AllowedItemIds: 'Allowed Item IDs must be non-negative integers.',
  AllowedUiCategoryIds: 'Allowed UI Category IDs must be non-negative integers.'
};

function invalidRowIdFindings(values, field) {
  if (!invalidRowIds(values).length) return [];
  return [finding('warning', field, INVALID_ROW_ID_MESSAGES[field])];
}

function hasDuplicateValues(values) {
  if (!Array.isArray(values)) return false;
  const seen = new Set();
  for (const value of values) {
    const key = String(value);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

const DUPLICATE_LIST_MESSAGES = {
  AllowedItemIds: 'Duplicate Item IDs in this category.',
  AllowedUiCategoryIds: 'Duplicate UI Category IDs in this category.',
  AllowedItemNamePatterns: 'Duplicate regex patterns in this category.'
};

function duplicateFindings(values, field, labelText) {
  if (!hasDuplicateValues(values)) return [];
  const message = DUPLICATE_LIST_MESSAGES[field] || `Duplicate ${labelText}s in this category.`;
  return [finding('warning', field, message)];
}

function sortPositionKey(category) {
  if (!isFiniteValue(category?.Order) || !isFiniteValue(category?.Priority)) return '';
  return `${Number(category.Order)}:${Number(category.Priority)}`;
}

function getCategoryIssueCountWithoutSortPosition(category) {
  const rules = rulesOf(category);
  let count = [
    ...validateCategoryName(category),
    ...validateCategoryOrder(category),
    ...validateCategoryPriority(category),
    ...validateRarities(category)
  ].filter(isIssueFinding).length;

  if (hasDuplicateValues(rules.AllowedItemIds)) count++;
  if (hasDuplicateValues(rules.AllowedUiCategoryIds)) count++;
  if (invalidRowIds(rules.AllowedItemIds).length) count++;
  if (invalidRowIds(rules.AllowedUiCategoryIds).length) count++;
  if (hasDuplicateValues(rules.AllowedItemNamePatterns)) count++;

  if (Array.isArray(rules.AllowedItemNamePatterns)) {
    for (const pattern of rules.AllowedItemNamePatterns) count += validateRegexPattern(pattern).filter(isIssueFinding).length;
  }
  for (const key of RANGE_FILTER_KEYS) count += validateRangeFilter(key, rules[key], RANGE_FILTER_LABELS[key]).filter(isIssueFinding).length;
  for (const key of STATE_FILTER_KEYS) count += validateStateFilter(key, rules[key], STATE_FILTER_LABELS[key]).filter(isIssueFinding).length;
  return count;
}

export function getCategoryIssueCounts(categories = []) {
  const sortPositionCounts = new Map();
  for (const category of categories) {
    const key = sortPositionKey(category);
    if (key) sortPositionCounts.set(key, (sortPositionCounts.get(key) || 0) + 1);
  }

  return new Map(categories.map(category => {
    const sortWarning = (sortPositionCounts.get(sortPositionKey(category)) || 0) > 1 ? 1 : 0;
    return [category, getCategoryIssueCountWithoutSortPosition(category) + sortWarning];
  }));
}

export function getCategoryIssueCount(category, allCategories = []) {
  return getCategoryIssueCounts(allCategories.includes(category) ? allCategories : [category, ...allCategories]).get(category) || 0;
}

export function validateCategory(category, allCategories = []) {
  const rules = rulesOf(category);
  const findings = [
    ...validateCategoryName(category),
    ...validateCategoryOrder(category),
    ...validateCategoryPriority(category),
    ...validateCategorySortPosition(category, allCategories),
    ...validateRarities(category),
    ...duplicateFindings(rules.AllowedItemIds, 'AllowedItemIds', 'Item ID'),
    ...duplicateFindings(rules.AllowedUiCategoryIds, 'AllowedUiCategoryIds', 'UI Category ID'),
    ...invalidRowIdFindings(rules.AllowedItemIds, 'AllowedItemIds'),
    ...invalidRowIdFindings(rules.AllowedUiCategoryIds, 'AllowedUiCategoryIds'),
    ...duplicateFindings(rules.AllowedItemNamePatterns, 'AllowedItemNamePatterns', 'regex pattern')
  ];
  if (Array.isArray(rules.AllowedItemNamePatterns)) {
    for (const pattern of rules.AllowedItemNamePatterns) findings.push(...validateRegexPattern(pattern));
  }
  for (const key of RANGE_FILTER_KEYS) findings.push(...validateRangeFilter(key, rules[key], RANGE_FILTER_LABELS[key]));
  for (const key of STATE_FILTER_KEYS) findings.push(...validateStateFilter(key, rules[key], STATE_FILTER_LABELS[key]));
  return findings;
}

export function analyzeImportedConfig(config) {
  const categories = Array.isArray(config?.Categories) ? config.Categories : [];
  const findings = [];
  const ids = new Map();
  for (const category of categories) {
    const id = String(category?.Id ?? '');
    if (id) ids.set(id, (ids.get(id) || 0) + 1);
  }
  for (const [, count] of ids) {
    if (count > 1) findings.push(finding('warning', 'Id', 'Two or more categories share the same internal category ID.'));
  }
  for (const [index, category] of categories.entries()) {
    for (const item of validateCategory(category, categories)) {
      if (item.field === 'SortPosition') continue;
      findings.push({ ...item, categoryId: category?.Id, categoryName: label(category, index) });
    }
  }
  for (const item of groupedDuplicateSortPositionFindings(categories)) {
    findings.push({ ...item, categoryName: '' });
  }
  return { findings, counts: countFindings(findings) };
}

export function countFindings(findings) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
    return counts;
  }, { error: 0, warning: 0, note: 0 });
}
