import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  getBasicSwitchWarnings,
  rangeFiltersSummary,
  rangeFiltersSummaryParts,
  stateFiltersSummary,
  stateFiltersSummaryParts
} from '../src/ui/categoryEditor.js';
import { renderDetailsSummaryHtml } from '../src/ui/detailsSummary.js';

test('rangeFiltersSummaryParts returns no badges for inactive valid ranges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({}), {
    title: 'Range Filters',
    badges: [],
    issueCount: 0
  });
  assert.equal(rangeFiltersSummary({}), 'Range Filters');
});


test('renderDetailsSummaryHtml always includes stable empty badge slot', () => {
  const html = renderDetailsSummaryHtml(rangeFiltersSummaryParts({}));
  assert.match(html, /details-summary-title">Range Filters<\/span><span class="details-summary-badges"><\/span>/);
  assert.doesNotMatch(html, /ui-badge/);
});

test('renderDetailsSummaryHtml renders active badges inside stable badge slot without issue badges', () => {
  const html = renderDetailsSummaryHtml(rangeFiltersSummaryParts({ Level: { Enabled: true, Min: 10, Max: 1 } }));
  assert.match(html, /<span class="details-summary-badges"><span class="ui-badge details-summary-badge success ui-badge-success">Level<\/span><\/span>/);
  assert.doesNotMatch(html, /ui-badge-warning|1 issue/);
});

test('rangeFiltersSummaryParts returns active range badges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true } }).badges, [
    { label: 'Level', tone: 'success' }
  ]);
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true }, ItemLevel: { Enabled: true } }).badges, [
    { label: 'Level', tone: 'success' },
    { label: 'Item Level', tone: 'success' }
  ]);
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true }, ItemLevel: { Enabled: true }, VendorPrice: { Enabled: true } }).badges, [
    { label: '3 active', tone: 'success' }
  ]);
});

test('rangeFiltersSummaryParts preserves issue count without adding issue badges for invalid ranges', () => {
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: false, Min: 20, Max: 10 } }), {
    title: 'Range Filters',
    badges: [],
    issueCount: 1
  });
  assert.deepEqual(rangeFiltersSummaryParts({ Level: { Enabled: true, Min: 20, Max: 10 } }), {
    title: 'Range Filters',
    badges: [{ label: 'Level', tone: 'success' }],
    issueCount: 1
  });
});

test('stateFiltersSummaryParts returns no badges for inactive valid states', () => {
  assert.deepEqual(stateFiltersSummaryParts({}), {
    title: 'State Filters',
    badges: [],
    issueCount: 0
  });
  assert.equal(stateFiltersSummary({}), 'State Filters');
});

test('stateFiltersSummaryParts returns required and excluded badges', () => {
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 1 } }).badges, [
    { label: '2 required', tone: 'required' }
  ]);
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 2 } }).badges, [
    { label: '1 excluded', tone: 'excluded' }
  ]);
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 1 }, Repairable: { State: 2 } }).badges, [
    { label: '2 required', tone: 'required' },
    { label: '1 excluded', tone: 'excluded' }
  ]);
});

test('stateFiltersSummaryParts preserves state counts and issue count without adding issue badges', () => {
  assert.deepEqual(stateFiltersSummaryParts({ Unique: { State: 1 }, Dyeable: { State: 7 }, Repairable: { State: 2 } }), {
    title: 'State Filters',
    badges: [
      { label: '1 required', tone: 'required' },
      { label: '1 excluded', tone: 'excluded' }
    ],
    issueCount: 1
  });
  assert.deepEqual(stateFiltersSummaryParts({ Dyeable: { State: 7 } }), {
    title: 'State Filters',
    badges: [],
    issueCount: 1
  });
});

test('getBasicSwitchWarnings returns disabled pinned warning', () => {
  assert.deepEqual(getBasicSwitchWarnings({ Enabled: false, Pinned: true }).map(item => item.message), [
    'Disabled categories should usually not be pinned.'
  ]);
  assert.deepEqual(getBasicSwitchWarnings({ Enabled: true, Pinned: true }), []);
});


test('title and summary CSS use shared alignment tokens', () => {
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /--title-control-height:\s*2rem;/);
  assert.match(styles, /--summary-content-height:\s*var\(--badge-height\);/);
  assert.match(styles, /--summary-padding-block:\s*10px;/);
  assert.match(styles, /--title-line-height:\s*1;/);
  assert.match(styles, /--heading-optical-y:\s*-1px;/);
  assert.match(styles, /\.category-header-title-row\s*{[^}]*min-height:\s*var\(--title-control-height\)/s);
  assert.match(styles, /\.flush-heading\s*{[^}]*min-height:\s*var\(--title-control-height\)/s);
  assert.match(styles, /\.category-header-title-row \.flush-heading\s*{[^}]*transform:\s*translateY\(var\(--heading-optical-y\)\)/s);
  assert.match(styles, /\.details-summary-content\s*{[^}]*min-height:\s*var\(--summary-content-height,\s*var\(--badge-height\)\)/s);
  assert.match(styles, /\.details-summary-title\s*{[^}]*min-height:\s*var\(--summary-content-height,\s*var\(--badge-height\)\)/s);
  assert.match(styles, /\.details-summary-badges\s*{[^}]*min-height:\s*var\(--summary-content-height,\s*var\(--badge-height\)\)/s);
  assert.doesNotMatch(styles, /\.details-summary-(?:content|title|badges)\s*{[^}]*var\(--title-control-height\)/s);
  assert.match(styles, /:root\[data-density="compact"\]\s*{[^}]*--summary-padding-block:\s*7px;/s);
});

