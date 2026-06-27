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


test('app imports import validation summary helpers it references', () => {
  const source = read('src/app.js');
  const importNames = source.match(/import \{(?<names>[\s\S]*?)\} from ['"]\.\/importValidationSummary\.js['"];/)?.groups.names
    .split(',')
    .map(name => name.trim())
    .filter(Boolean) ?? [];

  for (const helper of ['reviewableImportFindings']) {
    if (!new RegExp(`\\b${helper}\\b`).test(source)) continue;
    assert.ok(importNames.includes(helper), `src/app.js references ${helper} but does not import it from importValidationSummary.js`);
  }
});

test('importText does not keep an unused importSummary binding', () => {
  const source = read('src/app.js');
  assert.doesNotMatch(source, /const\s+importSummary\s*=/);
  assert.match(source, /applyValidatedConfig\(validation\);/);
});

test('generated description UI wiring stays safe and source-consistent', () => {
  const editor = read('src/ui/categoryEditor.js');
  const app = read('src/app.js');
  const styles = read('styles.css');

  assert.match(editor, /descriptionRow\.className = 'description-generate-row'/);
  assert.match(editor, /descriptionRow\.append\(descriptionInput, generateButton\)/);
  assert.match(styles, /\.description-generate-row\s*{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto;[\s\S]*?gap:\s*8px;[\s\S]*?align-items:\s*start;/);
  assert.match(styles, /@media \(max-width: 640px\)\s*{[\s\S]*?\.description-generate-row\s*{[\s\S]*?grid-template-columns:\s*1fr;/);
  assert.match(editor, /textInput\('Name',[\s\S]*onBlur: \(\) => maybeAutoGenerateDescription\('name changed'\)/);
  assert.doesNotMatch(editor, /textInput\('Name',[^;]*autoGenerate: 'name changed'/);
  assert.match(app, /renderCategoryEditor\(\{[\s\S]*copyTextToClipboard,/);
  assert.match(editor, /const ok = await copyTextToClipboard\(generated\);/);
  assert.doesNotMatch(editor, /navigator\.clipboard\?\.writeText\(generated\)/);
});

test('import and raw JSON paths do not auto-generate descriptions', () => {
  const app = read('src/app.js');
  const config = read('src/config.js');
  const validation = read('src/validation.js');
  const importTextBody = app.match(/async function importText\([^)]*\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  const rawApplyBody = app.match(/requireScopedEl\(wrap, '#applyRawFull'[\s\S]*?\.onclick = async \(\) => \{(?<body>[\s\S]*?)\n    \};/)?.groups.body ?? '';

  assert.doesNotMatch(importTextBody, /generateCategoryDescription/);
  assert.doesNotMatch(rawApplyBody, /generateCategoryDescription/);
  assert.doesNotMatch(config, /generateCategoryDescription/);
  assert.doesNotMatch(validation, /generateCategoryDescription/);
});


test('empty state startup actions use preset callbacks without owning import parsing', () => {
  const editor = read('src/ui/categoryEditor.js');
  assert.doesNotMatch(editor, /Start with <strong>Import\/Paste<\/strong> or <strong>Upload<\/strong>/);
  assert.match(editor, /Start with:/);
  assert.match(editor, /Load basic presets/);
  assert.match(editor, /Load advanced presets/);
  assert.doesNotMatch(editor, /Load presets based on SortaKinda/);
  assert.match(editor, /Import bundled basic preset categories/);
  assert.match(editor, /Import bundled advanced preset categories/);
  assert.match(editor, /Change appearance and other settings in Preferences\./);
  assert.match(editor, /Click \? for more information about this app\./);
  assert.match(editor, /loadBasicPresets/);
  assert.match(editor, /loadAdvancedPresets/);
  assert.doesNotMatch(editor, /BASIC_PRESET_BASE64|ADVANCED_PRESET_BASE64|SORTAKINDA_PRESET_BASE64|parseImportedText|validateConfig|importText/);
});

test('app owns bundled preset import through normal import path', () => {
  const app = read('src/app.js');
  assert.match(app, /import \{ PRESETS \} from '\.\/presets\.js';/);
  assert.match(app, /function loadPreset\(preset\) \{/);
  assert.match(app, /if \(!preset\?\.data\) \{/);
  assert.match(app, /Preset is not available\./);
  assert.match(app, /return importText\(preset\.data, preset\.sourceLabel \|\| 'Preset'\);/);
  assert.match(app, /function loadBasicPresets\(\)/);
  assert.match(app, /function loadAdvancedPresets\(\)/);
  assert.match(app, /preset => preset\.id === 'basic'/);
  assert.match(app, /preset => preset\.id === 'advanced'/);
  assert.match(app, /loadBasicPresets, loadAdvancedPresets,/);

  const presets = read('src/presets.js');
  assert.match(presets, /sourceLabel: 'Basic presets'/);
  assert.match(presets, /sourceLabel: 'Advanced presets'/);
});

test('static fallback empty state matches startup guidance', () => {
  const index = read('index.html');
  assert.doesNotMatch(index, /Start with Import\/Paste or Upload to load an existing AetherBags export, or add a category manually\./);
  assert.match(index, /Load basic presets/);
  assert.match(index, /Load advanced presets/);
  assert.match(index, /Change appearance and other settings in Preferences\./);
  assert.match(index, /Click \? for more information about this app\./);
});

test('range filter live edits use scheduled list rendering without full rerender', () => {
  const source = read('src/ui/categoryEditor.js');
  assert.match(source, /function createScheduledRenderList\(renderList\)/);
  assert.match(source, /const scheduleRenderList = createScheduledRenderList\(renderList\)/);
  assert.match(source, /rangeSliderControl\(filter\.label, obj, \(\) => \{[\s\S]*?scheduleRenderList\(\);[\s\S]*?\}, defaults\)/);
  const rangeBlock = source.match(/for \(const filter of RANGE_FILTERS\) \{(?<body>[\s\S]*?)\n  \}/)?.groups.body ?? '';
  assert.doesNotMatch(rangeBlock, /renderAll\(\)/);
});

test('accessibility polish remains wired in source', () => {
  assert.match(read('src/ui/categoryList.js'), /class="drag-handle"[^>]*aria-hidden="true"/);
  assert.match(read('src/ui/listEditor.js'), /setAttribute\('aria-label'/);
});

test('link buttons use concrete theme tokens', () => {
  const styles = read('styles.css');
  assert.match(styles, /\.link-button\s*\{[\s\S]*?color:\s*var\(--accent\)/);
  assert.match(styles, /\.link-button:focus-visible\s*\{[\s\S]*?outline:\s*2px solid var\(--accent\)/);
  assert.match(styles, /:root\[data-theme="high-contrast"\] \.link-button:focus-visible/);
  assert.doesNotMatch(styles, /\.link-button[\s\S]*?var\(--(?:link|focus),/);
});

test('responsive stacked app layout source rules stay in place', () => {
  const styles = read('styles.css');
  assert.match(styles, /@media \(max-width: 840px\)\s*{[\s\S]*?\.app\s*{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?grid-template-rows:\s*minmax\(240px, 40vh\) minmax\(0, 1fr\);/);
  assert.match(styles, /@media \(max-width: 840px\)\s*{[\s\S]*?\.sidebar\s*{[^}]*border-right:\s*0;[^}]*border-bottom:\s*1px solid var\(--border\);/);
  assert.doesNotMatch(styles, /@media \(max-width: 840px\)\s*{[\s\S]*?html, body\s*{[^}]*overflow:\s*auto;/);
});

test('modal open and close keeps background app inert and aria-hidden only while active', () => {
  const modals = read('src/modals.js');
  assert.match(modals, /document\.querySelector\('\.app'\)/);
  assert.match(modals, /\.inert\s*=\s*true/);
  assert.match(modals, /setAttribute\('aria-hidden', 'true'\)/);
  assert.match(modals, /\.inert\s*=\s*false/);
  assert.match(modals, /removeAttribute\('aria-hidden'\)/);
  const openBody = modals.match(/export function openModal\([^)]*\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  assert.ok(
    openBody.indexOf('focusTarget.focus()') !== -1
      && openBody.indexOf('setAppModalInert()') > openBody.indexOf('focusTarget.focus()'),
    'openModal should request modal focus before making the app inert/aria-hidden'
  );
  const closeBody = modals.match(/export function closeModal\(\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  assert.match(closeBody, /restoreAppModalInert\(\)/);
});

test('package scripts include test and combined check commands', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts?.test, 'node --test');
  assert.ok(pkg.scripts?.check);
  assert.match(pkg.scripts.check, /node --check src\/app\.js/);
  assert.match(pkg.scripts.check, /node scripts\/check-imports\.mjs/);
  assert.match(pkg.scripts.check, /node --test/);
});

test('pure import validation helper tests import the pure helper module instead of app', () => {
  assert.doesNotMatch(read('test/importModalRules.test.mjs'), /from ['"]\.\.\/src\/app\.js['"]|import\(['"]\.\.\/src\/app\.js['"]\)/);
  assert.match(read('test/importModalRules.test.mjs'), /from ['"]\.\.\/src\/importValidationSummary\.js['"]/);
});

test('state filter changes schedule list rendering without full render', () => {
  const source = read('src/ui/categoryEditor.js');
  const body = source.match(/function renderStateFilterCard\(filterName, obj\) \{(?<body>[\s\S]*?)\n    return box;/)?.groups.body ?? '';
  assert.match(body, /scheduleRenderList\(\)/);
  assert.doesNotMatch(body, /renderAll\(\)/);
});

test('list editor lookup retry uses useful lookup-name semantics', () => {
  const source = read('src/ui/listEditor.js');
  assert.match(source, /import \{[^}]*\bisUsefulLookupName\b[^}]*\} from ['"]\.\.\/lookupNames\.js['"]/);
  assert.match(source, /const\s+missing\s*=\s*ids\.filter\(id\s*=>\s*!isUsefulLookupName\(lookupName\(lookupSheet,\s*id\)\)\)/);
  assert.doesNotMatch(source, /const\s+missing\s*=\s*ids\.filter\(id\s*=>\s*!lookupName\(lookupSheet,\s*id\)\)/);
});

test('compact density does not enlarge list editor pill sizing', () => {
  const styles = read('styles.css');
  assert.match(styles, /Compact mode must not enlarge list editor pills/);
  assert.match(styles, /--pill-font-size\s*:\s*12px;/);
  assert.match(styles, /--pill-padding-block\s*:\s*4px;/);
  assert.match(styles, /--pill-padding-inline\s*:\s*8px;/);
  assert.match(styles, /--pill-remove-size\s*:\s*16px;/);
  assert.match(styles, /\.pill\s*{(?=[\s\S]*?font-size:\s*var\(--pill-font-size\);)(?=[\s\S]*?padding:\s*var\(--pill-padding-block\)\s+var\(--pill-padding-inline\);)[\s\S]*?line-height:\s*1\.2;/);
  assert.match(styles, /\.pill button\s*{[\s\S]*?width:\s*var\(--pill-remove-size\);[\s\S]*?height:\s*var\(--pill-remove-size\);[\s\S]*?min-height:\s*0;/);
  assert.match(styles, /:root\[data-density="compact"\]\s+\.pill\s*{[\s\S]*?font-size:\s*var\(--pill-font-size\);[\s\S]*?padding:\s*var\(--pill-padding-block\)\s+var\(--pill-padding-inline\);[\s\S]*?min-height:\s*0;/);
  assert.match(styles, /:root\[data-density="compact"\]\s+\.pill button\s*{[\s\S]*?width:\s*var\(--pill-remove-size\);[\s\S]*?height:\s*var\(--pill-remove-size\);[\s\S]*?padding:\s*0;/);
});

test('modal requestAnimationFrame work is guarded against fast close', () => {
  const source = read('src/modals.js');
  assert.match(source, /let\s+modalVersion\s*=\s*0/);
  assert.match(source, /const\s+version\s*=\s*\+\+modalVersion/);
  assert.match(source, /requestAnimationFrame\(\(\)\s*=>\s*{[\s\S]*?version\s*!==\s*modalVersion[\s\S]*?classList\.contains\('hidden'\)[\s\S]*?return;/);
  assert.match(source, /export function closeModal\(\) \{\n\s*modalVersion\+\+/);
});

test('legacy import summary and appearance modal alias stay retired', () => {
  const app = read('src/app.js');
  const config = read('src/config.js');
  const preferences = read('src/ui/preferencesModal.js');
  assert.doesNotMatch(config, /buildImportSummary/);
  assert.doesNotMatch(config, /summary:\s*buildImportSummary|\bsummary\b/);
  assert.match(config, /Mutates obj in place:/);
  assert.match(app, /function applyValidatedConfig\(validation\) \{ data = validation\.config; \}/);
  assert.doesNotMatch(preferences, /showAppearanceModal/);
});
