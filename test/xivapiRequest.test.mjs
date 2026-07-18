import test from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchXivapiJson,
  XIVAPI_REQUEST_DEADLINE_MS,
  XivapiRequestTimeoutError
} from '../src/xivapiRequest.js';

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
      timers.get(id)?.callback();
    },
    timers,
    cleared
  };
}

class TrackedAbortSignal {
  constructor() {
    this.aborted = false;
    this.reason = undefined;
    this.listeners = new Set();
    this.additions = 0;
    this.removals = 0;
  }

  addEventListener(type, listener) {
    if (type !== 'abort') return;
    this.additions++;
    this.listeners.add(listener);
  }

  removeEventListener(type, listener) {
    if (type !== 'abort') return;
    this.removals++;
    this.listeners.delete(listener);
  }

  abort(reason) {
    if (this.aborted) return;
    this.aborted = true;
    this.reason = reason;
    for (const listener of [...this.listeners]) listener();
  }
}

function requestOptions(timers, overrides = {}) {
  return {
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    ...overrides
  };
}

test('XIVAPI request succeeds before the documented production deadline and cleans up', async () => {
  const timers = fakeTimers();
  const external = new TrackedAbortSignal();
  let receivedSignal = null;
  const result = await fetchXivapiJson('https://example.test/success', requestOptions(timers, {
    signal: external,
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://example.test/success');
      receivedSignal = init.signal;
      return { ok: true, json: async () => ({ value: 42 }) };
    }
  }));

  assert.deepEqual(result, { value: 42 });
  assert.equal(receivedSignal.aborted, false);
  assert.equal(external.additions, 1);
  assert.equal(external.removals, 1);
  assert.equal(external.listeners.size, 0);
  assert.deepEqual(timers.cleared, [0]);
  assert.equal(timers.timers.size, 0);
  assert.equal(XIVAPI_REQUEST_DEADLINE_MS, 15_000);
});

test('HTTP and JSON failures retain their classifications and clean up request state', async t => {
  for (const scenario of ['http', 'json']) {
    await t.test(scenario, async () => {
      const timers = fakeTimers();
      const external = new TrackedAbortSignal();
      const jsonError = new SyntaxError('invalid JSON');
      const pending = fetchXivapiJson('https://example.test/failure', requestOptions(timers, {
        signal: external,
        httpErrorMessage: status => `Preserved HTTP failure: ${status}`,
        fetchImpl: async () => scenario === 'http'
          ? { ok: false, status: 503, json: async () => assert.fail('HTTP failures must not parse JSON') }
          : { ok: true, json: async () => { throw jsonError; } }
      }));

      if (scenario === 'http') await assert.rejects(pending, /Preserved HTTP failure: 503/);
      else await assert.rejects(pending, error => error === jsonError);
      assert.equal(external.removals, 1);
      assert.equal(external.listeners.size, 0);
      assert.deepEqual(timers.cleared, [0]);
      assert.equal(timers.timers.size, 0);
    });
  }
});

test('deadline expiry aborts once, reports the distinct timeout, and ignores late settlement', async () => {
  const timers = fakeTimers();
  let resolveFetch;
  let internalAbortCount = 0;
  const pending = fetchXivapiJson('https://example.test/slow', requestOptions(timers, {
    deadlineMs: 25,
    fetchImpl: (url, init) => {
      init.signal.addEventListener('abort', () => { internalAbortCount++; });
      return new Promise(resolve => { resolveFetch = resolve; });
    }
  }));
  const timerId = [...timers.timers.keys()][0];

  assert.equal(timers.timers.get(timerId).delay, 25);
  timers.fire(timerId);
  await assert.rejects(pending, error => error instanceof XivapiRequestTimeoutError && error.deadlineMs === 25);
  assert.equal(internalAbortCount, 1);
  assert.deepEqual(timers.cleared, [timerId]);

  resolveFetch({ ok: true, json: async () => ({ late: true }) });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(internalAbortCount, 1);
});

test('caller abort before a request preserves its reason without starting work', async () => {
  const timers = fakeTimers();
  const external = new TrackedAbortSignal();
  const reason = new DOMException('user canceled', 'AbortError');
  let fetchCalls = 0;
  external.abort(reason);

  await assert.rejects(
    fetchXivapiJson('https://example.test/not-started', requestOptions(timers, {
      signal: external,
      fetchImpl: async () => { fetchCalls++; }
    })),
    error => error === reason
  );
  assert.equal(fetchCalls, 0);
  assert.equal(timers.timers.size, 0);
  assert.equal(external.additions, 0);
  assert.equal(external.removals, 0);
});

test('caller abort during a request wins over the deadline and removes listeners', async () => {
  const timers = fakeTimers();
  const external = new TrackedAbortSignal();
  const reason = new DOMException('user canceled', 'AbortError');
  let internalAbortCount = 0;
  const pending = fetchXivapiJson('https://example.test/canceled', requestOptions(timers, {
    signal: external,
    fetchImpl: (url, init) => {
      init.signal.addEventListener('abort', () => { internalAbortCount++; });
      return new Promise(() => {});
    }
  }));

  external.abort(reason);
  await assert.rejects(pending, error => error === reason && !(error instanceof XivapiRequestTimeoutError));
  assert.equal(internalAbortCount, 1);
  assert.equal(external.removals, 1);
  assert.equal(external.listeners.size, 0);
  assert.deepEqual(timers.cleared, [0]);
  assert.equal(timers.timers.size, 0);
});
