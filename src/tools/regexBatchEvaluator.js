export const REGEX_BATCH_SIZE = 50;
export const REGEX_BATCH_DEADLINE_MS = 1000;

let nextScanId = 1;

export class RegexBatchTimeoutError extends Error {
  constructor(deadlineMs) {
    super(`JavaScript regex evaluation exceeded the ${deadlineMs} ms batch deadline.`);
    this.name = 'RegexBatchTimeoutError';
    this.deadlineMs = deadlineMs;
  }
}

export class RegexWorkerCanceledError extends Error {
  constructor() {
    super('Regex worker evaluation was canceled.');
    this.name = 'RegexWorkerCanceledError';
  }
}

export class RegexWorkerError extends Error {
  constructor(message) {
    super(message || 'Regex worker evaluation failed.');
    this.name = 'RegexWorkerError';
  }
}

function defaultWorkerFactory() {
  return new Worker(new URL('./regexBatchWorker.js', import.meta.url), { type: 'module' });
}

export function createRegexBatchEvaluator({
  pattern,
  deadlineMs = REGEX_BATCH_DEADLINE_MS,
  workerFactory = defaultWorkerFactory,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout
} = {}) {
  const worker = workerFactory();
  const scanId = nextScanId++;
  let nextBatchId = 1;
  let pending = null;
  let terminated = false;

  const clearPendingTimer = () => {
    if (!pending || pending.timer === null) return;
    clearTimer(pending.timer);
    pending.timer = null;
  };

  const terminate = error => {
    if (terminated) return false;
    terminated = true;
    const active = pending;
    clearPendingTimer();
    pending = null;
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    worker.terminate();
    if (active && error) active.reject(error);
    return true;
  };

  const fail = error => terminate(error instanceof Error ? error : new RegexWorkerError(String(error)));

  worker.onmessage = event => {
    const reply = event?.data;
    if (terminated || !pending || !reply || reply.scanId !== scanId || reply.batchId !== pending.batchId) return;
    if (reply.type === 'error') {
      fail(new RegexWorkerError(reply.message));
      return;
    }
    if (reply.type !== 'result' || !Array.isArray(reply.matches) || !Number.isInteger(reply.evaluatedCount)) {
      fail(new RegexWorkerError('Regex worker returned an invalid message.'));
      return;
    }

    const active = pending;
    clearPendingTimer();
    pending = null;
    active.resolve({
      evaluatedCount: reply.evaluatedCount,
      matches: reply.matches,
      limitReached: Boolean(reply.limitReached)
    });
  };

  worker.onerror = event => {
    event?.preventDefault?.();
    fail(new RegexWorkerError(event?.message || 'Regex worker runtime failure.'));
  };

  worker.onmessageerror = () => {
    fail(new RegexWorkerError('Regex worker returned data that could not be read.'));
  };

  const evaluate = (candidates, maxMatches) => {
    if (terminated) return Promise.reject(new RegexWorkerCanceledError());
    if (pending) return Promise.reject(new RegexWorkerError('Regex worker already has a pending batch.'));
    const batchId = nextBatchId++;

    return new Promise((resolve, reject) => {
      pending = { batchId, resolve, reject, timer: null };
      pending.timer = setTimer(() => {
        fail(new RegexBatchTimeoutError(deadlineMs));
      }, deadlineMs);

      try {
        worker.postMessage({ type: 'evaluate', scanId, batchId, pattern, candidates, maxMatches });
      } catch (error) {
        fail(new RegexWorkerError(error?.message || 'Regex worker message failed.'));
      }
    });
  };

  return {
    evaluate,
    cancel: () => terminate(new RegexWorkerCanceledError()),
    dispose: () => terminate(pending ? new RegexWorkerCanceledError() : null),
    get terminated() { return terminated; }
  };
}

export async function evaluateCandidateBatches({
  evaluator,
  candidates,
  matches,
  matchedIds,
  maxMatches,
  batchSize = REGEX_BATCH_SIZE,
  onBatch = null
}) {
  let offset = 0;
  let evaluatedCount = 0;

  while (offset < candidates.length && matches.length < maxMatches) {
    const batchEnd = Math.min(offset + batchSize, candidates.length);
    let batchOffset = offset;

    while (batchOffset < batchEnd && matches.length < maxMatches) {
      const remaining = maxMatches - matches.length;
      const reply = await evaluator.evaluate(candidates.slice(batchOffset, batchEnd), remaining);
      if (reply.evaluatedCount < 1 || reply.evaluatedCount > batchEnd - batchOffset) {
        throw new RegexWorkerError('Regex worker returned an invalid evaluated count.');
      }
      if (!reply.limitReached && reply.evaluatedCount !== batchEnd - batchOffset) {
        throw new RegexWorkerError('Regex worker stopped before completing its batch.');
      }

      batchOffset += reply.evaluatedCount;
      evaluatedCount += reply.evaluatedCount;
      const addedMatches = [];
      for (const item of reply.matches) {
        if (matchedIds.has(item.id)) continue;
        matchedIds.add(item.id);
        matches.push(item);
        addedMatches.push(item);
        if (matches.length >= maxMatches) break;
      }
      if (typeof onBatch === 'function') onBatch({ evaluatedCount: reply.evaluatedCount, addedMatches });

      if (!reply.limitReached) break;
    }

    offset = batchEnd;
  }

  return { evaluatedCount, limitReached: matches.length >= maxMatches };
}
