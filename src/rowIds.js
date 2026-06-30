export function isValidRowIdValue(value) {
  if (typeof value === 'number') return Number.isInteger(value) && value >= 0;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed);
  }
  return false;
}

export function normalizeRowIdValue(value) {
  if (!isValidRowIdValue(value)) return null;
  return Number(value);
}

export function invalidRowIds(values) {
  if (!Array.isArray(values)) return [];
  return values.filter(value => !isValidRowIdValue(value));
}
