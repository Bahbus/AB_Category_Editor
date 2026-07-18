import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRegexBatchEvaluator,
  evaluateCandidateBatches,
  REGEX_BATCH_DEADLINE_MS,
  REGEX_BATCH_SIZE,
  RegexBatchTimeoutError,
  RegexWorkerCanceledError,
  RegexWorkerError
} from '../src/tools/regexBatchEvaluator.js';
import { evaluateRegexBatch } from '../src/tools/regexBatchWorker.js';

class FakeWorker {
  constructor({ throwOnPost = false } = {}) {
    this.throwOnPost = throwOnPost;
    this.messages = [];
    this.terminationCount = 0;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }

  postMessage(message) {
    if (this.throwOnPost) throw new Error('post failed');
    this.messages.push(message);
  }

  terminate() {
    this.terminationCount++;
  }

  reply(overrides = {}) {
    const request = this.messages.at(-1);
    this.onmessage?.({
      data: {
        type: 'result',
        scanId: request.scanId,
        batchId: request.batchId,
        evaluatedCount: request.candidates.length,
        matches: [],
        limitReached: false,
        ...overrides
      }
    });
  }
}

function fakeTimers() {
  let nextId = 0;
  const timers = new Map();
  const cleared = [];
  return {
    setTimer(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) {
      cleared.push(id);
      timers.delete(id);
    },
    fire(id) {
      const timer = timers.get(id);
      timers.delete(id);
      timer?.callback();
    },
    timers,
    cleared
  };
}

function makeEvaluator(worker, timers = fakeTimers(), options = {}) {
  return {
    evaluator: createRegexBatchEvaluator({
      pattern: '^augmented',
      workerFactory: () => worker,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
      ...options
    }),
    timers
  };
}

test('worker core uses fixed case-insensitive matching and stable candidate order', () => {
  const candidates = [
    { id: 3, name: 'Augmented Ironworks Helm' },
    { id: 1, name: 'Potion' },
    { id: 2, name: 'AUGMENTED Shire Coat' }
  ];
  const result = evaluateRegexBatch('^augmented', candidates, 10);

  assert.deepEqual(result, {
    evaluatedCount: 3,
    matches: [candidates[0], candidates[2]],
    limitReached: false
  });
});

test('worker core stops exactly at its supplied match limit', () => {
  const candidates = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: `Item ${index + 1}` }));
  assert.deepEqual(evaluateRegexBatch('item', candidates, 2), {
    evaluatedCount: 2,
    matches: candidates.slice(0, 2),
    limitReached: true
  });
});

test('candidate controller keeps batches bounded, dedupes stably, and stops at the exact unique maximum', async () => {
  const batchLengths = [];
  const evaluator = {
    async evaluate(candidates, maxMatches) {
      batchLengths.push(candidates.length);
      return evaluateRegexBatch('item', candidates, maxMatches);
    }
  };
  const matches = [];
  const matchedIds = new Set();
  const candidates = [
    { id: 1, name: 'Item first' },
    { id: 1, name: 'Item duplicate' },
    { id: 2, name: 'Item second' },
    { id: 3, name: 'Item third' },
    { id: 4, name: 'Item fourth' }
  ];

  const result = await evaluateCandidateBatches({
    evaluator,
    candidates,
    matches,
    matchedIds,
    maxMatches: 3,
    batchSize: 2
  });

  assert.deepEqual(matches.map(item => item.id), [1, 2, 3]);
  assert.deepEqual(batchLengths, [2, 2]);
  assert.deepEqual(result, { evaluatedCount: 4, limitReached: true });
});

test('successful worker replies clear deadlines and dispose terminates exactly once', async () => {
  const worker = new FakeWorker();
  const { evaluator, timers } = makeEvaluator(worker);
  const pending = evaluator.evaluate([{ id: 7, name: 'Augmented item' }], 5);

  assert.equal(worker.messages.length, 1);
  assert.equal(worker.messages[0].type, 'evaluate');
  assert.equal(worker.messages[0].pattern, '^augmented');
  assert.equal(timers.timers.size, 1);
  worker.reply({ matches: [{ id: 7, name: 'Augmented item' }] });

  assert.deepEqual(await pending, {
    evaluatedCount: 1,
    matches: [{ id: 7, name: 'Augmented item' }],
    limitReached: false
  });
  assert.equal(timers.timers.size, 0);
  assert.deepEqual(timers.cleared, [0]);
  assert.equal(evaluator.dispose(), true);
  assert.equal(evaluator.dispose(), false);
  assert.equal(worker.terminationCount, 1);
  assert.equal(worker.onmessage, null);
  assert.equal(worker.onerror, null);
  assert.equal(worker.onmessageerror, null);
});

