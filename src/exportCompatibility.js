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

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

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

function blockingSerializationFinding(path, message) {
  return finding('error', path, `${path} ${message}`, { blocksExport: true, serializationFidelity: true });
}

function appendJsonPath(path, key) {
  return typeof key === 'string' && /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(String(key))}]`;
}

function isArrayIndexKey(key, length) {
  if (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

export function jsonSerializationFidelityFindings(value) {
  const findings = [];
  const active = new WeakSet();
  const stack = [{ action: 'enter', value, path: '$' }];

  while (stack.length) {
    const frame = stack.pop();
    if (frame.action === 'exit') {
      active.delete(frame.value);
      continue;
    }

    const { value: current, path } = frame;
    if (current === null || typeof current === 'string' || typeof current === 'boolean') continue;
    if (typeof current === 'number') {
      if (!Number.isFinite(current)) findings.push(blockingSerializationFinding(path, 'is a non-finite number that JSON serialization would silently replace with null.'));
      continue;
    }
    if (typeof current === 'undefined') {
      findings.push(blockingSerializationFinding(path, 'is undefined and would be omitted or replaced with null by JSON serialization.'));
      continue;
    }
    if (typeof current === 'bigint') {
      findings.push(blockingSerializationFinding(path, 'is a BigInt value that JSON serialization cannot represent.'));
      continue;
    }
    if (typeof current === 'function' || typeof current === 'symbol') {
      findings.push(blockingSerializationFinding(path, `is a ${typeof current} value that JSON serialization cannot preserve.`));
      continue;
    }
    if (typeof current !== 'object') {
      findings.push(blockingSerializationFinding(path, 'has a value type that JSON serialization cannot preserve.'));
      continue;
    }
    if (active.has(current)) {
      findings.push(blockingSerializationFinding(path, 'creates a circular reference that JSON serialization cannot represent.'));
      continue;
    }

    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(current);
      keys = Reflect.ownKeys(current);
    } catch {
      findings.push(blockingSerializationFinding(path, 'cannot be inspected safely for JSON serialization.'));
      continue;
    }
    if (!Array.isArray(current) && prototype !== Object.prototype && prototype !== null) {
      findings.push(blockingSerializationFinding(path, 'is not a plain JSON object and may change shape during serialization.'));
      continue;
    }

    active.add(current);
    stack.push({ action: 'exit', value: current });
    const children = [];

    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index++) {
        const childPath = `${path}[${index}]`;
        if (!hasOwn(current, index)) {
          findings.push(blockingSerializationFinding(childPath, 'is an array hole that JSON serialization would replace with null.'));
        } else {
          let descriptor;
          try { descriptor = Object.getOwnPropertyDescriptor(current, String(index)); } catch { descriptor = null; }
          if (!descriptor || !hasOwn(descriptor, 'value')) findings.push(blockingSerializationFinding(childPath, 'cannot be read safely without invoking an accessor during serialization.'));
          else children.push({ action: 'enter', value: descriptor.value, path: childPath });
        }
      }
    }

    for (const key of keys) {
      let descriptor;
      try { descriptor = Object.getOwnPropertyDescriptor(current, key); } catch { descriptor = null; }
      const childPath = typeof key === 'symbol' ? `${path}[${String(key)}]` : appendJsonPath(path, key);
      if (!descriptor) {
        findings.push(blockingSerializationFinding(childPath, 'cannot be inspected safely for JSON serialization.'));
        continue;
      }
      if (key === 'toJSON' && typeof descriptor.value === 'function') {
        findings.push(blockingSerializationFinding(childPath, 'defines custom JSON serialization that may change the stored value.'));
        continue;
      }
      if (!descriptor.enumerable) continue;
      if (Array.isArray(current) && isArrayIndexKey(key, current.length)) continue;
      if (typeof key === 'symbol') {
        findings.push(blockingSerializationFinding(childPath, 'uses an enumerable symbol key that JSON serialization would omit.'));
      } else if (Array.isArray(current)) {
        findings.push(blockingSerializationFinding(childPath, 'is an extra array property that JSON serialization would omit.'));
      } else if (!hasOwn(descriptor, 'value')) {
        findings.push(blockingSerializationFinding(childPath, 'is an accessor property that cannot be checked without invoking user code.'));
      } else {
        children.push({ action: 'enter', value: descriptor.value, path: childPath });
      }
    }

    for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
  }

  if (findings.length === 0) {
    try {
      if (JSON.stringify(value) === undefined) findings.push(blockingSerializationFinding('$', 'does not produce a JSON document.'));
    } catch {
      findings.push(blockingSerializationFinding('$', 'cannot be serialized as a JSON document.'));
    }
  }
  return findings;
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

function defaultingCategoryFinding(category, index, field, message) {
  return categoryFinding(category, index, 'warning', field, message);
}

function validateUintList(category, index, rules, field, label) {
  if (!hasOwn(rules, field)) {
    return [defaultingCategoryFinding(category, index, field, `${label} is omitted; AetherBags will use its empty-list default.`)];
  }
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
  if (!hasOwn(rules, field)) {
    return [defaultingCategoryFinding(category, index, field, `${label} is omitted; AetherBags will use its empty-list default.`)];
  }
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
  if (!hasOwn(rules, 'AllowedRarities')) {
    return [defaultingCategoryFinding(category, index, 'AllowedRarities', 'Allowed Rarities is omitted; AetherBags will use its empty-list default.')];
  }
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
  if (!hasOwn(category, 'Color')) {
    return [defaultingCategoryFinding(category, index, 'Color', 'Color is omitted; AetherBags will use the category Color initializer.')];
  }
  if (!isPlainObject(category?.Color)) {
    return [blockingCategoryFinding(category, index, 'Color', 'Color must be a JSON object with finite single-precision X, Y, Z, and W numbers.')];
  }
  const findings = [];
  for (const component of ['X', 'Y', 'Z', 'W']) {
    if (!hasOwn(category.Color, component)) {
      findings.push(defaultingCategoryFinding(category, index, 'Color', `Color ${component} is omitted; AetherBags will use the Vector4 component default 0.`));
    } else if (!isFiniteSingleScalar(category.Color[component])) {
      findings.push(blockingCategoryFinding(category, index, 'Color', `Color ${component} must be a finite JSON number representable by AetherBags' single-precision Vector4.`));
    }
  }
  return findings;
}

