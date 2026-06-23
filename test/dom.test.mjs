import assert from 'node:assert/strict';
import test from 'node:test';

import { el, requireEl } from '../src/dom.js';

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
  const expected = { id: 'showAppearance' };
  globalThis.document = {
    getElementById(id) {
      return id === 'showAppearance' ? expected : null;
    }
  };

  assert.equal(requireEl('showAppearance'), expected);
});

test('requireEl throws a clear missing-element error', () => {
  globalThis.document = {
    getElementById() {
      return null;
    }
  };

  assert.throws(
    () => requireEl('showAppearance'),
    /Missing required element: #showAppearance/
  );
});
