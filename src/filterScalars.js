export const UINT32_MAX = 0xFFFFFFFF;

export function isBooleanScalar(value) {
  return typeof value === 'boolean';
}

export function isIntegerScalar(value) {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function isUnsignedIntegerScalar(value) {
  return isIntegerScalar(value) && value >= 0 && value <= UINT32_MAX;
}

export function isRangeBoundScalar(field, value) {
  return field === 'VendorPrice' ? isUnsignedIntegerScalar(value) : isIntegerScalar(value);
}

export function isStateScalar(value) {
  return isIntegerScalar(value) && (value === 0 || value === 1 || value === 2);
}

export function isStateFilterScalar(value) {
  return isIntegerScalar(value);
}
