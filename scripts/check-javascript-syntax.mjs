#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const skippedDirectories = new Set(['.git', 'node_modules']);

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function portableRelativePath(root, file) {
  return relative(root, file).split(sep).join('/');
}

export function discoverJavaScriptFiles(root = repositoryRoot) {
  const files = [];

  function walk(directory) {
    const entries = readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!skippedDirectories.has(entry.name)) walk(path);
        continue;
      }

      if (entry.isFile() && ['.js', '.mjs'].includes(extname(entry.name))) files.push(path);
    }
  }

  walk(root);
  return files.sort((left, right) => {
    const leftPath = portableRelativePath(root, left);
    const rightPath = portableRelativePath(root, right);
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
}

export function runJavaScriptSyntaxCheck({
  root = repositoryRoot,
  nodeExecutable = process.execPath,
  spawn = spawnSync,
  stdio = 'inherit',
  log = console.log,
  error = console.error,
} = {}) {
  const files = discoverJavaScriptFiles(root);
  const failedFiles = [];

  for (const file of files) {
    const result = spawn(nodeExecutable, ['--check', file], { stdio });
    if (result.error) {
      error(`Could not syntax-check ${portableRelativePath(root, file)}: ${result.error.message}`);
      failedFiles.push(file);
      continue;
    }
    if (result.status !== 0) failedFiles.push(file);
  }

  if (failedFiles.length > 0) {
    error(`JavaScript syntax check failed for ${failedFiles.length} of ${files.length} files.`);
    return { ok: false, files, failedFiles };
  }

  log(`JavaScript syntax check passed: ${files.length} files checked.`);
  return { ok: true, files, failedFiles };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const result = runJavaScriptSyntaxCheck();
  if (!result.ok) process.exitCode = 1;
}
