import { ALLOWED_RARITY_IDS, RANGE_FILTERS, STATE_FILTERS } from './constants.js';
import {
  isBooleanScalar,
  isFiniteSingleScalar,
  isRangeBoundScalar,
  isSignedInt32Scalar,
  isStateFilterScalar,
  isStateScalar,
  isUnsignedIntegerScalar
} from './filterScalars.js';

export const AETHERBAGS_EXPORT_FORMAT = 'AetherBags_Category';
export const AETHERBAGS_EXPORT_VERSION = 1;

const CATEGORY_INSTANCE = Symbol('aetherBagsCompatibilityCategoryInstance');
const ITEM_SORT_FIELDS = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
const SORT_DIRECTIONS = new Set([0, 1]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function categoryLabel(category, index = null) {
  const name = String(category?.Name ?? '').trim();
  if (name) return name;
  return Number.isInteger(index) ? `Category ${index + 1}` : '(unnamed category)';
}

function finding(severity, field, message, options = {}) {
  return { severity, field, message, blocksExport: false, ...options };
}

function categoryFinding(category, index, severity, field, message, options = {}) {
  const result = finding(severity, field, message, {
    categoryId: category?.Id,
    categoryName: categoryLabel(category, index),
    categoryIndex: index,
    ...options
  });
  Object.defineProperty(result, CATEGORY_INSTANCE, { value: category });
  return result;
}

export function compatibilityFindingCategory(item) {
  return item?.[CATEGORY_INSTANCE];
}

function blockingCategoryFinding(category, index, field, message) {
  return categoryFinding(category, index, 'error', field, message, { blocksExport: true });
}

function validateUintList(category, index, rules, field, label) {
  const values = rules?.[field];
  if (!Array.isArray(values)) {
    return [blockingCategoryFinding(category, index, field, `${label} must be an array of unsigned 32-bit JSON numbers.`)];
  }
  if (values.some(value => !isUnsignedIntegerScalar(value))) {
    return [blockingCategoryFinding(category, index, field, `${label} must contain only JSON-number non-negative integers from 0 through 4294967295; numeric strings are not export-compatible.`)];
  }
  return [];
}

function validateStringList(category, index, rules, field, label) {
  const values = rules?.[field];
  if (!Array.isArray(values)) {
    return [blockingCategoryFinding(category, index, field, `${label} must be an array of strings.`)];
  }
  const findings = [];
  for (const [valueIndex, value] of values.entries()) {
    if (typeof value !== 'string') {
      const position = field === 'AllowedItemNamePatterns' ? `Pattern ${valueIndex + 1}` : `${label} value ${valueIndex + 1}`;
      findings.push(blockingCategoryFinding(category, index, field, `${position} must be a string.`));
    }
  }
  return findings;
}

function validateRarities(category, index, rules) {
  const values = rules?.AllowedRarities;
  if (!Array.isArray(values)) {
    return [blockingCategoryFinding(category, index, 'AllowedRarities', 'Allowed Rarities must be an array of signed 32-bit JSON-number integers.')];
  }
  const findings = [];
  for (const [valueIndex, value] of values.entries()) {
    if (!isSignedInt32Scalar(value)) {
      findings.push(blockingCategoryFinding(category, index, 'AllowedRarities', `Allowed Rarities value ${valueIndex + 1} must be a signed 32-bit JSON-number integer.`));
    } else if (!ALLOWED_RARITY_IDS.has(value)) {
      findings.push(categoryFinding(category, index, 'warning', 'AllowedRarities', `Allowed Rarities value ${value} is unsupported by this editor and AetherBags import normalization may discard it.`));
    }
  }
  return findings;
}

function validateColor(category, index) {
  if (!isPlainObject(category?.Color)) {
    return [blockingCategoryFinding(category, index, 'Color', 'Color must be a JSON object with finite single-precision X, Y, Z, and W numbers.')];
  }
  const findings = [];
  for (const component of ['X', 'Y', 'Z', 'W']) {
    if (!isFiniteSingleScalar(category.Color[component])) {
      findings.push(blockingCategoryFinding(category, index, 'Color', `Color ${component} must be a finite JSON number representable by AetherBags' single-precision Vector4.`));
    }
  }
  return findings;
}

function validateItemSortCriteria(category, index) {
  const criteria = category?.ItemSortCriteria;
  if (!Array.isArray(criteria)) {
    return [blockingCategoryFinding(category, index, 'ItemSortCriteria', 'Item Sort Criteria must be an array of non-null objects.')];
  }
  const findings = [];
  const seenFields = new Set();
  let usableCount = 0;
  let useGlobalIndex = -1;
  for (const [criterionIndex, criterion] of criteria.entries()) {
    const position = criterionIndex + 1;
    if (!isPlainObject(criterion)) {
      findings.push(blockingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} must be a non-null JSON object.`));
      continue;
    }
    if (!isSignedInt32Scalar(criterion.Field)) {
      findings.push(blockingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} Field must be a signed 32-bit JSON-number integer.`));
      continue;
    }
    if (!isSignedInt32Scalar(criterion.Direction)) {
      findings.push(blockingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} Direction must be a signed 32-bit JSON-number integer.`));
      continue;
    }
    if (!ITEM_SORT_FIELDS.has(criterion.Field) || !SORT_DIRECTIONS.has(criterion.Direction)) {
      findings.push(categoryFinding(category, index, 'warning', 'ItemSortCriteria', `Item Sort Criterion ${position} uses an unsupported Field or Direction and AetherBags will discard it during import normalization.`));
      continue;
    }
    usableCount++;
    if (criterion.Field === 0) {
      if (useGlobalIndex < 0) useGlobalIndex = criterionIndex;
      continue;
    }
    if (useGlobalIndex >= 0) continue;
    if (seenFields.has(criterion.Field)) {
      findings.push(categoryFinding(category, index, 'warning', 'ItemSortCriteria', `Item Sort Criterion ${position} repeats Field ${criterion.Field} and AetherBags will discard the duplicate.`));
    } else {
      seenFields.add(criterion.Field);
    }
  }
  if (useGlobalIndex >= 0) {
    const criterion = criteria[useGlobalIndex];
    if (criteria.length !== 1 || useGlobalIndex !== 0 || criterion.Direction !== 0) {
      findings.push(categoryFinding(category, index, 'warning', 'ItemSortCriteria', 'AetherBags will normalize Item Sort Criteria to a single Use Global / Ascending criterion.'));
    }
  } else if (criteria.length === 0 || usableCount === 0) {
    findings.push(categoryFinding(category, index, 'warning', 'ItemSortCriteria', 'AetherBags will replace the empty or unusable Item Sort Criteria list with its Use Global default.'));
  }
  return findings;
}

function validateRangeFilters(category, index, rules) {
  const findings = [];
  for (const filter of RANGE_FILTERS) {
    const range = rules?.[filter.key];
    if (!isPlainObject(range)) {
      findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} must be a JSON object.`));
      continue;
    }
    if (!isBooleanScalar(range.Enabled)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} Enabled must be a JSON boolean.`));
    const boundText = filter.key === 'VendorPrice' ? 'an unsigned 32-bit JSON-number integer' : 'a signed 32-bit JSON-number integer';
    if (!isRangeBoundScalar(filter.key, range.Min)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} minimum must be ${boundText}.`));
    if (!isRangeBoundScalar(filter.key, range.Max)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} maximum must be ${boundText}.`));
    if (isRangeBoundScalar(filter.key, range.Min) && isRangeBoundScalar(filter.key, range.Max) && range.Min > range.Max) {
      findings.push(categoryFinding(category, index, 'warning', filter.key, `${filter.label} minimum is greater than maximum.`));
    }
  }
  return findings;
}

function validateStateFilters(category, index, rules) {
  const findings = [];
  for (const filter of STATE_FILTERS) {
    const stateFilter = rules?.[filter.key];
    if (!isPlainObject(stateFilter)) {
      findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} must be a JSON object.`));
      continue;
    }
    if (!isSignedInt32Scalar(stateFilter.State)) {
      findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} State must be a signed 32-bit JSON-number integer.`));
    } else if (!isStateScalar(stateFilter.State)) {
      findings.push(categoryFinding(category, index, 'warning', filter.key, `${filter.label} State must be the integer 0, 1, or 2; AetherBags will treat ${stateFilter.State} as Ignored.`));
    }
    if (!isStateFilterScalar(stateFilter.Filter)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} Filter must be a signed 32-bit JSON-number integer.`));
  }
  return findings;
}

