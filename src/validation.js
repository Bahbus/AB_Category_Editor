import { RANGE_FILTERS, STATE_FILTERS } from './constants.js';
import { normalizeRowIdValue } from './rowIds.js';
import { classifyStoredPattern } from './patternSemantics.js';
import { isBooleanScalar, isRangeBoundScalar, isSignedInt32Scalar, isStateFilterScalar, isStateScalar } from './filterScalars.js';
import { categoryCompatibilityFindings, rootCompatibilityFindings } from './exportCompatibility.js';

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

function validateSortInteger(category, key) {
  if (!isSignedInt32Scalar(category?.[key])) return [finding('error', key, `${key} must be a signed 32-bit JSON-number integer.`)];
  return [];
}

export function validateCategoryOrder(category) { return validateSortInteger(category, 'Order'); }
export function validateCategoryPriority(category) { return validateSortInteger(category, 'Priority'); }

function sortInteger(value) {
  return isSignedInt32Scalar(value) ? value : null;
}

export function validateCategorySortPosition(category, allCategories = []) {
  const order = sortInteger(category?.Order);
  const priority = sortInteger(category?.Priority);
  if (order === null || priority === null) return [];
  const dupes = (allCategories || []).filter(other => (
    other !== category
    && sortInteger(other?.Order) === order
    && sortInteger(other?.Priority) === priority
  ));
  return dupes.length ? [finding('warning', 'SortPosition', `Duplicate sort position: Order ${order} / Priority ${priority}.`)] : [];
}


export function groupedDuplicateSortPositionFindings(categories = []) {
  const groups = new Map();
  for (const [index, category] of (categories || []).entries()) {
    const order = sortInteger(category?.Order);
    const priority = sortInteger(category?.Priority);
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
  return categoryCompatibilityFindings(category).filter(item => item.field === 'AllowedRarities');
}

const INVALID_ROW_ID_MESSAGES = {
  AllowedItemIds: 'Allowed Item IDs must be non-negative integers.',
  AllowedUiCategoryIds: 'Allowed UI Category IDs must be non-negative integers.'
};

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
  const order = sortInteger(category?.Order);
  const priority = sortInteger(category?.Priority);
  if (order === null || priority === null) return '';
  return `${order}:${priority}`;
}

function getCategoryIssueCountWithoutSortPosition(category) {
  return validateCategory(category, []).filter(item => item.field !== 'SortPosition' && isIssueFinding(item)).length;
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
    ...categoryCompatibilityFindings(category),
    ...validateCategorySortPosition(category, allCategories),
    ...duplicateFindings(rules.AllowedItemIds, 'AllowedItemIds', 'Item ID'),
    ...duplicateFindings(rules.AllowedUiCategoryIds, 'AllowedUiCategoryIds', 'UI Category ID'),
    ...duplicateFindings(usableStoredPatterns(rules.AllowedItemNamePatterns), 'AllowedItemNamePatterns', 'regex pattern')
  ];
  if (Array.isArray(rules.AllowedItemNamePatterns)) {
    for (const [index, pattern] of rules.AllowedItemNamePatterns.entries()) {
      if (typeof pattern === 'string' && !pattern.trim()) findings.push(...validateAllowedItemNamePattern(pattern, index));
    }
  }
  return findings;
}

export function analyzeImportedConfig(config) {
  const categories = Array.isArray(config?.Categories) ? config.Categories : [];
  const rootFindings = rootCompatibilityFindings(config).filter(item =>
    item.field === 'Categories' || Object.prototype.hasOwnProperty.call(config || {}, item.field)
  );
  const findings = [...rootFindings];
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
