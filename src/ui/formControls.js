import { escapeHtml } from '../dom.js';
import { optionalFiniteNumber } from '../optionalNumbers.js';
import { INT32_MAX, INT32_MIN, isIntegerScalar } from '../filterScalars.js';

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

const DEFAULT_RANGE_CONTROL_MESSAGES = Object.freeze({
  minimum: 'Minimum',
  maximum: 'Maximum',
  minimumSlider: filter => `${filter} minimum slider`,
  maximumSlider: filter => `${filter} maximum slider`,
  integer: component => `${component} must be an integer.`,
  atLeast: (component, minimum) => `${component} must be at least ${minimum}.`,
  noGreater: (component, maximum) => `${component} must be no greater than ${maximum}.`,
  bounds: (component, minimum, maximum) => `${component} must be an integer from ${minimum} through ${maximum}.`,
  reversed: 'Minimum is greater than maximum. Values are preserved until you edit them.'
});

export function rangeSliderBounds(min, max, defaults = {}) {
  const defaultMin = Number.isFinite(defaults.min) ? defaults.min : 0;
  const defaultMax = Number.isFinite(defaults.max) ? defaults.max : 100;
  const values = [defaultMin, defaultMax];
  const valueOptions = {
    minimum: defaults.minimum ?? INT32_MIN,
    maximum: defaults.maximum ?? INT32_MAX
  };
  if (decideRangeValueChange(min, min, valueOptions).valid) values.push(min);
  if (decideRangeValueChange(max, max, valueOptions).valid) values.push(max);
  let lower = Math.min(...values);
  let upper = Math.max(...values);
  if (lower === upper) upper = lower + 1;
  return { min: Math.floor(lower), max: Math.ceil(upper) };
}

export function decideRangeValueChange(storedValue, nextValue, options = {}) {
  const minimum = options.minimum ?? INT32_MIN;
  const maximum = options.maximum ?? INT32_MAX;
  const valid = isIntegerScalar(nextValue)
    && (minimum === null || nextValue >= minimum)
    && (maximum === null || nextValue <= maximum);
  if (!valid) return { valid: false, changed: false, value: storedValue };
  return { valid: true, changed: !Object.is(storedValue, nextValue), value: nextValue };
}

export function rangeInputErrorMessage(key, rawValue, options = {}, messages = DEFAULT_RANGE_CONTROL_MESSAGES) {
  const component = key === 'Min' ? messages.minimum : messages.maximum;
  const minimum = options.minimum ?? INT32_MIN;
  const maximum = options.maximum ?? INT32_MAX;
  const value = Number(String(rawValue));
  if (String(rawValue).trim() === '' || !isIntegerScalar(value)) return messages.integer(component);
  if (value < minimum) return messages.atLeast(component, minimum);
  if (value > maximum) return messages.noGreater(component, maximum);
  return messages.bounds(component, minimum, maximum);
}

export function rangeValidationState(rangeObj, inputErrors = {}, options = {}, messages = DEFAULT_RANGE_CONTROL_MESSAGES) {
  const minValid = decideRangeValueChange(rangeObj.Min, rangeObj.Min, options).valid;
  const maxValid = decideRangeValueChange(rangeObj.Max, rangeObj.Max, options).valid;
  const reversed = minValid && maxValid && rangeObj.Min > rangeObj.Max;
  const minError = inputErrors.Min || (!minValid ? rangeInputErrorMessage('Min', rangeObj.Min, options, messages) : '');
  const maxError = inputErrors.Max || (!maxValid ? rangeInputErrorMessage('Max', rangeObj.Max, options, messages) : '');
  const errors = [minError, maxError].filter(Boolean);
  const message = errors.join(' ') || (reversed
    ? messages.reversed
    : '');
  return {
    hasIssue: reversed || errors.length > 0,
    hasError: errors.length > 0,
    reversed,
    message,
    Min: { invalid: reversed || Boolean(minError), describedBy: reversed || Boolean(minError) },
    Max: { invalid: reversed || Boolean(maxError), describedBy: reversed || Boolean(maxError) }
  };
}

