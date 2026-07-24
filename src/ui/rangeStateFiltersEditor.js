import { RANGE_FILTERS, STATE_FILTER_KEYS } from '../constants.js';
import { escapeHtml, requireScopedEl } from '../dom.js';
import { INT32_MAX, INT32_MIN, UINT32_MAX } from '../filterScalars.js';
import { setDetailsSummary } from './detailsSummary.js';
import { rangeSliderControl, segmentedControl, switchInput } from './formControls.js';
import { rangeFiltersSummaryParts, stateFiltersSummaryParts } from './filterSummary.js';

const RANGE_FILTER_MESSAGE_KEYS = new Map([
  ['Level', 'rangeState.range.level.label'],
  ['ItemLevel', 'rangeState.range.itemLevel.label'],
  ['VendorPrice', 'rangeState.range.vendorPrice.label']
]);

const STATE_FILTER_MESSAGE_KEYS = new Map([
  ['Untradable', 'rangeState.state.untradable.label'],
  ['Unique', 'rangeState.state.unique.label'],
  ['Collectable', 'rangeState.state.collectable.label'],
  ['Dyeable', 'rangeState.state.dyeable.label'],
  ['Repairable', 'rangeState.state.repairable.label'],
  ['HighQuality', 'rangeState.state.highQuality.label'],
  ['Desynthesizable', 'rangeState.state.desynthesizable.label'],
  ['Glamourable', 'rangeState.state.glamourable.label'],
  ['FullySpiritbonded', 'rangeState.state.fullySpiritbonded.label']
]);

function translatedStableLabel(translate, keys, family, key) {
  const messageKey = keys.get(key);
  if (!messageKey) throw new Error(`Unknown ${family} filter key: ${key}`);
  return translate(messageKey);
}

export function createRangeStateFilterMessages(translate) {
  const rangeLabel = key => translatedStableLabel(translate, RANGE_FILTER_MESSAGE_KEYS, 'Range', key);
  const stateLabel = key => translatedStableLabel(translate, STATE_FILTER_MESSAGE_KEYS, 'State', key);
  const minimum = translate('rangeState.range.minimum.label');
  const maximum = translate('rangeState.range.maximum.label');
  return Object.freeze({
    rangeTitle: translate('rangeState.range.title'),
    rangeActive: count => translate(count === 1 ? 'rangeState.range.summary.active.one' : 'rangeState.range.summary.active.many', { count }),
    rangeLabel,
    enabled: translate('rangeState.range.enabled.label'),
    rangeControls: Object.freeze({
      minimum,
      maximum,
      minimumSlider: filter => translate('rangeState.range.minimumSlider.accessible', { filter }),
      maximumSlider: filter => translate('rangeState.range.maximumSlider.accessible', { filter }),
      integer: component => translate('rangeState.range.validation.integer', { component }),
      atLeast: (component, bound) => translate('rangeState.range.validation.minimum', { component, minimum: bound }),
      noGreater: (component, bound) => translate('rangeState.range.validation.maximum', { component, maximum: bound }),
      bounds: (component, lower, upper) => translate('rangeState.range.validation.bounds', { component, minimum: lower, maximum: upper }),
      reversed: translate('rangeState.range.validation.reversed')
    }),
    stateTitle: translate('rangeState.state.title'),
    stateRequired: count => translate(count === 1 ? 'rangeState.state.summary.required.one' : 'rangeState.state.summary.required.many', { count }),
    stateExcluded: count => translate(count === 1 ? 'rangeState.state.summary.excluded.one' : 'rangeState.state.summary.excluded.many', { count }),
    stateLabel,
    stateGroup: key => translate('rangeState.state.group.accessible', { filter: stateLabel(key) }),
    stateOptions: Object.freeze([
      Object.freeze({ value: 0, label: translate('rangeState.state.ignored.label'), tone: 'ignored' }),
      Object.freeze({ value: 1, label: translate('rangeState.state.required.label'), tone: 'required' }),
      Object.freeze({ value: 2, label: translate('rangeState.state.excluded.label'), tone: 'excluded' })
    ])
  });
}

export function renderRangeStateFiltersEditor(rules, deps = {}) {
  const {
    markDirty,
    onFiltersChanged = () => {},
    scheduleRenderList = () => {},
    translate
  } = deps;
  const messages = createRangeStateFilterMessages(translate);

  const ranges = document.createElement('details');
  ranges.className = 'card';
  ranges.innerHTML = '<summary></summary><div class="details-body"></div>';
  setDetailsSummary(ranges, rangeFiltersSummaryParts(rules, messages));
  const rangeGrid = document.createElement('div');
  rangeGrid.className = 'grid cols-3 range-filter-grid';

  function afterRangeChange() {
    markDirty();
    setDetailsSummary(ranges, rangeFiltersSummaryParts(rules, messages));
    onFiltersChanged('range filter changed');
    scheduleRenderList();
  }

  for (const filter of RANGE_FILTERS) {
    const { key } = filter;
    const obj = rules[key];
    const box = document.createElement('div');
    box.className = 'nested-card';
    const defaults = {
      min: filter.defaults.Min,
      max: filter.defaults.Max,
      minimum: key === 'VendorPrice' ? 0 : INT32_MIN,
      maximum: key === 'VendorPrice' ? UINT32_MAX : INT32_MAX
    };
    const title = document.createElement('div');
    title.className = 'filter-card-title';
    const filterLabel = messages.rangeLabel(key);
    title.innerHTML = `<h3>${escapeHtml(filterLabel)}</h3>`;
    const titleActions = document.createElement('div');
    titleActions.className = 'filter-card-actions';
    titleActions.appendChild(switchInput(messages.enabled, obj.Enabled, value => {
      obj.Enabled = value;
      afterRangeChange();
    }));
    title.appendChild(titleActions);
    box.append(
      title,
      rangeSliderControl(filterLabel, obj, afterRangeChange, defaults, messages.rangeControls)
    );
    rangeGrid.appendChild(box);
  }
  requireScopedEl(ranges, '.details-body', 'range filters').appendChild(rangeGrid);

  const states = document.createElement('details');
  states.className = 'card';
  states.innerHTML = '<summary></summary><div class="details-body"></div>';
  setDetailsSummary(states, stateFiltersSummaryParts(rules, messages));
  const stateGrid = document.createElement('div');
  stateGrid.className = 'grid cols-3';

  function afterStateChange() {
    markDirty();
    setDetailsSummary(states, stateFiltersSummaryParts(rules, messages));
    onFiltersChanged('state filter changed');
    scheduleRenderList();
  }

  function renderStateFilterCard(filterName, obj) {
    const box = document.createElement('div');
    box.className = 'nested-card state-filter-card';
    const title = document.createElement('div');
    title.className = 'filter-card-title';
    title.innerHTML = `<h3>${escapeHtml(messages.stateLabel(filterName))}</h3>`;
    const titleActions = document.createElement('div');
    titleActions.className = 'filter-card-actions';
    titleActions.appendChild(segmentedControl(messages.stateGroup(filterName), obj.State ?? 0, messages.stateOptions, next => {
      obj.State = next;
      afterStateChange();
    }));
    title.appendChild(titleActions);
    box.appendChild(title);
    return box;
  }

  for (const key of STATE_FILTER_KEYS) {
    stateGrid.appendChild(renderStateFilterCard(key, rules[key]));
  }
  requireScopedEl(states, '.details-body', 'state filters').appendChild(stateGrid);

  return { ranges, states };
}
