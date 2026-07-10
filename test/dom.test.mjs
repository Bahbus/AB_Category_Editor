import assert from 'node:assert/strict';
import test from 'node:test';

import { el, requireEl, showBusy, hideBusy } from '../src/dom.js';

test('el returns matching element or null', () => {
  const expected = { id: 'present' };
  globalThis.document = {
    getElementById(id) {
      return id === 'present' ? expected : null;
    }
  };

  assert.equal(el('present'), expected);
  assert.equal(el('missing'), null);
});

test('requireEl returns matching element', () => {
  const expected = { id: 'showPreferences' };
  globalThis.document = {
    getElementById(id) {
      return id === 'showPreferences' ? expected : null;
    }
  };

  assert.equal(requireEl('showPreferences'), expected);
});

test('requireEl throws a clear missing-element error', () => {
  globalThis.document = {
    getElementById() {
      return null;
    }
  };

  assert.throws(
    () => requireEl('showPreferences'),
    /Missing required element: #showPreferences/
  );
});

test('one busy operation completing does not hide an overlapping operation', () => {
  const hidden = new Set(['hidden']);
  const box = { classList: { add: value => hidden.add(value), remove: value => hidden.delete(value), contains: value => hidden.has(value) } };
  const title = { textContent: '' };
  const detail = { textContent: '' };
  const fill = { classList: { add() {}, remove() {} }, style: {} };
  globalThis.document = { getElementById(id) { return ({ busyOverlay: box, busyTitle: title, busyDetail: detail, busyProgressFill: fill })[id] || null; } };

  hideBusy(true);
  showBusy('First');
  showBusy('Second');
  hideBusy();
  assert.equal(hidden.has('hidden'), false);
  hideBusy();
  assert.equal(hidden.has('hidden'), true);
});
