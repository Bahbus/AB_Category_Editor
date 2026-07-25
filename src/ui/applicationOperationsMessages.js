function errorDetail(err) {
  return err instanceof Error ? err.message : String(err);
}

export function createLookupSheetLabel(translate) {
  const labels = new Map([
    ['Item', translate('applicationOperations.lookup.sheet.item')],
    ['ItemUICategory', translate('applicationOperations.lookup.sheet.uiCategory')]
  ]);
  return sheet => labels.get(sheet) ?? sheet;
}

export function createApplicationOperationsMessages(translate) {
  const sheetLabel = createLookupSheetLabel(translate);

  return Object.freeze({
    lookup: Object.freeze({
      sheetLabel,
      noneReferenced: translate('applicationOperations.lookup.noneReferenced'),
      allCached: total => translate('applicationOperations.lookup.allCached', { total }),
      busyTitle: translate('applicationOperations.lookup.busy.title'),
      busyInitial: total => translate('applicationOperations.lookup.busy.initial', { total }),
      busyProgress: (done, total, sheet, batch, batches) => translate(
        'applicationOperations.lookup.busy.progress',
        { done, total, sheet: sheetLabel(sheet), batch, batches }
      ),
      failureMore: count => translate('applicationOperations.lookup.failure.more', { count }),
      partialFailure: (count, details) => translate(
        'applicationOperations.lookup.failure.partial',
        { count, details }
      ),
      automaticUnresolved: count => translate(
        'applicationOperations.lookup.automatic.unresolved',
        { count }
      ),
      automaticCached: count => translate(
        'applicationOperations.lookup.automatic.cached',
        { count }
      ),
      complete: count => translate('applicationOperations.lookup.complete', { count }),
      automaticFailed: err => translate(
        'applicationOperations.lookup.automatic.failed',
        { error: errorDetail(err) }
      ),
      failed: err => translate(
        'applicationOperations.lookup.failed',
        { error: errorDetail(err) }
      )
    }),
    cache: Object.freeze({
      clearRefused: translate('applicationOperations.cache.clearRefused'),
      cleared: translate('applicationOperations.cache.cleared')
    }),
    categories: Object.freeze({
      sortNoop: translate('applicationOperations.categories.sortNoop'),
      renumberNoop: translate('applicationOperations.categories.renumberNoop')
    })
  });
}
