import test from 'node:test';
import assert from 'node:assert/strict';

import { createTranslator } from '../src/localization.js';
import { ENGLISH_MESSAGES } from '../src/locales/en.js';
import { createCategoryEditorMessages } from '../src/ui/categoryEditor.js';
import { createCategoryListMessages } from '../src/ui/categoryList.js';
import { read } from '../testSupport/sourceFiles.mjs';

test('category-list message adapter preserves exact English and inserts category data', () => {
  const messages = createCategoryListMessages(createTranslator('en'));
  const named = { Name: 'Raid <Gear>', Description: 'Level 100', Order: 4 };
  const unnamed = { Name: '', Description: ' ', Order: 8 };

  assert.equal(messages.unnamed, '(unnamed)');
  assert.equal(messages.noDescription, 'No description');
  assert.equal(messages.unknownFormat, 'Unknown format');
  assert.equal(messages.issueLabel(1), '1 validation issue');
  assert.equal(messages.issueLabel(2), '2 validation issues');
  assert.equal(messages.displayName(named), 'Raid <Gear>');
  assert.equal(messages.displayName(unnamed), '(unnamed)');
  assert.equal(messages.subtitle(named), '#4 · Level 100');
  assert.equal(messages.subtitle(unnamed), '#8 · No description');
  assert.equal(messages.subtitleTitle(unnamed), 'No description');
  assert.equal(messages.selectionAccessible('Raid <Gear>', '#4 · Level 100', '. 2 validation issues'), 'Select category Raid <Gear>. #4 · Level 100. 2 validation issues');
  assert.equal(messages.selectionTooltip('Raid <Gear>'), 'Select Raid <Gear>');
  assert.equal(messages.clearSearchToReorder, 'Clear search to reorder');
  assert.equal(messages.dragToReorder, 'Drag to reorder');
  assert.equal(messages.enabledOn, 'on');
  assert.equal(messages.enabledOff, 'off');
  assert.equal(messages.pinned, 'Pinned');
  assert.equal(messages.searchStatus(1), '1 shown · clear search to reorder');
  assert.equal(messages.reorderStatus(3), '3 shown · drag categories to reorder');
});

test('category-editor shell message adapter preserves exact English and inserts category data', () => {
  const messages = createCategoryEditorMessages(createTranslator('en'));

  assert.equal(messages.unnamed, '(unnamed)');
  assert.equal(messages.issueLabel(1), '1 validation issue');
  assert.equal(messages.issueLabel(3), '3 validation issues');
  assert.equal(messages.duplicate, 'Duplicate');
  assert.equal(messages.actions.moveUp('Raid <Gear>'), 'Move Raid <Gear> up');
  assert.equal(messages.actions.moveDown('Raid <Gear>'), 'Move Raid <Gear> down');
  assert.equal(messages.actions.duplicate('Raid <Gear>'), 'Duplicate Raid <Gear>');
  assert.equal(messages.actions.delete('Raid <Gear>'), 'Delete Raid <Gear>');
  assert.deepEqual({
    title: messages.deleteConfirmation.title,
    question: messages.deleteConfirmation.question('Raid <Gear>'),
    questionParts: messages.deleteConfirmation.questionParts('Raid <Gear>'),
    warning: messages.deleteConfirmation.warning,
    confirm: messages.deleteConfirmation.confirm,
    cancel: messages.deleteConfirmation.cancel
  }, {
    title: 'Delete category',
    question: 'Delete Raid <Gear>?',
    questionParts: [
      { type: 'text', value: 'Delete ' },
      { type: 'placeholder', name: 'name', value: 'Raid <Gear>' },
      { type: 'text', value: '?' }
    ],
    warning: 'This only affects the browser copy until you download or export.',
    confirm: 'Delete category',
    cancel: 'Cancel'
  });
  assert.deepEqual(messages.advanced, {
    title: 'Advanced',
    hint: 'Edit the selected category directly. Click “Apply raw category JSON” after changes.',
    apply: 'Apply raw category JSON'
  });
  assert.equal(messages.rawJson.parseLabel, 'Selected-category Raw JSON input');
  assert.equal(messages.rawJson.noChanges, 'There are no category changes to apply.');
  assert.equal(messages.rawJson.invalid('Unexpected token <'), 'Invalid category JSON: Unexpected token <');
});

