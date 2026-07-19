export const XIVAPI_REQUEST_DEADLINE_MS = 15_000;

export class XivapiRequestTimeoutError extends Error {
  constructor(deadlineMs) {
    super(`XIVAPI request exceeded the ${deadlineMs} ms deadline.`);
    this.name = 'XivapiRequestTimeoutError';
    this.deadlineMs = deadlineMs;
  }
}

function callerAbortReason(signal) {
  if (signal?.reason !== undefined) return signal.reason;
  const error = new Error('XIVAPI request was canceled.');
  error.name = 'AbortError';
  return error;
}

export function fetchXivapiJson(url, {
  signal = null,
  fetchImpl = globalThis.fetch,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
  deadlineMs = XIVAPI_REQUEST_DEADLINE_MS,
  httpErrorMessage = status => `XIVAPI request failed: HTTP ${status}`
} = {}) {
  if (signal?.aborted) return Promise.reject(callerAbortReason(signal));

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let timer = null;
    let settled = false;

    const cleanup = () => {
      if (timer !== null) {
        clearTimer(timer);
        timer = null;
      }
      signal?.removeEventListener('abort', onCallerAbort);
    };

    const finish = (callback, value) => {
      if (settled) return false;
      settled = true;
      cleanup();
      callback(value);
      return true;
    };

    const onCallerAbort = () => {
      const reason = callerAbortReason(signal);
      if (!finish(reject, reason)) return;
      controller.abort(reason);
    };

    if (signal) {
      signal.addEventListener('abort', onCallerAbort, { once: true });
      if (signal.aborted) {
        onCallerAbort();
        return;
      }
    }

    try {
      timer = setTimer(() => {
        const error = new XivapiRequestTimeoutError(deadlineMs);
        if (!finish(reject, error)) return;
        controller.abort(error);
      }, deadlineMs);

      const request = fetchImpl(url, { signal: controller.signal });
      Promise.resolve(request)
        .then(response => {
          if (settled) return undefined;
          if (!response.ok) throw new Error(httpErrorMessage(response.status));
          return response.json();
        })
        .then(
          json => { finish(resolve, json); },
          error => { finish(reject, error); }
        );
    } catch (error) {
      finish(reject, error);
    }
  });
}
