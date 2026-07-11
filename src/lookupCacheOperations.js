export function createLookupCacheOperationCoordinator() {
  let activeCount = 0;
  const listeners = new Set();

  const notify = () => {
    const active = activeCount > 0;
    for (const listener of listeners) listener(active);
  };

  return {
    acquire() {
      activeCount++;
      notify();
      let released = false;
      return () => {
        if (released) return;
        released = true;
        activeCount--;
        notify();
      };
    },
    isActive() {
      return activeCount > 0;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

export function clearLookupCacheIfIdle({ isActive, clear, onRefused }) {
  if (isActive()) {
    onRefused();
    return false;
  }
  clear();
  return true;
}
