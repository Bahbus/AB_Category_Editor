import test from 'node:test';
import assert from 'node:assert/strict';

import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createTranslator, formatRichMessage } from '../src/localization.js';
import { renderEmptyStateIfNeeded } from '../src/ui/categoryEditor.js';
import { appendEmptyStateRichMessage, buildEmptyState } from '../src/ui/emptyState.js';

class FakeNode {
  constructor(nodeName, nodeType = 1, data = '') {
    this.nodeName = nodeName;
    this.nodeType = nodeType;
    this.data = data;
    this.childNodes = [];
    this.className = '';
    this.id = '';
    this.type = '';
    this.attributes = new Map();
    this.listeners = new Map();
    this.ownText = '';
  }

  appendChild(node) {
    this.childNodes.push(node);
    return node;
  }

  set textContent(value) {
    this.ownText = String(value);
    this.childNodes = [];
  }

  get textContent() {
    if (this.nodeType === 3) return this.data;
    return this.ownText + this.childNodes.map(node => node.textContent).join('');
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, callback) {
    this.listeners.set(type, callback);
  }

  click() {
    this.listeners.get('click')?.();
  }
}

const fakeDocument = {
  createElement(tagName) {
    return new FakeNode(tagName.toUpperCase());
  },
  createTextNode(text) {
    return new FakeNode('#text', 3, String(text));
  }
};

function elements(root, tagName) {
  const expected = tagName.toUpperCase();
  const matches = [];
  const visit = node => {
    if (node.nodeType === 1 && node.nodeName === expected) matches.push(node);
    for (const child of node.childNodes) visit(child);
  };
  visit(root);
  return matches;
}

function elementById(root, id) {
  return elements(root, 'button').find(node => node.id === id) ?? null;
}

const EXPECTED_LIST_ITEMS = [
  'Import/Paste or Upload to load an existing AetherBags export',
  'Load basic presets',
  'Load advanced presets',
  'Add a category manually'
];

test('empty state builds exact English text, list order, semantics, and button contracts', () => {
  const card = buildEmptyState({ translate: createTranslator('en') }, fakeDocument);
  assert.equal(card.className, 'card empty-state-card');
  assert.equal(elements(card, 'h2')[0].textContent, 'No category selected');
  assert.equal(elements(card, 'p')[0].textContent, 'Start with:');
  assert.deepEqual(elements(card, 'li').map(item => item.textContent), EXPECTED_LIST_ITEMS);
  assert.deepEqual(elements(card, 'strong').map(node => node.textContent), ['Import/Paste', 'Upload']);
  assert.equal(elements(card, 'strong').length, 2);
  assert.deepEqual(elements(card, 'p').map(node => node.textContent), [
    'Start with:',
    'Change appearance and other settings in Preferences.',
    'Click ? for more information about this app.'
  ]);

  const basic = elementById(card, 'loadBasicPresets');
  const advanced = elementById(card, 'loadAdvancedPresets');
  assert.deepEqual([basic.id, basic.type, basic.className, basic.textContent, basic.getAttribute('title'), basic.getAttribute('aria-label')], [
    'loadBasicPresets', 'button', 'link-button', 'Load basic presets',
    'Import bundled basic preset categories', 'Import bundled basic preset categories'
  ]);
  assert.deepEqual([advanced.id, advanced.type, advanced.className, advanced.textContent, advanced.getAttribute('title'), advanced.getAttribute('aria-label')], [
    'loadAdvancedPresets', 'button', 'link-button', 'Load advanced presets',
    'Import bundled advanced preset categories', 'Import bundled advanced preset categories'
  ]);
});

