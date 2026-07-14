import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyStoredPattern,
  compileBrowserPattern,
  removeSavedPatternAtSourceIndex,
  selectUsableSavedPatterns
} from '../src/patternSemantics.js';

test('stored patterns accept nonblank .NET-only syntax without JavaScript validation', () => {
  assert.deepEqual(classifyStoredPattern('(?>a)'), { usable: true, reason: null });
});

test('stored pattern classification rejects non-strings and blank strings structurally', () => {
  assert.deepEqual(classifyStoredPattern(42), { usable: false, reason: 'non-string' });
  assert.deepEqual(classifyStoredPattern(''), { usable: false, reason: 'blank' });
  assert.deepEqual(classifyStoredPattern(' \t '), { usable: false, reason: 'blank' });
});

test('browser compilation rejects blank patterns before scanning', () => {
  assert.equal(compileBrowserPattern('   ').status, 'blank');
});

test('.NET-only patterns report browser incompatibility instead of stored-pattern invalidity', () => {
  const result = compileBrowserPattern('(?>a)');
  assert.equal(result.status, 'incompatible');
  assert.equal(result.regex, null);
});

test('browser-compatible patterns compile with fixed case-insensitive behavior', () => {
  const result = compileBrowserPattern('^augmented');
  assert.equal(result.status, 'compatible');
  assert.equal(result.regex.ignoreCase, true);
  assert.equal(result.regex.flags, 'i');
  assert.equal(result.regex.test('Augmented item'), true);
});

test('usable saved choices retain original indices when invalid entries are filtered', () => {
  const source = [null, '   ', '(?>a)', 7, '^Foo, Bar$'];
  const selection = selectUsableSavedPatterns(source);
  assert.deepEqual(selection.options, [
    { pattern: '(?>a)', sourceIndex: 2 },
    { pattern: '^Foo, Bar$', sourceIndex: 4 }
  ]);
  assert.equal(selection.omittedCount, 3);
  assert.deepEqual(source, [null, '   ', '(?>a)', 7, '^Foo, Bar$']);
});

test('optional removal uses the saved choice original source index', () => {
  const source = [null, '(?>a)', ' ', '^Foo$'];
  const { options } = selectUsableSavedPatterns(source);
  const selected = options[1];

  assert.equal(selected.sourceIndex, 3);
  assert.equal(removeSavedPatternAtSourceIndex(source, selected.sourceIndex), true);
  assert.deepEqual(source, [null, '(?>a)', ' ']);
});