export function decideRangeInputChange(storedValue, rawValue, options = {}) {
  const text = String(rawValue);
  if (text.trim() === '') return { valid: false, changed: false, value: storedValue };
  return decideRangeValueChange(storedValue, Number(text), options);
}

export function applyRangeValueChange(rangeObj, key, nextValue, onChange = () => {}, options = {}) {
  const decision = decideRangeValueChange(rangeObj[key], nextValue, options);
  if (!decision.valid || !decision.changed) return false;
  rangeObj[key] = decision.value;
  onChange();
  return true;
}

export function createNumberCommitState(jsonValue, displayValue = String(jsonValue ?? '')) {
  return {
    jsonValue,
    numberValue: optionalFiniteNumber(jsonValue),
    displayValue: String(displayValue),
    diverged: false
  };
}

export function numberInputDisplayValue(jsonValue, browserValue = '') {
  const displayValue = String(browserValue ?? '');
  if (displayValue.trim() !== '') return displayValue;
  const numberValue = optionalFiniteNumber(jsonValue);
  return numberValue === null ? displayValue : String(numberValue);
}

export function numberInputStoredDisplayValue(jsonValue) {
  if (jsonValue === undefined) return 'undefined';
  if (jsonValue === null) return 'null';
  if (typeof jsonValue === 'object') {
    try { return JSON.stringify(jsonValue); }
    catch { return String(jsonValue); }
  }
  return String(jsonValue);
}

export function decideNumberCommit(state, rawValue, options = {}) {
  const inputValue = String(rawValue);
  const diverged = state.diverged || inputValue !== state.displayValue;
  let numberValue = optionalFiniteNumber(rawValue);
  if (numberValue === null) return { inputValid: false, changed: false, state: { ...state, diverged } };

  const validateNumber = typeof options.validateNumber === 'function' ? options.validateNumber : () => true;
  if (!validateNumber(numberValue)) return { inputValid: false, changed: false, state: { ...state, diverged } };

  const minValue = optionalFiniteNumber(options.min);
  const maxValue = optionalFiniteNumber(options.max);
  if (minValue !== null) numberValue = Math.max(minValue, numberValue);
  if (maxValue !== null) numberValue = Math.min(maxValue, numberValue);

  if (state.numberValue === null && !diverged) {
    return { inputValid: true, changed: false, state: { ...state, diverged } };
  }
  const explicitJsonNumberCorrection = options.requireJsonNumber
    && diverged
    && typeof state.jsonValue !== 'number';
  if (state.numberValue !== null && Object.is(numberValue, state.numberValue) && !explicitJsonNumberCorrection) {
    return { inputValid: true, changed: false, state: { ...state, diverged } };
  }
  return {
    inputValid: true,
    changed: true,
    state: createNumberCommitState(numberValue, String(numberValue))
  };
}

export function applyNumberCommit(state, rawValue, onChange = () => {}, options = {}) {
  const decision = decideNumberCommit(state, rawValue, options);
  if (decision.changed) onChange(decision.state.jsonValue);
  return decision;
}

