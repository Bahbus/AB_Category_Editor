import test from 'node:test';
import assert from 'node:assert/strict';

import fs from 'node:fs';

import { RARITIES } from '../src/constants.js';
import { STATE_FILTER_OPTIONS, rangeSliderBounds, stateFilterLabel } from '../src/ui/formControls.js';

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

test('number controls commit finite input events without committing empty partial values', () => {
  const formControlsSource = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  const categoryEditorSource = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');
  assert.match(formControlsSource, /input\.oninput = e =>/);
  assert.match(formControlsSource, /String\(rawValue\)\.trim\(\) === ''/);
  assert.match(formControlsSource, /minNumber\.oninput = \(\) => commitFiniteNumberInput/);
  assert.match(categoryEditorSource, /input\.oninput = e =>/);
});

test('hidden range validation keeps hidden display precedence', () => {
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.validation-list\[hidden\],\s*\.range-validation\[hidden\]\s*{\s*display: none !important;/);
});
