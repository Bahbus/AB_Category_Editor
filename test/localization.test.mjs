import test from 'node:test';
import assert from 'node:assert/strict';

import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createTranslator, DEFAULT_LOCALE, formatMessage, resolveLocale } from '../src/localization.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('English lookup returns established Preferences copy', () => {
  const translate = createTranslator('en');
  assert.equal(translate('preferences.title'), 'Editor Preferences');
  assert.equal(translate('preferences.theme.highContrast.label'), 'High Contrast');
  assert.equal(translate('preferences.saved'), 'Editor preferences saved locally.');
});

test('named interpolation replaces supplied parameters', () => {
  assert.equal(formatMessage('Resolved {count} values for {name}.', { count: 3, name: 'Items' }), 'Resolved 3 values for Items.');
});

test('unsupported locales deterministically fall back to English', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.equal(resolveLocale('fr'), 'en');
  assert.equal(createTranslator('fr')('preferences.title'), 'Editor Preferences');
});

test('unknown keys and missing interpolation parameters fail explicitly', () => {
  assert.throws(() => createTranslator('en')('preferences.unknown'), /Unknown localization key: preferences\.unknown/);
  assert.throws(() => formatMessage('Hello, {name}.'), /Missing localization parameter: name/);
});

test('the English catalog contains plain text rather than HTML fragments', () => {
  assert.ok(Object.isFrozen(ENGLISH_MESSAGES));
  for (const [key, value] of Object.entries(ENGLISH_MESSAGES)) {
    assert.equal(typeof value, 'string', key);
    assert.doesNotMatch(value, /<[^>]*>/, key);
  }
});

test('localization mechanics and the English catalog are DOM-free', () => {
  const localization = read('src/localization.js');
  const english = read('src/locales/en.js');
  for (const source of [localization, english]) {
    assert.doesNotMatch(source, /\b(?:document|window|HTMLElement|Node)\b/);
  }
});
