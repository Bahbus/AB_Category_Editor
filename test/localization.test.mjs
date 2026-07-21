import test from 'node:test';
import assert from 'node:assert/strict';

import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createTranslator, DEFAULT_LOCALE, formatMessage, formatRichMessage, resolveLocale } from '../src/localization.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('English lookup returns established localized modal copy', () => {
  const translate = createTranslator('en');
  assert.equal(translate('preferences.title'), 'Editor Preferences');
  assert.equal(translate('preferences.theme.highContrast.label'), 'High Contrast');
  assert.equal(translate('preferences.saved'), 'Editor preferences saved locally.');
  assert.equal(translate('help.title'), 'About / Help');
  assert.equal(translate('help.workflow.download.message', { action: 'Download', extension: '.txt' }), 'Download saves the updated gzip+Base64 text as a local .txt file.');
  assert.equal(translate('help.privacy.repository'), 'The app does not upload the full category config to this repository.');
  assert.equal(translate('lookupCache.title'), 'Lookup Cache');
  assert.equal(translate('lookupCache.unavailable.race'), 'The cache was not cleared because a lookup or scan is still running.');
});

test('Lookup Cache statistics interpolate established formatted counts', () => {
  const translate = createTranslator('en');
  assert.equal(
    translate('lookupCache.stats', { useful: '1,234', unresolved: '56' }),
    '1,234 useful, 56 unresolved'
  );
});

test('named interpolation replaces supplied parameters', () => {
  assert.equal(formatMessage('Resolved {count} values for {name}.', { count: 3, name: 'Items' }), 'Resolved 3 values for Items.');
});

test('rich-message formatting preserves surrounding text and follows template placeholder order', () => {
  const first = { label: 'first' };
  const second = { label: 'second' };
  assert.deepEqual(formatRichMessage('Before {second}, between {first}, after.', { first, second }), [
    { type: 'text', value: 'Before ' },
    { type: 'placeholder', name: 'second', value: second },
    { type: 'text', value: ', between ' },
    { type: 'placeholder', name: 'first', value: first },
    { type: 'text', value: ', after.' }
  ]);
});

test('rich-message formatting repeats opaque placeholder values by identity', () => {
  const value = Object.freeze({ toString() { throw new Error('must not stringify'); } });
  const parts = formatRichMessage('{value} then {value}', { value });
  assert.equal(parts[0].value, value);
  assert.equal(parts[2].value, value);
});

test('unsupported locales deterministically fall back to English', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
  assert.equal(resolveLocale('fr'), 'en');
  assert.equal(createTranslator('fr')('preferences.title'), 'Editor Preferences');
});

test('unknown keys and missing interpolation parameters fail explicitly', () => {
  const translate = createTranslator('en');
  assert.throws(() => translate('preferences.unknown'), /Unknown localization key: preferences\.unknown/);
  assert.throws(() => translate.rich('preferences.unknown'), /Unknown localization key: preferences\.unknown/);
  assert.throws(() => formatMessage('Hello, {name}.'), /Missing localization parameter: name/);
  assert.throws(() => formatRichMessage('Hello, {name}.'), /Missing localization parameter: name/);
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
