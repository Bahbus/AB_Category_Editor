import { colorToHex, colorToHexRGBA, hexToRgb01, hexToRgba01, rgbaCss, componentTo255, canonicalHexRgba, decideHexRgbaCommit, decideRgbCommit, decideAlphaCommit } from '../color.js';
import { escapeHtml, requireScopedEl } from '../dom.js';

export function normalizeRgbInputValue(value, committedValue) {
  const committed = Math.max(0, Math.min(255, Math.round(Number(committedValue) || 0)));
  if (String(value).trim() === '') return committed;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return committed;
  return Math.max(0, Math.min(255, Math.round(numeric)));
}

export function renderColorEditor(category, deps = {}) {
  const { markDirty, markDirtyAndRenderList = () => markDirty({ renderList: true }), scheduleRenderList = () => {} } = deps;
  const color = document.createElement('div');
  color.className = 'card color-card';
  color.innerHTML = '<h3>Color</h3>';

  const layout = document.createElement('div');
  layout.className = 'color-layout';

  const left = document.createElement('div');
  left.className = 'color-preview-field';
  left.innerHTML = `
    <div class="color-preview" title="Click to open the color picker">
      <div class="color-fill"></div>
      <input class="color-native-input" type="color" value="${colorToHex(category.Color)}" aria-label="Pick RGB color">
    </div>
  `;

  const right = document.createElement('div');
  right.className = 'grid';

  const hexWrap = document.createElement('div');
  const hexInputId = `hex-color-input-${Math.random().toString(36).slice(2)}`;
  hexWrap.innerHTML = `<label for="${hexInputId}">Hex RGBA</label><input id="${hexInputId}" class="hex-color-input" placeholder="#RRGGBBAA" value="${colorToHexRGBA(category.Color).toUpperCase()}">`;

  const nums = document.createElement('div');
  nums.className = 'grid cols-3 rgb-grid';

  function makeRgbaNumber(label, getValue, setValue) {
    const wrap = document.createElement('div');
    const id = `rgba-${label.toLowerCase()}-${Math.random().toString(36).slice(2)}`;
    wrap.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="number" min="0" max="255" step="1" value="${escapeHtml(getValue())}">`;
    const input = wrap.querySelector('input');
    let lastCommitted = getValue();
    function commitFinite(rawValue, options = {}) {
      if (String(rawValue).trim() === '' || !Number.isFinite(Number(rawValue))) return false;
      const n = normalizeRgbInputValue(rawValue, lastCommitted);
      if (options.writeBack) input.value = String(n);
      lastCommitted = n;
      if (getValue() === n) return false;
      setValue(n);
      updateColorVisuals();
      markDirty();
      scheduleRenderList();
      return true;
    }
    input.oninput = e => {
      commitFinite(e.target.value);
    };
    input.onblur = e => {
      const n = normalizeRgbInputValue(e.target.value, lastCommitted);
      e.target.value = String(n);
      commitFinite(n, { writeBack: true });
    };
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') e.currentTarget.blur();
    });
    return wrap;
  }

  nums.append(
    makeRgbaNumber('R', () => componentTo255(category.Color.X), n => { category.Color.X = n / 255; }),
    makeRgbaNumber('G', () => componentTo255(category.Color.Y), n => { category.Color.Y = n / 255; }),
    makeRgbaNumber('B', () => componentTo255(category.Color.Z), n => { category.Color.Z = n / 255; })
  );

  const alphaWrap = document.createElement('div');
  alphaWrap.className = 'alpha-slider-wrap';
  const alphaSliderId = `alpha-slider-${Math.random().toString(36).slice(2)}`;
  alphaWrap.innerHTML = `
    <div class="alpha-slider-label">
      <label for="${alphaSliderId}">A</label>
      <output class="alpha-value" for="${alphaSliderId}">${escapeHtml(componentTo255(category.Color.W))}</output>
    </div>
    <input id="${alphaSliderId}" class="alpha-slider" type="range" min="0" max="255" step="1" value="${escapeHtml(componentTo255(category.Color.W))}" aria-label="Alpha">
  `;

  right.append(hexWrap, nums, alphaWrap);
  layout.append(left, right);
  color.append(layout);

  const fill = requireScopedEl(color, '.color-fill', 'color editor');
  const picker = requireScopedEl(color, '.color-native-input', 'color editor');
  const hexInput = requireScopedEl(color, '.hex-color-input', 'color editor');
  const alphaSlider = requireScopedEl(color, '.alpha-slider', 'color editor');
  const alphaValue = requireScopedEl(color, '.alpha-value', 'color editor');
  let committedHex = canonicalHexRgba(colorToHexRGBA(category.Color));
  let committedRgb = colorToHex(category.Color).toUpperCase();
  let committedAlpha = componentTo255(category.Color.W);

  function updateColorVisuals() {
    const hex = colorToHexRGBA(category.Color).toUpperCase();
    const a255 = componentTo255(category.Color.W);
    fill.style.background = rgbaCss(category.Color);
    picker.value = colorToHex(category.Color);
    hexInput.value = hex;
    alphaSlider.value = String(a255);
    alphaValue.textContent = String(a255);
    committedHex = hex;
    committedRgb = picker.value.toUpperCase();
    committedAlpha = a255;
  }

  picker.oninput = e => {
    const decision = decideRgbCommit(e.target.value, committedRgb);
    if (decision.status !== 'valid-changed') {
      if (decision.canonical) e.target.value = decision.canonical;
      return;
    }
    const rgb = hexToRgb01(decision.canonical);
    category.Color.X = rgb.X;
    category.Color.Y = rgb.Y;
    category.Color.Z = rgb.Z;
    updateColorVisuals();
    markDirty();
    scheduleRenderList();
  };

  function setHexValidity(value) {
    const trimmed = value.trim();
    const valid = canonicalHexRgba(trimmed) !== null;
    hexInput.setCustomValidity(valid ? '' : 'Use #RRGGBBAA or RRGGBBAA.');
    hexInput.classList.toggle('invalid', Boolean(trimmed) && !valid);
    return valid;
  }

  function applyHexInput() {
    const decision = decideHexRgbaCommit(hexInput.value, committedHex);
    if (decision.status === 'invalid') {
      setHexValidity(hexInput.value);
      hexInput.reportValidity();
      return false;
    }
    hexInput.value = decision.canonical;
    setHexValidity(decision.canonical);
    if (decision.status === 'valid-no-change') return false;
    const rgba = hexToRgba01(decision.canonical);
    category.Color.X = rgba.X;
    category.Color.Y = rgba.Y;
    category.Color.Z = rgba.Z;
    category.Color.W = rgba.W;
    updateColorVisuals();
    markDirtyAndRenderList();
    return true;
  }

  hexInput.oninput = e => {
    setHexValidity(e.target.value);
  };
  hexInput.onblur = applyHexInput;
  hexInput.onchange = applyHexInput;
  hexInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyHexInput();
    }
  });

  alphaSlider.oninput = e => {
    const decision = decideAlphaCommit(e.target.value, committedAlpha);
    if (decision.status !== 'valid-changed') return;
    const n = decision.value;
    category.Color.W = n / 255;
    alphaValue.textContent = String(n);
    updateColorVisuals();
    markDirty();
    scheduleRenderList();
  };

  updateColorVisuals();
  setHexValidity(hexInput.value);

  return color;
}
