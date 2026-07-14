import test from 'node:test';
import assert from 'node:assert/strict';

import { tokenizeListInput } from '../src/ui/listEditor.js';

test('list input tokenization splits and trims comma-separated values by default', () => {
  assert.deepEqual(tokenizeListInput('1, 2, 3'), ['1', '2', '3']);
});

test('list input tokenization preserves comma-bearing patterns when splitting is disabled', () => {
  assert.deepEqual(tokenizeListInput('^A{1,3}$', false), ['^A{1,3}$']);
  assert.deepEqual(tokenizeListInput('^Foo, Bar$', false), ['^Foo, Bar$']);
});

test('list input tokenization treats blank input as a no-op', () => {
  assert.deepEqual(tokenizeListInput('   '), []);
  assert.deepEqual(tokenizeListInput('\t\n', false), []);
});

test('list input tokenization trims surrounding whitespace without changing internal commas', () => {
  assert.deepEqual(tokenizeListInput('  ^Foo, Bar$  ', false), ['^Foo, Bar$']);
});
