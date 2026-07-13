export async function makeRevisionedExportSnapshot(data, getRevision, makeSnapshot) {
  const revision = getRevision();
  const value = await makeSnapshot(data);
  return { revision, value };
}

export function saveSnapshotIfCurrent(snapshotRevision, currentRevision, options = {}) {
  if (snapshotRevision !== currentRevision) {
    if (typeof options.onStale === 'function') options.onStale();
    return false;
  }
  if (typeof options.onSaved === 'function') options.onSaved();
  return true;
}
