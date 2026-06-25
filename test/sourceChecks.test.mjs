import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../', import.meta.url);

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), 'utf8');
}

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(new URL(dir, root), { withFileTypes: true })) {
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (entry.isFile() && rel.endsWith('.js')) out.push(rel);
  }
  return out;
}

test('HTML/template source does not contain duplicate class attributes on one tag', () => {
  const files = ['index.html', ...sourceFiles('src')];
  const duplicateClassTag = /<[^>]*\bclass\s*=\s*['"][^'"]*['"][^>]*\bclass\s*=\s*['"]/i;

  for (const file of files) {
    assert.doesNotMatch(read(file), duplicateClassTag, `${file} has duplicate class attributes in one tag`);
  }
});

test('help and appearance preferences stay source-consistent', () => {
  const help = read('src/ui/helpModal.js');
  const appearance = read('src/ui/appearanceModal.js');

  assert.doesNotMatch(help, /checkbox style/i);
  assert.match(help, /themes? and (?:comfortable\/compact )?density/i);
  assert.match(appearance, /preferenceSelect\('themePreference', 'Theme'/);
  assert.match(appearance, /preferenceSelect\('densityPreference', 'Density'/);
});

test('key modal, help, pinned, and category issue status controls remain accessible', () => {
  const index = read('index.html');
  const list = read('src/ui/categoryList.js');

  assert.match(index, /id="showHelp"[^>]*aria-label="About \/ Help"/);
  assert.match(index, /class="modal"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(list, /aria-label="Pinned"/);
  assert.match(list, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.match(list, /class="[^"]*category-issue-badge[^"]*"[^>]*aria-label="\$\{escapeHtml\(issueLabel\)\}"/);
});

test('summary and focus CSS tokens remain in place', () => {
  const styles = read('styles.css');

  assert.match(styles, /--summary-content-height\s*:/);
  assert.match(styles, /--summary-padding-block\s*:/);
  assert.match(styles, /--badge-height\s*:/);
  assert.doesNotMatch(styles, /\.details-summary-title\s*{[^}]*--title-control-height/s);
  assert.match(styles, /summary:focus-visible/);
});
