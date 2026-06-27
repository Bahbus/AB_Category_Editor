export function isUsefulLookupName(name) {
  const value = String(name || '').trim();
  return Boolean(value)
    && !/^unknown$/i.test(value)
    && !/^\(?name unavailable\)?$/i.test(value)
    && !/^not looked up$/i.test(value);
}
