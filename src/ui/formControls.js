import { escapeHtml } from '../dom.js';

export function numberInput(label, value, onChange, step='1', min=null, max=null) {
  const wrap = document.createElement('div');
  const minAttr = min === null ? '' : ` min="${min}"`;
  const maxAttr = max === null ? '' : ` max="${max}"`;
  wrap.innerHTML = `<label>${label}</label><input type="number" step="${step}"${minAttr}${maxAttr} value="${escapeHtml(value)}">`;
  wrap.querySelector('input').oninput = e => onChange(Number(e.target.value));
  return wrap;
}

export function textInput(label, value, onChange) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<label>${label}</label><input value="${escapeHtml(value)}">`;
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
