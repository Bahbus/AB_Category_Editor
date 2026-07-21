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

export function formatRichMessage(template, parameters = {}) {
  const source = String(template);
  const parts = [];
  let textStart = 0;

  for (const match of source.matchAll(NAMED_PARAMETER)) {
    const [placeholder, name] = match;
    if (!Object.hasOwn(parameters, name)) {
      throw new Error(`Missing localization parameter: ${name}`);
    }
    if (match.index > textStart) {
      parts.push({ type: 'text', value: source.slice(textStart, match.index) });
    }
    parts.push({ type: 'placeholder', name, value: parameters[name] });
    textStart = match.index + placeholder.length;
  }

  if (textStart < source.length) {
    parts.push({ type: 'text', value: source.slice(textStart) });
  }
  return parts;
}

export function resolveLocale(locale) {
  return Object.hasOwn(LOCALE_CATALOGS, locale) ? locale : DEFAULT_LOCALE;
}

function messageForKey(catalog, key) {
  if (!Object.hasOwn(catalog, key)) {
    throw new Error(`Unknown localization key: ${key}`);
  }
  return catalog[key];
}

export function createTranslator(locale = DEFAULT_LOCALE) {
  const resolvedLocale = resolveLocale(locale);
  const catalog = LOCALE_CATALOGS[resolvedLocale];
  const translate = (key, parameters = {}) => {
    return formatMessage(messageForKey(catalog, key), parameters);
  };
  translate.rich = (key, parameters = {}) => {
    return formatRichMessage(messageForKey(catalog, key), parameters);
  };
  return translate;
}