test('range issue slider source and styles expose invalid fill state', () => {
  const source = fs.readFileSync(new URL('../src/ui/formControls.js', import.meta.url), 'utf8');
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  assert.match(source, /wrap\.classList\.toggle\('has-range-issue',\s*reversed \|\| nonFinite\)/);
  assert.match(source, /wrap\.classList\.toggle\('has-range-warning',\s*!nonFinite && reversed\)/);
  assert.match(source, /wrap\.classList\.toggle\('has-range-error',\s*nonFinite\)/);
  assert.match(styles, /\.range-slider-control\.has-range-issue \.range-slider-fill/);
  assert.match(styles, /\.range-slider-control\.has-range-warning \.range-slider-fill\s*{[^}]*var\(--warn\)/s);
  assert.match(styles, /\.range-slider-control\.has-range-error \.range-slider-fill\s*{[^}]*var\(--danger\)/s);
});

test('category list source does not import single-row issue count helper', () => {
  const source = fs.readFileSync(new URL('../src/ui/categoryList.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import\s*{[^}]*getCategoryIssueCount[,\s}]/);
  assert.match(source, /getCategoryIssueCounts/);
});

test('details summary keeps native disclosure marker display', () => {
  const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  const summaryRule = styles.match(/details\.card > summary\s*{(?<body>[^}]*)}/s)?.groups.body ?? '';
  assert.doesNotMatch(summaryRule, /display:\s*flex/);
  assert.match(summaryRule, /display:\s*list-item/);
});

test('setDetailsSummary updates stable summary parts without replacing summary html', () => {
  const source = fs.readFileSync(new URL('../src/ui/detailsSummary.js', import.meta.url), 'utf8');
  assert.match(source, /function ensureDetailsSummaryParts\(details\)/);
  assert.match(source, /summaryParts\.title\.textContent/);
  assert.match(source, /summaryParts\.badges\.replaceChildren/);
  assert.doesNotMatch(source, /summary\.innerHTML\s*=\s*renderDetailsSummaryHtml/);
});


test('category editor uses shared range defaults and advanced stable summary path', () => {
  const source = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');

  assert.match(source, /for \(const filter of RANGE_FILTERS\)/);
  assert.match(source, /const defaults = \{ min: filter\.defaults\.Min, max: filter\.defaults\.Max \}/);
  assert.doesNotMatch(source, /max:\s*100000/);
  assert.doesNotMatch(source, /max:\s*key === 'Level' \? 100 : 800/);
  assert.match(source, /setDetailsSummary\(advanced, \{ title: 'Advanced', badges: \[\], issueCount: 0 \}\)/);
});

test('color editor schedules high-frequency sidebar renders and keeps immediate hex commits', () => {
  const source = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');
  assert.match(source, /function createScheduledRenderList\(renderList\)/);
  assert.match(source, /const scheduleRenderList = createScheduledRenderList\(renderList\)/);
  assert.match(source, /picker\.oninput = e => \{[\s\S]*?markDirty\(\);[\s\S]*?scheduleRenderList\(\);[\s\S]*?\};/);
  assert.match(source, /alphaSlider\.oninput = e => \{[\s\S]*?markDirty\(\);[\s\S]*?scheduleRenderList\(\);[\s\S]*?\};/);
  assert.match(source, /function applyHexInput\(\) \{[\s\S]*?markDirtyAndRenderList\(\);[\s\S]*?return true;/);
});

test('icon and action controls have accessible labels', () => {
  const listSource = fs.readFileSync(new URL('../src/ui/categoryList.js', import.meta.url), 'utf8');
  const editorSource = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');
  const indexSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(listSource, /aria-label="Pinned"/);
  assert.match(listSource, /aria-hidden="true" focusable="false"/);
  assert.match(indexSource, /id="showHelp"[^>]*aria-label="About \/ Help"/);
  assert.match(editorSource, /setAttribute\('aria-label', label\)/);
});

test('regex tool and help modal source text stay current', () => {
  const regexSource = fs.readFileSync(new URL('../src/tools/regexToItemIds.js', import.meta.url), 'utf8');
  const helpSource = fs.readFileSync(new URL('../src/ui/helpModal.js', import.meta.url), 'utf8');

  assert.doesNotMatch(regexSource, /class="[^"]*"\s+class=/);
  assert.match(regexSource, /class="grid cols-3 modal-action-row"/);
  assert.doesNotMatch(helpSource, /checkbox style/i);
  assert.match(helpSource, /comfortable\/compact density/);
});

test('shared state filters are imported by validation and editor', () => {
  const validationSource = fs.readFileSync(new URL('../src/validation.js', import.meta.url), 'utf8');
  const editorSource = fs.readFileSync(new URL('../src/ui/categoryEditor.js', import.meta.url), 'utf8');

  assert.match(validationSource, /import \{ ALLOWED_RARITY_IDS, RANGE_FILTER_KEYS, STATE_FILTER_KEYS \}/);
  assert.doesNotMatch(validationSource, /export const STATE_FILTER_KEYS = \[/);
  assert.match(editorSource, /STATE_FILTERS, STATE_FILTER_KEYS/);
  assert.doesNotMatch(editorSource, /const STATE_FILTER_KEYS = \[/);
});
