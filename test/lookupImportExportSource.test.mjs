import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from '../testSupport/sourceFiles.mjs';

test('full Raw JSON wires its summary to the validated candidate', () => {
  const source = read('src/app.js');
  const rawApplyStart = source.indexOf("requireScopedEl(wrap, '#applyRawFull'");
  const rawApplyEnd = source.indexOf("requireScopedEl(wrap, '#copyRawFull'", rawApplyStart);
  const rawApplySource = source.slice(rawApplyStart, rawApplyEnd);
  assert.match(rawApplySource, /configValidationSummaryText\(validation\.config, rawAnalysis, validation\.repairs \|\| \[\]\)/);
  assert.doesNotMatch(rawApplySource, /validationSummaryText\(getCategories\(\)\.length/);
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

test('numeric list editors use strict row-ID dedupe without deduping name patterns', () => {
  const listEditor = read('src/ui/listEditor.js');
  const matchingRulesEditor = read('src/ui/matchingRulesEditor.js');

  assert.match(listEditor, /dedupeValues\s*=\s*false/);
  assert.match(listEditor, /dedupeKey\s*=\s*value\s*=>\s*value/);
  assert.match(listEditor, /if \(dedupeValues\)/);

  const uiStart = matchingRulesEditor.indexOf("listEditor('Allowed UI Category IDs'");
  const itemStart = matchingRulesEditor.indexOf("listEditor('Allowed Item IDs'", uiStart);
  const patternsAppend = matchingRulesEditor.indexOf('patternsCard,', itemStart);
  const patternStart = matchingRulesEditor.indexOf("const patternsCard = listEditor('Allowed Item Name Patterns'");
  const converterStart = matchingRulesEditor.indexOf('const converterButton', patternStart);
  const uiCall = matchingRulesEditor.slice(uiStart, itemStart);
  const itemCall = matchingRulesEditor.slice(itemStart, patternsAppend);
  const patternCall = matchingRulesEditor.slice(patternStart, converterStart);

  assert.match(uiCall, /dedupeValues:\s*true/);
  assert.match(matchingRulesEditor, /import \{ normalizeRowIdValue, parseTypedRowIdValue \} from ['"]\.\.\/rowIds\.js['"];/);
  assert.match(uiCall, /dedupeKey:\s*normalizeRowIdValue/);
  assert.match(itemCall, /dedupeValues:\s*true/);
  assert.match(itemCall, /dedupeKey:\s*normalizeRowIdValue/);
  assert.doesNotMatch(patternCall, /dedupeValues:\s*true/);
  assert.doesNotMatch(patternCall, /dedupeKey:\s*normalizeRowIdValue/);
});

test('name-pattern entry preserves commas while numeric ID editors retain comma-separated input', () => {
  const listEditor = read('src/ui/listEditor.js');
  const matchingRulesEditor = read('src/ui/matchingRulesEditor.js');
  const addHandler = listEditor.match(/add\.onclick = \(\) => \{(?<body>[\s\S]*?)\n  \};/)?.groups.body ?? '';

  assert.match(listEditor, /splitInputOnCommas\s*=\s*true/);
  assert.match(listEditor, /inputPlaceholder\s*=\s*'Add one value, or comma-separated values'/);
  assert.match(listEditor, /tokenizeListInput\(raw, splitInputOnCommas\)/);

  const uiStart = matchingRulesEditor.indexOf("listEditor('Allowed UI Category IDs'");
  const itemStart = matchingRulesEditor.indexOf("listEditor('Allowed Item IDs'", uiStart);
  const patternsAppend = matchingRulesEditor.indexOf('patternsCard,', itemStart);
  const patternStart = matchingRulesEditor.indexOf("const patternsCard = listEditor('Allowed Item Name Patterns'");
  const converterStart = matchingRulesEditor.indexOf('const converterButton', patternStart);
  const uiCall = matchingRulesEditor.slice(uiStart, itemStart);
  const itemCall = matchingRulesEditor.slice(itemStart, patternsAppend);
  const patternCall = matchingRulesEditor.slice(patternStart, converterStart);

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
  assert.match(exportHandler, /let busyShown = false;/);
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

test('both export paths share the accessible AetherBags compatibility preflight', () => {
  const app = read('src/app.js');
  const styles = read('styles.css');
  const exportHandler = app.match(/bindClick\('showExportCopy', async \(\) => \{(?<body>[\s\S]*?)\n  \}\);/)?.groups.body ?? '';
  const downloadHandler = app.match(/bindClick\('downloadBase64', async \(\) => \{(?<body>[\s\S]*?)\n  \}\);/)?.groups.body ?? '';
  const sharedPreflight = app.match(/async function makeCompatibleRevisionedExportSnapshot[\s\S]*?\n\}/)?.[0] ?? '';
  const blockedSummary = app.match(/function showExportCompatibilitySummary[\s\S]*?\n\}/)?.[0] ?? '';

  assert.match(app, /import \{ runAetherBagsExportPreflight \} from '\.\/exportCompatibility\.js'/);
  assert.match(sharedPreflight, /runAetherBagsExportPreflight\(data/);
  assert.match(sharedPreflight, /showExportCompatibilitySummary\(result\)/);
  assert.match(exportHandler, /makeCompatibleRevisionedExportSnapshot\(/);
  assert.match(downloadHandler, /makeCompatibleRevisionedExportSnapshot\(/);
  assert.match(blockedSummary, /role="alert"/);
  assert.match(blockedSummary, /cannot be safely serialized or read/);
  assert.match(blockedSummary, /safely default or ignore/);
  assert.match(blockedSummary, /structured controls or Raw JSON/);
  assert.match(blockedSummary, /saved state was not changed/);
  assert.match(styles, /\.modal\s*\{[\s\S]*?width:\s*min\(900px, calc\(100vw - 40px\)\)/);
  assert.match(styles, /\.modal-title-row > \.flush-heading\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.validation-list\s*\{[\s\S]*?overflow-wrap:\s*anywhere/);
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
  const sharedPreflight = app.match(/async function makeCompatibleRevisionedExportSnapshot[\s\S]*?\n\}/)?.[0] ?? '';
  assert.match(sharedPreflight, /runAetherBagsExportPreflight\(data/);
  assert.match(sharedPreflight, /makeRevisionedExportSnapshot\(data, \(\) => dataRevision, makeBase64Export\)/);
  for (const handler of [exportHandler, downloadHandler]) {
    assert.match(handler, /makeCompatibleRevisionedExportSnapshot\(/);
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

test('clipboard fallback removes its hidden textarea in finally', () => {
  const source = read('src/importExport.js');
  const body = source.match(/export async function copyTextToClipboard\(text\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';

  assert.match(body, /let\s+ta\s*=\s*null;/);
  assert.match(body, /finally\s*\{[\s\S]*ta\?\.remove\(\);[\s\S]*\}/);
});

test('numeric ID list parsers use exact uint parsing', () => {
  const source = read('src/ui/matchingRulesEditor.js');
  const uiStart = source.indexOf("listEditor('Allowed UI Category IDs'");
  const itemStart = source.indexOf("listEditor('Allowed Item IDs'", uiStart);
  const patternsAppend = source.indexOf('patternsCard,', itemStart);
  const uiBlock = source.slice(uiStart, itemStart);
  const itemBlock = source.slice(itemStart, patternsAppend);

  assert.match(uiBlock, /parseTypedRowIdValue\(x\)/);
  assert.match(itemBlock, /parseTypedRowIdValue\(x\)/);
  assert.match(uiBlock, /0 through 4294967295/);
  assert.match(itemBlock, /0 through 4294967295/);
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
  assert.match(handler, /showBusy\([\s\S]*?\);\s*busyShown = true;/);
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
  assert.match(numberBlock, /applyNumberCommit\(committed, rawValue, onChange, \{ \.\.\.bounds, validateNumber: options\.validateNumber, requireJsonNumber: options\.requireJsonNumber \}\)/);
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

test('range controls enforce width-aware input bounds and component-specific accessible live errors', () => {
  const controls = read('src/ui/formControls.js');
  const editor = read('src/ui/categoryEditor.js');
  assert.match(controls, /type="number" step="1"\$\{minAttr\}\$\{maxAttr\}/);
  assert.match(controls, /inputErrors\[key\] = rangeInputErrorMessage\(key, input\.value, valueOptions\);[\s\S]*?syncValidity\(\);[\s\S]*?return false;/);
  assert.match(controls, /input\.setAttribute\('aria-invalid', component\.invalid \? 'true' : 'false'\)/);
  assert.match(controls, /if \(component\.describedBy\) input\.setAttribute\('aria-describedby', validationId\)/);
  assert.match(editor, /minimum: key === 'VendorPrice' \? 0 : INT32_MIN/);
  assert.match(editor, /maximum: key === 'VendorPrice' \? UINT32_MAX : INT32_MAX/);
  assert.doesNotMatch(editor, /if \(typeof obj\.Filter !== 'number'\) obj\.Filter = 0/);
});
