export const INT32_MIN = -0x80000000;
export const INT32_MAX = 0x7FFFFFFF;
export const UINT32_MAX = 0xFFFFFFFF;

export function isBooleanScalar(value) {
  return typeof value === 'boolean';
}

export function isIntegerScalar(value) {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

export function isSignedInt32Scalar(value) {
  return isIntegerScalar(value) && value >= INT32_MIN && value <= INT32_MAX;
}

export function isUnsignedIntegerScalar(value) {
  return isIntegerScalar(value) && value >= 0 && value <= UINT32_MAX;
}

export function isRangeBoundScalar(field, value) {
  return field === 'VendorPrice' ? isUnsignedIntegerScalar(value) : isSignedInt32Scalar(value);
}

export function isStateScalar(value) {
  return isSignedInt32Scalar(value) && (value === 0 || value === 1 || value === 2);
}

export function isStateFilterScalar(value) {
  return isSignedInt32Scalar(value);
}
