import { escapeHtml } from '../dom.js';

let nextControlId = 0;

function makeControlId(prefix) {
  nextControlId += 1;
  return `${prefix}-${nextControlId}`;
}

export const STATE_FILTER_OPTIONS = [
  { value: 0, label: 'Ignored', tone: 'ignored' },
  { value: 1, label: 'Required', tone: 'required' },
  { value: 2, label: 'Excluded', tone: 'excluded' }
];

export function stateFilterLabel(value) {
  return STATE_FILTER_OPTIONS.find(option => option.value === Number(value))?.label ?? 'Ignored';
}

export function rangeSliderBounds(min, max, defaults = {}) {
  const defaultMin = Number.isFinite(defaults.min) ? defaults.min : 0;
  const defaultMax = Number.isFinite(defaults.max) ? defaults.max : 100;
  const rawMin = Number(min);
  const rawMax = Number(max);
  const values = [defaultMin, defaultMax];
  if (Number.isFinite(rawMin)) values.push(rawMin);
  if (Number.isFinite(rawMax)) values.push(rawMax);
  let lower = Math.min(...values);
  let upper = Math.max(...values);
  if (lower === upper) upper = lower + 1;
  return { min: Math.floor(lower), max: Math.ceil(upper) };
}

export function numberInput(label, value, onChange, step='1', min=null, max=null) {
  const wrap = document.createElement('div');
  const id = makeControlId('number-input');
  const minAttr = min === null ? '' : ` min="${min}"`;
  const maxAttr = max === null ? '' : ` max="${max}"`;
  wrap.innerHTML = `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" type="number" step="${step}"${minAttr}${maxAttr} value="${escapeHtml(value)}">`;
  const input = wrap.querySelector('input');
  input.onblur = e => {
    const fallback = Number(value) || 0;
    let next = Number(e.target.value);
    if (Number.isNaN(next)) next = fallback;
    if (min !== null) next = Math.max(Number(min), next);
    if (max !== null) next = Math.min(Number(max), next);
    e.target.value = String(next);
    onChange(next);
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.currentTarget.blur();
  });
  return wrap;
}

export function textInput(label, value, onChange) {
  const wrap = document.createElement('div');
  const id = makeControlId('text-input');
  wrap.innerHTML = `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" value="${escapeHtml(value)}">`;
  wrap.querySelector('input').oninput = e => onChange(e.target.value);
  return wrap;
}

export function switchInput(label, value, onChange) {
  const l = document.createElement('label');
  l.className = 'switch-control';
  l.innerHTML = `
    <input type="checkbox" role="switch" ${value ? 'checked' : ''}>
    <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
    <span class="switch-label">${escapeHtml(label)}</span>
  `;
  const input = l.querySelector('input');
  input.onchange = e => onChange(e.target.checked);
  return l;
}

export function segmentedControl(label, value, options, onChange) {
  const field = document.createElement('fieldset');
  field.className = 'segmented-field';
  const name = makeControlId('segmented');
  const legend = label ? `<legend class="sr-only">${escapeHtml(label)}</legend>` : '<legend class="sr-only">Select state filter behavior</legend>';
  field.innerHTML = `${legend}<div class="segmented-control" role="radiogroup"></div>`;
  const group = field.querySelector('.segmented-control');
  for (const option of options) {
    const id = makeControlId('segment');
    const checked = Number(value) === option.value;
    const segment = document.createElement('label');
    segment.className = `segment segment-${option.tone || 'neutral'}`;
    segment.innerHTML = `
      <input id="${id}" type="radio" name="${name}" value="${option.value}" ${checked ? 'checked' : ''}>
      <span>${escapeHtml(option.label)}</span>
    `;
    segment.querySelector('input').onchange = e => {
      if (e.target.checked) onChange(Number(e.target.value));
    };
    group.appendChild(segment);
  }
  return field;
}

