export function classifyStoredPattern(value) {
  if (typeof value !== 'string') return { usable: false, reason: 'non-string' };
  if (!value.trim()) return { usable: false, reason: 'blank' };
  return { usable: true, reason: null };
}

export function selectUsableSavedPatterns(values = []) {
  const options = [];
  let omittedCount = 0;

  for (const [sourceIndex, pattern] of (Array.isArray(values) ? values : []).entries()) {
    if (!classifyStoredPattern(pattern).usable) {
      omittedCount++;
      continue;
    }
    options.push({ pattern, sourceIndex });
  }

  return { options, omittedCount };
}

export function compileBrowserPattern(pattern) {
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return { status: 'blank', regex: null };
  }

  try {
    return { status: 'compatible', regex: new RegExp(pattern, 'i') };
  } catch (error) {
    return { status: 'incompatible', regex: null, error };
  }
}

export function removeSavedPatternAtSourceIndex(values, sourceIndex) {
  if (!Array.isArray(values) || !Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= values.length) {
    return false;
  }
  values.splice(sourceIndex, 1);
  return true;
}
