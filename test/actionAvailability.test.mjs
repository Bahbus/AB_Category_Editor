import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categoryRenumberAvailable,
  categorySortAvailable,
  hasNonblankText,
  lookupCacheClearAvailable,
  lookupCacheEntryCount,
  lookupResultAddAvailable,
  referencedIdLookupAvailable,
  regexAddMatchesAvailable,
  regexScanAvailable,
  textActionAvailable
} from '../src/actionAvailability.js';

test('text-backed actions require trimmed nonblank input and respect running state', () => {
  for (const value of ['', ' ', '\n\t']) {
    assert.equal(hasNonblankText(value), false);
    assert.equal(textActionAvailable(value), false);
  }
  for (const value of ['x', ' { malformed', '  candidate  ']) {
    assert.equal(hasNonblankText(value), true);
    assert.equal(textActionAvailable(value), true);
  }
  assert.equal(textActionAvailable('potion', true), false);
  assert.equal(textActionAvailable('changed after request', false), true);
  assert.equal(textActionAvailable('   ', false), false);
});

test('lookup result Add availability uses normalized row IDs and existing values', () => {
  assert.equal(lookupResultAddAvailable(7, []), true);
  assert.equal(lookupResultAddAvailable('007', [7]), false);
  assert.equal(lookupResultAddAvailable(7, ['7']), false);
  assert.equal(lookupResultAddAvailable('invalid', []), false);
});

test('regex Scan accepts nonblank compatibility candidates except while running', () => {
  assert.equal(regexScanAvailable(''), false);
  assert.equal(regexScanAvailable('  '), false);
  assert.equal(regexScanAvailable('(?>a)'), true);
  assert.equal(regexScanAvailable('^Potion$', true), false);
  assert.equal(regexScanAvailable('new current pattern', false), true);
});

test('regex Add matches requires a new normalized ID or removable saved pattern', () => {
  const duplicateMatches = [{ id: 7 }, { id: '008' }];
  assert.equal(regexAddMatchesAvailable({ matches: [{ id: 9 }], existingIds: [7, 8] }), true);
  assert.equal(regexAddMatchesAvailable({ matches: duplicateMatches, existingIds: ['7', 8] }), false);
  assert.equal(regexAddMatchesAvailable({ matches: duplicateMatches, existingIds: ['7', 8], canRemoveSelectedPattern: true }), true);
  assert.equal(regexAddMatchesAvailable({ matches: [{ id: 9 }], existingIds: [], running: true }), false);
});

test('Sort by order availability detects exact category identity order changes', () => {
  const compare = (left, right) => left.order - right.order;
  assert.equal(categorySortAvailable([], compare), false);
  assert.equal(categorySortAvailable([{ order: 1 }], compare), false);
  assert.equal(categorySortAvailable([{ order: 1 }, { order: 2 }], compare), false);
  assert.equal(categorySortAvailable([{ order: 2 }, { order: 1 }], compare), true);
});

test('Renumber availability requires exact one-based numeric Order and Priority', () => {
  assert.equal(categoryRenumberAvailable([]), false);
  assert.equal(categoryRenumberAvailable([{ Order: 1, Priority: 1 }, { Order: 2, Priority: 2 }]), false);
  assert.equal(categoryRenumberAvailable([{ Order: '1', Priority: 1 }]), true);
  assert.equal(categoryRenumberAvailable([{ Order: 1, Priority: 9 }]), true);
});

test('Resolve IDs availability requires an uncached reference and an idle action', () => {
  assert.equal(referencedIdLookupAvailable(0), false);
  assert.equal(referencedIdLookupAvailable(3), true);
  assert.equal(referencedIdLookupAvailable(3, true), false);
});

test('cache clearing requires stored entries and no active producer', () => {
  const empty = [{ total: 0 }, { total: 0 }];
  const nonempty = [{ total: 2 }, { total: 1 }];
  assert.equal(lookupCacheEntryCount(nonempty), 3);
  assert.equal(lookupCacheClearAvailable(empty, false), false);
  assert.equal(lookupCacheClearAvailable(nonempty, true), false);
  assert.equal(lookupCacheClearAvailable(nonempty, false), true);
});
