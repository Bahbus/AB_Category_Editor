import assert from 'node:assert/strict';
import test from 'node:test';

import { createLookupCacheOperationCoordinator, clearLookupCacheIfIdle } from '../src/lookupCacheOperations.js';

test('lookup cache operation coordinator tracks overlapping producers', () => {
  const coordinator = createLookupCacheOperationCoordinator();
  const states = [];
  coordinator.subscribe(active => states.push(active));

  const releaseFirst = coordinator.acquire();
  const releaseSecond = coordinator.acquire();
  assert.equal(coordinator.isActive(), true);
  releaseFirst();
  assert.equal(coordinator.isActive(), true);
  releaseSecond();
  assert.equal(coordinator.isActive(), false);
  assert.deepEqual(states, [true, true, true, false]);
});

test('lookup cache producer release is idempotent and safe for finally cleanup', () => {
  const coordinator = createLookupCacheOperationCoordinator();
  const release = coordinator.acquire();

  try {
    throw new Error('producer failed');
  } catch {
    // The producer reports its own failure before finally cleanup.
  } finally {
    release();
    release();
  }

  assert.equal(coordinator.isActive(), false);
});

test('cache clearing is refused while active and succeeds after release', () => {
  const coordinator = createLookupCacheOperationCoordinator();
  const release = coordinator.acquire();
  let clears = 0;
  let refusals = 0;
  const options = {
    isActive: coordinator.isActive,
    clear: () => { clears++; },
    onRefused: () => { refusals++; }
  };

  assert.equal(clearLookupCacheIfIdle(options), false);
  assert.equal(clears, 0);
  assert.equal(refusals, 1);
  release();
  assert.equal(clearLookupCacheIfIdle(options), true);
  assert.equal(clears, 1);
});
