import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';

import { RARITIES } from '../src/constants.js';
import { validateCategoryOrder } from '../src/validation.js';
import { isSignedInt32Scalar } from '../src/filterScalars.js';
import {
  applyNumberCommit,
  applyRangeValueChange,
  createNumberCommitState,
  decideRangeInputChange,
  decideRangeValueChange,
  numberInputDisplayValue,
  numberInputStoredDisplayValue,
  rangeSliderBounds,
  rangeInputErrorMessage,
  rangeValidationState
} from '../src/ui/formControls.js';

test('rarity labels hide internal numeric values', () => {
  assert.deepEqual(RARITIES.map(rarity => rarity.label), ['Common', 'Uncommon', 'Rare', 'Relic', 'Aetherial']);
  assert.deepEqual(RARITIES.map(rarity => rarity.id), [1, 2, 3, 4, 7]);
  for (const rarity of RARITIES) {
    assert.doesNotMatch(rarity.label, /\d/);
  }
});

test('rangeSliderBounds includes current values without clamping unusual imports', () => {
  assert.deepEqual(rangeSliderBounds(10, 90, { min: 0, max: 100 }), { min: 0, max: 100 });
  assert.deepEqual(rangeSliderBounds(-50, 500, { min: 0, max: 100 }), { min: -50, max: 500 });
  assert.deepEqual(rangeSliderBounds(25, 10, { min: 0, max: 20 }), { min: 0, max: 25 });
  assert.deepEqual(rangeSliderBounds(5, 5, { min: 5, max: 5 }), { min: 5, max: 6 });
});

test('range value decisions distinguish invalid, unchanged, and changed values', () => {
  assert.deepEqual(decideRangeValueChange(10, NaN), { valid: false, changed: false, value: 10 });
  assert.deepEqual(decideRangeValueChange(10, 1.5), { valid: false, changed: false, value: 10 });
  assert.deepEqual(decideRangeValueChange(10, 10), { valid: true, changed: false, value: 10 });
  assert.deepEqual(decideRangeValueChange(10, 11), { valid: true, changed: true, value: 11 });
});

test('range typed-input decisions reject blank, fractions, and negative Vendor Price without mutation', () => {
  for (const rawValue of ['', ' ', '1.5', '-1', 'not-a-number']) {
    const decision = decideRangeInputChange(10, rawValue, { minimum: 0, maximum: 0xFFFFFFFF });
    assert.deepEqual(decision, { valid: false, changed: false, value: 10 });
  }
  assert.deepEqual(decideRangeInputChange(10, '11', { minimum: 0 }), { valid: true, changed: true, value: 11 });
  assert.deepEqual(decideRangeInputChange(-5, '-7'), { valid: true, changed: true, value: -7 });
});

test('range typed-input decisions enforce signed Int32 and exact uint boundaries', () => {
  for (const value of [-2147483648, 2147483647]) {
    assert.deepEqual(decideRangeInputChange(0, String(value)), { valid: true, changed: true, value });
  }
  for (const value of [-2147483649, 2147483648]) {
    assert.deepEqual(decideRangeInputChange(0, String(value)), { valid: false, changed: false, value: 0 });
  }
  const uintOptions = { minimum: 0, maximum: 4294967295 };
  for (const value of [0, 4294967295]) assert.equal(decideRangeInputChange(1, String(value), uintOptions).valid, true);
  for (const value of [-1, 4294967296]) {
    assert.deepEqual(decideRangeInputChange(1, String(value), uintOptions), { valid: false, changed: false, value: 1 });
  }
});

test('range validation state keeps component errors specific and reversed ranges shared', () => {
  const maxOnly = rangeValidationState(
    { Min: 10, Max: 20 },
    { Max: rangeInputErrorMessage('Max', '4294967296', { minimum: 0, maximum: 4294967295 }) },
    { minimum: 0, maximum: 4294967295 }
  );
  assert.deepEqual(maxOnly.Min, { invalid: false, describedBy: false });
  assert.deepEqual(maxOnly.Max, { invalid: true, describedBy: true });
  assert.match(maxOnly.message, /Maximum must be no greater than 4294967295/);
  assert.doesNotMatch(maxOnly.message, /non-negative/);

  const storedMinOnly = rangeValidationState({ Min: -2147483649, Max: 20 });
  assert.deepEqual(storedMinOnly.Min, { invalid: true, describedBy: true });
  assert.deepEqual(storedMinOnly.Max, { invalid: false, describedBy: false });
  assert.match(storedMinOnly.message, /Minimum must be at least -2147483648/);

  const reversed = rangeValidationState({ Min: 20, Max: 10 });
  assert.deepEqual(reversed.Min, { invalid: true, describedBy: true });
  assert.deepEqual(reversed.Max, { invalid: true, describedBy: true });
  assert.equal(reversed.reversed, true);
  assert.equal(reversed.hasError, false);
});

