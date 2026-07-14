import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';

import { RARITIES } from '../src/constants.js';
import { validateCategoryOrder } from '../src/validation.js';
import {
  applyNumberCommit,
  applyRangeValueChange,
  createNumberCommitState,
  decideRangeValueChange,
  numberInputDisplayValue,
  STATE_FILTER_OPTIONS,
  rangeSliderBounds,
  stateFilterLabel
} from '../src/ui/formControls.js';

test('rarity labels hide internal numeric values', () => {
  assert.deepEqual(RARITIES.map(rarity => rarity.label), ['Common', 'Uncommon', 'Rare', 'Relic', 'Aetherial']);
  assert.deepEqual(RARITIES.map(rarity => rarity.id), [1, 2, 3, 4, 7]);
  for (const rarity of RARITIES) {
    assert.doesNotMatch(rarity.label, /\d/);
  }
});

test('state filter options preserve numeric values with friendly labels', () => {
  assert.deepEqual(STATE_FILTER_OPTIONS.map(option => option.value), [0, 1, 2]);
  assert.deepEqual(STATE_FILTER_OPTIONS.map(option => option.label), ['Ignored', 'Required', 'Excluded']);
  assert.equal(stateFilterLabel(0), 'Ignored');
  assert.equal(stateFilterLabel(1), 'Required');
  assert.equal(stateFilterLabel(2), 'Excluded');
  assert.equal(stateFilterLabel(99), 'Ignored');
});

test('rangeSliderBounds includes current values without clamping unusual imports', () => {
  assert.deepEqual(rangeSliderBounds(10, 90, { min: 0, max: 100 }), { min: 0, max: 100 });
  assert.deepEqual(rangeSliderBounds(-50, 500, { min: 0, max: 100 }), { min: -50, max: 500 });
  assert.deepEqual(rangeSliderBounds(25, 10, { min: 0, max: 20 }), { min: 0, max: 25 });
  assert.deepEqual(rangeSliderBounds(5, 5, { min: 5, max: 5 }), { min: 5, max: 6 });
});

test('range value decisions distinguish invalid, unchanged, and changed values', () => {
  assert.deepEqual(decideRangeValueChange(10, NaN), { valid: false, changed: false, value: 10 });
  assert.deepEqual(decideRangeValueChange(10, 10), { valid: true, changed: false, value: 10 });
  assert.deepEqual(decideRangeValueChange(10, 11), { valid: true, changed: true, value: 11 });
});

test('range value application is a no-op for same values and notifies once for a real change', () => {
  const range = { Min: 10, Max: 20 };
  let notifications = 0;
  const notify = () => { notifications++; };

  assert.equal(applyRangeValueChange(range, 'Min', 10, notify), false);
  assert.deepEqual(range, { Min: 10, Max: 20 });
  assert.equal(notifications, 0);

  assert.equal(applyRangeValueChange(range, 'Min', 12, notify), true);
  assert.deepEqual(range, { Min: 12, Max: 20 });
  assert.equal(notifications, 1);

  assert.equal(applyRangeValueChange(range, 'Min', 12, notify), false);
  assert.deepEqual(range, { Min: 12, Max: 20 });
  assert.equal(notifications, 1);
});

test('native-sanitized accepted numeric strings receive canonical display values without model rewrites', () => {
  for (const [jsonValue, expectedDisplay] of [['  +7  ', '7'], ['0x10', '16']]) {
    let commits = 0;
    const displayValue = numberInputDisplayValue(jsonValue, '');
    const decision = applyNumberCommit(
      createNumberCommitState(jsonValue, displayValue),
      displayValue,
      () => { commits++; }
    );

    assert.equal(displayValue, expectedDisplay);
    assert.equal(decision.changed, false);
    assert.strictEqual(decision.state.jsonValue, jsonValue);
    assert.equal(commits, 0);
  }
});

test('browser-representable accepted numeric strings retain the browser display', () => {
  for (const displayValue of ['7', '0012', '-3.5', '1e3']) {
    assert.equal(numberInputDisplayValue(displayValue, displayValue), displayValue);
  }
});

test('invalid committed number values retain the browser blank or invalid display', () => {
  for (const value of [null, undefined, '', '   ', true, false, [], {}, 'nope']) {
    assert.equal(numberInputDisplayValue(value, ''), '');
  }
  assert.equal(numberInputDisplayValue([1], '1'), '1');
});

test('number commit state preserves valid JSON values and accepted numeric strings on numeric no-ops', () => {
  for (const value of [0, 12.5, -3, '0', '0012', '  +7  ']) {
    let commits = 0;
    const state = createNumberCommitState(value, String(value));
    const decision = applyNumberCommit(state, String(state.numberValue), () => { commits++; });
    assert.equal(decision.inputValid, true);
    assert.equal(decision.changed, false);
    assert.strictEqual(decision.state.jsonValue, value);
    assert.equal(commits, 0);
  }
});