function validateItemSortCriteria(category, index) {
  if (!hasOwn(category, 'ItemSortCriteria')) {
    return [defaultingCategoryFinding(category, index, 'ItemSortCriteria', 'Item Sort Criteria is omitted; AetherBags will use its empty-list default and later normalize it to Use Global.')];
  }
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
    const fieldMissing = !hasOwn(criterion, 'Field');
    const directionMissing = !hasOwn(criterion, 'Direction');
    if (fieldMissing) findings.push(defaultingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} Field is omitted; AetherBags will use Quantity.`));
    if (directionMissing) findings.push(defaultingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} Direction is omitted; AetherBags will use Descending.`));
    const field = fieldMissing ? 1 : criterion.Field;
    const direction = directionMissing ? 1 : criterion.Direction;
    if (!isSignedInt32Scalar(field)) {
      findings.push(blockingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} Field must be a signed 32-bit JSON-number integer.`));
      continue;
    }
    if (!isSignedInt32Scalar(direction)) {
      findings.push(blockingCategoryFinding(category, index, 'ItemSortCriteria', `Item Sort Criterion ${position} Direction must be a signed 32-bit JSON-number integer.`));
      continue;
    }
    if (!ITEM_SORT_FIELDS.has(field) || !SORT_DIRECTIONS.has(direction)) {
      findings.push(categoryFinding(category, index, 'warning', 'ItemSortCriteria', `Item Sort Criterion ${position} uses an unsupported Field or Direction and AetherBags will discard it during import normalization.`));
      continue;
    }
    usableCount++;
    if (field === 0) {
      if (useGlobalIndex < 0) useGlobalIndex = criterionIndex;
      continue;
    }
    if (useGlobalIndex >= 0) continue;
    if (seenFields.has(field)) {
      findings.push(categoryFinding(category, index, 'warning', 'ItemSortCriteria', `Item Sort Criterion ${position} repeats Field ${field} and AetherBags will discard the duplicate.`));
    } else {
      seenFields.add(field);
    }
  }
  if (useGlobalIndex >= 0) {
    const criterion = criteria[useGlobalIndex];
    const direction = hasOwn(criterion, 'Direction') ? criterion.Direction : 1;
    if (criteria.length !== 1 || useGlobalIndex !== 0 || direction !== 0) {
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
    if (!hasOwn(rules, filter.key)) {
      findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} is omitted; AetherBags will use its initialized range defaults.`));
      continue;
    }
    if (!isPlainObject(range)) {
      findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} must be a JSON object.`));
      continue;
    }
    if (!hasOwn(range, 'Enabled')) findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} Enabled is omitted; AetherBags will use false.`));
    else if (!isBooleanScalar(range.Enabled)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} Enabled must be a JSON boolean.`));
    const boundText = filter.key === 'VendorPrice' ? 'an unsigned 32-bit JSON-number integer' : 'a signed 32-bit JSON-number integer';
    if (!hasOwn(range, 'Min')) findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} minimum is omitted; AetherBags will use 0 for the supplied range object.`));
    else if (!isRangeBoundScalar(filter.key, range.Min)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} minimum must be ${boundText}.`));
    if (!hasOwn(range, 'Max')) findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} maximum is omitted; AetherBags will use 0 for the supplied range object.`));
    else if (!isRangeBoundScalar(filter.key, range.Max)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} maximum must be ${boundText}.`));
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
    if (!hasOwn(rules, filter.key)) {
      findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} is omitted; AetherBags will use its Ignored/default filter.`));
      continue;
    }
    if (!isPlainObject(stateFilter)) {
      findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} must be a JSON object.`));
      continue;
    }
    if (!hasOwn(stateFilter, 'State')) {
      findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} State is omitted; AetherBags will use 0 (Ignored).`));
    } else if (!isSignedInt32Scalar(stateFilter.State)) {
      findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} State must be a signed 32-bit JSON-number integer.`));
    } else if (!isStateScalar(stateFilter.State)) {
      findings.push(categoryFinding(category, index, 'warning', filter.key, `${filter.label} State must be the integer 0, 1, or 2; AetherBags will treat ${stateFilter.State} as Ignored.`));
    }
    if (!hasOwn(stateFilter, 'Filter')) findings.push(defaultingCategoryFinding(category, index, filter.key, `${filter.label} Filter is omitted; AetherBags will use 0.`));
    else if (!isStateFilterScalar(stateFilter.Filter)) findings.push(blockingCategoryFinding(category, index, filter.key, `${filter.label} Filter must be a signed 32-bit JSON-number integer.`));
  }
  return findings;
}

export function categoryCompatibilityFindings(category, index = null) {
  if (!isPlainObject(category)) {
    return [categoryFinding(category, index, 'error', 'Categories', 'Each category must be a non-null JSON object.', { blocksExport: true })];
  }
  const findings = [];
  const booleanDefaults = { Enabled: true, Pinned: false };
  for (const field of ['Enabled', 'Pinned']) {
    if (!hasOwn(category, field)) findings.push(defaultingCategoryFinding(category, index, field, `${field} is omitted; AetherBags will use ${booleanDefaults[field]}.`));
    else if (!isBooleanScalar(category[field])) findings.push(blockingCategoryFinding(category, index, field, `${field} must be a JSON boolean.`));
  }
  const stringDefaults = { Id: 'a generated category ID', Name: '"New Category"', Description: 'an empty string' };
  for (const field of ['Id', 'Name', 'Description']) {
    if (!hasOwn(category, field)) findings.push(defaultingCategoryFinding(category, index, field, `${field} is omitted; AetherBags will use ${stringDefaults[field]}.`));
    else if (typeof category[field] !== 'string') findings.push(blockingCategoryFinding(category, index, field, `${field} must be a string.`));
  }
  const numberDefaults = { Order: 0, Priority: 100 };
  for (const field of ['Order', 'Priority']) {
    if (!hasOwn(category, field)) findings.push(defaultingCategoryFinding(category, index, field, `${field} is omitted; AetherBags will use ${numberDefaults[field]}.`));
    else if (!isSignedInt32Scalar(category[field])) findings.push(blockingCategoryFinding(category, index, field, `${field} must be a signed 32-bit JSON-number integer; numeric strings and fractions are not compatible.`));
  }
  if (Object.prototype.hasOwnProperty.call(category, 'ForkedFromKey') && category.ForkedFromKey !== null && typeof category.ForkedFromKey !== 'string') {
    findings.push(blockingCategoryFinding(category, index, 'ForkedFromKey', 'ForkedFromKey must be null or a string when present.'));
  }
  findings.push(...validateColor(category, index));
  findings.push(...validateItemSortCriteria(category, index));
  findings.push(...validateUintList(category, index, category, 'CustomItemOrder', 'Custom Item Order'));
  if (!hasOwn(category, 'Rules')) {
    findings.push(defaultingCategoryFinding(category, index, 'Rules', 'Rules is omitted; AetherBags will use a complete default rule set.'));
    return findings;
  }
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
  if (!hasOwn(config, 'Format')) {
    findings.push(finding('warning', 'Format', `Format is omitted; AetherBags will use its default "${AETHERBAGS_EXPORT_FORMAT}".`));
  } else if (config.Format === null) {
    findings.push(finding('warning', 'Format', 'Format is null; the current AetherBags importer can assign and ignores this value.'));
  } else if (typeof config.Format !== 'string') {
    findings.push(finding('error', 'Format', 'Format must be a string when present so System.Text.Json can assign it.', { blocksExport: true }));
  } else if (config.Format !== AETHERBAGS_EXPORT_FORMAT) {
    findings.push(finding('warning', 'Format', `Format is "${config.Format}"; the current AetherBags importer ignores this value.`));
  }
  if (!hasOwn(config, 'Version')) {
    findings.push(finding('warning', 'Version', `Version is omitted; AetherBags will use its default ${AETHERBAGS_EXPORT_VERSION}.`));
  } else if (!isSignedInt32Scalar(config.Version)) {
    findings.push(finding('error', 'Version', 'Version must be a signed 32-bit JSON-number integer when present so System.Text.Json can assign it.', { blocksExport: true }));
  } else if (config.Version !== AETHERBAGS_EXPORT_VERSION) {
    findings.push(finding('warning', 'Version', `Version is ${config.Version}; the current AetherBags importer ignores this value.`));
  }
  if (!hasOwn(config, 'Categories')) {
    findings.push(finding('error', 'Categories', 'Categories is omitted; AetherBags will default it to an empty list and reject the import because at least one category is required.', { blocksExport: true }));
  } else if (!Array.isArray(config.Categories)) {
    findings.push(finding('error', 'Categories', 'Categories must be an array.', { blocksExport: true }));
  } else if (config.Categories.length === 0) {
    findings.push(finding('error', 'Categories', 'Categories must contain at least one category for AetherBags to accept the import.', { blocksExport: true }));
  }
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
  const findings = jsonSerializationFidelityFindings(config);
  findings.push(...rootCompatibilityFindings(config));
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
