import test from 'node:test';
import assert from 'node:assert/strict';

import { isModalOpen, trapModalFocus } from '../src/modals.js';

function createFocusFixture() {
  const focusable = [];
  const modal = {
    contains(node) { return focusable.includes(node); },
    querySelectorAll() { return focusable; }
  };
  function control(name) {
    const node = {
      name,
      hidden: false,
      getAttribute() { return null; },
      closest() { return null; },
      matches() { return false; },
      focus() { document.activeElement = node; }
    };
    focusable.push(node);
    return node;
  }
  const first = control('first');
  const middle = control('middle');
  const last = control('last');
  const backdrop = {
    classList: { contains() { return false; } },
    querySelector(selector) { return selector === '.modal' ? modal : null; }
  };
  return { backdrop, first, last, middle };
}

function tabEvent(shiftKey = false) {
  return {
    key: 'Tab',
    shiftKey,
    prevented: false,
    preventDefault() { this.prevented = true; }
  };
}

test('isModalOpen reports only a present, visible modal backdrop', () => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  let backdrop = null;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      getElementById(id) {
        return id === 'modalBackdrop' ? backdrop : null;
      }
    }
  });

  try {
    assert.equal(isModalOpen(), false);
    backdrop = { classList: { contains: className => className === 'hidden' } };
    assert.equal(isModalOpen(), false);
    backdrop = { classList: { contains: () => false } };
    assert.equal(isModalOpen(), true);
  } finally {
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});

test('modal focus trap re-enters from outside and preserves boundary cycling', async t => {
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const fixture = createFocusFixture();
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: null,
      getElementById(id) { return id === 'modalBackdrop' ? fixture.backdrop : null; }
    }
  });
  try {
    await t.test('Tab from outside enters at the first control', () => {
      document.activeElement = {};
      const event = tabEvent();
      trapModalFocus(event);
      assert.equal(event.prevented, true);
      assert.equal(document.activeElement, fixture.first);
    });
    await t.test('Shift+Tab from outside enters at the last control', () => {
      document.activeElement = {};
      const event = tabEvent(true);
      trapModalFocus(event);
      assert.equal(event.prevented, true);
      assert.equal(document.activeElement, fixture.last);
    });
    await t.test('Tab cycles the last control to the first', () => {
      document.activeElement = fixture.last;
      const event = tabEvent();
      trapModalFocus(event);
      assert.equal(event.prevented, true);
      assert.equal(document.activeElement, fixture.first);
    });
    await t.test('Shift+Tab cycles the first control to the last', () => {
      document.activeElement = fixture.first;
      const event = tabEvent(true);
      trapModalFocus(event);
      assert.equal(event.prevented, true);
      assert.equal(document.activeElement, fixture.last);
    });
    await t.test('Tab inside a non-boundary control remains native', () => {
      document.activeElement = fixture.middle;
      const event = tabEvent();
      trapModalFocus(event);
      assert.equal(event.prevented, false);
      assert.equal(document.activeElement, fixture.middle);
    });
  } finally {
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor);
    else delete globalThis.document;
  }
});
