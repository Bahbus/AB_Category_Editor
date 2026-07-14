import { ALLOWED_RARITY_IDS, RANGE_FILTERS, RANGE_FILTER_KEYS, STATE_FILTERS, STATE_FILTER_KEYS } from './constants.js';
import { invalidRowIds, normalizeRowIdValue } from './rowIds.js';
import { optionalFiniteNumber } from './optionalNumbers.js';
import { classifyStoredPattern } from './patternSemantics.js';
import { isBooleanScalar, isRangeBoundScalar, isStateFilterScalar, isStateScalar } from './filterScalars.js';

const RANGE_FILTER_LABELS = Object.fromEntries(RANGE_FILTERS.map(filter => [filter.key, filter.label]));
const STATE_FILTER_LABELS = Object.fromEntries(STATE_FILTERS.map(filter => [filter.key, filter.label]));
const CATEGORY_INSTANCE = Symbol('validationCategoryInstance');

function finding(severity, field, message) { return { severity, field, message }; }
function label(category, index = null) {
  const name = String(category?.Name ?? '').trim();
  if (name) return name;
  return Number.isInteger(index) ? `Category ${index + 1}` : '(unnamed category)';
}
function rulesOf(category) { return category?.Rules && typeof category.Rules === 'object' ? category.Rules : {}; }
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
  if (optionalFiniteNumber(category?.[key]) === null) return [finding('error', key, `${key} must be a finite number.`)];
  return [];
}

export function validateCategoryOrder(category) { return validateFiniteNumber(category, 'Order'); }
export function validateCategoryPriority(category) { return validateFiniteNumber(category, 'Priority'); }

export function validateCategorySortPosition(category, allCategories = []) {
  const order = optionalFiniteNumber(category?.Order);
  const priority = optionalFiniteNumber(category?.Priority);
  if (order === null || priority === null) return [];
  const dupes = (allCategories || []).filter(other => (
    other !== category
    && optionalFiniteNumber(other?.Order) === order
    && optionalFiniteNumber(other?.Priority) === priority
  ));
  return dupes.length ? [finding('warning', 'SortPosition', `Duplicate sort position: Order ${order} / Priority ${priority}.`)] : [];
}


