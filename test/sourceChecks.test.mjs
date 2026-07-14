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

test('full Raw JSON wires its summary to the validated candidate', () => {
  const source = read('src/app.js');
  const rawApplyStart = source.indexOf("requireScopedEl(wrap, '#applyRawFull'");
  const rawApplyEnd = source.indexOf("requireScopedEl(wrap, '#copyRawFull'", rawApplyStart);
  const rawApplySource = source.slice(rawApplyStart, rawApplyEnd);
  assert.match(rawApplySource, /configValidationSummaryText\(validation\.config, rawAnalysis, validation\.repairs \|\| \[\]\)/);
  assert.doesNotMatch(rawApplySource, /validationSummaryText\(getCategories\(\)\.length/);
});

test('importText does not keep an unused importSummary binding', () => {
  const source = read('src/app.js');
  assert.doesNotMatch(source, /const\s+importSummary\s*=/);
  assert.match(source, /applyValidatedConfig\(validation\);/);
  assert.match(source, /function loadPreset\(preset\)[\s\S]*?return importText\(preset\.data, preset\.sourceLabel \|\| 'Preset'\);/);
  assert.match(source, /bindChange\('fileInput',[\s\S]*?await importText\(await file\.text\(\), file\.name\);/);
  assert.match(source, /if \(!\(await importText\(text, ''\)\)\)/);
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
  assert.match(editor, /return applyGeneratedDescriptionChange\(cat, text, \(\) => \{/);
  assert.match(editor, /if \(cat\.Description === generated\) setStatus\('Description already matches the generated text\.', 'ok'\);[\s\S]*?else if \(!String\(cat\.Description \|\| ''\)\.trim\(\)\) applyGeneratedDescription\(generated\);[\s\S]*?else showGenerateDescriptionConfirmation\(generated\);/);
  assert.match(editor, /replaceGeneratedDescription[\s\S]*?if \(!applyGeneratedDescription\(generated\)\) setStatus\('Description already matches the generated text\.', 'ok'\);/);
  assert.match(editor, /if \(!isUsefulGeneratedDescription\(generated\)\) return false;[\s\S]*?return applyGeneratedDescription\(generated\);/);
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

test('category drops trust only valid application-owned drag state', () => {
  const source = read('src/ui/categoryList.js');
  const dragOver = source.match(/item\.ondragover = ev => \{(?<body>[\s\S]*?)\n    \};/)?.groups.body ?? '';
  const drop = source.match(/item\.ondrop = ev => \{(?<body>[\s\S]*?)\n    \};/)?.groups.body ?? '';
  assert.match(dragOver, /const from = getDraggedIndex\(\);[\s\S]*Number\.isFinite\(from\)[\s\S]*Number\.isInteger\(from\)[\s\S]*ev\.preventDefault\(\)/);
  assert.match(drop, /const from = getDraggedIndex\(\);[\s\S]*Number\.isFinite\(from\)[\s\S]*Number\.isInteger\(from\)[\s\S]*ev\.preventDefault\(\)/);
  assert.doesNotMatch(drop, /dataTransfer|getData|text\/plain|Number\(/);
  assert.match(drop, /setDraggedIndex\(null\);[\s\S]*clearDragClasses\(\);[\s\S]*moveCategory/);
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

test('package scripts include test and exhaustive combined check commands', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts?.test, 'node --test');
  assert.ok(pkg.scripts?.check);
  assert.match(pkg.scripts.check, /node scripts\/check-javascript-syntax\.mjs/);
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

test('regex add matched IDs does not dirty or say Added 0 when nothing changed', () => {
  const source = read('src/tools/regexToItemIds.js');
  const addHandler = source.match(/addButton\.onclick = \(\) => \{(?<body>[\s\S]*?)\n  \};/)?.groups.body ?? '';

  assert.match(addHandler, /let\s+removedPattern\s*=\s*false/);
  assert.match(addHandler, /removedPattern\s*=\s*removeSavedPatternAtSourceIndex/);
  assert.match(addHandler, /if\s*\(\s*!added\s*&&\s*!removedPattern\s*\)/);
  assert.match(addHandler, /No new item IDs added; all matches were already present\./);

  const noChangeIndex = addHandler.search(/if\s*\(\s*!added\s*&&\s*!removedPattern\s*\)/);
  const markDirtyIndex = addHandler.indexOf('markDirty()');

  assert.ok(noChangeIndex !== -1);
  assert.ok(markDirtyIndex !== -1);
  assert.ok(markDirtyIndex > noChangeIndex, 'markDirty should happen only after no-change branch returns');

  assert.doesNotMatch(addHandler, /setStatus\(`Added \$\{added\} item ID\(s\)\.`, 'ok'\)/);
  assert.match(addHandler, /Added \$\{added\} item ID\(s\) and removed selected regex filter\./);
  assert.match(addHandler, /Added \$\{added\} item ID\(s\)\./);
  assert.match(addHandler, /Removed selected regex filter\./);
});

test('number input blank blur restores previous value instead of committing zero', () => {
  const source = read('src/ui/formControls.js');
  const numberBlock = source.match(/export function numberInput[\s\S]*?\n\}\n\nexport function textInput/)?.[0] ?? '';
  const blurBlock = numberBlock.match(/input\.onblur = e => \{(?<body>[\s\S]*?)\n  \};/)?.groups.body ?? '';

  assert.match(blurBlock, /String\(e\.target\.value\)\.trim\(\) === ''/);
  assert.match(blurBlock, /restoreCommittedValue\(\);/);
  assert.match(numberBlock, /options\.validate\(committed\.jsonValue\)/);

  const blankIndex = blurBlock.indexOf("String(e.target.value).trim() === ''");
  const commitIndex = blurBlock.indexOf('commitInput(e.target.value, { min, max })');
  assert.ok(blankIndex !== -1);
  assert.ok(commitIndex !== -1);
  assert.ok(blankIndex < commitIndex, 'blank restore should run before commitValue');
});

test('range number blank blur restores previous value instead of committing zero', () => {
  const source = read('src/ui/formControls.js');
  const rangeCommitBlock = source.match(/function commitNumber\(key, input\) \{(?<body>[\s\S]*?)\n  \}\n  function commitFiniteNumberInput/)?.groups.body ?? '';

  assert.match(source, /if \(text\.trim\(\) === ''\) return \{ valid: false, changed: false, value: storedValue \};/);
  assert.match(rangeCommitBlock, /decideRangeInputChange\(rangeObj\[key\], input\.value, valueOptions\)/);
  assert.match(rangeCommitBlock, /input\.value = String\(rangeObj\[key\]\);/);
  assert.match(rangeCommitBlock, /syncValidity\(\);/);
  const invalidIndex = rangeCommitBlock.indexOf('if (!decision.valid)');
  const restoreIndex = rangeCommitBlock.indexOf('input.value = String(rangeObj[key])');
  const applyIndex = rangeCommitBlock.indexOf('applyRangeValueChange(rangeObj, key, decision.value, onChange, valueOptions)');
  assert.ok(invalidIndex !== -1 && restoreIndex > invalidIndex && applyIndex > restoreIndex);
});

test('typed list add reports partial duplicate skips without changing all-duplicate behavior', () => {
  const source = read('src/ui/listEditor.js');
  const addHandler = source.match(/add\.onclick = \(\) => \{(?<body>[\s\S]*?)\n  \};/)?.groups.body ?? '';

  assert.match(addHandler, /let\s+skippedDuplicates\s*=\s*0/);
  assert.match(addHandler, /skippedDuplicates\+\+/);
  assert.match(addHandler, /No new values added; all were already present\./);
  assert.match(addHandler, /if\s*\(skippedDuplicates\)/);
  assert.match(addHandler, /Added \$\{added\} value\(s\); skipped \$\{skippedDuplicates\} duplicate\(s\)\./);
});

test('raw category JSON delegates atomic normalization and replacement to the change helper', () => {
  const source = read('src/ui/categoryEditor.js');
  const handler = source.match(/el\('applyRawCategory'\)\.onclick = \(\) => \{(?<body>[\s\S]*?)\n  \};/)?.groups.body ?? '';

  assert.match(handler, /const candidate = JSON\.parse\(el\('rawCategory'\)\.value\);/);
  assert.match(handler, /applySelectedCategoryCandidate\(\{ categories: cats, selectedIndex, candidate, normalize: ensureShape/);
  assert.match(handler, /if \(!changed\) setStatus\('There are no category changes to apply\.', 'ok'\);/);
  assert.match(handler, /setStatus\('Invalid category JSON: ' \+ err\.message, 'err'\);/);
  assert.doesNotMatch(handler, /cats\[selectedIndex\] = parsed;/);
  assert.doesNotMatch(handler, /commitActiveField\(\)/);

  assert.doesNotMatch(handler, /cats\[selectedIndex\] = candidate/);
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
  assert.match(app, /function applyValidatedConfig\(validation\) \{[\s\S]*?applyConfigReplacement\(data, validation\.config,[\s\S]*?data = candidate;[\s\S]*?advanceDataRevision\(\);/);
  assert.doesNotMatch(preferences, /showAppearanceModal/);
});

test('manual lookup search normalizes row IDs and avoids unnamed cache placeholders', () => {
  const source = read('src/ui/listEditor.js');

  assert.match(source, /import \{[^}]*\browId\b[^}]*\browName\b[^}]*\} from ['"]\.\.\/xivapi\.js['"];/);
  assert.match(source, /import \{ normalizeRowIdValue \} from ['"]\.\.\/rowIds\.js['"];/);
  assert.match(source, /const\s+id\s*=\s*normalizeRowIdValue\(rowId\(result\)\)/);
  assert.match(source, /if \(id === null\) continue;/);
  assert.match(source, /const\s+name\s*=\s*rowName\(result\)/);
  assert.match(source, /const\s+displayName\s*=\s*isUsefulLookupName\(name\) \? name : '\(name unavailable\)'/);
  assert.match(source, /if \(isUsefulLookupName\(name\)\) \{[\s\S]*cache\[String\(id\)\] = name;[\s\S]*saveLookupCache\(\);[\s\S]*\}/);
  assert.match(source, /arr\.some\(value => normalizeRowIdValue\(value\) === id\)/);
  assert.match(source, /arr\.push\(id\)/);
  assert.doesNotMatch(source, /arr\.push\(rowId\(result\)\)/);
  assert.doesNotMatch(source, /const\s+name\s*=\s*result\.fields\?\.Name\s*\|\|\s*'\(unnamed\)'/);
});

test('manual lookup search reports no usable rendered results separately', () => {
  const source = read('src/ui/listEditor.js');

  assert.match(source, /let\s+rendered\s*=\s*0;/);
  assert.match(source, /resultsBox\.appendChild\(r\);\s*rendered\+\+;/);
  assert.match(source, /if \(!rendered\) \{[\s\S]*No usable results with valid row IDs\.[\s\S]*setStatus\('No usable search results with valid row IDs\.'\);[\s\S]*return;[\s\S]*\}/);
  assert.match(source, /if \(!results\.length\) \{[\s\S]*No results\.[\s\S]*return;[\s\S]*\}/);
  assert.match(source, /if \(!rendered\)[\s\S]*setStatus\(`Search complete`, 'ok'\)/);
});


test('manual lookup search result Add buttons have contextual accessible labels', () => {
  const source = read('src/ui/listEditor.js');
  const lookupRowBody = source.match(/const r = document\.createElement\('div'\);(?<body>[\s\S]*?)resultsBox\.appendChild\(r\);/)?.groups.body ?? '';

  assert.match(lookupRowBody, /<button class="small">Add<\/button>/);
  assert.match(lookupRowBody, /const\s+addButton\s*=\s*r\.querySelector\('button'\)/);
  assert.match(lookupRowBody, /addButton\.setAttribute\('aria-label'/);
  assert.match(lookupRowBody, /addButton\.title\s*=/);
  for (const token of ['displayName', 'id', 'title']) {
    assert.match(lookupRowBody, new RegExp(String.raw`\b${token}\b`));
  }
  assert.doesNotMatch(lookupRowBody, /r\.querySelector\('button'\)\.onclick/);
});

test('numeric list editors use strict row-ID dedupe without deduping name patterns', () => {
  const listEditor = read('src/ui/listEditor.js');
  const categoryEditor = read('src/ui/categoryEditor.js');

  assert.match(listEditor, /dedupeValues\s*=\s*false/);
  assert.match(listEditor, /dedupeKey\s*=\s*value\s*=>\s*value/);
  assert.match(listEditor, /if \(dedupeValues\)/);

  const uiStart = categoryEditor.indexOf("listEditor('Allowed UI Category IDs'");
  const itemStart = categoryEditor.indexOf("listEditor('Allowed Item IDs'", uiStart);
  const patternsAppend = categoryEditor.indexOf('patternsCard,', itemStart);
  const patternStart = categoryEditor.indexOf("const patternsCard = listEditor('Allowed Item Name Patterns'");
  const converterStart = categoryEditor.indexOf('const converterButton', patternStart);
  const uiCall = categoryEditor.slice(uiStart, itemStart);
  const itemCall = categoryEditor.slice(itemStart, patternsAppend);
  const patternCall = categoryEditor.slice(patternStart, converterStart);

  assert.match(uiCall, /dedupeValues:\s*true/);
  assert.match(categoryEditor, /import \{ normalizeRowIdValue \} from ['"]\.\.\/rowIds\.js['"];/);
  assert.match(uiCall, /dedupeKey:\s*normalizeRowIdValue/);
  assert.match(itemCall, /dedupeValues:\s*true/);
  assert.match(itemCall, /dedupeKey:\s*normalizeRowIdValue/);
  assert.doesNotMatch(patternCall, /dedupeValues:\s*true/);
  assert.doesNotMatch(patternCall, /dedupeKey:\s*normalizeRowIdValue/);
});

test('name-pattern entry preserves commas while numeric ID editors retain comma-separated input', () => {
  const listEditor = read('src/ui/listEditor.js');
  const categoryEditor = read('src/ui/categoryEditor.js');
  const addHandler = listEditor.match(/add\.onclick = \(\) => \{(?<body>[\s\S]*?)\n  \};/)?.groups.body ?? '';

  assert.match(listEditor, /splitInputOnCommas\s*=\s*true/);
  assert.match(listEditor, /inputPlaceholder\s*=\s*'Add one value, or comma-separated values'/);
  assert.match(listEditor, /tokenizeListInput\(raw, splitInputOnCommas\)/);

  const uiStart = categoryEditor.indexOf("listEditor('Allowed UI Category IDs'");
  const itemStart = categoryEditor.indexOf("listEditor('Allowed Item IDs'", uiStart);
  const patternsAppend = categoryEditor.indexOf('patternsCard,', itemStart);
  const patternStart = categoryEditor.indexOf("const patternsCard = listEditor('Allowed Item Name Patterns'");
  const converterStart = categoryEditor.indexOf('const converterButton', patternStart);
  const uiCall = categoryEditor.slice(uiStart, itemStart);
  const itemCall = categoryEditor.slice(itemStart, patternsAppend);
  const patternCall = categoryEditor.slice(patternStart, converterStart);

  assert.doesNotMatch(uiCall, /splitInputOnCommas:\s*false/);
  assert.doesNotMatch(itemCall, /splitInputOnCommas:\s*false/);
  assert.doesNotMatch(uiCall, /inputPlaceholder:/);
  assert.doesNotMatch(itemCall, /inputPlaceholder:/);
  assert.match(patternCall, /splitInputOnCommas:\s*false/);
  assert.match(patternCall, /inputPlaceholder:\s*'Add one regex\/name pattern'/);
  assert.match(patternCall, /validateValue:\s*validateRegexPattern/);
  assert.match(addHandler, /if \(findingList\.some\(item => item\.severity === 'error'\)\) \{\s*renderValidation\(findingList\);\s*return;/);
  assert.ok(addHandler.indexOf('renderValidation(findingList)') < addHandler.indexOf('arr.push(part)'));
  assert.ok(addHandler.indexOf('renderValidation(findingList)') < addHandler.indexOf("input.value = ''"));
});

test('regex converter action is composed into the name-pattern list row', () => {
  const categoryEditor = read('src/ui/categoryEditor.js');
  const styles = read('styles.css');

  assert.match(categoryEditor, /const patternsCard = listEditor\('Allowed Item Name Patterns'/);
  assert.match(categoryEditor, /converterButton\.type = 'button'/);
  assert.match(categoryEditor, /converterButton\.textContent = 'Convert patterns to Item IDs'/);
  assert.match(categoryEditor, /converterButton\.className = 'pattern-converter-action'/);
  assert.match(categoryEditor, /converterButton\.onclick = openRegexToItemIdsTool/);
  assert.match(categoryEditor, /requireScopedEl\(patternsCard, '\.list-editor-row', 'name patterns'\)\.appendChild\(converterButton\)/);
  assert.match(categoryEditor, /ruleGrid\.append\([\s\S]*?patternsCard,[\s\S]*?renderAllowedRaritiesEditor/);
  assert.doesNotMatch(categoryEditor, /<h3>Regex → Item IDs<\/h3>/);
  assert.doesNotMatch(categoryEditor, /id="openRegexToItemIds"/);
  assert.match(styles, /\.pattern-converter-action\s*\{[\s\S]*?margin-left:\s*auto;[\s\S]*?max-width:\s*100%;[\s\S]*?white-space:\s*normal;/);
});

test('regex converter distinguishes AetherBags storage from fixed JavaScript compatibility', () => {
  const converter = read('src/tools/regexToItemIds.js');
  const semantics = read('src/patternSemantics.js');
  const runBody = converter.match(/runButton\.onclick = async \(\) => \{(?<body>[\s\S]*?)\n  \};\n\n  addButton\.onclick/)?.groups.body ?? '';

  assert.doesNotMatch(converter, /regexFlags|Regex flags/);
  assert.match(semantics, /new RegExp\(pattern, 'i'\)/);
  assert.match(converter, /case-insensitive, culture-invariant \.NET regex/);
  assert.match(converter, /fixed case-insensitive JavaScript regex/);
  assert.match(converter, /valid AetherBags patterns cannot be scanned here/);
  assert.match(converter, /AetherBags\/\.NET pattern cannot be scanned by the browser converter/);

  const compileIndex = runBody.indexOf('compileBrowserPattern(input.value)');
  assert.ok(compileIndex >= 0);
  for (const laterWork of [
    'matches = []',
    'acquireLookupCacheProducer()',
    "showBusy('Scanning items'",
    'fetchItemRowsPage(',
    'lookupCache.Item'
  ]) {
    assert.ok(compileIndex < runBody.indexOf(laterWork), `compatibility decision must precede ${laterWork}`);
  }
  assert.match(runBody, /compilation\.status === 'blank'[\s\S]*?return;/);
  assert.match(runBody, /compilation\.status === 'incompatible'[\s\S]*?return;/);
});

test('regex converter filters saved choices while preserving removal source indices', () => {
  const converter = read('src/tools/regexToItemIds.js');
  const semantics = read('src/patternSemantics.js');

  assert.match(converter, /selectUsableSavedPatterns\(patterns\)/);
  assert.match(converter, /\{ pattern, sourceIndex \}/);
  assert.match(converter, /option\.sourceIndex === Number\(select\.value\)/);
  assert.match(converter, /Correct them in Allowed Item Name Patterns or Raw JSON/);
  assert.match(converter, /removeSavedPatternAtSourceIndex\(cat\.Rules\.AllowedItemNamePatterns, sourceIndex\)/);
  assert.match(semantics, /values\.splice\(sourceIndex, 1\)/);
});

test('RGB blur restores committed values and only dirties actual component changes', () => {
  const source = read('src/ui/categoryEditor.js');
  const rgbBlock = source.match(/function makeRgbaNumber\(label, getValue, setValue\) \{(?<body>[\s\S]*?)\n  \}/)?.groups.body ?? '';

  assert.match(source, /export function normalizeRgbInputValue/);
  assert.match(rgbBlock, /let lastCommitted = getValue\(\);/);
  assert.match(rgbBlock, /if \(getValue\(\) === n\) return false;/);
  assert.match(rgbBlock, /const n = normalizeRgbInputValue\(e\.target\.value, lastCommitted\);/);
  assert.match(rgbBlock, /e\.target\.value = String\(n\);/);
  assert.match(rgbBlock, /markDirty\(\);\s*scheduleRenderList\(\);/);
});

test('add, duplicate, lookup Add, and regex add use safe numeric-ID and sort policies', () => {
  const app = read('src/app.js');
  const editor = read('src/ui/categoryEditor.js');
  const list = read('src/ui/listEditor.js');
  const regex = read('src/tools/regexToItemIds.js');

  assert.match(app, /nextCategorySortValue\(getCategories\(\)\) - 1/);
  assert.match(editor, /const nextSortValue = nextCategorySortValue\(cats\);/);
  assert.match(editor, /copy\.Order = nextSortValue;\s*copy\.Priority = nextSortValue;/);
  assert.match(list, /arr\.some\(value => normalizeRowIdValue\(value\) === id\)/);
  assert.match(regex, /new Set\(ids\.map\(normalizeRowIdValue\)\.filter\(id => id !== null\)\)/);
  assert.match(regex, /const id = normalizeRowIdValue\(item\.id\);/);
});

test('automatic lookup and export failures release only their own busy operation', () => {
  const app = read('src/app.js');
  const automaticLookup = app.match(/function maybeAutoLookupImportedIds\(\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  const exportHandler = app.match(/bindClick\('showExportCopy', async \(\) => \{(?<body>[\s\S]*?)\n  \}\);/)?.groups.body ?? '';

  assert.doesNotMatch(automaticLookup, /hideBusy\(true\)/);
  assert.doesNotMatch(exportHandler, /hideBusy\(true\)/);
  assert.match(exportHandler, /let busyShown = true;/);
  assert.match(exportHandler, /if \(busyShown\) hideBusy\(\);/);
});

test('export guards the generated snapshot before awaiting automatic clipboard copy', () => {
  const app = read('src/app.js');
  const handler = app.match(/bindClick\('showExportCopy', async \(\) => \{(?<body>[\s\S]*?)\n  \}\);/)?.groups.body ?? '';
  const modalGuardIndex = handler.indexOf('if (isModalOpen())');
  const wrapIndex = handler.indexOf("document.createElement('div')");
  const openIndex = handler.indexOf("openModal('Export / Copy', wrap)");
  const savedIndex = handler.indexOf('saveSnapshotIfCurrent(snapshot.revision, dataRevision');
  const clipboardIndex = handler.indexOf('await copyTextToClipboard(b64)');

  assert.ok(modalGuardIndex !== -1 && wrapIndex !== -1 && openIndex !== -1 && savedIndex !== -1 && clipboardIndex !== -1);
  assert.ok(modalGuardIndex < wrapIndex, 'active modal guard must run before creating export modal content');
  assert.ok(modalGuardIndex < openIndex, 'active modal guard must run before opening the export modal');
  assert.ok(modalGuardIndex < savedIndex, 'active modal guard must run before changing save state');
  assert.ok(modalGuardIndex < clipboardIndex, 'active modal guard must run before automatic clipboard work');
  assert.match(handler, /if \(isModalOpen\(\)\) \{[\s\S]*?another dialog was active[\s\S]*?return;[\s\S]*?\}/);
  assert.ok(openIndex < savedIndex, 'the generated export must be shown before it counts as exported');
  assert.ok(savedIndex < clipboardIndex, 'saved state must not be cleared after the clipboard await');
  assert.doesNotMatch(handler.slice(clipboardIndex), /markSaved\(|saveSnapshotIfCurrent\(/);
  assert.match(handler, /snapshotCurrent[\s\S]*?Current gzip\+Base64 export[\s\S]*?represents earlier editor data and is not the current config/);
});

test('all live config identity revisions guard both asynchronous export snapshot completion paths', () => {
  const app = read('src/app.js');
  const snapshots = read('src/exportSnapshots.js');
  const advanceRevision = app.match(/function advanceDataRevision\(\) \{(?<body>[\s\S]*?)\}/)?.groups.body ?? '';
  const markDirty = app.match(/function markDirty\(options = \{\}\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  const applyValidatedConfig = app.match(/function applyValidatedConfig\(validation\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  const exportHandler = app.match(/bindClick\('showExportCopy', async \(\) => \{(?<body>[\s\S]*?)\n  \}\);/)?.groups.body ?? '';
  const downloadHandler = app.match(/bindClick\('downloadBase64', async \(\) => \{(?<body>[\s\S]*?)\n  \}\);/)?.groups.body ?? '';

  assert.match(app, /let dataRevision = 0;/);
  assert.doesNotMatch(app, /function getCategories\(\) \{[^}]*data\.Categories\s*=/);
  assert.match(advanceRevision, /dataRevision \+= 1;/);
  assert.match(markDirty, /advanceDataRevision\(\);/);
  assert.match(applyValidatedConfig, /applyConfigReplacement\(data, validation\.config/);
  assert.match(applyValidatedConfig, /advanceDataRevision\(\);/);
  assert.match(snapshots, /const revision = getRevision\(\);\s*const value = await makeSnapshot\(data\);/);
  for (const handler of [exportHandler, downloadHandler]) {
    assert.match(handler, /makeRevisionedExportSnapshot\(data, \(\) => dataRevision, makeBase64Export\)/);
    assert.match(handler, /saveSnapshotIfCurrent\(snapshot\.revision, dataRevision/);
  }
  assert.match(exportHandler, /newer changes remain unexported\./);
  assert.match(exportHandler, /represents earlier editor data and is not the current config\./);
  assert.match(downloadHandler, /newer changes remain unexported\./);
  assert.match(downloadHandler, /represents earlier editor data and is not the current config\./);
  assert.doesNotMatch(exportHandler, /onStale:\s*\(\) => \{\s*if \(dirty\)/);
  assert.doesNotMatch(downloadHandler, /onStale\(\) \{\s*if \(dirty\)/);
});

test('lookup cache modal displays useful and unresolved cache stats', () => {
  const app = read('src/app.js');
  const modal = read('src/ui/lookupCacheModal.js');

  assert.match(app, /function lookupCacheStats\(sheet\) \{/);
  assert.match(app, /values\.filter\(isUsefulLookupName\)\.length/);
  assert.match(app, /return \{ useful, unresolved: values\.length - useful, total: values\.length \};/);
  assert.match(app, /showLookupCacheModal\(\{ lookupCacheStats, clearLookupCache, isLookupCacheProducerActive:/);
  assert.match(modal, /formatLookupCacheStats\(stats\)/);
  assert.match(modal, /\$\{stats\.useful\.toLocaleString\(\)\} useful, \$\{stats\.unresolved\.toLocaleString\(\)\} unresolved/);
  assert.match(modal, /Item names:/);
  assert.match(modal, /UI category names:/);
  assert.doesNotMatch(modal, /Cached Item names/);
});

test('all asynchronous cache producers use finally-safe coordination', () => {
  const app = read('src/app.js');
  const list = read('src/ui/listEditor.js');
  const regex = read('src/tools/regexToItemIds.js');

  const referenced = app.match(/async function lookupReferencedIds[\s\S]*?\nfunction maybeAutoLookupImportedIds/)?.[0] ?? '';
  assert.match(referenced, /const releaseLookupCacheProducer = lookupCacheOperations\.acquire\(\);/);
  assert.match(referenced, /finally \{ releaseLookupCacheProducer\(\);/);
  assert.match(list, /releaseLookupCacheProducer = acquireLookupCacheProducer\(\);/);
  assert.match(list, /finally \{\s*releaseLookupCacheProducer\?\.\(\);/);
  assert.match(regex, /const releaseLookupCacheProducer = acquireLookupCacheProducer\(\);/);
  assert.match(regex, /finally \{\s*releaseLookupCacheProducer\(\);/);
});

test('lookup cache modal disables and explains clearing while producers are active', () => {
  const app = read('src/app.js');
  const modal = read('src/ui/lookupCacheModal.js');

  assert.match(app, /clearLookupCacheIfIdle\(\{/);
  assert.match(app, /Lookup cache cannot be cleared while a lookup or scan is running\./);
  assert.match(modal, /clearButton\.disabled = active;/);
  assert.match(modal, /Wait for the lookup or scan to finish before clearing the cache\./);
  assert.match(modal, /if \(!clearLookupCache\(\)\)/);
  assert.match(modal, /The cache was not cleared because a lookup or scan is still running\./);
});

test('automatic lookup uses quiet success and unresolved statuses while manual lookup remains noisy', () => {
  const source = read('src/app.js');

  assert.match(source, /lookupReferencedIds\(\{ quiet: true \}\)/);
  const lookupBody = source.match(/async function lookupReferencedIds\(options = \{\}\) \{(?<body>[\s\S]*?)\nfunction maybeAutoLookupImportedIds/)?.groups.body ?? '';
  assert.match(lookupBody, /const \{ quiet = false \} = options;/);
  assert.match(lookupBody, /if \(quiet\) setStatus\(`Automatic lookup left \$\{failures\.length\} unresolved ID\(s\)\.`\);/);
  assert.match(lookupBody, /else setStatus\(message, 'warn'\);/);
  assert.match(lookupBody, /else if \(quiet\) setStatus\(`Automatic lookup cached \$\{uncached\} new name\(s\)\.`\);/);
  assert.match(lookupBody, /else setStatus\(`Lookup complete: \$\{uncached\} new name\(s\) cached\.`, 'ok'\);/);
  assert.doesNotMatch(lookupBody, /if \(quiet\) setStatus\([^)]*, ['"](?:ok|warn|err)['"]\)/);
});

test('lookup batch caches only the current chunk payload rows', () => {
  const source = read('src/xivapi.js');

  assert.match(source, /const\s+cachePayloadRows\s*=\s*\(idsToCache,\s*rowsById\)\s*=>\s*\{/);
  assert.match(source, /for \(const id of idsToCache\)/);
  assert.match(source, /cachePayloadRows\(chunk,\s*extractSheetRowsById\(await fetchLookupRows\(sheet, chunk\)\)\)/);
  assert.doesNotMatch(source, /const\s+cachePayloadRows\s*=\s*rowsById\s*=>\s*\{\s*for \(const id of missing\)/);
});

test('clipboard fallback removes its hidden textarea in finally', () => {
  const source = read('src/importExport.js');
  const body = source.match(/export async function copyTextToClipboard\(text\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';

  assert.match(body, /let\s+ta\s*=\s*null;/);
  assert.match(body, /finally\s*\{[\s\S]*ta\?\.remove\(\);[\s\S]*\}/);
});

test('preferences tabs support arrow-key navigation and roving tabindex', () => {
  const source = read('src/ui/preferencesModal.js');

  for (const token of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /setAttribute\('tabindex', selected \? '0' : '-1'\)/);
  assert.match(source, /nextTab\.focus\(\)/);
});

test('app shell keeps 100vh fallback and adds dynamic viewport height', () => {
  const styles = read('styles.css');
  const appRule = styles.match(/\.app\s*\{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';

  assert.match(appRule, /height:\s*100vh;/);
  assert.match(appRule, /height:\s*100dvh;/);
});


test('duplicate sort-position import merge uses stable grouped keys', () => {
  const validation = read('src/validation.js');

  assert.match(validation, /sortPositionKey:\s*`\$\{group\.order\}:\$\{group\.priority\}`/);
  assert.match(validation, /categoryNames:\s*stableNames/);
  assert.match(validation, /stableNames\s*=\s*group\.names\.slice\(\)\.sort/);
  assert.match(validation, /function\s+validationFindingKey\(item\)/);
  assert.match(validation, /item\?\.field === 'SortPosition' && item\.sortPositionKey/);
  assert.match(validation, /return `\$\{item\.severity\}\|\$\{item\.field\}\|\$\{item\.sortPositionKey\}`/);
  assert.match(validation, /const key = validationFindingKey\(item\);/);
});

test('numeric ID list parsers reject negatives and mention non-negative integers', () => {
  const source = read('src/ui/categoryEditor.js');
  const uiBlock = source.match(/listEditor\('Allowed UI Category IDs',[\s\S]*?\n    \}, x => x, \{ hint: 'Game ItemUICategory/)?.[0] ?? '';
  const itemBlock = source.match(/listEditor\('Allowed Item IDs',[\s\S]*?\n    \}, x => x, \{ hint: 'Specific Item/)?.[0] ?? '';

  assert.match(uiBlock, /\/\^\\d\+\$\//);
  assert.match(itemBlock, /\/\^\\d\+\$\//);
  assert.doesNotMatch(uiBlock, /\/\^-\?\\d\+\$\//);
  assert.doesNotMatch(itemBlock, /\/\^-\?\\d\+\$\//);
  assert.match(uiBlock, /non-negative integers/);
  assert.match(itemBlock, /non-negative integers/);
});

test('list lookup busy overlay only appears after missing ID check', () => {
  const source = read('src/ui/listEditor.js');
  const handler = source.match(/lookupButton\.onclick = async \(\) => \{(?<body>[\s\S]*?)\n    \};/)?.groups.body ?? '';
  const missingIndex = handler.indexOf('const missing = ids.filter');
  const noMissingIndex = handler.indexOf('if (!missing.length)');
  const showBusyIndex = handler.indexOf('showBusy(');
  const hideBusyIndex = handler.indexOf('hideBusy();');

  assert.notEqual(missingIndex, -1);
  assert.notEqual(noMissingIndex, -1);
  assert.notEqual(showBusyIndex, -1);
  assert.notEqual(hideBusyIndex, -1);
  assert.ok(noMissingIndex > missingIndex, 'cached-ID branch should run after missing IDs are computed');
  assert.ok(showBusyIndex > noMissingIndex, 'busy overlay should be shown only after all-cached branch returns');
  assert.match(handler, /if \(!missing\.length\) \{[\s\S]*?already cached[\s\S]*?renderPills\(\);[\s\S]*?return;/);
});

test('regex scanner uses shared strict row ID normalization', () => {
  const source = read('src/tools/regexToItemIds.js');

  assert.match(source, /import \{ normalizeRowIdValue \} from '\.\.\/rowIds\.js';/);
  assert.match(source, /const id = normalizeRowIdValue\(rowId\(row\)\);/);
  assert.match(source, /if \(id === null \|\| !name\) continue;/);
  assert.doesNotMatch(source, /matches\.push\(\{ id: Number\(id\), name \}\)/);
});

test('list lookup only hides busy overlay after showing it', () => {
  const source = read('src/ui/listEditor.js');
  const handler = source.match(/lookupButton\.onclick = async \(\) => \{(?<body>[\s\S]*?)\n    \};/)?.groups.body ?? '';
  const noMissingIndex = handler.indexOf('if (!missing.length)');
  const showBusyIndex = handler.indexOf('showBusy(');

  assert.match(handler, /let busyShown = false;/);
  assert.match(handler, /showBusy\([\s\S]*?\);\n\s*busyShown = true;/);
  assert.match(handler, /if \(busyShown\) hideBusy\(\);/);
  assert.ok(showBusyIndex > noMissingIndex, 'all-cached branch should remain before showBusy');
});

test('manual lookup search holds a cache-producer lease across every async exit path', () => {
  const source = read('src/ui/listEditor.js');
  const handler = source.match(/searchButton\.onclick = async \(\) => \{(?<body>[\s\S]*?)\n    \};/)?.groups.body ?? '';
  const blankIndex = handler.indexOf('if (!query) return');
  const acquireIndex = handler.indexOf('const releaseLookupCacheProducer = acquireLookupCacheProducer()');
  const awaitIndex = handler.indexOf('await searchXivapi(lookupSheet, query)');
  const finallyIndex = handler.indexOf('} finally {');

  assert.ok(blankIndex !== -1 && acquireIndex !== -1 && awaitIndex !== -1 && finallyIndex !== -1);
  assert.ok(blankIndex < acquireIndex && acquireIndex < awaitIndex && awaitIndex < finallyIndex);
  assert.equal((handler.match(/releaseLookupCacheProducer\(\)/g) || []).length, 1);
  assert.match(handler, /finally \{\s*releaseLookupCacheProducer\(\);\s*searchButton\.disabled = false;/);
  assert.match(handler, /if \(!results\.length\) \{[\s\S]*?return;/);
  assert.match(handler, /if \(!rendered\) \{[\s\S]*?return;/);
  assert.match(handler, /catch \(err\) \{[\s\S]*?setStatus\(err\.message, 'err'\);/);
});

test('number blur handlers avoid unchanged dirty commits', () => {
  const source = read('src/ui/formControls.js');
  const numberBlock = source.match(/export function numberInput[\s\S]*?\n}\n\nexport function textInput/)?.[0] ?? '';
  const rangeCommitBlock = source.match(/function commitNumber\(key, input\) \{[\s\S]*?\n  }\n  function commitFiniteNumberInput/)?.[0] ?? '';

  assert.match(numberBlock, /let committed = createNumberCommitState\(value, input\.value\);/);
  assert.match(numberBlock, /applyNumberCommit\(committed, rawValue, onChange, bounds\)/);
  assert.match(numberBlock, /options\.validate\(committed\.jsonValue\)/);
  assert.doesNotMatch(numberBlock, /Number\(value\) \|\| 0/);
  assert.match(rangeCommitBlock, /applyRangeValueChange\(rangeObj, key, decision\.value, onChange, valueOptions\)/);
  assert.doesNotMatch(rangeCommitBlock, /rangeObj\[key\] = next/);
});

test('range number and slider live events share the guarded change helper', () => {
  const source = read('src/ui/formControls.js');
  const finiteInputBlock = source.match(/function commitFiniteNumberInput\(key, input\) \{(?<body>[\s\S]*?)\n  \}/)?.groups.body ?? '';

  assert.match(finiteInputBlock, /decideRangeInputChange\(rangeObj\[key\], input\.value, valueOptions\)/);
  assert.match(finiteInputBlock, /applyRangeValueChange\(rangeObj, key, decision\.value, onChange, valueOptions\)/);
  assert.match(source, /minSlider\.oninput = e => \{[\s\S]*?applyRangeValueChange\(rangeObj, 'Min', Number\(e\.target\.value\), onChange, valueOptions\);/);
  assert.match(source, /maxSlider\.oninput = e => \{[\s\S]*?applyRangeValueChange\(rangeObj, 'Max', Number\(e\.target\.value\), onChange, valueOptions\);/);
});

test('range controls enforce integer input, Vendor Price bounds, and accessible live errors', () => {
  const controls = read('src/ui/formControls.js');
  const editor = read('src/ui/categoryEditor.js');
  assert.match(controls, /type="number" step="1"\$\{minAttr\}\$\{maxAttr\}/);
  assert.match(controls, /inputErrors\[key\] = invalidInputMessage\(key\);[\s\S]*?syncValidity\(\);[\s\S]*?return false;/);
  assert.match(controls, /input\.setAttribute\('aria-invalid', hasRangeIssue \? 'true' : 'false'\)/);
  assert.match(controls, /if \(hasRangeIssue\) input\.setAttribute\('aria-describedby', validationId\)/);
  assert.match(editor, /minimum: key === 'VendorPrice' \? 0 : null/);
  assert.match(editor, /maximum: key === 'VendorPrice' \? UINT32_MAX : null/);
  assert.doesNotMatch(editor, /if \(typeof obj\.Filter !== 'number'\) obj\.Filter = 0/);
});
