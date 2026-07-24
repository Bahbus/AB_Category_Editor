import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createBasicEditorMessages } from '../src/ui/basicEditor.js';
import { createColorEditorMessages } from '../src/ui/colorEditor.js';

test('Basics message adapter preserves every established English UI string', () => {
  const messages = createBasicEditorMessages(createTranslator('en'));

  assert.equal(messages.title, 'Basics');
  assert.equal(messages.enabled, 'Enabled');
  assert.equal(messages.pinned, 'Pinned');
  assert.equal(messages.name, 'Name');
  assert.equal(messages.description, 'Description');
  assert.deepEqual(messages.generate, {
    action: 'Generate',
    accessible: 'Generate description for this category'
  });
  assert.deepEqual(messages.confirmation, {
    title: 'Generate description',
    guidance: 'Review before replacing the current description.',
    current: 'Current description',
    generated: 'Generated description',
    replace: 'Replace description',
    copy: 'Copy generated text',
    cancel: 'Cancel'
  });
  assert.deepEqual(messages.status, {
    current: 'Description already matches the generated text.',
    copied: 'Generated description copied.',
    copyFailed: 'Copy failed. Select the text manually.'
  });
  assert.deepEqual(messages.order, {
    label: 'Order',
    error: 'Order must be a signed 32-bit integer.'
  });
  assert.deepEqual(messages.priority, {
    label: 'Priority',
    error: 'Priority must be a signed 32-bit integer.'
  });
});

test('Color message adapter preserves every established English UI string', () => {
  const messages = createColorEditorMessages(createTranslator('en'));

  assert.equal(messages.title, 'Color');
  assert.equal(messages.previewTooltip, 'Click to open the color picker');
  assert.equal(messages.pickerAccessible, 'Pick RGB color');
  assert.deepEqual(messages.hex, {
    label: 'Hex RGBA',
    placeholder: '#RRGGBBAA',
    error: 'Use #RRGGBBAA or RRGGBBAA.'
  });
  assert.equal(messages.red, 'R');
  assert.equal(messages.green, 'G');
  assert.equal(messages.blue, 'B');
  assert.deepEqual(messages.alpha, { label: 'A', accessible: 'Alpha' });
});

test('Basics and Color adapters invoke every owned flat catalog key', () => {
  const calls = [];
  const translate = key => {
    calls.push(key);
    return key;
  };

  createBasicEditorMessages(translate);
  createColorEditorMessages(translate);

  const expected = Object.keys(ENGLISH_MESSAGES)
    .filter(key => key.startsWith('basics.') || key.startsWith('color.'));
  assert.deepEqual([...new Set(calls)].sort(), expected.sort());
  assert.equal(calls.length, expected.length);
});

test('Basics and Color catalog entries remain plain text without markup', () => {
  for (const [key, value] of Object.entries(ENGLISH_MESSAGES)
    .filter(([key]) => key.startsWith('basics.') || key.startsWith('color.'))) {
    assert.doesNotMatch(value, /<[^>]*>/, `${key} must remain plain text`);
  }
});