export function groupedDuplicateSortPositionFindings(categories = []) {
  const groups = new Map();
  for (const [index, category] of (categories || []).entries()) {
    const order = optionalFiniteNumber(category?.Order);
    const priority = optionalFiniteNumber(category?.Priority);
    if (order === null || priority === null) continue;
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

export function validateAllowedItemNamePattern(pattern, sourceIndex = null) {
  const classification = classifyStoredPattern(pattern);
  if (classification.usable) return [];
  const position = Number.isInteger(sourceIndex) ? `Pattern ${sourceIndex + 1}` : 'Pattern';
  if (classification.reason === 'non-string') {
    return [finding('error', 'AllowedItemNamePatterns', `${position} must be a string.`)];
  }
  return [finding('error', 'AllowedItemNamePatterns', `${position} must not be empty or whitespace-only because AetherBags skips blank patterns.`)];
}

// Compatibility alias retained for existing structured-editor wiring.
export const validateRegexPattern = validateAllowedItemNamePattern;

export function validateRangeFilter(field, range, labelText = field) {
  const findings = [];
  const min = range?.Min;
  const max = range?.Max;
  const boundType = field === 'VendorPrice' ? 'an integer from 0 through 4294967295' : 'a signed 32-bit integer';
  if (!isBooleanScalar(range?.Enabled)) findings.push(finding('error', field, `${labelText} Enabled must be a JSON boolean.`));
  if (!isRangeBoundScalar(field, min)) findings.push(finding('error', field, `${labelText} minimum must be ${boundType}.`));
  if (!isRangeBoundScalar(field, max)) findings.push(finding('error', field, `${labelText} maximum must be ${boundType}.`));
  if (isRangeBoundScalar(field, min) && isRangeBoundScalar(field, max) && min > max) findings.push(finding('warning', field, `${labelText} minimum is greater than maximum.`));
  return findings;
}

export function validateStateFilter(field, stateFilter, labelText = field) {
  const findings = [];
  if (!isStateScalar(stateFilter?.State)) findings.push(finding('warning', field, `${labelText} State must be the integer 0, 1, or 2 and will otherwise be treated as Ignored.`));
  if (!isStateFilterScalar(stateFilter?.Filter)) findings.push(finding('error', field, `${labelText} Filter must be a signed 32-bit integer.`));
  return findings;
}

export function validateRarities(category) {
  const values = rulesOf(category).AllowedRarities;
  if (!Array.isArray(values)) return [finding('warning', 'AllowedRarities', 'Allowed rarities list is malformed and will be normalized.')];
  const unsupported = values.filter(value => !ALLOWED_RARITY_IDS.has(Number(value)));
  return unsupported.length ? [finding('warning', 'AllowedRarities', `Unsupported rarity value(s) will be ignored: ${unsupported.join(', ')}.`)] : [];
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

function usableStoredPatterns(values) {
  return Array.isArray(values) ? values.filter(value => classifyStoredPattern(value).usable) : [];
}

function hasDuplicateRowIds(values) {
  if (!Array.isArray(values)) return false;
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeRowIdValue(value);
    if (normalized === null) continue;
    if (seen.has(normalized)) return true;
    seen.add(normalized);
  }
  return false;
}

const DUPLICATE_LIST_MESSAGES = {
  AllowedItemIds: 'Duplicate Item IDs in this category.',
  AllowedUiCategoryIds: 'Duplicate UI Category IDs in this category.',
  AllowedItemNamePatterns: 'Duplicate regex patterns in this category.'
};

function duplicateFindings(values, field, labelText) {
  const duplicates = INVALID_ROW_ID_MESSAGES[field] ? hasDuplicateRowIds(values) : hasDuplicateValues(values);
  if (!duplicates) return [];
  const message = DUPLICATE_LIST_MESSAGES[field] || `Duplicate ${labelText}s in this category.`;
  return [finding('warning', field, message)];
}

function sortPositionKey(category) {
  const order = optionalFiniteNumber(category?.Order);
  const priority = optionalFiniteNumber(category?.Priority);
  if (order === null || priority === null) return '';
  return `${order}:${priority}`;
}

function getCategoryIssueCountWithoutSortPosition(category) {
  const rules = rulesOf(category);
  let count = [
    ...validateCategoryName(category),
    ...validateCategoryOrder(category),
    ...validateCategoryPriority(category),
    ...validateRarities(category)
  ].filter(isIssueFinding).length;

  if (hasDuplicateRowIds(rules.AllowedItemIds)) count++;
  if (hasDuplicateRowIds(rules.AllowedUiCategoryIds)) count++;
  if (invalidRowIds(rules.AllowedItemIds).length) count++;
  if (invalidRowIds(rules.AllowedUiCategoryIds).length) count++;
  if (hasDuplicateValues(usableStoredPatterns(rules.AllowedItemNamePatterns))) count++;

  if (Array.isArray(rules.AllowedItemNamePatterns)) {
    for (const [index, pattern] of rules.AllowedItemNamePatterns.entries()) {
      count += validateAllowedItemNamePattern(pattern, index).filter(isIssueFinding).length;
    }
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
    ...duplicateFindings(usableStoredPatterns(rules.AllowedItemNamePatterns), 'AllowedItemNamePatterns', 'regex pattern')
  ];
  if (Array.isArray(rules.AllowedItemNamePatterns)) {
    for (const [index, pattern] of rules.AllowedItemNamePatterns.entries()) {
      findings.push(...validateAllowedItemNamePattern(pattern, index));
    }
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
      const categoryFinding = { ...item, categoryId: category?.Id, categoryName: label(category, index) };
      Object.defineProperty(categoryFinding, CATEGORY_INSTANCE, { value: category });
      findings.push(categoryFinding);
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

function validationFindingKey(item, categoryTokens) {
  if (item?.field === 'SortPosition' && item.sortPositionKey) {
    return `${item.severity}|${item.field}|${item.sortPositionKey}`;
  }
  const category = item?.[CATEGORY_INSTANCE];
  if (category && (typeof category === 'object' || typeof category === 'function')) {
    if (!categoryTokens.has(category)) categoryTokens.set(category, categoryTokens.size + 1);
    return `${item?.severity}|${item?.field}|category:${categoryTokens.get(category)}|${item?.message}`;
  }
  return `${item?.severity}|${item?.field}|${String(item?.categoryId ?? '')}|${item?.message}`;
}

export function mergeValidationFindings(...analyses) {
  const seen = new Set();
  const categoryTokens = new Map();
  const findings = [];
  for (const analysis of analyses) {
    for (const item of analysis?.findings || []) {
      const key = validationFindingKey(item, categoryTokens);
      if (seen.has(key)) continue;
      seen.add(key);
      findings.push(item);
    }
  }
  return { findings, counts: countFindings(findings) };
}