export function categoryCompatibilityFindings(category, index = null) {
  if (!isPlainObject(category)) {
    return [categoryFinding(category, index, 'error', 'Categories', 'Each category must be a non-null JSON object.', { blocksExport: true })];
  }
  const findings = [];
  for (const field of ['Enabled', 'Pinned']) {
    if (!isBooleanScalar(category[field])) findings.push(blockingCategoryFinding(category, index, field, `${field} must be a JSON boolean.`));
  }
  for (const field of ['Id', 'Name', 'Description']) {
    if (typeof category[field] !== 'string') findings.push(blockingCategoryFinding(category, index, field, `${field} must be a string.`));
  }
  for (const field of ['Order', 'Priority']) {
    if (!isSignedInt32Scalar(category[field])) findings.push(blockingCategoryFinding(category, index, field, `${field} must be a signed 32-bit JSON-number integer; numeric strings and fractions are not compatible.`));
  }
  if (Object.prototype.hasOwnProperty.call(category, 'ForkedFromKey') && category.ForkedFromKey !== null && typeof category.ForkedFromKey !== 'string') {
    findings.push(blockingCategoryFinding(category, index, 'ForkedFromKey', 'ForkedFromKey must be null or a string when present.'));
  }
  findings.push(...validateColor(category, index));
  findings.push(...validateItemSortCriteria(category, index));
  findings.push(...validateUintList(category, index, category, 'CustomItemOrder', 'Custom Item Order'));
  if (!isPlainObject(category.Rules)) {
    findings.push(blockingCategoryFinding(category, index, 'Rules', 'Rules must be a non-null JSON object.'));
    return findings;
  }
  findings.push(...validateUintList(category, index, category.Rules, 'AllowedItemIds', 'Allowed Item IDs'));
  findings.push(...validateUintList(category, index, category.Rules, 'AllowedUiCategoryIds', 'Allowed UI Category IDs'));
  findings.push(...validateStringList(category, index, category.Rules, 'AllowedItemNamePatterns', 'Allowed Item Name Patterns'));
  findings.push(...validateRarities(category, index, category.Rules));
  findings.push(...validateRangeFilters(category, index, category.Rules));
  findings.push(...validateStateFilters(category, index, category.Rules));
  return findings;
}

