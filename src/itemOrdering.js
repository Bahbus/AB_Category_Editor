import { isSignedInt32Scalar, isUnsignedIntegerScalar } from './filterScalars.js';

export const ITEM_SORT_FIELDS = Object.freeze([
  Object.freeze({ value: 0, label: 'Use Global Default' }),
  Object.freeze({ value: 1, label: 'Quantity' }),
  Object.freeze({ value: 2, label: 'Name' }),
  Object.freeze({ value: 3, label: 'Rarity' }),
  Object.freeze({ value: 4, label: 'Item ID' }),
  Object.freeze({ value: 5, label: 'Custom Item Order' }),
  Object.freeze({ value: 6, label: 'Game Category' }),
  Object.freeze({ value: 7, label: 'Item Level' })
]);

export const ITEM_SORT_DIRECTIONS = Object.freeze([
  Object.freeze({ value: 0, label: 'Ascending' }),
  Object.freeze({ value: 1, label: 'Descending' })
]);

const FIELD_VALUES = new Set(ITEM_SORT_FIELDS.map(option => option.value));
const DIRECTION_VALUES = new Set(ITEM_SORT_DIRECTIONS.map(option => option.value));
const GLOBAL_CRITERION = Object.freeze({ Field: 0, Direction: 0 });

function hasOwn(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function sameCriteria(left, right) {
  return Array.isArray(left) && left.length === right.length && left.every((criterion, index) => (
    isPlainObject(criterion)
    && criterion.Field === right[index].Field
    && criterion.Direction === right[index].Direction
    && Object.keys(criterion).length === 2
  ));
}
function issue(severity, field, message, options = {}) {
  return { severity, field, message, blocksExport: false, ...options };
}

export function itemSortFieldLabel(value) {
  return ITEM_SORT_FIELDS.find(option => option.value === value)?.label || `Unsupported field ${String(value)}`;
}

export function itemSortDirectionLabel(value) {
  return ITEM_SORT_DIRECTIONS.find(option => option.value === value)?.label || `Unsupported direction ${String(value)}`;
}

export function analyzeItemOrdering(category) {
  const criteriaPresent = hasOwn(category || {}, 'ItemSortCriteria');
  const storedCriteria = category?.ItemSortCriteria;
  const criteriaIssues = [];
  const normalizedCriteria = [];
  let criteriaRepresentable = true;
  let usableCount = 0;
  let useGlobalIndex = -1;
  const seenFields = new Set();

  if (!criteriaPresent || (Array.isArray(storedCriteria) && storedCriteria.length === 0)) {
    normalizedCriteria.push({ ...GLOBAL_CRITERION });
  } else if (!Array.isArray(storedCriteria)) {
    criteriaRepresentable = false;
    criteriaIssues.push(issue('error', 'ItemSortCriteria', 'Item Sort Criteria must be an array of non-null objects.', { blocksExport: true }));
  } else {
    for (const [index, criterion] of storedCriteria.entries()) {
      const position = index + 1;
      if (!isPlainObject(criterion)) {
        criteriaRepresentable = false;
        criteriaIssues.push(issue('error', 'ItemSortCriteria', `Item Sort Criterion ${position} must be a non-null JSON object.`, { blocksExport: true }));
        continue;
      }
      const fieldMissing = !hasOwn(criterion, 'Field');
      const directionMissing = !hasOwn(criterion, 'Direction');
      if (fieldMissing) criteriaIssues.push(issue('warning', 'ItemSortCriteria', `Item Sort Criterion ${position} Field is omitted; AetherBags will use Quantity.`));
      if (directionMissing) criteriaIssues.push(issue('warning', 'ItemSortCriteria', `Item Sort Criterion ${position} Direction is omitted; AetherBags will use Descending.`));
      const field = fieldMissing ? 1 : criterion.Field;
      const direction = directionMissing ? 1 : criterion.Direction;
      if (!isSignedInt32Scalar(field)) {
        criteriaRepresentable = false;
        criteriaIssues.push(issue('error', 'ItemSortCriteria', `Item Sort Criterion ${position} Field must be a signed 32-bit JSON-number integer.`, { blocksExport: true }));
        continue;
      }
      if (!isSignedInt32Scalar(direction)) {
        criteriaRepresentable = false;
        criteriaIssues.push(issue('error', 'ItemSortCriteria', `Item Sort Criterion ${position} Direction must be a signed 32-bit JSON-number integer.`, { blocksExport: true }));
        continue;
      }
      if (!FIELD_VALUES.has(field) || !DIRECTION_VALUES.has(direction)) {
        criteriaIssues.push(issue('warning', 'ItemSortCriteria', `Item Sort Criterion ${position} uses an unsupported Field or Direction and AetherBags will discard it during import normalization.`));
        continue;
      }
      usableCount++;
      if (field === 0) {
        if (useGlobalIndex < 0) useGlobalIndex = index;
        continue;
      }
      if (seenFields.has(field)) {
        criteriaIssues.push(issue('warning', 'ItemSortCriteria', `Item Sort Criterion ${position} repeats Field ${field} and AetherBags will discard the duplicate.`));
        continue;
      }
      seenFields.add(field);
      normalizedCriteria.push({ Field: field, Direction: direction });
    }
    if (useGlobalIndex >= 0) {
      const global = storedCriteria[useGlobalIndex];
      const direction = hasOwn(global, 'Direction') ? global.Direction : 1;
      normalizedCriteria.splice(0, normalizedCriteria.length, { ...GLOBAL_CRITERION });
      if (storedCriteria.length !== 1 || useGlobalIndex !== 0 || direction !== 0) {
        criteriaIssues.push(issue('warning', 'ItemSortCriteria', 'AetherBags will normalize Item Sort Criteria to a single Use Global / Ascending criterion.'));
      }
    } else if (usableCount === 0) {
      normalizedCriteria.splice(0, normalizedCriteria.length, { ...GLOBAL_CRITERION });
      criteriaIssues.push(issue('warning', 'ItemSortCriteria', 'AetherBags will replace the empty or unusable Item Sort Criteria list with its Use Global default.'));
    }
  }

  const customCriterionActive = normalizedCriteria.some(criterion => criterion.Field === 5);
  const customPresent = hasOwn(category || {}, 'CustomItemOrder');
  const storedCustomOrder = category?.CustomItemOrder;
  const customIssues = [];
  const customRepresentable = !customPresent || Array.isArray(storedCustomOrder);
  const validCustomOrder = Array.isArray(storedCustomOrder) && storedCustomOrder.every(isUnsignedIntegerScalar);
  const customFallbackMessage = normalizedCriteria.length === 1
    ? 'AetherBags will fall back to Quantity / Descending instead of applying custom item ranks.'
    : 'Custom ranks cannot contribute; AetherBags will continue with the remaining sort criteria.';
  if (customPresent && !Array.isArray(storedCustomOrder)) {
    customIssues.push(issue('error', 'CustomItemOrder', 'Custom Item Order must be an array of unsigned 32-bit JSON numbers.', { blocksExport: true }));
  } else if (Array.isArray(storedCustomOrder) && !validCustomOrder) {
    customIssues.push(issue('error', 'CustomItemOrder', 'Custom Item Order must contain only JSON-number non-negative integers from 0 through 4294967295; numeric strings are not export-compatible.', { blocksExport: true }));
  } else if (customCriterionActive && !customPresent) {
    customIssues.push(issue('warning', 'CustomItemOrder', `Custom Order is selected, but Custom Item Order is omitted; ${customFallbackMessage}`));
  } else if (customCriterionActive && storedCustomOrder.length === 0) {
    customIssues.push(issue('warning', 'CustomItemOrder', `Custom Order is selected, but Custom Item Order is empty; ${customFallbackMessage}`));
  } else if (customCriterionActive && new Set(storedCustomOrder).size !== storedCustomOrder.length) {
    customIssues.push(issue('warning', 'CustomItemOrder', 'Custom Item Order contains duplicate item IDs; AetherBags will use only the first position for each item.'));
  }

  const criteriaCanonical = criteriaPresent && criteriaRepresentable && sameCriteria(storedCriteria, normalizedCriteria);
  const customOrderingApplied = customCriterionActive && validCustomOrder && storedCustomOrder.length > 0;
  let badge = 'Use global';
  if (customOrderingApplied) badge = 'Custom order';
  else if (normalizedCriteria.length > 1 || normalizedCriteria[0]?.Field !== 0) badge = `${normalizedCriteria.length} ${normalizedCriteria.length === 1 ? 'criterion' : 'criteria'}`;

  return {
    criteriaPresent,
    criteriaRepresentable,
    criteriaCanonical,
    normalizedCriteria,
    effectiveCriteria: normalizedCriteria.map(criterion => ({ ...criterion })),
    customCriterionActive,
    customOrderingApplied,
    customPresent,
    customRepresentable,
    validCustomOrder,
    retainedInactiveCustomOrder: !customCriterionActive && validCustomOrder && storedCustomOrder.length > 0,
    customOrder: validCustomOrder ? storedCustomOrder.slice() : [],
    criteriaIssues,
    customIssues,
    issues: [...criteriaIssues, ...customIssues],
    badge
  };
}

function decision(value, changed) { return { value, changed }; }
export function decideCanonicalCriteriaRepair(storedCriteria, normalizedCriteria) {
  const value = normalizedCriteria.map(criterion => ({ ...criterion }));
  return decision(value, !sameCriteria(storedCriteria, value));
}
export function decideCriterionAdd(criteria, field, direction = 0) {
  if (!FIELD_VALUES.has(field) || !DIRECTION_VALUES.has(direction)) return decision(criteria, false);
  if (field === 0) return decision([{ ...GLOBAL_CRITERION }], !sameCriteria(criteria, [GLOBAL_CRITERION]));
  if (criteria.some(criterion => criterion.Field === field)) return decision(criteria, false);
  const base = criteria.filter(criterion => criterion.Field !== 0).map(criterion => ({ ...criterion }));
  return decision([...base, { Field: field, Direction: direction }], true);
}
export function decideCriterionChange(criteria, index, key, value) {
  if (!Array.isArray(criteria) || index < 0 || index >= criteria.length) return decision(criteria, false);
  if (key === 'Field') {
    if (!FIELD_VALUES.has(value) || criteria.some((criterion, position) => position !== index && criterion.Field === value)) return decision(criteria, false);
    if (value === 0) return decision([{ ...GLOBAL_CRITERION }], !sameCriteria(criteria, [GLOBAL_CRITERION]));
  } else if (key === 'Direction') {
    if (!DIRECTION_VALUES.has(value) || criteria[index].Field === 0) value = 0;
  } else return decision(criteria, false);
  if (criteria[index][key] === value) return decision(criteria, false);
  const next = criteria.map(criterion => ({ ...criterion }));
  next[index][key] = value;
  if (next[index].Field === 0) next[index].Direction = 0;
  return decision(next, true);
}
export function decideCriterionRemove(criteria, index) {
  if (!Array.isArray(criteria) || index < 0 || index >= criteria.length) return decision(criteria, false);
  return decision(criteria.filter((_, position) => position !== index).map(criterion => ({ ...criterion })), true);
}
export function decideOrderedMove(values, index, offset) {
  const target = index + offset;
  if (!Array.isArray(values) || !Number.isInteger(index) || !Number.isInteger(target) || index < 0 || target < 0 || index >= values.length || target >= values.length || offset === 0) return decision(values, false);
  const next = values.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return decision(next, true);
}
export function decideUniqueItemAdd(values, itemId) {
  if (!Array.isArray(values) || !isUnsignedIntegerScalar(itemId) || values.includes(itemId)) return decision(values, false);
  return decision([...values, itemId], true);
}
export function decideItemRemove(values, index) {
  if (!Array.isArray(values) || index < 0 || index >= values.length) return decision(values, false);
  return decision(values.filter((_, position) => position !== index), true);
}
