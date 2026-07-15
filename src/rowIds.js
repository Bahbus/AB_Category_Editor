import { UINT32_MAX, isUnsignedIntegerScalar } from './filterScalars.js';

export function isValidRowIdValue(value) {
  if (typeof value === 'number') return isUnsignedIntegerScalar(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return false;
    const normalized = Number(trimmed);
    return Number.isSafeInteger(normalized) && normalized >= 0 && normalized <= UINT32_MAX;
  }
  return false;
}

export function normalizeRowIdValue(value) {
  if (!isValidRowIdValue(value)) return null;
  return Number(value);
}

export function parseTypedRowIdValue(value) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return null;
  const normalized = Number(text);
  if (!Number.isSafeInteger(normalized) || normalized < 0 || normalized > UINT32_MAX) return null;
  return normalized;
}

export function invalidRowIds(values) {
  if (!Array.isArray(values)) return [];
  return values.filter(value => !isValidRowIdValue(value));
}
