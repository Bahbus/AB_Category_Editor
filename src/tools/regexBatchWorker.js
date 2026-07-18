export function evaluateRegexBatch(pattern, candidates, maxMatches) {
  const regex = new RegExp(pattern, 'i');
  const limit = Math.max(1, Math.floor(Number(maxMatches) || 1));
  const matches = [];
  let evaluatedCount = 0;

  for (const candidate of candidates) {
    evaluatedCount++;
    regex.lastIndex = 0;
    if (regex.test(candidate.name)) matches.push(candidate);
    if (matches.length >= limit) break;
  }

  return {
    evaluatedCount,
    matches,
    limitReached: matches.length >= limit
  };
}

function serializedError(error) {
  return error instanceof Error ? error.message : String(error);
}

const workerScope = globalThis;
if (typeof workerScope.addEventListener === 'function' && typeof workerScope.postMessage === 'function') {
  workerScope.addEventListener('message', event => {
    const request = event.data;
    if (!request || request.type !== 'evaluate') return;

    const { scanId, batchId, pattern, candidates, maxMatches } = request;
    try {
      if (typeof pattern !== 'string' || !Array.isArray(candidates)) throw new Error('Invalid regex worker request.');
      const result = evaluateRegexBatch(pattern, candidates, maxMatches);
      workerScope.postMessage({ type: 'result', scanId, batchId, ...result });
    } catch (error) {
      workerScope.postMessage({ type: 'error', scanId, batchId, message: serializedError(error) });
    }
  });
}
