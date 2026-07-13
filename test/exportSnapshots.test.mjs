import test from 'node:test';
import assert from 'node:assert/strict';

import { makeRevisionedExportSnapshot, saveSnapshotIfCurrent } from '../src/exportSnapshots.js';

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function pendingSnapshot(data, getRevision) {
  const compression = deferred();
  const operation = makeRevisionedExportSnapshot(data, getRevision, currentData => {
    const json = JSON.stringify(currentData);
    return compression.promise.then(() => json);
  });
  return { compression, operation };
}

test('an unchanged export revision permits exactly one save transition', async () => {
  const data = { value: 'current' };
  let revision = 3;
  let saves = 0;
  let stale = 0;
  const pending = pendingSnapshot(data, () => revision);

  pending.compression.resolve();
  const snapshot = await pending.operation;
  assert.equal(saveSnapshotIfCurrent(snapshot.revision, revision, {
    onSaved: () => { saves++; },
    onStale: () => { stale++; }
  }), true);
  assert.equal(saves, 1);
  assert.equal(stale, 0);
});

test('an edit during Export/Copy compression preserves dirty state and the older snapshot', async () => {
  const data = { value: 'before' };
  let revision = 0;
  let dirty = true;
  let stale = 0;
  const pending = pendingSnapshot(data, () => revision);

  data.value = 'after';
  revision++;
  pending.compression.resolve();
  const snapshot = await pending.operation;
  assert.equal(snapshot.value, '{"value":"before"}');
  assert.equal(saveSnapshotIfCurrent(snapshot.revision, revision, {
    onSaved: () => { dirty = false; },
    onStale: () => { stale++; }
  }), false);
  assert.equal(dirty, true);
  assert.equal(stale, 1);
});

test('an edit during Download compression preserves dirty state', async () => {
  const data = { categories: [1] };
  let revision = 8;
  let dirty = true;
  let saves = 0;
  const pending = pendingSnapshot(data, () => revision);

  data.categories.push(2);
  revision++;
  pending.compression.resolve();
  const snapshot = await pending.operation;
  assert.equal(snapshot.value, '{"categories":[1]}');
  assert.equal(saveSnapshotIfCurrent(snapshot.revision, revision, {
    onSaved: () => { saves++; dirty = false; }
  }), false);
  assert.equal(saves, 0);
  assert.equal(dirty, true);
});

test('overlapping out-of-order completions cannot save an older revision over a newer one', async () => {
  const data = { value: 'first' };
  let revision = 0;
  let dirty = true;
  const savedRevisions = [];
  const first = pendingSnapshot(data, () => revision);

  data.value = 'second';
  revision++;
  const second = pendingSnapshot(data, () => revision);

  second.compression.resolve();
  const secondSnapshot = await second.operation;
  assert.equal(saveSnapshotIfCurrent(secondSnapshot.revision, revision, {
    onSaved: () => { savedRevisions.push(secondSnapshot.revision); dirty = false; }
  }), true);

  first.compression.resolve();
  const firstSnapshot = await first.operation;
  assert.equal(saveSnapshotIfCurrent(firstSnapshot.revision, revision, {
    onSaved: () => { savedRevisions.push(firstSnapshot.revision); dirty = false; }
  }), false);
  assert.deepEqual(savedRevisions, [1]);
  assert.equal(dirty, false);
});