test('deadline expiry rejects before a reply and cleans up the worker immediately', async () => {
  const worker = new FakeWorker();
  const { evaluator, timers } = makeEvaluator(worker, fakeTimers(), { deadlineMs: 25 });
  const pending = evaluator.evaluate([{ id: 1, name: 'pathological' }], 1);
  const timerId = [...timers.timers.keys()][0];

  assert.equal(timers.timers.get(timerId).delay, 25);
  timers.fire(timerId);
  await assert.rejects(pending, error => error instanceof RegexBatchTimeoutError && error.deadlineMs === 25);
  assert.equal(worker.terminationCount, 1);
  assert.equal(evaluator.terminated, true);
  worker.reply({ matches: [{ id: 99, name: 'late' }] });
  assert.equal(worker.terminationCount, 1);
});

test('cancellation rejects a pending batch and is idempotent', async () => {
  const worker = new FakeWorker();
  const { evaluator, timers } = makeEvaluator(worker);
  const pending = evaluator.evaluate([{ id: 1, name: 'pending' }], 1);

  assert.equal(evaluator.cancel(), true);
  assert.equal(evaluator.cancel(), false);
  await assert.rejects(pending, RegexWorkerCanceledError);
  assert.equal(timers.timers.size, 0);
  assert.equal(worker.terminationCount, 1);
});

test('worker construction and postMessage failures never fall back to local evaluation', async () => {
  assert.throws(
    () => createRegexBatchEvaluator({ pattern: 'x', workerFactory: () => { throw new Error('construction failed'); } }),
    /construction failed/
  );

  const worker = new FakeWorker({ throwOnPost: true });
  const { evaluator } = makeEvaluator(worker);
  await assert.rejects(evaluator.evaluate([{ id: 1, name: 'x' }], 1), error => error instanceof RegexWorkerError && /post failed/.test(error.message));
  assert.equal(worker.terminationCount, 1);
});

test('worker runtime, message, and serialized evaluation errors reject and terminate', async t => {
  for (const scenario of ['runtime', 'message', 'serialized']) {
    await t.test(scenario, async () => {
      const worker = new FakeWorker();
      const { evaluator } = makeEvaluator(worker);
      const pending = evaluator.evaluate([{ id: 1, name: 'x' }], 1);
      if (scenario === 'runtime') worker.onerror({ message: 'runtime failed', preventDefault() {} });
      if (scenario === 'message') worker.onmessageerror({});
      if (scenario === 'serialized') worker.reply({ type: 'error', message: 'worker rejected pattern' });
      await assert.rejects(pending, RegexWorkerError);
      assert.equal(worker.terminationCount, 1);
    });
  }
});

test('stale replies cannot settle another batch or a later scan', async () => {
  const firstWorker = new FakeWorker();
  const first = makeEvaluator(firstWorker);
  const firstPending = first.evaluator.evaluate([{ id: 1, name: 'first' }], 1);
  const staleRequest = { ...firstWorker.messages[0] };
  firstWorker.reply();
  await firstPending;

  const secondPending = first.evaluator.evaluate([{ id: 2, name: 'second' }], 1);
  firstWorker.onmessage({ data: { type: 'result', scanId: staleRequest.scanId, batchId: staleRequest.batchId, evaluatedCount: 1, matches: [{ id: 99, name: 'stale' }] } });
  let settled = false;
  secondPending.then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  firstWorker.reply({ matches: [{ id: 2, name: 'second' }] });
  assert.equal((await secondPending).matches[0].id, 2);
  first.evaluator.dispose();

  const secondWorker = new FakeWorker();
  const second = makeEvaluator(secondWorker);
  const laterPending = second.evaluator.evaluate([{ id: 3, name: 'later' }], 1);
  secondWorker.onmessage({ data: { type: 'result', scanId: staleRequest.scanId, batchId: staleRequest.batchId, evaluatedCount: 1, matches: [{ id: 100, name: 'older scan' }] } });
  secondWorker.reply({ matches: [{ id: 3, name: 'later' }] });
  assert.equal((await laterPending).matches[0].id, 3);
  second.evaluator.dispose();
});

test('completed-batch matches survive a later deterministic timeout', async () => {
  const matches = [];
  const matchedIds = new Set();
  let callCount = 0;
  const evaluator = {
    async evaluate(candidates) {
      callCount++;
      if (callCount === 2) throw new RegexBatchTimeoutError(10);
      return { evaluatedCount: candidates.length, matches: candidates, limitReached: false };
    }
  };

  await assert.rejects(
    evaluateCandidateBatches({
      evaluator,
      candidates: [{ id: 4, name: 'first' }, { id: 5, name: 'pending' }],
      matches,
      matchedIds,
      maxMatches: 10,
      batchSize: 1
    }),
    RegexBatchTimeoutError
  );
  assert.deepEqual(matches, [{ id: 4, name: 'first' }]);
  assert.deepEqual([...matchedIds], [4]);
});

test('production worker limits remain conservative and explicit', () => {
  assert.equal(REGEX_BATCH_SIZE, 50);
  assert.equal(REGEX_BATCH_DEADLINE_MS, 1000);
});
