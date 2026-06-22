import { escapeHtml } from '../dom.js';

let nextControlId = 0;

function makeControlId(prefix) {
  nextControlId += 1;
  return `${prefix}-${nextControlId}`;
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

export function checkbox(label, value, onChange) {
  const l = document.createElement('label');
  l.className = 'check';
  l.innerHTML = `<input type="checkbox" ${value ? 'checked' : ''}> ${escapeHtml(label)}`;
  l.querySelector('input').onchange = e => onChange(e.target.checked);
  return l;
}
