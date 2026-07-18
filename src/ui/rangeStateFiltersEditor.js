import { RANGE_FILTERS, STATE_FILTERS, STATE_FILTER_KEYS } from '../constants.js';
import { escapeHtml, requireScopedEl } from '../dom.js';
import { INT32_MAX, INT32_MIN, UINT32_MAX } from '../filterScalars.js';
import { setDetailsSummary } from './detailsSummary.js';
import { STATE_FILTER_OPTIONS, rangeSliderControl, segmentedControl, switchInput } from './formControls.js';
import { rangeFiltersSummaryParts, stateFiltersSummaryParts } from './filterSummary.js';

const RANGE_FILTER_NAMES = Object.fromEntries(RANGE_FILTERS.map(filter => [filter.key, filter.label]));
const STATE_FILTER_NAMES = Object.fromEntries(STATE_FILTERS.map(filter => [filter.key, filter.label]));

function displayFilterName(value) {
  return RANGE_FILTER_NAMES[value] || STATE_FILTER_NAMES[value] || String(value).replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

export function renderRangeStateFiltersEditor(rules, deps = {}) {
  const {
    markDirty,
    onFiltersChanged = () => {},
    scheduleRenderList = () => {}
  } = deps;

  const ranges = document.createElement('details');
  ranges.className = 'card';
  ranges.innerHTML = '<summary></summary><div class="details-body"></div>';
  setDetailsSummary(ranges, rangeFiltersSummaryParts(rules));
  const rangeGrid = document.createElement('div');
  rangeGrid.className = 'grid cols-3 range-filter-grid';

  function afterRangeChange() {
    markDirty();
    setDetailsSummary(ranges, rangeFiltersSummaryParts(rules));
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
    title.innerHTML = `<h3>${escapeHtml(filter.label)}</h3>`;
    const titleActions = document.createElement('div');
    titleActions.className = 'filter-card-actions';
    titleActions.appendChild(switchInput('Enabled', obj.Enabled, value => {
      obj.Enabled = value;
      afterRangeChange();
    }));
    title.appendChild(titleActions);
    box.append(
      title,
      rangeSliderControl(filter.label, obj, afterRangeChange, defaults)
    );
    rangeGrid.appendChild(box);
  }
  requireScopedEl(ranges, '.details-body', 'range filters').appendChild(rangeGrid);

  const states = document.createElement('details');
  states.className = 'card';
  states.innerHTML = '<summary></summary><div class="details-body"></div>';
  setDetailsSummary(states, stateFiltersSummaryParts(rules));
  const stateGrid = document.createElement('div');
  stateGrid.className = 'grid cols-3';

  function afterStateChange() {
    markDirty();
    setDetailsSummary(states, stateFiltersSummaryParts(rules));
    onFiltersChanged('state filter changed');
    scheduleRenderList();
  }

  function renderStateFilterCard(filterName, obj) {
    const box = document.createElement('div');
    box.className = 'nested-card state-filter-card';
    const title = document.createElement('div');
    title.className = 'filter-card-title';
    title.innerHTML = `<h3>${escapeHtml(displayFilterName(filterName))}</h3>`;
    const titleActions = document.createElement('div');
    titleActions.className = 'filter-card-actions';
    titleActions.appendChild(segmentedControl(displayFilterName(filterName), obj.State ?? 0, STATE_FILTER_OPTIONS, next => {
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
