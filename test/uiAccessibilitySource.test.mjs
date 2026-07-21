import test from 'node:test';
import assert from 'node:assert/strict';
import { read, sourceFiles } from '../testSupport/sourceFiles.mjs';

test('Item Ordering is placed between the top editor grid and matching rule grid', () => {
  const source = read('src/ui/categoryEditor.js');
  const matchingRules = read('src/ui/matchingRulesEditor.js');
  const top = source.indexOf('root.appendChild(topEditorGrid)');
  const ordering = source.indexOf('renderItemOrderingEditor(cat', top);
  const rules = source.indexOf('root.appendChild(renderMatchingRulesEditor', ordering);
  assert.ok(top >= 0 && ordering > top && rules > ordering);
  assert.match(matchingRules, /ruleGrid\.className = 'grid cols-2'/);
});

test('Item Ordering uses shared summary, issue styling, accessible controls, and explicit correction actions', () => {
  const source = read('src/ui/itemOrderingEditor.js');
  assert.match(source, /setDetailsSummary\(details, orderingSummary/);
  assert.match(source, /issueCount/);
  assert.match(source, /setAttribute\('aria-label', `Field for sort criterion/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /\['↑', 'up', -1\], \['↓', 'down', 1\]/);
  assert.match(source, /`Move sort criterion \$\{index \+ 1\} \$\{directionName\}`/);
  assert.match(source, /button\.className = 'icon-button movement-button'/);
  assert.match(source, /syncButtonTooltip\(button, movementLabel\)/);
  assert.match(source, /remove\.className = 'icon-button danger'/);
  assert.match(source, /remove\.textContent = '×'/);
  assert.match(source, /remove\.title = removeLabel/);
  assert.match(source, /add\.className = 'icon-button add-icon-button ordering-contextual-icon'/);
  assert.match(source, /add\.textContent = '\+'/);
  assert.match(source, /`Remove sort criterion \$\{index \+ 1\}`/);
  assert.match(source, /Replace with AetherBags-normalized criteria/);
  assert.match(source, /Edit in Raw JSON/);
  assert.match(source, /ITEM_SORT_FIELDS\.filter\(option => option\.value !== 5\)[\s\S]*ITEM_SORT_FIELDS\.find\(option => option\.value === 5\)/);
  assert.doesNotMatch(source, /className = 'row ordering-(?:row-actions|add-row)'/);
  assert.ok(source.indexOf('section.appendChild(addRow)') < source.indexOf('section.appendChild(rows)'));
});

test('custom ordering reuses strict Item lookup and opt-in ordered list behavior', () => {
  const ordering = read('src/ui/itemOrderingEditor.js');
  const list = read('src/ui/listEditor.js');
  assert.match(ordering, /parseTypedRowIdValue/);
  assert.match(ordering, /lookupSheet: 'Item'/);
  assert.match(ordering, /ordered: true/);
  assert.match(ordering, /listEditorDeps/);
  assert.match(list, /ordered = false/);
  assert.match(list, /preserveInputOnNoop = false/);
  assert.match(ordering, /preserveInputOnNoop: true/);
  assert.match(list, /Move .* from rank .* up in/);
  assert.match(list, /Move .* from rank .* down in/);
});

test('Custom Item Order is appended only when the shared relevance decision requires it', () => {
  const ordering = read('src/ui/itemOrderingEditor.js');
  const styles = read('styles.css');
  assert.match(ordering, /if \(analysis\.customOrderRelevant\) body\.appendChild\(renderCustomOrderEditor\(analysis\)\)/);
  assert.doesNotMatch(ordering, /Add Custom Item Order as a sort criterion to create ranks/);
  assert.doesNotMatch(styles, /custom-order-section[^\n{]*\{[^}]*display:\s*none/);
  assert.doesNotMatch(ordering, /<details[^>]*>[^<]*Custom Item Order/i);
});

test('criterion rerenders and final retained-rank removal restore focus to surviving ordering controls', () => {
  const ordering = read('src/ui/itemOrderingEditor.js');
  assert.ok(ordering.includes("field.onchange = () => applyCriteriaDecision(decideCriterionChange(criteria, index, 'Field', Number(field.value)), '', `field-${index}`)"));
  assert.ok(ordering.includes("direction.onchange = () => applyCriteriaDecision(decideCriterionChange(criteria, index, 'Direction', Number(direction.value)), '', `direction-${index}`)"));
  assert.match(ordering, /applyCriteriaDecision[\s\S]*?renderBody\(\);\s*focusOrderingControl\(focusKey\)/);
  assert.match(ordering, /if \(!analyzeItemOrdering\(category\)\.customOrderRelevant\)\s*{\s*renderBody\(\);\s*focusOrderingControl\(\['add-field', 'field-0'\]\)/);
  assert.match(ordering, /target && !target\.disabled && !target\.hidden/);
});

test('ordering edits refresh local validation and sidebar without a whole-editor render', () => {
  const source = read('src/ui/itemOrderingEditor.js');
  const change = source.match(/function afterChange[\s\S]*?\n  }/)?.[0] || '';
  assert.match(change, /onValidationChanged\(\)/);
  assert.match(change, /renderList\(\)/);
  assert.doesNotMatch(change, /renderAll/);
});

test('rendering effective Use Global never inserts ordering properties', () => {
  const source = read('src/ui/itemOrderingEditor.js');
  const render = source.match(/function renderBody[\s\S]*?\n  }/)?.[0] || '';
  assert.doesNotMatch(render, /category\.(?:ItemSortCriteria|CustomItemOrder)\s*=/);
});

test('extra-member criteria route to selected-category Raw JSON without structured mutation controls', () => {
  const source = read('src/ui/itemOrderingEditor.js');
  const guard = source.match(/if \(!analysis\.criteriaStructuredEditable\)[\s\S]*?return section;/)?.[0] || '';
  assert.match(guard, /additional properties/);
  assert.match(guard, /selected-category Raw JSON/);
  assert.match(guard, /preserved exactly/);
  assert.doesNotMatch(guard, /decideCriterion(?:Add|Change|Remove)|decideOrderedMove|decideCanonicalCriteriaRepair/);
});

test('ordering rerenders use deterministic enabled focus fallbacks', () => {
  const ordering = read('src/ui/itemOrderingEditor.js');
  const list = read('src/ui/listEditor.js');
  assert.match(ordering, /listMutationFocusPlan\('add'/);
  assert.match(ordering, /listMutationFocusPlan\('move'/);
  assert.match(ordering, /listMutationFocusPlan\('remove'/);
  assert.match(ordering, /target && !target\.disabled && !target\.hidden/);
  assert.match(list, /listMutationFocusPlan\('move'/);
  assert.match(list, /listMutationFocusPlan\('remove'/);
  assert.match(list, /focusOrderedControl\(\['input'\]\)/);
  assert.match(list, /target && !target\.disabled && !target\.hidden/);
});

test('Help routes complete rich messages through allowlisted semantic nodes without HTML parsing', () => {
  const help = read('src/ui/helpModal.js');
  const english = read('src/locales/en.js');
  const keys = [
    'action.aboutHelp',
    'help.introduction',
    'help.workflow.title',
    'action.importPaste',
    'help.workflow.import.message',
    'action.upload',
    'help.workflow.upload.message',
    'action.exportCopy',
    'help.workflow.export.message',
    'action.download',
    'help.workflow.download.message',
    'help.workflow.reimport',
    'help.lookup.title',
    'action.resolveIds',
    'help.lookup.resolveIds.message',
    'action.lookupCache',
    'help.lookup.cache.message',
    'help.lookup.regex.label',
    'help.lookup.regex.message',
    'help.preferences.title',
    'action.preferences',
    'help.preferences.preferences.message',
    'help.preferences.generate.label',
    'help.preferences.generate.message',
    'help.preferences.behavior.message',
    'help.preferences.storage.message',
    'help.privacy.title',
    'help.privacy.localProcessing',
    'help.privacy.storage.message',
    'help.privacy.xivapi',
    'help.privacy.repository'
  ];

  for (const key of keys) {
    assert.ok(english.includes(`'${key}':`), key);
    assert.ok(help.includes(`'${key}'`), key);
  }
  const obsoleteFragments = [
    'help.workflow.download.beforeExtension',
    'help.workflow.download.afterExtension',
    'help.preferences.behavior.joiner',
    'help.preferences.storage.beforeName',
    'help.preferences.storage.afterName',
    'help.privacy.storage.beforeName',
    'help.privacy.storage.afterName'
  ];
  for (const key of obsoleteFragments) {
    assert.doesNotMatch(english, new RegExp(key.replaceAll('.', '\\.')));
  }
  assert.match(help, /HELP_SEMANTIC_ELEMENTS = Object\.freeze\(\{[\s\S]*?strong: 'strong',[\s\S]*?code: 'code'[\s\S]*?\}\)/);
  assert.match(help, /translate\.rich\(key, placeholders\)/);
  assert.match(help, /documentRef\.createTextNode\(part\.value\)/);
  assert.match(help, /element\.textContent = part\.value\.text/);
  assert.match(help, /openModal\(translate\('action\.aboutHelp'\), buildHelpContent\(translate\)\)/);
  assert.doesNotMatch(help, /innerHTML|insertAdjacentHTML|DOMParser/);
  assert.doesNotMatch(help, /escapeHtml/);
  assert.doesNotMatch(help, /This editor helps you inspect|Basic workflow|comfortable\/compact density|The full imported config is processed locally/);
});

test('Preferences modal routes its complete English surface through escaped localization keys', () => {
  const preferences = read('src/ui/preferencesModal.js');
  const english = read('src/locales/en.js');
  const keys = [
    'preferences.title',
    'preferences.introduction',
    'preferences.sections.label',
    'preferences.appearance.title',
    'preferences.behavior.title',
    'preferences.theme.label',
    'preferences.density.label',
    'preferences.autoLookupImportedIds.label',
    'preferences.autoLookupImportedIds.hint',
    'preferences.autoGenerateDescriptions.label',
    'preferences.autoGenerateDescriptions.hint',
    'preferences.saved'
  ];
  for (const key of keys) {
    assert.ok(english.includes(`'${key}':`), key);
    assert.ok(preferences.includes(`translate('${key}')`), key);
  }
  assert.match(preferences, /aria-label="\$\{escapeHtml\(translate\('preferences\.sections\.label'\)\)\}"/);
  assert.match(preferences, /escapeHtml\(translate\(`\$\{keyPrefix\}\.\$\{option\.key\}\.label`\)\)/);
  assert.match(preferences, /escapeHtml\(translate\(`\$\{keyPrefix\}\.\$\{options\.find[\s\S]*?\.hint`\)\)/);
  assert.match(preferences, /openModal\(translate\('preferences\.title'\), wrap\)/);
  assert.match(preferences, /setStatus\(translate\('preferences\.saved'\), 'ok'\)/);
  assert.doesNotMatch(preferences, /These editor preferences are stored locally|Editor preferences saved locally\.|Auto-lookup imported IDs|Auto-generate descriptions/);
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

test('allowed rarity checkbox changes refresh validation and category list without full render', () => {
  const source = read('src/ui/matchingRulesEditor.js');
  const categoryEditor = read('src/ui/categoryEditor.js');
  assert.match(source, /onRulesChanged = \(\) => \{\}/);
  assert.match(source, /onRulesChanged\('rarities changed'\);/);
  assert.match(categoryEditor, /onRulesChanged: reason => \{\s*basicEditor\.refreshValidation\(\);\s*basicEditor\.maybeAutoGenerateDescription\(reason\);\s*renderList\(\);\s*\}/);
  const rarityEditorBody = source.match(/function renderAllowedRaritiesEditor\(category, deps\) \{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';
  assert.doesNotMatch(rarityEditorBody, /renderAll\(\)/);
});

test('generated description UI wiring stays safe and source-consistent', () => {
  const editor = read('src/ui/basicEditor.js');
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
  assert.match(editor, /return applyGeneratedDescriptionChange\(category, text, \(\) => \{/);
  assert.match(editor, /if \(category\.Description === generated\) setStatus\('Description already matches the generated text\.', 'ok'\);[\s\S]*?else if \(!String\(category\.Description \|\| ''\)\.trim\(\)\) applyGeneratedDescription\(generated\);[\s\S]*?else showGenerateDescriptionConfirmation\(generated\);/);
  assert.match(editor, /replaceGeneratedDescription[\s\S]*?if \(!applyGeneratedDescription\(generated\)\) setStatus\('Description already matches the generated text\.', 'ok'\);/);
  assert.match(editor, /if \(!isUsefulGeneratedDescription\(generated\)\) return false;[\s\S]*?return applyGeneratedDescription\(generated\);/);
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
  const source = read('src/ui/rangeStateFiltersEditor.js');
  const categoryEditor = read('src/ui/categoryEditor.js');
  assert.match(categoryEditor, /function createScheduledRenderList\(renderList\)/);
  assert.match(categoryEditor, /const scheduleRenderList = createScheduledRenderList\(renderList\)/);
  assert.match(source, /rangeSliderControl\(filter\.label, obj, afterRangeChange, defaults\)/);
  const afterRangeChange = source.slice(source.indexOf('function afterRangeChange()'), source.indexOf('for (const filter of RANGE_FILTERS)'));
  const rangeOrder = ['markDirty();', 'setDetailsSummary(ranges, rangeFiltersSummaryParts(rules));', "onFiltersChanged('range filter changed');", 'scheduleRenderList();']
    .map(statement => afterRangeChange.indexOf(statement));
  assert.ok(rangeOrder.every(index => index >= 0));
  assert.deepEqual(rangeOrder, [...rangeOrder].sort((a, b) => a - b));
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

test('state filter changes schedule list rendering without full render', () => {
  const source = read('src/ui/rangeStateFiltersEditor.js');
  const body = source.match(/function renderStateFilterCard\(filterName, obj\) \{(?<body>[\s\S]*?)\n    return box;/)?.groups.body ?? '';
  assert.match(body, /obj\.State = next;[\s\S]*?afterStateChange\(\);/);
  const afterStateChange = source.slice(source.indexOf('function afterStateChange()'), source.indexOf('function renderStateFilterCard'));
  const stateOrder = ['markDirty();', 'setDetailsSummary(states, stateFiltersSummaryParts(rules));', "onFiltersChanged('state filter changed');", 'scheduleRenderList();']
    .map(statement => afterStateChange.indexOf(statement));
  assert.ok(stateOrder.every(index => index >= 0));
  assert.deepEqual(stateOrder, [...stateOrder].sort((a, b) => a - b));
  assert.doesNotMatch(body, /renderAll\(\)/);
});

test('button taxonomy keeps icon targets square and at least 24 CSS pixels in every density', () => {
  const styles = read('styles.css');
  assert.match(styles, /--button-icon-target:\s*30px;/);
  assert.match(styles, /:root\[data-density="compact"\]\s*{[\s\S]*?--button-icon-target:\s*26px;/);
  assert.match(styles, /button\.small\s*,\s*button\.button-compact/);
  assert.match(styles, /button\.icon-button\s*{(?=[\s\S]*?width:\s*var\(--button-icon-target\);)(?=[\s\S]*?height:\s*var\(--button-icon-target\);)(?=[\s\S]*?min-width:\s*var\(--button-icon-target\);)[\s\S]*?min-height:\s*var\(--button-icon-target\);/);
  assert.match(styles, /--ordering-control-height:\s*35px;/);
  assert.match(styles, /:root\[data-density="compact"\]\s*{[\s\S]*?--ordering-control-height:\s*31px;/);
  assert.match(styles, /button\.icon-button\.ordering-contextual-icon\s*{(?=[\s\S]*?width:\s*var\(--ordering-control-height\);)(?=[\s\S]*?height:\s*var\(--ordering-control-height\);)[\s\S]*?min-height:\s*var\(--ordering-control-height\);/);
  assert.match(styles, /--input-control-height:\s*38px;/);
  assert.match(styles, /:root\[data-density="compact"\]\s*{[\s\S]*?--input-control-height:\s*34px;/);
  assert.match(styles, /button\.icon-button\.input-paired-icon\s*{(?=[\s\S]*?width:\s*var\(--input-control-height\);)(?=[\s\S]*?height:\s*var\(--input-control-height\);)[\s\S]*?min-height:\s*var\(--input-control-height\);/);
  assert.match(styles, /\.ordering-criterion-row select,[\s\S]*?\.ordering-add-row select\s*{[\s\S]*?height:\s*var\(--ordering-control-height\);/);
  assert.match(styles, /\.ordering-add-row\s*>\s*button:not\(\.icon-button\)\s*{\s*height:\s*35px;/);
  assert.match(styles, /:root\[data-density="compact"\]\s+\.ordering-add-row\s*>\s*button:not\(\.icon-button\)\s*{\s*height:\s*31px;/);
  assert.match(styles, /button\.primary/);
  assert.match(styles, /button\.danger/);
  assert.match(styles, /\.link-button\s*{/);
  assert.doesNotMatch(styles, /--button-icon-target:\s*(?:[01]?\d|2[0-3])px/);
});

test('context determines whether input-adjacent icons match height or center compactly', () => {
  const styles = read('styles.css');
  const ordering = read('src/ui/itemOrderingEditor.js');
  const list = read('src/ui/listEditor.js');
  const category = read('src/ui/categoryEditor.js');
  assert.match(ordering, /add\.className = 'icon-button add-icon-button ordering-contextual-icon'/);
  assert.match(list, /add\.className = 'icon-button add-icon-button input-paired-icon'/);
  assert.match(styles, /\.ordering-row-actions\s*{[\s\S]*?align-items:\s*center;[\s\S]*?height:\s*var\(--ordering-control-height\);/);
  assert.match(ordering, /button\.className = 'icon-button movement-button'/);
  assert.match(ordering, /remove\.className = 'icon-button danger'/);
  assert.match(styles, /\.category-header-actions\s*>\s*button\s*{[\s\S]*?height:\s*var\(--button-icon-target\);/);
  assert.match(category, /id="duplicateCat" class="small">Duplicate<\/button>/);
});

test('standalone movement stays neutral while compact pill icons retain visible focus', () => {
  const styles = read('styles.css');
  const list = read('src/ui/listEditor.js');
  assert.match(styles, /button\.movement-button\s*{[\s\S]*?border-color:\s*var\(--border\);[\s\S]*?color:\s*var\(--text\);/);
  assert.match(styles, /\.pill-icon-button\s*{(?=[\s\S]*?width:\s*18px;)(?=[\s\S]*?height:\s*18px;)[\s\S]*?border:\s*0;/);
  assert.match(styles, /\.pill-icon-button:not\(:disabled\):focus-visible\s*{(?=[\s\S]*?outline:\s*2px solid var\(--accent\);)(?=[\s\S]*?outline-offset:\s*2px;)[\s\S]*?box-shadow:/);
  assert.doesNotMatch(styles, /\.pill-icon-button:not\(:disabled\):focus-visible\s*{[\s\S]*?outline:\s*0;/);
  assert.match(styles, /:root\[data-theme="high-contrast"\] button:focus-visible[\s\S]*?outline:\s*2px solid var\(--warn\);/);
  assert.match(styles, /\.pill-icon-button\.pill-move:not\(:disabled\):is\(:hover, :focus-visible\)\s*{[\s\S]*?color:\s*var\(--accent\);[\s\S]*?text-shadow:/);
  assert.match(styles, /\.pill-icon-button\.pill-remove:not\(:disabled\):is\(:hover, :focus-visible\)\s*{[\s\S]*?text-shadow:/);
  assert.match(styles, /\.pill-icon-button:disabled\s*{[\s\S]*?text-shadow:\s*none;/);
  assert.match(list, /moveUp\.className = 'pill-icon-button pill-move'/);
  assert.match(list, /moveDown\.className = 'pill-icon-button pill-move'/);
  assert.match(list, /removeButton\.className = 'pill-icon-button pill-remove'/);
});

test('selected-category structural actions restore focus after full rerenders', () => {
  const category = read('src/ui/categoryEditor.js');
  assert.match(category, /selectedCategoryStructuralFocusPlan\(action, selectedIndex, cats\.length\)/);
  assert.match(category, /document\.querySelector\('\.cat-item\[aria-current="true"\]'\)/);
  assert.match(category, /target && !target\.disabled && !target\.hidden && document\.contains\(target\)/);
  for (const action of ['move-up', 'move-down', 'duplicate', 'delete']) {
    assert.match(category, new RegExp(`renderAll\\(\\);\\s*restoreStructuralActionFocus\\('${action}'\\)`));
  }
});

test('movement icon controls retain precise names, enabled-only titles, and disabled boundaries', () => {
  const category = read('src/ui/categoryEditor.js');
  const ordering = read('src/ui/itemOrderingEditor.js');
  const list = read('src/ui/listEditor.js');
  assert.match(category, /id="moveUp" class="icon-button movement-button">↑<\/button>/);
  assert.match(category, /id="moveDown" class="icon-button movement-button">↓<\/button>/);
  assert.match(category, /moveUp:\s*`Move \$\{actionName\} up`/);
  assert.match(category, /moveDown:\s*`Move \$\{actionName\} down`/);
  assert.match(category, /el\('moveUp'\)\.disabled = selectedIndex <= 0/);
  assert.match(category, /el\('moveDown'\)\.disabled = selectedIndex >= cats\.length - 1/);
  assert.match(category, /syncButtonTooltip\(button, label\)/);
  assert.match(ordering, /button\.disabled = index \+ offset < 0 \|\| index \+ offset >= criteria\.length/);
  assert.match(ordering, /button\.setAttribute\('aria-label', movementLabel\);\s*syncButtonTooltip\(button, movementLabel\)/);
  assert.match(list, /moveUp\.disabled = i === 0/);
  assert.match(list, /moveDown\.disabled = i === arr\.length - 1/);
  assert.match(list, /syncButtonTooltip\(moveUp, moveUpLabel\);\s*moveUp\.setAttribute\('aria-label', moveUpLabel\)/);
  assert.match(list, /syncButtonTooltip\(moveDown, moveDownLabel\);\s*moveDown\.setAttribute\('aria-label', moveDownLabel\)/);
  assert.match(list, /removeButton\.title = removeLabel;\s*removeButton\.setAttribute\('aria-label', removeLabel\)/);
});

test('disabled buttons omit tooltips and no current control claims the reason exception', () => {
  const app = read('src/app.js');
  const buttonSources = [
    read('src/ui/categoryEditor.js'),
    read('src/ui/itemOrderingEditor.js'),
    read('src/ui/listEditor.js')
  ].join('\n');
  assert.match(app, /button\.disabled = disabled;\s*button\.removeAttribute\('title'\)/);
  assert.doesNotMatch(buttonSources, /syncButtonTooltip\([^\n]+,[^\n]+,[^\n]+\)/);
});

test('disabled buttons cannot acquire the shared hover border', () => {
  const styles = read('styles.css');
  assert.match(styles, /button:not\(:disabled\):hover\s*{\s*border-color:\s*var\(--accent\);\s*}/);
  assert.doesNotMatch(styles, /(?:^|\n)button:hover\s*{/);
});

test('visible button labels retain clarity with intentional sentence case', () => {
  const index = read('index.html');
  const sources = sourceFiles('src').map(read).join('\n');
  assert.match(index, />Sort by order<\/button>/);
  assert.doesNotMatch(index, />Sort by Order<\/button>/);
  for (const label of ['Duplicate', 'Export/Copy', 'Raw JSON', 'Resolve IDs']) {
    assert.match(`${index}\n${sources}`, new RegExp(`>${label.replace('/', '\\/')}<\\/button>|textContent = '${label.replace('/', '\\/')}'`));
  }
  assert.match(sources, /id="deleteCat" class="icon-button danger">🗑<\/button>/);
  assert.match(sources, /remove\.textContent = '×'/);
  assert.match(sources, /add\.textContent = '\+'/);
  assert.match(sources, /lookupButton\.textContent = '🔍'/);
});

test('list add and lookup icon controls track useful input and unresolved IDs', () => {
  const list = read('src/ui/listEditor.js');
  const styles = read('styles.css');
  assert.match(list, /add\.setAttribute\('aria-label', `Add value to \$\{title\}`\)/);
  assert.match(list, /const addLabel = `Add value to \$\{title\}`/);
  assert.match(list, /function syncAddButtonState\(\)\s*{\s*add\.disabled = input\.value\.trim\(\)\.length === 0;\s*syncButtonTooltip\(add, addLabel\)/);
  assert.match(list, /input\.addEventListener\('input', syncAddButtonState\)/);
  assert.match(list, /lookupButton\.className = 'icon-button pill-lookup-button'/);
  assert.match(list, /lookupButton\.setAttribute\('aria-label', lookupLabel\)/);
  assert.match(list, /lookupButton\.disabled = true;\s*syncButtonTooltip\(lookupButton, lookupLabel\)/);
  assert.match(list, /lookupButton\.disabled = false;\s*syncButtonTooltip\(lookupButton, lookupLabel\)/);
  assert.match(list, /lookupButton\.hidden = !showLookup/);
  assert.match(list, /pillsWrap\.classList\.toggle\('has-pill-lookup', showLookup\)/);
  assert.match(list, /pillsWrap\.appendChild\(lookupButton\)/);
  assert.doesNotMatch(list, /row\.append\(lookupButton\)/);
  assert.match(styles, /--pill-list-border-width:\s*1px;/);
  assert.match(styles, /--pill-list-padding:\s*8px;/);
  assert.match(styles, /--pill-row-height:\s*28px;/);
  assert.match(styles, /\.pill-list\s*{[\s\S]*?padding:\s*var\(--pill-list-padding\);[\s\S]*?border:\s*var\(--pill-list-border-width\) dashed var\(--border\);/);
  assert.match(styles, /\.pill-lookup-button\s*{[\s\S]*?top:\s*calc\(var\(--pill-list-border-width\) \+ var\(--pill-list-padding\) \+ \(var\(--pill-row-height\) - var\(--button-icon-target\)\) \/ 2\);[\s\S]*?right:\s*7px;/);
  assert.match(styles, /:root\s*{[\s\S]*?--button-icon-target:\s*30px;/);
  assert.match(styles, /:root\[data-density="compact"\]\s*{[\s\S]*?--button-icon-target:\s*26px;/);
  assert.match(styles, /\.pill-lookup-button\[hidden\]\s*{[\s\S]*?display:\s*none !important;/);

  const firstPillCenter = 1 + 8 + (28 / 2);
  for (const target of [30, 26]) {
    const lookupTop = 1 + 8 + ((28 - target) / 2);
    assert.equal(lookupTop + (target / 2), firstPillCenter);
  }
});

test('modal requestAnimationFrame work is guarded against fast close', () => {
  const source = read('src/modals.js');
  assert.match(source, /let\s+modalVersion\s*=\s*0/);
  assert.match(source, /const\s+version\s*=\s*\+\+modalVersion/);
  assert.match(source, /requestAnimationFrame\(\(\)\s*=>\s*{[\s\S]*?version\s*!==\s*modalVersion[\s\S]*?classList\.contains\('hidden'\)[\s\S]*?return;/);
  assert.match(source, /export function closeModal\(\)\s*{\s*modalVersion\+\+/);
});

test('manual lookup search result Add buttons have contextual accessible labels', () => {
  const source = read('src/ui/listEditor.js');
  const lookupRowBody = source.match(/const r = document\.createElement\('div'\);(?<body>[\s\S]*?)resultsBox\.appendChild\(r\);/)?.groups.body ?? '';

  assert.match(lookupRowBody, /<button class="icon-button add-icon-button">\+<\/button>/);
  assert.match(lookupRowBody, /const\s+addButton\s*=\s*r\.querySelector\('button'\)/);
  assert.match(lookupRowBody, /addButton\.setAttribute\('aria-label'/);
  assert.match(lookupRowBody, /syncButtonTooltip\(addButton, addLabel\)/);
  assert.match(lookupRowBody, /addButton\.disabled = !lookupResultAddAvailable\(id, arr\)/);
  for (const token of ['displayName', 'id', 'title']) {
    assert.match(lookupRowBody, new RegExp(String.raw`\b${token}\b`));
  }
  assert.doesNotMatch(lookupRowBody, /r\.querySelector\('button'\)\.onclick/);
});

test('regex converter action is composed into the name-pattern list row', () => {
  const matchingRulesEditor = read('src/ui/matchingRulesEditor.js');
  const styles = read('styles.css');

  assert.match(matchingRulesEditor, /const patternsCard = listEditor\('Allowed Item Name Patterns'/);
  assert.match(matchingRulesEditor, /converterButton\.type = 'button'/);
  assert.match(matchingRulesEditor, /converterButton\.textContent = 'Convert patterns to Item IDs'/);
  assert.match(matchingRulesEditor, /converterButton\.className = 'pattern-converter-action'/);
  assert.match(matchingRulesEditor, /converterButton\.onclick = openRegexToItemIdsTool/);
  assert.match(matchingRulesEditor, /requireScopedEl\(patternsCard, '\.list-editor-row', 'name patterns'\)\.appendChild\(converterButton\)/);
  assert.match(matchingRulesEditor, /ruleGrid\.append\([\s\S]*?Allowed UI Category IDs[\s\S]*?Allowed Item IDs[\s\S]*?patternsCard,[\s\S]*?renderAllowedRaritiesEditor/);
  assert.doesNotMatch(matchingRulesEditor, /<h3>Regex → Item IDs<\/h3>/);
  assert.doesNotMatch(matchingRulesEditor, /id="openRegexToItemIds"/);
  assert.match(styles, /\.pattern-converter-action\s*\{[\s\S]*?margin-left:\s*auto;[\s\S]*?max-width:\s*100%;[\s\S]*?white-space:\s*normal;/);
});

test('RGB blur restores committed values and only dirties actual component changes', () => {
  const source = read('src/ui/colorEditor.js');
  const rgbBlock = source.match(/function makeRgbaNumber\(label, getValue, setValue\) \{(?<body>[\s\S]*?)\n  \}/)?.groups.body ?? '';

  assert.match(source, /export function normalizeRgbInputValue/);
  assert.match(rgbBlock, /let lastCommitted = getValue\(\);/);
  assert.match(rgbBlock, /function synchronizeFromColor\(\) \{[\s\S]*?input\.value = String\(displayedValue\);[\s\S]*?lastCommitted = displayedValue;[\s\S]*?\}/);
  assert.match(rgbBlock, /rgbControls\.push\(\{ synchronizeFromColor \}\);/);
  assert.match(rgbBlock, /if \(getValue\(\) === n\) return false;/);
  assert.match(rgbBlock, /const n = normalizeRgbInputValue\(e\.target\.value, lastCommitted\);/);
  assert.match(rgbBlock, /e\.target\.value = String\(n\);/);
  assert.match(rgbBlock, /markDirty\(\);\s*scheduleRenderList\(\);/);
  assert.match(source, /function updateColorVisuals\(\) \{[\s\S]*?for \(const control of rgbControls\) control\.synchronizeFromColor\(\);[\s\S]*?committedHex = hex;/);
});

test('preferences tabs support arrow-key navigation and roving tabindex', () => {
  const source = read('src/ui/preferencesModal.js');

  for (const token of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /setAttribute\('tabindex', selected \? '0' : '-1'\)/);
  assert.match(source, /nextTab\.focus\(\)/);
  assert.match(source, /role="tablist"[\s\S]*?role="tab"[\s\S]*?aria-selected="true"[\s\S]*?tabindex="0"/);
  assert.match(source, /role="tabpanel"[^>]*aria-labelledby="appearancePreferencesTab"/);
  assert.match(source, /role="tabpanel"[^>]*aria-labelledby="behaviorPreferencesTab"/);
});

test('app shell keeps 100vh fallback and adds dynamic viewport height', () => {
  const styles = read('styles.css');
  const appRule = styles.match(/\.app\s*\{(?<body>[\s\S]*?)\n\}/)?.groups.body ?? '';

  assert.match(appRule, /height:\s*100vh;/);
  assert.match(appRule, /height:\s*100dvh;/);
});