export function rootCompatibilityFindings(config) {
  if (!isPlainObject(config)) return [finding('error', 'Root', 'Export root must be a JSON object.', { blocksExport: true })];
  const findings = [];
  if (config.Format !== AETHERBAGS_EXPORT_FORMAT) findings.push(finding('error', 'Format', `Format must be the string "${AETHERBAGS_EXPORT_FORMAT}".`, { blocksExport: true }));
  if (!isSignedInt32Scalar(config.Version) || config.Version !== AETHERBAGS_EXPORT_VERSION) findings.push(finding('error', 'Version', `Version must be the supported JSON-number integer ${AETHERBAGS_EXPORT_VERSION}.`, { blocksExport: true }));
  if (!Array.isArray(config.Categories)) findings.push(finding('error', 'Categories', 'Categories must be an array.', { blocksExport: true }));
  return findings;
}

export function countCompatibilityFindings(findings = []) {
  return findings.reduce((counts, item) => {
    counts[item.severity] = (counts[item.severity] || 0) + 1;
    if (item.blocksExport) counts.blocking++;
    return counts;
  }, { error: 0, warning: 0, note: 0, blocking: 0 });
}

export function analyzeAetherBagsCompatibility(config) {
  const findings = rootCompatibilityFindings(config);
  if (Array.isArray(config?.Categories)) {
    for (const [index, category] of config.Categories.entries()) findings.push(...categoryCompatibilityFindings(category, index));
  }
  return { findings, counts: countCompatibilityFindings(findings) };
}

export function decideAetherBagsExportPreflight(config) {
  const analysis = analyzeAetherBagsCompatibility(config);
  const blockingFindings = analysis.findings.filter(item => item.blocksExport);
  return { allowed: blockingFindings.length === 0, analysis, blockingFindings };
}

export async function runAetherBagsExportPreflight(config, makeExport) {
  const decision = decideAetherBagsExportPreflight(config);
  if (!decision.allowed) return { ...decision, value: undefined };
  return { ...decision, value: await makeExport() };
}
