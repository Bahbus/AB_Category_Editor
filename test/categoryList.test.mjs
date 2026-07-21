import test from 'node:test';
import assert from 'node:assert/strict';

import { defaultCategory } from '../src/config.js';
import { computeCategoryIssueCounts, renderCategoryList } from '../src/ui/categoryList.js';
import { getCategoryIssueCount, getCategoryIssueCounts, isIssueFinding } from '../src/validation.js';

function cleanCategory(overrides = {}) {
  const category = defaultCategory(0);
  category.Id = overrides.Id ?? 'cat-a';
  category.Name = overrides.Name ?? 'Clean';
  category.Description = overrides.Description ?? 'Has description';
  category.Order = overrides.Order ?? 1;
  category.Priority = overrides.Priority ?? 1;
  Object.assign(category, overrides);
  return category;
}

class FakeElement {
  constructor(ownerDocument, tagName = 'div') {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.style = { setProperty() {} };
    this.classList = { add() {}, remove() {} };
    this.isConnected = false;
    this._innerHTML = '';
  }

  set innerHTML(value) {
    for (const child of this.children) child.isConnected = false;
    this.children = [];
    this._innerHTML = value;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  appendChild(child) {
    child.isConnected = this.isConnected;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

function fakeCategoryListDocument() {
  const documentRef = {
    activeElement: null,
    elements: new Map(),
    createElement(tagName) {
      return new FakeElement(documentRef, tagName);
    },
    getElementById(id) {
      return documentRef.elements.get(id) ?? null;
    },
    querySelector(selector) {
      if (selector !== '.cat-item[aria-current="true"]') return null;
      return documentRef.getElementById('categoryList').children
        .find(child => child.getAttribute('aria-current') === 'true') ?? null;
    },
    querySelectorAll() {
      return [];
    },
    contains(node) {
      return Boolean(node?.isConnected);
    }
  };
  documentRef.body = new FakeElement(documentRef, 'body');
  documentRef.body.isConnected = true;
  documentRef.activeElement = documentRef.body;
  for (const id of ['search', 'format', 'count', 'categoryList', 'listStatus', 'autoRenumberDrag']) {
    const element = new FakeElement(documentRef);
    element.isConnected = true;
    element.value = '';
    element.checked = false;
    documentRef.elements.set(id, element);
  }
  return documentRef;
}

test('getCategoryIssueCount counts errors and warnings but not notes', () => {
  const category = cleanCategory({
    Description: '',
    Order: 'not-a-number',
    Rules: {
      ...cleanCategory().Rules,
      AllowedItemNamePatterns: ['   ']
    }
  });

  assert.equal(getCategoryIssueCount(category, [category]), 2);
});


test('computeCategoryIssueCounts counts duplicate sort positions once without full per-row validation', () => {
  const first = cleanCategory({ Id: 'cat-a', Order: 3, Priority: 7 });
  const second = cleanCategory({ Id: 'cat-b', Order: 3, Priority: 7 });
  const clean = cleanCategory({ Id: 'cat-c', Order: 4, Priority: 7 });
  const counts = computeCategoryIssueCounts([first, second, clean]);

  assert.equal(counts.get(first), getCategoryIssueCount(first, [first, second, clean]));
  assert.equal(counts.get(second), getCategoryIssueCount(second, [first, second, clean]));
  assert.equal(counts.get(clean), 0);
});


test('shared issue helper only treats errors and warnings as issue findings', () => {
  assert.equal(isIssueFinding({ severity: 'error' }), true);
  assert.equal(isIssueFinding({ severity: 'warning' }), true);
  assert.equal(isIssueFinding({ severity: 'note' }), false);
});

test('shared issue counts distinguish duplicate order and priority pairs', () => {
  const first = cleanCategory({ Id: 'cat-a', Order: 9, Priority: 1 });
  const sameOrder = cleanCategory({ Id: 'cat-b', Order: 9, Priority: 2 });
  const samePriority = cleanCategory({ Id: 'cat-c', Order: 10, Priority: 1 });
  const counts = getCategoryIssueCounts([first, sameOrder, samePriority]);

  assert.equal(counts.get(first), 0);
  assert.equal(counts.get(sameOrder), 0);
  assert.equal(counts.get(samePriority), 0);
});

test('click, Enter, and Space selection focus the newly rendered selected entry', () => {
  const originalDocument = globalThis.document;
  const documentRef = fakeCategoryListDocument();
  globalThis.document = documentRef;
  try {
    const categories = [
      cleanCategory({ Id: '', Name: 'Duplicate', Order: 1, Priority: 1 }),
      cleanCategory({ Id: '', Name: 'Duplicate', Order: 2, Priority: 2 })
    ];
    let selectedIndex = 0;
    let renderCount = 0;
    const args = {
      data: { Format: 'Test', Version: 1 },
      getCategories: () => categories,
      ensureShape() {},
      getSelectedIndex: () => selectedIndex,
      setSelectedIndex: value => { selectedIndex = value; },
      getDraggedIndex: () => null,
      setDraggedIndex() {},
      renumberCategories() {},
      markDirty() {},
      renderAll() {
        renderCount++;
        renderCategoryList(args);
      }
    };
    renderCategoryList(args);

    function activate(index, kind) {
      const staleItem = documentRef.getElementById('categoryList').children[index];
      const previousRenderCount = renderCount;
      let prevented = false;
      documentRef.activeElement = staleItem;
      if (kind === 'click') staleItem.onclick();
      else staleItem.onkeydown({ key: kind, preventDefault() { prevented = true; } });
      const selectedItem = documentRef.querySelector('.cat-item[aria-current="true"]');
      assert.equal(renderCount, previousRenderCount + 1);
      assert.notEqual(selectedItem, staleItem);
      assert.equal(staleItem.isConnected, false);
      assert.equal(selectedItem.dataset.index, String(index));
      assert.equal(documentRef.activeElement, selectedItem);
      assert.equal(prevented, kind !== 'click');
    }

    activate(1, 'click');
    activate(0, 'Enter');
    activate(1, ' ');
    activate(1, 'click');
    assert.equal(renderCount, 4);

    const selectedItem = documentRef.getElementById('categoryList').children[1];
    documentRef.querySelector = () => null;
    assert.doesNotThrow(() => selectedItem.onclick());
    const disconnectedTarget = new FakeElement(documentRef);
    disconnectedTarget.focus = () => { throw new Error('Disconnected targets must not be focused'); };
    documentRef.querySelector = () => disconnectedTarget;
    const rerenderedSelectedItem = documentRef.getElementById('categoryList').children[1];
    assert.doesNotThrow(() => rerenderedSelectedItem.onclick());
    assert.equal(renderCount, 6);
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
