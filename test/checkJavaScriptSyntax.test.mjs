import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

import {
  discoverJavaScriptFiles,
  runJavaScriptSyntaxCheck,
} from '../scripts/check-javascript-syntax.mjs';

function withTemporaryRepository(callback) {
  const root = mkdtempSync(join(tmpdir(), 'ab-category-editor-syntax-'));
  try {
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeFixture(root, path, source = 'export const valid = true;\n') {
  const file = join(root, path);
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, source);
}

function portablePaths(root, files) {
  return files.map((file) => relative(root, file).split(sep).join('/'));
}

test('discovers nested JavaScript in deterministic order and skips excluded entries', () => {
  withTemporaryRepository((root) => {
    writeFixture(root, 'z-last.js');
    writeFixture(root, 'nested/deeper/c.mjs');
    writeFixture(root, 'nested/b.js');
    writeFixture(root, 'a-first.mjs');
    writeFixture(root, '.git/ignored.js');
    writeFixture(root, 'node_modules/ignored.mjs');
    writeFixture(root, 'nested/not-javascript.json', '{}\n');
    symlinkSync(join(root, 'nested'), join(root, 'linked-directory'), 'dir');

    assert.deepEqual(portablePaths(root, discoverJavaScriptFiles(root)), [
      'a-first.mjs',
      'nested/b.js',
      'nested/deeper/c.mjs',
      'z-last.js',
    ]);
  });
});

test('valid files succeed and invalid JavaScript produces a failed result', () => {
  withTemporaryRepository((root) => {
    writeFixture(root, 'valid.js');
    writeFixture(root, 'nested/valid.mjs', 'export default function valid() {}\n');

    const successMessages = [];
    const validResult = runJavaScriptSyntaxCheck({
      root,
      stdio: 'pipe',
      log: (message) => successMessages.push(message),
      error: (message) => successMessages.push(message),
    });

    assert.equal(validResult.ok, true);
    assert.equal(validResult.files.length, 2);
    assert.deepEqual(successMessages, ['JavaScript syntax check passed: 2 files checked.']);

    writeFixture(root, 'invalid.js', 'function broken( {\n');
    const failureMessages = [];
    const invalidResult = runJavaScriptSyntaxCheck({
      root,
      stdio: 'pipe',
      log: (message) => failureMessages.push(message),
      error: (message) => failureMessages.push(message),
    });

    assert.equal(invalidResult.ok, false);
    assert.deepEqual(portablePaths(root, invalidResult.failedFiles), ['invalid.js']);
    assert.deepEqual(failureMessages, ['JavaScript syntax check failed for 1 of 3 files.']);
  });
});
