import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);

export function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), 'utf8');
}

export function sourceFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(new URL(dir, root), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relativePath = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(relativePath));
    else if (entry.isFile() && /\.(?:js|mjs)$/.test(relativePath)) out.push(relativePath);
  }
  return out;
}