test('range messages are optional and support translated labels, bounds, and reversed warnings', () => {
  const messages = {
    minimum: 'Lower',
    maximum: 'Upper',
    minimumSlider: filter => `${filter} lower`,
    maximumSlider: filter => `${filter} upper`,
    integer: component => `${component}: integer`,
    atLeast: (component, minimum) => `${component}: >= ${minimum}`,
    noGreater: (component, maximum) => `${component}: <= ${maximum}`,
    bounds: (component, minimum, maximum) => `${component}: ${minimum}..${maximum}`,
    reversed: 'Lower exceeds upper.'
  };

  assert.equal(rangeInputErrorMessage('Min', '', {}, messages), 'Lower: integer');
  assert.equal(rangeInputErrorMessage('Min', '-1', { minimum: 0 }, messages), 'Lower: >= 0');
  assert.equal(rangeInputErrorMessage('Max', '11', { maximum: 10 }, messages), 'Upper: <= 10');
  assert.equal(rangeInputErrorMessage('Max', 'nope', { minimum: 0, maximum: 10 }, messages), 'Upper: integer');
  assert.equal(rangeValidationState({ Min: 20, Max: 10 }, {}, {}, messages).message, 'Lower exceeds upper.');
});

test('invalid range applications do not mutate or notify and valid integers notify exactly once', () => {
  const range = { Min: 10, Max: 20 };
  let notifications = 0;
  const notify = () => { notifications++; };
  assert.equal(applyRangeValueChange(range, 'Min', 1.5, notify), false);
  assert.equal(applyRangeValueChange(range, 'Min', -1, notify, { minimum: 0 }), false);
  assert.deepEqual(range, { Min: 10, Max: 20 });
  assert.equal(notifications, 0);
  assert.equal(applyRangeValueChange(range, 'Min', 11, notify, { minimum: 0 }), true);
  assert.equal(applyRangeValueChange(range, 'Min', 11, notify, { minimum: 0 }), false);
  assert.deepEqual(range, { Min: 11, Max: 20 });
  assert.equal(notifications, 1);
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

test('strict sort controls can display preserved incompatible JSON values exactly', () => {
  assert.equal(numberInputStoredDisplayValue('0x10'), '0x10');
  assert.equal(numberInputStoredDisplayValue('9007199254740993'), '9007199254740993');
  assert.equal(numberInputStoredDisplayValue(null), 'null');
  assert.equal(numberInputStoredDisplayValue(true), 'true');
  assert.equal(numberInputStoredDisplayValue([1]), '[1]');
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

test('Order and Priority commit decisions accept Int32 boundaries and reject incompatible input without mutation', () => {
  for (const value of [-2147483648, 2147483647]) {
    const decision = applyNumberCommit(createNumberCommitState(0, '0'), String(value), () => {}, { validateNumber: isSignedInt32Scalar });
    assert.equal(decision.inputValid, true);
    assert.equal(decision.state.jsonValue, value);
  }
  for (const value of ['1.5', '2147483648', '-2147483649', 'Infinity', '', 'true', 'null']) {
    let commits = 0;
    const state = createNumberCommitState(7, '7');
    const decision = applyNumberCommit(state, value, () => { commits++; }, { validateNumber: isSignedInt32Scalar });
    assert.equal(decision.inputValid, false, value);
    assert.equal(decision.changed, false);
    assert.equal(decision.state.jsonValue, 7);
    assert.equal(commits, 0);
  }
});

test('explicit same-text edits can correct preserved numeric strings without changing numeric no-ops', () => {
  let corrected = null;
  const stringState = { ...createNumberCommitState('1', '1'), diverged: true };
  const correction = applyNumberCommit(stringState, '1', value => { corrected = value; }, {
    validateNumber: isSignedInt32Scalar,
    requireJsonNumber: true
  });
  assert.equal(correction.changed, true);
  assert.equal(correction.state.jsonValue, 1);
  assert.equal(corrected, 1);

  let numericCommits = 0;
  const numericState = { ...createNumberCommitState(1, '1'), diverged: true };
  assert.equal(applyNumberCommit(numericState, '1', () => { numericCommits++; }, {
    validateNumber: isSignedInt32Scalar,
    requireJsonNumber: true
  }).changed, false);
  assert.equal(numericCommits, 0);
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
  const categoryEditorSource = fs.readFileSync(new URL('../src/ui/rangeStateFiltersEditor.js', import.meta.url), 'utf8');
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  assert.match(categoryEditorSource, /segmentedControl\(messages\.stateGroup\(filterName\), obj\.State \?\? 0, messages\.stateOptions/);
  assert.match(formControlsSource, /<legend class="sr-only">\$\{escapeHtml\(label\)\}<\/legend>/);
});


test('text controls can refresh validation during input', () => {
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  const basicEditorSource = fs.readFileSync(new URL('../src/ui/basicEditor.js', import.meta.url), 'utf8');
  assert.match(formControlsSource, /options\.validateOnInput/);
  assert.match(formControlsSource, /typeof options\.onBlur === 'function'/);
  assert.ok(formControlsSource.includes('onChange(e.target.value);\n    if (options.validateOnInput) setValidation'));
  assert.match(basicEditorSource, /textInput\(messages\.description,[\s\S]*validateOnInput: true/);
  assert.match(basicEditorSource, /textInput\(messages\.name,[\s\S]*validateOnInput: true/);
});

test('number controls commit finite input events without committing empty partial values', () => {
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  const colorEditorSource = fs.readFileSync(new URL('../src/ui/colorEditor.js', import.meta.url), 'utf8');
  assert.match(formControlsSource, /input\.oninput = e =>/);
  assert.match(formControlsSource, /const input = wrap\.querySelector\('input'\);[\s\S]*?input\.value = preserveStoredDisplay \? numberInputStoredDisplayValue\(value\) : numberInputDisplayValue\(value, input\.value\);/);
  assert.match(formControlsSource, /createNumberCommitState\(value, input\.value\)/);
  assert.match(formControlsSource, /applyNumberCommit\(committed, rawValue, onChange, \{ \.\.\.bounds, validateNumber: options\.validateNumber, requireJsonNumber: options\.requireJsonNumber \}\)/);
  assert.match(formControlsSource, /options\.validate\(committed\.jsonValue\)/);
  assert.match(formControlsSource, /function restoreCommittedValue\(\) \{[\s\S]*?numberInputStoredDisplayValue\(committed\.jsonValue\)[\s\S]*?numberInputDisplayValue\(committed\.jsonValue, input\.value\);/);
  assert.doesNotMatch(formControlsSource, /Number\(value\) \|\| 0/);
  assert.match(formControlsSource, /minNumber\.oninput = \(\) => commitFiniteNumberInput/);
  assert.match(colorEditorSource, /input\.oninput = e =>/);
});

test('hidden range validation keeps hidden display precedence', () => {
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.validation-list\[hidden\],\s*\.range-validation\[hidden\]\s*{\s*display: none !important;/);
});

test('range validation applies per-component accessibility while retaining shared reversed warnings', () => {
  const source = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');

  assert.match(source, /const validationId = makeControlId\('range-validation'\);/);
  assert.match(source, /<p id="\$\{validationId\}" class="hint range-validation" hidden>/);
  assert.match(source, /const validity = rangeValidationState\(rangeObj, inputErrors, valueOptions, messages\);/);
  assert.match(source, /for \(const \[input, component\] of \[\[minNumber, validity\.Min\], \[maxNumber, validity\.Max\]\]\) \{[\s\S]*?input\.setAttribute\('aria-invalid', component\.invalid \? 'true' : 'false'\);[\s\S]*?if \(component\.describedBy\) input\.setAttribute\('aria-describedby', validationId\);/);
});
