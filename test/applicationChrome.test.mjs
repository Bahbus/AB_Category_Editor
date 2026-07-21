import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { applyApplicationChromeLocalization } from '../src/ui/applicationChrome.js';
import { read } from '../testSupport/sourceFiles.mjs';

const TEXT_TARGETS = {
  '.brand h1': 'AetherBags Category Editor',
  'label[for="search"]': 'Search categories',
  '#clearSearch': 'Clear',
  '#addCategory': 'Add category',
  '#sortByOrder': 'Sort by order',
  '#renumber': 'Renumber',
  '.switch-control .switch-label': 'Auto-renumber after drag',
  '.topbar-group-file .topbar-group-label': 'File / Data',
  '#showImport': 'Import/Paste',
  '#uploadFile': 'Upload',
  '#showExportCopy': 'Export/Copy',
  '#downloadBase64': 'Download',
  '#showRaw': 'Raw JSON',
  '.topbar-group-tools .topbar-group-label': 'Tools',
  '#lookupReferencedIds': 'Resolve IDs',
  '#showLookupCache': 'Lookup Cache',
  '.topbar-group-help .topbar-group-label': 'Help',
  '#showPreferences': 'Preferences'
};

const ATTRIBUTE_TARGETS = {
  '#search': { placeholder: 'Search names, descriptions, regex, IDs' },
  '#clearSearch': { 'aria-label': 'Clear search' },
  '.topbar': { 'aria-label': 'Editor controls' },
  '.topbar-group-file': { 'aria-label': 'File and data controls' },
  '.topbar-group-tools': { 'aria-label': 'Lookup tools' },
  '.topbar-group-help': { 'aria-label': 'Help' },
  '#showHelp': { title: 'About / Help', 'aria-label': 'About / Help' }
};

class FakeElement {
  constructor() {
    this.textContent = 'fallback';
    this.attributes = {};
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }
}

function fakeChromeDocument() {
  const selectors = new Set([...Object.keys(TEXT_TARGETS), ...Object.keys(ATTRIBUTE_TARGETS)]);
  const elements = new Map([...selectors].map(selector => [selector, new FakeElement()]));
  return {
    title: 'fallback',
    elements,
    querySelector(selector) { return elements.get(selector) || null; }
  };
}

test('application chrome uses the injected translator and retains exact English output', () => {
  const documentRef = fakeChromeDocument();
  applyApplicationChromeLocalization(createTranslator('en'), documentRef);

  assert.equal(documentRef.title, 'AetherBags Category Editor');
  for (const [selector, expected] of Object.entries(TEXT_TARGETS)) {
    assert.equal(documentRef.elements.get(selector).textContent, expected, selector);
  }
  for (const [selector, attributes] of Object.entries(ATTRIBUTE_TARGETS)) {
    assert.deepEqual(documentRef.elements.get(selector).attributes, attributes, selector);
  }
});

test('application chrome sends every localized value through the supplied translator instance', () => {
  const documentRef = fakeChromeDocument();
  const keys = [];
  const translate = key => {
    keys.push(key);
    return `[${key}]`;
  };
  applyApplicationChromeLocalization(translate, documentRef);

  assert.equal(documentRef.title, '[app.name]');
  assert.equal(documentRef.elements.get('#showImport').textContent, '[action.importPaste]');
  assert.equal(documentRef.elements.get('#showHelp').attributes['aria-label'], '[action.aboutHelp]');
  assert.deepEqual(keys, [
    'app.name',
    'app.name',
    'chrome.sidebar.search.label',
    'action.clear',
    'action.addCategory',
    'action.sortByOrder',
    'action.renumber',
    'chrome.sidebar.autoRenumberAfterDrag',
    'chrome.topbar.fileData.title',
    'action.importPaste',
    'action.upload',
    'action.exportCopy',
    'action.download',
    'action.rawJson',
    'chrome.topbar.tools.title',
    'action.resolveIds',
    'action.lookupCache',
    'chrome.topbar.help',
    'action.preferences',
    'chrome.sidebar.search.placeholder',
    'action.clearSearch',
    'chrome.topbar.editorControls.label',
    'chrome.topbar.fileData.label',
    'chrome.topbar.tools.label',
    'chrome.topbar.help',
    'action.aboutHelp',
    'action.aboutHelp'
  ]);
});

test('index keeps immediate matching English chrome fallback without changing identity or control contracts', () => {
  const index = read('index.html');
  for (const value of [...Object.values(TEXT_TARGETS), ...Object.values(ATTRIBUTE_TARGETS).flatMap(Object.values)]) {
    assert.ok(index.includes(value), value);
  }
  assert.match(index, /<html lang="en"/);
  assert.match(index, /<button id="clearSearch" class="small clear-search" type="button" aria-label="Clear search" disabled>Clear<\/button>/);
  assert.match(index, /<button id="showExportCopy" class="primary">Export\/Copy<\/button>/);
  assert.match(index, /<button id="showHelp" class="icon-button" title="About \/ Help" aria-label="About \/ Help">\?<\/button>/);
  assert.match(index, /<input id="fileInput" class="hidden" type="file"/);
  assert.match(index, /<div class="topbar-group topbar-group-file" role="group" aria-label="File and data controls">/);
});

test('chrome localization uses only text, title-property, and explicit attribute sinks', () => {
  const source = read('src/ui/applicationChrome.js');
  assert.match(source, /documentRef\.title = translate\('app\.name'\)/);
  assert.match(source, /\.textContent = translate\(key\)/);
  assert.match(source, /\.setAttribute\(attribute, translate\(key\)\)/);
  assert.doesNotMatch(source, /innerHTML|outerHTML|insertAdjacentHTML|DOMParser|createContextualFragment/);
});

test('shared action labels replace obsolete Help-owned duplicates while Help behavior stays focused', () => {
  const english = read('src/locales/en.js');
  const help = read('src/ui/helpModal.js');
  const lookupCache = read('src/ui/lookupCacheModal.js');
  for (const key of [
    'help.title',
    'help.workflow.import.label',
    'help.workflow.upload.label',
    'help.workflow.export.label',
    'help.workflow.download.label',
    'help.lookup.resolveIds.label',
    'help.lookup.cache.label',
    'help.preferences.preferences.label',
    'lookupCache.title'
  ]) {
    assert.doesNotMatch(english, new RegExp(`'${key.replaceAll('.', '\\.')}'`), key);
  }
  for (const key of ['action.importPaste', 'action.upload', 'action.exportCopy', 'action.download', 'action.resolveIds', 'action.lookupCache', 'action.preferences', 'action.aboutHelp']) {
    assert.ok(english.includes(`'${key}':`), key);
  }
  assert.match(help, /openModal\(translate\('action\.aboutHelp'\), buildHelpContent\(translate\)\)/);
  assert.match(lookupCache, /openModal\(translate\('action\.lookupCache'\), wrap/);
});
