import { ENGLISH_MESSAGES } from './locales/en.js';

export const DEFAULT_LOCALE = 'en';

const LOCALE_CATALOGS = Object.freeze({
  en: ENGLISH_MESSAGES
});

const NAMED_PARAMETER = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

export function formatMessage(template, parameters = {}) {
  return String(template).replace(NAMED_PARAMETER, (placeholder, name) => {
    if (!Object.hasOwn(parameters, name)) {
      throw new Error(`Missing localization parameter: ${name}`);
    }
    return String(parameters[name]);
  });
}

export function resolveLocale(locale) {
  return Object.hasOwn(LOCALE_CATALOGS, locale) ? locale : DEFAULT_LOCALE;
}

export function createTranslator(locale = DEFAULT_LOCALE) {
  const resolvedLocale = resolveLocale(locale);
  const catalog = LOCALE_CATALOGS[resolvedLocale];
  return (key, parameters = {}) => {
    if (!Object.hasOwn(catalog, key)) {
      throw new Error(`Unknown localization key: ${key}`);
    }
    return formatMessage(catalog[key], parameters);
  };
}