export function rangeSliderControl(label, rangeObj, onChange, defaults = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'range-slider-control';
  const minInputId = makeControlId('range-min-number');
  const maxInputId = makeControlId('range-max-number');
  const minSliderId = makeControlId('range-min-slider');
  const maxSliderId = makeControlId('range-max-slider');
  const bounds = rangeSliderBounds(rangeObj.Min, rangeObj.Max, defaults);
  wrap.innerHTML = `
    <div class="range-slider-stack">
      <div class="range-slider-rail" aria-hidden="true"></div>
      <div class="range-slider-fill" aria-hidden="true"></div>
      <input id="${minSliderId}" class="range-min-slider" type="range" min="${bounds.min}" max="${bounds.max}" step="1" value="${escapeHtml(rangeObj.Min)}" aria-label="${escapeHtml(label)} minimum slider">
      <input id="${maxSliderId}" class="range-max-slider" type="range" min="${bounds.min}" max="${bounds.max}" step="1" value="${escapeHtml(rangeObj.Max)}" aria-label="${escapeHtml(label)} maximum slider">
    </div>
    <div class="range-number-grid">
      <div><label for="${minInputId}">Minimum</label><input id="${minInputId}" type="number" step="1" value="${escapeHtml(rangeObj.Min)}"></div>
      <div><label for="${maxInputId}">Maximum</label><input id="${maxInputId}" type="number" step="1" value="${escapeHtml(rangeObj.Max)}"></div>
    </div>
    <p class="hint range-validation" hidden>Minimum is greater than maximum. Values are preserved until you edit them.</p>
  `;
  const minNumber = wrap.querySelector(`#${minInputId}`);
  const maxNumber = wrap.querySelector(`#${maxInputId}`);
  const minSlider = wrap.querySelector(`#${minSliderId}`);
  const maxSlider = wrap.querySelector(`#${maxSliderId}`);
  const validation = wrap.querySelector('.range-validation');

  function syncValidity() {
    const minValue = Number(rangeObj.Min);
    const maxValue = Number(rangeObj.Max);
    const lowerBound = Number(minSlider.min);
    const upperBound = Number(minSlider.max);
    const span = upperBound - lowerBound || 1;
    const reversed = minValue > maxValue;
    const start = Math.max(0, Math.min(100, ((Math.min(minValue, maxValue) - lowerBound) / span) * 100));
    const end = Math.max(0, Math.min(100, ((Math.max(minValue, maxValue) - lowerBound) / span) * 100));
    wrap.style.setProperty('--range-start', `${start}%`);
    wrap.style.setProperty('--range-end', `${end}%`);
    minSlider.classList.toggle('range-active-slider', reversed || minValue >= maxValue);
    minNumber.classList.toggle('invalid', reversed);
    maxNumber.classList.toggle('invalid', reversed);
    validation.hidden = !reversed;
  }
  function commitNumber(key, input) {
    const next = Number(input.value);
    if (Number.isNaN(next)) {
      input.value = String(rangeObj[key]);
      return;
    }
    rangeObj[key] = next;
    const nextBounds = rangeSliderBounds(rangeObj.Min, rangeObj.Max, defaults);
    for (const slider of [minSlider, maxSlider]) {
      slider.min = String(nextBounds.min);
      slider.max = String(nextBounds.max);
    }
    minSlider.value = String(rangeObj.Min);
    maxSlider.value = String(rangeObj.Max);
    syncValidity();
    onChange();
  }
  minNumber.onblur = () => commitNumber('Min', minNumber);
  maxNumber.onblur = () => commitNumber('Max', maxNumber);
  minNumber.addEventListener('keydown', e => { if (e.key === 'Enter') e.currentTarget.blur(); });
  maxNumber.addEventListener('keydown', e => { if (e.key === 'Enter') e.currentTarget.blur(); });
  minSlider.oninput = e => {
    rangeObj.Min = Number(e.target.value);
    minNumber.value = e.target.value;
    syncValidity();
    onChange();
  };
  maxSlider.oninput = e => {
    rangeObj.Max = Number(e.target.value);
    maxNumber.value = e.target.value;
    syncValidity();
    onChange();
  };
  syncValidity();
  return wrap;
}