test('invalid committed number values stay untouched on blank and non-committing input', () => {
  const cases = [null, undefined, '', '   ', true, false, [], [1], {}, 'nope'];
  for (const value of cases) {
    const displayed = Array.isArray(value) && value.length === 1 ? String(value[0]) : '';
    let commits = 0;
    const initial = createNumberCommitState(value, displayed);
    const blank = applyNumberCommit(initial, '', () => { commits++; });
    const unchangedDisplay = applyNumberCommit(initial, displayed, () => { commits++; });

    assert.equal(blank.changed, false);
    assert.strictEqual(blank.state.jsonValue, value);
    assert.equal(unchangedDisplay.changed, false);
    assert.strictEqual(unchangedDisplay.state.jsonValue, value);
    assert.equal(commits, 0);
  }
});

test('a deliberate finite correction replaces an invalid number once and makes later blur a no-op', () => {
  const invalid = { preserved: true };
  const category = { Order: invalid };
  let commits = 0;
  let committedValue = invalid;
  assert.equal(validateCategoryOrder(category).length, 1);
  const first = applyNumberCommit(createNumberCommitState(invalid, ''), '42', value => {
    commits++;
    committedValue = value;
    category.Order = value;
  });
  const blur = applyNumberCommit(first.state, '42', () => { commits++; });

  assert.equal(first.changed, true);
  assert.equal(first.state.numberValue, 42);
  assert.equal(committedValue, 42);
  assert.deepEqual(validateCategoryOrder(category), []);
  assert.equal(blur.changed, false);
  assert.equal(commits, 1);
});

test('editing away from an invalid numeric-looking array makes a same-display finite correction deliberate', () => {
  const invalid = [1];
  let commits = 0;
  const initial = createNumberCommitState(invalid, '1');
  const cleared = applyNumberCommit(initial, '', () => { commits++; });
  const corrected = applyNumberCommit(cleared.state, '1', () => { commits++; });

  assert.equal(cleared.changed, false);
  assert.equal(corrected.changed, true);
  assert.equal(corrected.state.jsonValue, 1);
  assert.equal(commits, 1);
});


test('switch markup relies on native checked state instead of mirrored aria-checked', () => {
  const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  assert.doesNotMatch(indexHtml, /aria-checked/);
  assert.doesNotMatch(formControlsSource, /aria-checked/);
});

test('segmented state filter legends are accessible without repeating visible headings', () => {
  const categoryEditorSource = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  assert.match(categoryEditorSource, /segmentedControl\(displayFilterName\(filterName\)/);
  assert.match(formControlsSource, /<legend class="sr-only">\$\{escapeHtml\(label\)\}<\/legend>/);
});


test('text controls can refresh validation during input', () => {
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  const categoryEditorSource = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');
  assert.match(formControlsSource, /options\.validateOnInput/);
  assert.match(formControlsSource, /typeof options\.onBlur === 'function'/);
  assert.ok(formControlsSource.includes('onChange(e.target.value);\n    if (options.validateOnInput) setValidation'));
  assert.match(categoryEditorSource, /textInput\('Description',[\s\S]*validateOnInput: true/);
  assert.match(categoryEditorSource, /textInput\('Name',[\s\S]*validateOnInput: true/);
});

test('number controls commit finite input events without committing empty partial values', () => {
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  const categoryEditorSource = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');
  assert.match(formControlsSource, /input\.oninput = e =>/);
  assert.match(formControlsSource, /const input = wrap\.querySelector\('input'\);[\s\S]*?input\.value = numberInputDisplayValue\(value, input\.value\);/);
  assert.match(formControlsSource, /createNumberCommitState\(value, input\.value\)/);
  assert.match(formControlsSource, /applyNumberCommit\(committed, rawValue, onChange, bounds\)/);
  assert.match(formControlsSource, /options\.validate\(committed\.jsonValue\)/);
  assert.match(formControlsSource, /function restoreCommittedValue\(\) \{[\s\S]*?input\.value = numberInputDisplayValue\(committed\.jsonValue, input\.value\);/);
  assert.doesNotMatch(formControlsSource, /Number\(value\) \|\| 0/);
  assert.match(formControlsSource, /minNumber\.oninput = \(\) => commitFiniteNumberInput/);
  assert.match(categoryEditorSource, /input\.oninput = e =>/);
});

test('hidden range validation keeps hidden display precedence', () => {
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.validation-list\[hidden\],\s*\.range-validation\[hidden\]\s*{\s*display: none !important;/);
});

test('range validation associates both number inputs with its generated message only while invalid', () => {
  const source = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');

  assert.match(source, /const validationId = makeControlId\('range-validation'\);/);
  assert.match(source, /<p id="\$\{validationId\}" class="hint range-validation" hidden>/);
  assert.match(source, /const hasRangeIssue = reversed \|\| nonFinite;/);
  assert.match(source, /for \(const input of \[minNumber, maxNumber\]\) \{[\s\S]*?input\.setAttribute\('aria-invalid', hasRangeIssue \? 'true' : 'false'\);[\s\S]*?if \(hasRangeIssue\) input\.setAttribute\('aria-describedby', validationId\);[\s\S]*?else input\.removeAttribute\('aria-describedby'\);[\s\S]*?\}/);
});
