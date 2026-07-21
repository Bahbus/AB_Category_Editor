import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator, formatRichMessage } from '../src/localization.js';
import { appendHelpRichMessage, buildHelpContent } from '../src/ui/helpModal.js';

class FakeNode {
  constructor(nodeName, nodeType = 1, data = '') {
    this.nodeName = nodeName;
    this.nodeType = nodeType;
    this.data = data;
    this.childNodes = [];
    this.className = '';
    this.ownText = '';
  }

  appendChild(node) {
    this.childNodes.push(node);
    return node;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  set textContent(value) {
    this.ownText = String(value);
    this.childNodes = [];
  }

  get textContent() {
    if (this.nodeType === 3) return this.data;
    return this.ownText + this.childNodes.map(node => node.textContent).join('');
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

const EXPECTED_HELP_ITEMS = [
  'Import/Paste accepts formatted JSON or the gzip+Base64 category text exported/copied from AetherBags.',
  'Upload accepts a text, Base64, or JSON file containing that same AetherBags category data.',
  'Export/Copy creates updated gzip+Base64 text and tries to copy it to your clipboard.',
  'Download saves the updated gzip+Base64 text as a local .txt file.',
  "Paste or import the exported Base64 text back into AetherBags using the plugin's category import workflow.",
  'Resolve IDs resolves referenced item IDs and UI category IDs to English names through XIVAPI.',
  'Lookup Cache shows and clears locally cached lookup names stored in this browser.',
  'Regex → Item IDs scans XIVAPI item names for a selected name pattern and can be canceled while it runs.',
  'Preferences lets you choose editor-only themes and comfortable/compact density, plus behavior settings like auto-lookup and description generation.',
  'Generate beside Description suggests concise text from the category name and selected rules/filters.',
  'Auto-lookup imported IDs and Auto-generate descriptions live on the Behavior tab; generated descriptions only fill blanks and never overwrite existing text.',
  'Preferences are stored locally in this browser with localStorage and are not included in exported AetherBags config data.',
  'The full imported config is processed locally in your browser.',
  'The app stores lookup names in localStorage so repeated ID lookups are faster.',
  'XIVAPI is contacted only for item/category name lookups, search queries, and item sheet scans used by Regex → Item IDs.',
  'The app does not upload the full category config to this repository.'
];

test('Help builds exact English text and established semantic structure without HTML parsing', () => {
  const content = buildHelpContent(createTranslator('en'), fakeDocument);
  assert.equal(content.className, 'help-modal');
  assert.equal(elements(content, 'h3').length, 4);
  assert.equal(elements(content, 'ul').length, 4);
  assert.equal(elements(content, 'li').length, 16);
  assert.equal(elements(content, 'strong').length, 11);
  assert.equal(elements(content, 'code').length, 3);
  assert.deepEqual(elements(content, 'li').map(item => item.textContent), EXPECTED_HELP_ITEMS);
  assert.deepEqual(elements(content, 'code').map(node => node.textContent), ['.txt', 'localStorage', 'localStorage']);
});

test('Help rendering follows a synthetically reordered rich template without UI logic changes', () => {
  const english = createTranslator('en');
  const reordered = (key, parameters) => english(key, parameters);
  reordered.rich = (key, parameters) => key === 'help.workflow.download.message'
    ? formatRichMessage('{extension} precedes {action}.', parameters)
    : english.rich(key, parameters);

  const content = buildHelpContent(reordered, fakeDocument);
  const download = elements(content, 'li')[3];
  assert.equal(download.textContent, '.txt precedes Download.');
  assert.deepEqual(download.childNodes.map(node => node.nodeName), ['CODE', '#text', 'STRONG', '#text']);
});

test('Help rich rendering accepts only its local strong and code semantics', () => {
  const target = fakeDocument.createElement('li');
  appendHelpRichMessage(target, [
    { type: 'text', value: 'Before ' },
    { type: 'placeholder', name: 'value', value: { kind: 'strong', text: '<safe>' } }
  ], fakeDocument);
  assert.equal(target.textContent, 'Before <safe>');
  assert.equal(target.childNodes[1].nodeName, 'STRONG');
  assert.equal(target.childNodes[1].ownText, '<safe>');
  assert.throws(() => appendHelpRichMessage(target, [
    { type: 'placeholder', name: 'value', value: { kind: 'a', text: 'unsafe' } }
  ], fakeDocument), /Unsupported Help rich-message semantic: a/);
});