export function numberInput(label, value, onChange, step='1', min=null, max=null, options = {}) {
  const wrap = document.createElement('div');
  const id = makeControlId('number-input');
  const minAttr = min === null ? '' : ` min="${min}"`;
  const maxAttr = max === null ? '' : ` max="${max}"`;
  const messageId = options.messageId || `${id}-validation`;
  const storedNumberCompatible = typeof value === 'number'
    && (typeof options.validateNumber !== 'function' || options.validateNumber(value));
  const preserveStoredDisplay = options.preserveStoredDisplay && !storedNumberCompatible;
  const inputType = preserveStoredDisplay ? 'text' : 'number';
  wrap.innerHTML = `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" type="${inputType}" step="${step}"${minAttr}${maxAttr} value="${escapeHtml(value)}"><p id="${messageId}" class="validation-list" hidden></p>`;
  const input = wrap.querySelector('input');
  const message = wrap.querySelector(`#${messageId}`);
  input.value = preserveStoredDisplay ? numberInputStoredDisplayValue(value) : numberInputDisplayValue(value, input.value);
  function setValidation(findings = []) {
    const errors = findings.filter(item => item.severity === 'error' || item.severity === 'warning');
    input.classList.toggle('invalid', errors.length > 0);
    input.setAttribute('aria-invalid', errors.length ? 'true' : 'false');
    if (findings.length) { input.setAttribute('aria-describedby', messageId); message.hidden = false; message.innerHTML = findings.map(item => `<span class="field-${item.severity}">${escapeHtml(item.message)}</span>`).join(''); }
    else { input.removeAttribute('aria-describedby'); message.hidden = true; message.textContent = ''; }
  }
  let committed = createNumberCommitState(value, input.value);
  function setCommittedValidation() {
    setValidation(options.validate ? options.validate(committed.jsonValue) : []);
  }
  function restoreCommittedValue() {
    input.value = preserveStoredDisplay ? numberInputStoredDisplayValue(committed.jsonValue) : String(committed.jsonValue ?? '');
    if (!preserveStoredDisplay) input.value = numberInputDisplayValue(committed.jsonValue, input.value);
    committed = createNumberCommitState(committed.jsonValue, input.value);
    setCommittedValidation();
  }
  function commitInput(rawValue, bounds = {}) {
    const decision = applyNumberCommit(committed, rawValue, onChange, { ...bounds, validateNumber: options.validateNumber, requireJsonNumber: options.requireJsonNumber });
    committed = decision.state;
    if (decision.inputValid) setCommittedValidation();
    else {
      const messageText = typeof options.inputErrorMessage === 'function'
        ? options.inputErrorMessage(rawValue)
        : options.inputErrorMessage;
      setValidation(messageText ? [{ severity: 'error', message: messageText }] : (options.validate ? options.validate(rawValue) : []));
    }
    return decision;
  }
  setCommittedValidation();
  input.oninput = e => {
    if (options.requireJsonNumber) committed = { ...committed, diverged: true };
    commitInput(e.target.value);
  };
  input.onblur = e => {
    if (String(e.target.value).trim() === '') {
      restoreCommittedValue();
      return;
    }
    const decision = commitInput(e.target.value, { min, max });
    if (!decision.inputValid) restoreCommittedValue();
    else {
      e.target.value = preserveStoredDisplay ? numberInputStoredDisplayValue(committed.jsonValue) : String(committed.jsonValue ?? '');
      if (!preserveStoredDisplay) e.target.value = numberInputDisplayValue(committed.jsonValue, e.target.value);
      committed = createNumberCommitState(committed.jsonValue, e.target.value);
      setCommittedValidation();
    }
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.currentTarget.blur();
  });
  return wrap;
}

