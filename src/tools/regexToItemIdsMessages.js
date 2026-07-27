function errorDetail(err) {
  return err instanceof Error ? err.message : String(err);
}

export function createRegexToItemIdsMessages(translate) {
  return Object.freeze({
    modal: Object.freeze({
      title: translate('regexConverter.modal.title'),
      introduction: translate('regexConverter.modal.introduction'),
      omittedPatterns: count => translate('regexConverter.modal.omittedPatterns', { count }),
      patternLabel: translate('regexConverter.modal.patternLabel'),
      customPattern: translate('regexConverter.modal.customPattern'),
      regexLabel: translate('regexConverter.modal.regexLabel'),
      placeholder: translate('regexConverter.modal.placeholder'),
      maxMatchesLabel: translate('regexConverter.modal.maxMatchesLabel'),
      pageSizeLabel: translate('regexConverter.modal.pageSizeLabel'),
      addBehaviorLabel: translate('regexConverter.modal.addBehaviorLabel'),
      keepPattern: translate('regexConverter.modal.keepPattern'),
      removePattern: translate('regexConverter.modal.removePattern'),
      scan: translate('regexConverter.modal.scan'),
      cancel: translate('regexConverter.modal.cancel'),
      add: translate('regexConverter.modal.add'),
      bindingContext: translate('regexConverter.modal.bindingContext')
    }),
    results: Object.freeze({
      truncated: matches => translate('regexConverter.results.truncated', { matches })
    }),
    scan: Object.freeze({
      cancelingSummary: translate('regexConverter.scan.cancelingSummary'),
      cancelingBusy: translate('regexConverter.scan.cancelingBusy'),
      blankPattern: translate('regexConverter.scan.blankPattern'),
      incompatiblePattern: error => translate(
        'regexConverter.scan.incompatiblePattern',
        { error: errorDetail(error) }
      ),
      workerUnavailable: error => translate(
        'regexConverter.scan.workerUnavailable',
        { error: errorDetail(error) }
      ),
      busyTitle: translate('regexConverter.scan.busyTitle'),
      busyStarting: translate('regexConverter.scan.busyStarting'),
      progressSummary: (scanned, matches, pages) => translate(
        'regexConverter.scan.progressSummary',
        { scanned, matches, pages }
      ),
      progressBusy: (scanned, matches, pages) => translate(
        'regexConverter.scan.progressBusy',
        { scanned, matches, pages }
      ),
      canceledSummary: (scanned, matches) => translate(
        'regexConverter.scan.canceledSummary',
        { scanned, matches }
      ),
      canceledStatus: translate('regexConverter.scan.canceledStatus'),
      completeSummary: (matches, scanned) => translate(
        'regexConverter.scan.completeSummary',
        { matches, scanned }
      ),
      completeStatus: translate('regexConverter.scan.completeStatus'),
      batchTimeoutSummary: (scanned, matches) => translate(
        'regexConverter.scan.batchTimeoutSummary',
        { scanned, matches }
      ),
      batchTimeoutStatus: seconds => translate(
        'regexConverter.scan.batchTimeoutStatus',
        { seconds }
      ),
      xivapiTimeoutSummary: (scanned, matches) => translate(
        'regexConverter.scan.xivapiTimeoutSummary',
        { scanned, matches }
      ),
      xivapiTimeoutStatus: seconds => translate(
        'regexConverter.scan.xivapiTimeoutStatus',
        { seconds }
      ),
      partialFailureSummary: (scanned, matches) => translate(
        'regexConverter.scan.partialFailureSummary',
        { scanned, matches }
      ),
      failed: error => translate('regexConverter.scan.failed', { error: errorDetail(error) })
    }),
    add: Object.freeze({
      noop: translate('regexConverter.add.noop'),
      addedAndRemoved: added => translate('regexConverter.add.addedAndRemoved', { added }),
      added: added => translate('regexConverter.add.added', { added }),
      removed: translate('regexConverter.add.removed')
    })
  });
}
