const DEFAULT_DURATION = 180;
const DEFAULT_EASING = 'cubic-bezier(0.2, 0, 0, 1)';
const activeAnimations = new Map();
let nextMotionId = 1;

export function createReorderMotionKey(prefix = 'reorder') {
  return `${prefix}-${nextMotionId++}`;
}

export function createOccurrenceMotionKeys(length, prefix = 'reorder') {
  const count = Number.isInteger(length) && length > 0 ? length : 0;
  return Array.from({ length: count }, () => createReorderMotionKey(prefix));
}

export function moveOccurrenceMotionKey(keys, index, offset) {
  const target = index + offset;
  if (!Array.isArray(keys) || !Number.isInteger(index) || !Number.isInteger(target)
    || index < 0 || target < 0 || index >= keys.length || target >= keys.length || offset === 0) return false;
  [keys[index], keys[target]] = [keys[target], keys[index]];
  return true;
}

export function syncOccurrenceMotionKeys(keys, length, prefix = 'reorder') {
  const count = Number.isInteger(length) && length > 0 ? length : 0;
  keys.splice(count);
  while (keys.length < count) keys.push(createReorderMotionKey(prefix));
  return keys;
}

export function createObjectMotionKeyFactory(prefix = 'reorder') {
  const keys = new WeakMap();
  return value => {
    if (!value || (typeof value !== 'object' && typeof value !== 'function')) return createReorderMotionKey(prefix);
    if (!keys.has(value)) keys.set(value, createReorderMotionKey(prefix));
    return keys.get(value);
  };
}

function motionNodes(container) {
  return container?.querySelectorAll?.('[data-reorder-motion-key]') || [];
}

function motionReduced(matchMedia = globalThis.matchMedia) {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function cancelActiveAnimation(key) {
  const animation = activeAnimations.get(key);
  if (!animation) return;
  activeAnimations.delete(key);
  try { animation.cancel(); } catch { /* Motion is progressive enhancement. */ }
}

export function captureReorderMotion(container) {
  const positions = new Map();
  for (const node of motionNodes(container)) {
    const key = node?.dataset?.reorderMotionKey;
    if (!key || typeof node.getBoundingClientRect !== 'function') continue;
    cancelActiveAnimation(key);
    try {
      const rect = node.getBoundingClientRect();
      if (Number.isFinite(rect.left) && Number.isFinite(rect.top)) positions.set(key, { left: rect.left, top: rect.top });
    } catch { /* A failed measurement must not affect the reorder. */ }
  }
  return positions;
}

export function cancelReorderMotion(container) {
  for (const node of motionNodes(container)) {
    const key = node?.dataset?.reorderMotionKey;
    if (key) cancelActiveAnimation(key);
  }
}

export function animateReorderMotion(container, positions, options = {}) {
  if (!(positions instanceof Map) || !positions.size || motionReduced(options.matchMedia)) return 0;
  const duration = Number.isFinite(options.duration) && options.duration >= 0 ? options.duration : DEFAULT_DURATION;
  const easing = options.easing || DEFAULT_EASING;
  let started = 0;

  for (const node of motionNodes(container)) {
    const key = node?.dataset?.reorderMotionKey;
    const first = positions.get(key);
    if (!key || !first || !node.isConnected || typeof node.getBoundingClientRect !== 'function' || typeof node.animate !== 'function') continue;
    try {
      const last = node.getBoundingClientRect();
      const x = first.left - last.left;
      const y = first.top - last.top;
      if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) continue;
      cancelActiveAnimation(key);
      const animation = node.animate([
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' }
      ], { duration, easing });
      if (!animation) continue;
      activeAnimations.set(key, animation);
      started++;
      Promise.resolve(animation.finished).catch(() => {}).finally(() => {
        if (activeAnimations.get(key) === animation) activeAnimations.delete(key);
      });
    } catch { /* Unsupported or failed animation setup leaves final DOM authoritative. */ }
  }
  return started;
}