test('category shell adapters invoke every owned stable catalog key with named interpolation', () => {
  const calls = [];
  const translate = (key, params) => {
    calls.push({ key, params });
    return key;
  };
  translate.rich = (key, params) => {
    calls.push({ key, params });
    return [{ type: 'placeholder', name: 'name', value: params.name }];
  };
  const list = createCategoryListMessages(translate);
  const editor = createCategoryEditorMessages(translate);

  list.issueLabel(1);
  list.issueLabel(2);
  list.selectionAccessible('Name', '#1 · Description', '. 1 validation issue');
  list.selectionTooltip('Name');
  list.searchStatus(1);
  list.reorderStatus(2);
  editor.issueLabel(1);
  editor.issueLabel(2);
  editor.actions.moveUp('Name');
  editor.actions.moveDown('Name');
  editor.actions.duplicate('Name');
  editor.actions.delete('Name');
  editor.deleteConfirmation.question('Name');
  editor.deleteConfirmation.questionParts('Name');
  editor.rawJson.invalid('detail');

  const expected = Object.keys(ENGLISH_MESSAGES)
    .filter(key => key.startsWith('categoryList.') || key.startsWith('categoryEditor.'));
  assert.deepEqual([...new Set(calls.map(call => call.key))].sort(), expected.sort());
  assert.ok(calls.some(call => call.key === 'categoryList.selection.accessible'
    && call.params.name === 'Name'
    && call.params.subtitle === '#1 · Description'
    && call.params.issues === '. 1 validation issue'));
  assert.ok(calls.some(call => call.key === 'categoryEditor.rawJson.invalid' && call.params.error === 'detail'));
});

test('category shell catalog entries are plain text and owners keep localization injected', () => {
  for (const [key, value] of Object.entries(ENGLISH_MESSAGES)
    .filter(([key]) => key.startsWith('categoryList.') || key.startsWith('categoryEditor.'))) {
    assert.doesNotMatch(value, /<[^>]*>/, `${key} must remain plain text`);
  }

  const app = read('src/app.js');
  const list = read('src/ui/categoryList.js');
  const editor = read('src/ui/categoryEditor.js');
  assert.match(app, /renderCategoryList\(\{[\s\S]*?commitActiveField,\s*translate/);
  assert.match(app, /renderCategoryEditor\(\{[\s\S]*?translate/);
  for (const source of [list, editor]) {
    assert.doesNotMatch(source, /locales\/|ENGLISH_MESSAGES|createTranslator|resolveLocale/);
  }
  assert.match(list, /const messages = createCategoryListMessages\(translate\)/);
  assert.match(editor, /const messages = createCategoryEditorMessages\(translate\)/);
});

test('category shell keeps dynamic data in escaped, text, property, or attribute sinks', () => {
  const list = read('src/ui/categoryList.js');
  const editor = read('src/ui/categoryEditor.js');

  assert.match(list, /item\.setAttribute\('aria-label', messages\.selectionAccessible/);
  assert.match(list, /item\.title = messages\.selectionTooltip/);
  assert.match(list, /escapeHtml\(displayName\)/);
  assert.match(list, /escapeHtml\(subtitle\)/);
  assert.match(editor, /escapeHtml\(cat\.Name \|\| messages\.unnamed\)/);
  assert.match(editor, /title\.textContent = cat\.Name \|\| messages\.unnamed/);
  assert.match(editor, /strong\.textContent = part\.value/);
  assert.match(editor, /escapeHtml\(JSON\.stringify\(cat, null, 2\)\)/);
  assert.match(editor, /copy\.Name = \(copy\.Name \|\| 'Category'\) \+ ' Copy'/);
});
