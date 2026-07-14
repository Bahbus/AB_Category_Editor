import test from 'node:test';
import assert from 'node:assert/strict';

import { isModalOpen } from '../src/modals.js';

test('isModalOpen reports only a present, visible modal backdrop', () => {
  const originalDocument = globalThis.document;
  let backdrop = null;
  globalThis.document = {
    getElementById(id) {
      return id === 'modalBackdrop' ? backdrop : null;
    }
  };

  try {
    assert.equal(isModalOpen(), false);
    backdrop = { classList: { contains: className => className === 'hidden' } };
    assert.equal(isModalOpen(), false);
    backdrop = { classList: { contains: () => false } };
    assert.equal(isModalOpen(), true);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
