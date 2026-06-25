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
  const preferences = read('src/ui/preferencesModal.js');

  assert.doesNotMatch(help, /checkbox style/i);
  assert.match(help, /themes? and (?:comfortable\/compact )?density/i);
  assert.match(preferences, /preferenceSelect\('themePreference', 'Theme'/);
  assert.match(preferences, /preferenceSelect\('densityPreference', 'Density'/);
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


function importFromConstants(source) {
  return source.match(/import \{(?<names>[^}]+)\} from ['"]\.\.\/constants\.js['"];/)?.groups.names
    .split(',')
    .map(name => name.trim())
    .filter(Boolean) ?? [];
}

test('category editor imports shared state filter keys when referenced', () => {
  const source = read('src/ui/categoryEditor.js');
  if (!/\bSTATE_FILTER_KEYS\b/.test(source)) return;
  assert.ok(importFromConstants(source).includes('STATE_FILTER_KEYS'), 'categoryEditor.js references STATE_FILTER_KEYS but does not import it from constants.js');
});

test('range filter key references are imported or locally declared', () => {
  for (const file of sourceFiles('src')) {
    const source = read(file);
    if (!/\bRANGE_FILTER_KEYS\b/.test(source)) continue;
    const importsRangeKeys = /import \{[^}]*\bRANGE_FILTER_KEYS\b[^}]*\} from ['"][^'"]*constants\.js['"];/.test(source);
    const declaresRangeKeys = /\b(?:const|let|var)\s+RANGE_FILTER_KEYS\b/.test(source);
    assert.ok(importsRangeKeys || declaresRangeKeys, `${file} references RANGE_FILTER_KEYS without importing or declaring it`);
  }
});

test('allowed rarity checkbox changes refresh validation and category list without full render', () => {
  const source = read('src/ui/categoryEditor.js');
  assert.match(source, /onValidationChanged = \(\) => \{\}/);
  assert.match(source, /onValidationChanged\(\);/);
  assert.match(source, /renderAllowedRaritiesEditor\(cat, \{ \.\.\.deps, onValidationChanged: \(\) => \{ updateValidationUi\(\);[\s\S]*?renderList\(\); \} \}\)/);
  const rarityEditorBody = source.match(/function renderAllowedRaritiesEditor\(cat, deps\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  assert.doesNotMatch(rarityEditorBody, /renderAll\(\)/);
});

test('importText does not keep an unused importSummary binding', () => {
  const source = read('src/app.js');
  assert.doesNotMatch(source, /const\s+importSummary\s*=/);
  assert.match(source, /applyValidatedConfig\(validation\);/);
});
