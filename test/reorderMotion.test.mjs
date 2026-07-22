import test from 'node:test';
import assert from 'node:assert/strict';

import {
  animateReorderMotion,
  cancelReorderMotion,
  captureReorderMotion,
  createObjectMotionKeyFactory,
  createOccurrenceMotionKeys,
  moveOccurrenceMotionKey,
  syncOccurrenceMotionKeys
} from '../src/reorderMotion.js';

function motionNode(key, left, top, options = {}) {
  const animations = [];
  const node = {
    dataset: { reorderMotionKey: key },
    isConnected: options.isConnected ?? true,
    getBoundingClientRect() { return { left, top }; }
  };
  if (options.animate !== false) {
    node.animate = (frames, timing) => {
      const animation = options.animation || { finished: Promise.resolve(), cancel() {} };
      animations.push({ frames, timing, animation });
      return animation;
    };
  }
  return { node, animations };
}

function container(nodes) {
  return { querySelectorAll() { return nodes.map(item => item.node); } };
}

test('occurrence keys remain distinct for duplicate-looking entries and follow only a real move', () => {
  const keys = createOccurrenceMotionKeys(3, 'duplicate');
  assert.equal(new Set(keys).size, 3);
  assert.equal(moveOccurrenceMotionKey(keys, 2, -1), true);
  assert.deepEqual(keys.map(key => key.split('-')[0]), ['duplicate', 'duplicate', 'duplicate']);
  assert.equal(moveOccurrenceMotionKey(keys, 0, -1), false);
  assert.equal(syncOccurrenceMotionKeys(keys, 4, 'duplicate'), keys);
  assert.equal(new Set(keys).size, 4);
});

test('object keys use reference identity rather than names, IDs, or JSON equality', () => {
  const keyFor = createObjectMotionKeyFactory('category');
  const first = { Id: '', Name: 'Same' };
  const second = { Id: '', Name: 'Same' };
  assert.equal(keyFor(first), keyFor(first));
  assert.notEqual(keyFor(first), keyFor(second));
});

test('capture and play animate connected replacement nodes from prior positions', async () => {
  const beforeA = motionNode('a', 0, 10);
  const beforeB = motionNode('b', 0, 40);
  const positions = captureReorderMotion(container([beforeA, beforeB]));
  const afterA = motionNode('a', 0, 40);
  const afterB = motionNode('b', 0, 10);

  assert.equal(animateReorderMotion(container([afterB, afterA]), positions, { duration: 150, matchMedia: () => ({ matches: false }) }), 2);
  assert.deepEqual(afterA.animations[0].frames, [
    { transform: 'translate(0px, -30px)' },
    { transform: 'translate(0, 0)' }
  ]);
  assert.equal(afterA.animations[0].timing.duration, 150);
  await Promise.resolve();
});

test('reduced motion, missing APIs, disconnection, and unchanged positions suppress animation safely', () => {
  const before = motionNode('a', 0, 0);
  const positions = captureReorderMotion(container([before]));
  const reduced = motionNode('a', 0, 20);
  assert.equal(animateReorderMotion(container([reduced]), positions, { matchMedia: () => ({ matches: true }) }), 0);
  assert.equal(reduced.animations.length, 0);

  const unsupported = motionNode('a', 0, 20, { animate: false });
  const disconnected = motionNode('a', 0, 20, { isConnected: false });
  const unchanged = motionNode('a', 0, 0);
  assert.equal(animateReorderMotion(container([unsupported, disconnected, unchanged]), positions, { matchMedia: () => ({ matches: false }) }), 0);
});

test('rapid replacement cancels stale animation and failed setup stays non-fatal', () => {
  let cancelCount = 0;
  const pending = new Promise(() => {});
  const firstAfter = motionNode('a', 0, 20, { animation: { finished: pending, cancel() { cancelCount++; } } });
  const initial = new Map([['a', { left: 0, top: 0 }]]);
  assert.equal(animateReorderMotion(container([firstAfter]), initial, { matchMedia: () => ({ matches: false }) }), 1);

  const interruptedPositions = captureReorderMotion(container([firstAfter]));
  assert.equal(cancelCount, 1);
  const failed = motionNode('a', 0, 40);
  failed.node.animate = () => { throw new Error('unsupported'); };
  assert.doesNotThrow(() => animateReorderMotion(container([failed]), interruptedPositions, { matchMedia: () => ({ matches: false }) }));
});

test('completion and explicit newer-render cleanup release active animations', async () => {
  let completedCancelCount = 0;
  const completed = motionNode('completed', 0, 20, { animation: { finished: Promise.resolve(), cancel() { completedCancelCount++; } } });
  animateReorderMotion(container([completed]), new Map([['completed', { left: 0, top: 0 }]]), { matchMedia: () => ({ matches: false }) });
  await Promise.resolve();
  await Promise.resolve();
  captureReorderMotion(container([completed]));
  assert.equal(completedCancelCount, 0);

  let cancelled = 0;
  const pending = new Promise(() => {});
  const active = motionNode('active', 0, 20, { animation: { finished: pending, cancel() { cancelled++; } } });
  animateReorderMotion(container([active]), new Map([['active', { left: 0, top: 0 }]]), { matchMedia: () => ({ matches: false }) });
  cancelReorderMotion(container([active]));
  assert.equal(cancelled, 1);
});
