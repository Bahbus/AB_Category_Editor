#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skippedDirs = new Set(['.git', 'node_modules']);
const staticImportPattern = /(?:import\s+(?:[^'";]+?\s+from\s*)?|export\s+[^'";]+?\s+from\s*)["'](\.{1,2}\/[^"']+)["']/g;
const moduleScriptPattern = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/g;
const failures = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) files.push(...walk(path));
      continue;
    }
    if (entry.isFile() && extname(entry.name) === '.js') files.push(path);
  }
  return files;
}

for (const file of walk(root)) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(staticImportPattern)) {
    const specifier = match[1];
    const target = normalize(resolve(dirname(file), specifier));
    if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) {
      failures.push(`${relative(root, file)} imports missing module ${specifier}`);
    }
  }
}

const indexHtml = join(root, 'index.html');
if (existsSync(indexHtml)) {
  const source = readFileSync(indexHtml, 'utf8');
  for (const match of source.matchAll(moduleScriptPattern)) {
    const specifier = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(specifier) || specifier.startsWith('//')) continue;
    const target = normalize(resolve(dirname(indexHtml), specifier));
    if (!target.startsWith(root) || !existsSync(target) || !statSync(target).isFile()) {
      failures.push(`index.html references missing module entrypoint ${specifier}`);
    }
  }
}

if (failures.length) {
  console.error('Missing relative JavaScript imports found:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('All static relative JavaScript imports resolve to existing files.');
