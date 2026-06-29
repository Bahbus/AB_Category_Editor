export function isUsefulLookupName(name) {
  const value = String(name || '').trim();
  return Boolean(value)
    && !/^unknown$/i.test(value)
    && !/^\(?unnamed\)?$/i.test(value)
    && !/^\(?name unavailable\)?$/i.test(value)
    && !/^not looked up$/i.test(value);
}

export function hasUsefulLookupName(lookupName, sheet, id) {
  return isUsefulLookupName(typeof lookupName === 'function' ? lookupName(sheet, id) : '');
}

export function lookupDisplayName(name) {
  return isUsefulLookupName(name) ? String(name).trim() : '';
}