test('empty state sends every displayed value through the injected translator', () => {
  const english = createTranslator('en');
  const calls = [];
  const translate = (key, parameters) => {
    calls.push([key, parameters]);
    return english(key, parameters);
  };
  translate.rich = (key, parameters) => {
    calls.push([key, parameters]);
    return english.rich(key, parameters);
  };
  buildEmptyState({ translate }, fakeDocument);
  assert.deepEqual(calls.map(([key]) => key), [
    'emptyState.title',
    'emptyState.startWith',
    'action.importPaste',
    'action.upload',
    'emptyState.workflow.message',
    'emptyState.basicPreset.label',
    'emptyState.basicPreset.description',
    'emptyState.advancedPreset.label',
    'emptyState.advancedPreset.description',
    'emptyState.addManually',
    'action.preferences',
    'emptyState.preferencesGuidance',
    'emptyState.helpGuidance'
  ]);
});

test('empty-state workflow follows a synthetically reordered rich template', () => {
  const english = createTranslator('en');
  const reordered = (key, parameters) => english(key, parameters);
  reordered.rich = (key, parameters) => key === 'emptyState.workflow.message'
    ? formatRichMessage('{upload} before {importPaste} loads an existing export', parameters)
    : english.rich(key, parameters);
  const card = buildEmptyState({ translate: reordered }, fakeDocument);
  const workflow = elements(card, 'li')[0];
  assert.equal(workflow.textContent, 'Upload before Import/Paste loads an existing export');
  assert.deepEqual(workflow.childNodes.map(node => node.nodeName), ['STRONG', '#text', 'STRONG', '#text']);
});

test('empty-state rich rendering uses text nodes and accepts only UI-owned strong semantics', () => {
  const target = fakeDocument.createElement('li');
  appendEmptyStateRichMessage(target, [
    { type: 'text', value: '<before> ' },
    { type: 'placeholder', name: 'value', value: { kind: 'strong', text: '<safe>' } }
  ], fakeDocument);
  assert.equal(target.childNodes[0].nodeType, 3);
  assert.equal(target.childNodes[0].data, '<before> ');
  assert.equal(target.childNodes[1].nodeName, 'STRONG');
  assert.equal(target.childNodes[1].ownText, '<safe>');
  assert.throws(() => appendEmptyStateRichMessage(target, [
    { type: 'placeholder', name: 'value', value: { kind: 'code', text: 'unsupported' } }
  ], fakeDocument), /Unsupported empty-state rich-message semantic: code/);
});

test('empty-state catalog values remain plain strings without UI semantics or executable instructions', () => {
  const messages = Object.entries(ENGLISH_MESSAGES).filter(([key]) => key.startsWith('emptyState.'));
  assert.equal(messages.length, 10);
  for (const [key, value] of messages) {
    assert.equal(typeof value, 'string', key);
    assert.doesNotMatch(value, /<|>|https?:|javascript:|\bon\w+\s*=|\b(?:strong|code|script|style|title|aria-label|sanitize)\b/i, key);
  }
});

test('preset actions commit the active field before invoking their normal callbacks', () => {
  const calls = [];
  const card = buildEmptyState({
    translate: createTranslator('en'),
    commitActiveField: () => calls.push('commit'),
    loadBasicPresets: () => calls.push('basic'),
    loadAdvancedPresets: () => calls.push('advanced')
  }, fakeDocument);
  elementById(card, 'loadBasicPresets').click();
  elementById(card, 'loadAdvancedPresets').click();
  assert.deepEqual(calls, ['commit', 'basic', 'commit', 'advanced']);
});

test('category editor empty-state gate resets selection and skips the builder for populated data', () => {
  const root = fakeDocument.createElement('section');
  const selections = [];
  let builds = 0;
  const emptyStateBuilder = () => {
    builds++;
    return fakeDocument.createElement('div');
  };
  assert.equal(renderEmptyStateIfNeeded({
    categories: [], root, setSelectedIndex: value => selections.push(value), emptyStateBuilder
  }), true);
  assert.deepEqual(selections, [-1]);
  assert.equal(builds, 1);
  assert.equal(root.childNodes.length, 1);

  assert.equal(renderEmptyStateIfNeeded({
    categories: [{}], root, setSelectedIndex: value => selections.push(value), emptyStateBuilder
  }), false);
  assert.deepEqual(selections, [-1]);
  assert.equal(builds, 1);
});
