import test from 'node:test';
import assert from 'node:assert/strict';
import { read, sourceFiles } from '../testSupport/sourceFiles.mjs';

function importFromConstants(source) {
  return source.match(/import \{(?<names>[^}]+)\} from ['"]\.\.\/constants\.js['"];/)?.groups.names
    .split(',')
    .map(name => name.trim())
    .filter(Boolean) ?? [];
}

test('HTML/template source does not contain duplicate class attributes on one tag', () => {
  const files = ['index.html', ...sourceFiles('src')];
  const duplicateClassTag = /<[^>]*\bclass\s*=\s*['"][^'"]*['"][^>]*\bclass\s*=\s*['"]/i;

  for (const file of files) {
    assert.doesNotMatch(read(file), duplicateClassTag, `${file} has duplicate class attributes in one tag`);
  }
});

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
  assert.match(source, /function loadPreset\(preset\)[\s\S]*?return importText\(preset\.data, preset\.sourceLabel \|\| 'Preset'\);/);
  assert.match(source, /bindChange\('fileInput',[\s\S]*?await importText\(await file\.text\(\), file\.name\);/);
  assert.match(source, /if \(!\(await importText\(text, ''\)\)\)/);
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

test('package scripts include test and exhaustive combined check commands', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.scripts?.test, 'node --test');
  assert.ok(pkg.scripts?.check);
  assert.match(pkg.scripts.check, /node scripts\/check-javascript-syntax\.mjs/);
  assert.match(pkg.scripts.check, /node scripts\/check-imports\.mjs/);
  assert.match(pkg.scripts.check, /node --test/);
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