export function textInput(label, value, onChange, options = {}) {
  const wrap = document.createElement('div');
  const id = makeControlId('text-input');
  const messageId = options.messageId || `${id}-validation`;
  wrap.innerHTML = `<label for="${id}">${escapeHtml(label)}</label><input id="${id}" value="${escapeHtml(value)}"><p id="${messageId}" class="validation-list" hidden></p>`;
  const input = wrap.querySelector('input');
  const message = wrap.querySelector(`#${messageId}`);
  function setValidation(findings = []) {
    const serious = findings.filter(item => item.severity === 'error' || item.severity === 'warning');
    input.classList.toggle('invalid', serious.length > 0);
    input.setAttribute('aria-invalid', serious.length ? 'true' : 'false');
    if (findings.length) { input.setAttribute('aria-describedby', messageId); message.hidden = false; message.innerHTML = findings.map(item => `<span class="field-${item.severity}">${escapeHtml(item.message)}</span>`).join(''); }
    else { input.removeAttribute('aria-describedby'); message.hidden = true; message.textContent = ''; }
  }
  setValidation(options.validate ? options.validate(value) : []);
  input.oninput = e => {
    onChange(e.target.value);
    if (options.validateOnInput) setValidation(options.validate ? options.validate(e.target.value) : []);
  };
  input.onblur = e => {
    setValidation(options.validate ? options.validate(e.target.value) : []);
    if (typeof options.onBlur === 'function') options.onBlur(e.target.value);
  };
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
    const checked = value === option.value;
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

export function rangeSliderControl(label, rangeObj, onChange, defaults = {}, messages = DEFAULT_RANGE_CONTROL_MESSAGES) {
  const wrap = document.createElement('div');
  wrap.className = 'range-slider-control';
  const minInputId = makeControlId('range-min-number');
  const maxInputId = makeControlId('range-max-number');
  const minSliderId = makeControlId('range-min-slider');
  const maxSliderId = makeControlId('range-max-slider');
  const validationId = makeControlId('range-validation');
  const minimum = defaults.minimum ?? null;
  const maximum = defaults.maximum ?? null;
  const valueOptions = { minimum, maximum };
  const minAttr = minimum === null ? '' : ` min="${minimum}"`;
  const maxAttr = maximum === null ? '' : ` max="${maximum}"`;
  const bounds = rangeSliderBounds(rangeObj.Min, rangeObj.Max, defaults);
  wrap.innerHTML = `
    <div class="range-slider-stack">
      <div class="range-slider-rail" aria-hidden="true"></div>
      <div class="range-slider-fill" aria-hidden="true"></div>
      <input id="${minSliderId}" class="range-min-slider" type="range" min="${bounds.min}" max="${bounds.max}" step="1" value="${escapeHtml(rangeObj.Min)}" aria-label="${escapeHtml(messages.minimumSlider(label))}">
      <input id="${maxSliderId}" class="range-max-slider" type="range" min="${bounds.min}" max="${bounds.max}" step="1" value="${escapeHtml(rangeObj.Max)}" aria-label="${escapeHtml(messages.maximumSlider(label))}">
    </div>
    <div class="range-number-grid">
      <div><label for="${minInputId}">${escapeHtml(messages.minimum)}</label><input id="${minInputId}" type="number" step="1"${minAttr}${maxAttr} value="${escapeHtml(rangeObj.Min)}"></div>
      <div><label for="${maxInputId}">${escapeHtml(messages.maximum)}</label><input id="${maxInputId}" type="number" step="1"${minAttr}${maxAttr} value="${escapeHtml(rangeObj.Max)}"></div>
    </div>
    <p id="${validationId}" class="hint range-validation" hidden>${escapeHtml(messages.reversed)}</p>
  `;
  const minNumber = wrap.querySelector(`#${minInputId}`);
  const maxNumber = wrap.querySelector(`#${maxInputId}`);
  const minSlider = wrap.querySelector(`#${minSliderId}`);
  const maxSlider = wrap.querySelector(`#${maxSliderId}`);
  const validation = wrap.querySelector('.range-validation');
  const inputErrors = { Min: '', Max: '' };

  function syncValidity() {
    const minValue = rangeObj.Min;
    const maxValue = rangeObj.Max;
    const lowerBound = Number(minSlider.min);
    const upperBound = Number(minSlider.max);
    const span = upperBound - lowerBound || 1;
    const validity = rangeValidationState(rangeObj, inputErrors, valueOptions, messages);
    const minCompatible = decideRangeValueChange(minValue, minValue, valueOptions).valid;
    const maxCompatible = decideRangeValueChange(maxValue, maxValue, valueOptions).valid;
    const visualMin = minCompatible ? minValue : lowerBound;
    const visualMax = maxCompatible ? maxValue : upperBound;
    const start = Math.max(0, Math.min(100, ((Math.min(visualMin, visualMax) - lowerBound) / span) * 100));
    const end = Math.max(0, Math.min(100, ((Math.max(visualMin, visualMax) - lowerBound) / span) * 100));
    wrap.style.setProperty('--range-start', `${start}%`);
    wrap.style.setProperty('--range-end', `${end}%`);
    wrap.classList.toggle('has-range-issue', validity.hasIssue);
    wrap.classList.toggle('has-range-error', validity.hasError);
    wrap.classList.toggle('has-range-warning', validity.reversed);
    minSlider.classList.toggle('range-active-slider', validity.reversed || (minCompatible && maxCompatible && minValue >= maxValue));
    minNumber.classList.toggle('invalid', validity.Min.invalid);
    maxNumber.classList.toggle('invalid', validity.Max.invalid);
    validation.textContent = validity.message;
    validation.classList.add('range-validation');
    validation.classList.toggle('validation-list', validity.hasIssue);
    validation.classList.toggle('field-error', validity.hasError);
    validation.classList.toggle('field-warning', validity.reversed);
    validation.hidden = !validity.hasIssue;
    for (const [input, component] of [[minNumber, validity.Min], [maxNumber, validity.Max]]) {
      input.setAttribute('aria-invalid', component.invalid ? 'true' : 'false');
      if (component.describedBy) input.setAttribute('aria-describedby', validationId);
      else input.removeAttribute('aria-describedby');
    }
  }
  function commitNumber(key, input) {
    const decision = decideRangeInputChange(rangeObj[key], input.value, valueOptions);
    if (!decision.valid) {
      input.value = String(rangeObj[key]);
      inputErrors[key] = '';
      syncValidity();
      return;
    }
    inputErrors[key] = '';
    input.value = String(decision.value);
    const changed = applyRangeValueChange(rangeObj, key, decision.value, onChange, valueOptions);
    const nextBounds = rangeSliderBounds(rangeObj.Min, rangeObj.Max, defaults);
    for (const slider of [minSlider, maxSlider]) {
      slider.min = String(nextBounds.min);
      slider.max = String(nextBounds.max);
    }
    minSlider.value = String(rangeObj.Min);
    maxSlider.value = String(rangeObj.Max);
    syncValidity();
    return changed;
  }
  function commitFiniteNumberInput(key, input) {
    const decision = decideRangeInputChange(rangeObj[key], input.value, valueOptions);
    if (!decision.valid) {
      inputErrors[key] = rangeInputErrorMessage(key, input.value, valueOptions, messages);
      syncValidity();
      return false;
    }
    inputErrors[key] = '';
    const changed = applyRangeValueChange(rangeObj, key, decision.value, onChange, valueOptions);
    const nextBounds = rangeSliderBounds(rangeObj.Min, rangeObj.Max, defaults);
    for (const slider of [minSlider, maxSlider]) {
      slider.min = String(nextBounds.min);
      slider.max = String(nextBounds.max);
    }
    minSlider.value = String(rangeObj.Min);
    maxSlider.value = String(rangeObj.Max);
    syncValidity();
    return changed;
  }
  minNumber.oninput = () => commitFiniteNumberInput('Min', minNumber);
  maxNumber.oninput = () => commitFiniteNumberInput('Max', maxNumber);
  minNumber.onblur = () => commitNumber('Min', minNumber);
  maxNumber.onblur = () => commitNumber('Max', maxNumber);
  minNumber.addEventListener('keydown', e => { if (e.key === 'Enter') e.currentTarget.blur(); });
  maxNumber.addEventListener('keydown', e => { if (e.key === 'Enter') e.currentTarget.blur(); });
  minSlider.oninput = e => {
    inputErrors.Min = '';
    applyRangeValueChange(rangeObj, 'Min', Number(e.target.value), onChange, valueOptions);
    minNumber.value = e.target.value;
    syncValidity();
  };
  maxSlider.oninput = e => {
    inputErrors.Max = '';
    applyRangeValueChange(rangeObj, 'Max', Number(e.target.value), onChange, valueOptions);
    maxNumber.value = e.target.value;
    syncValidity();
  };
  syncValidity();
  return wrap;
}
