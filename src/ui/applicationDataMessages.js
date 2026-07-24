function errorDetail(err) {
  return err instanceof Error ? err.message : String(err);
}

export function createApplicationDataMessages(translate) {
  const summary = Object.freeze({
    importedCategories: count => translate(
      count === 1 ? 'applicationData.summary.imported.one' : 'applicationData.summary.imported.many',
      { count: count.toLocaleString() }
    ),
    errors: count => translate(
      count === 1 ? 'applicationData.summary.error.one' : 'applicationData.summary.error.many',
      { count }
    ),
    warnings: count => translate(
      count === 1 ? 'applicationData.summary.warning.one' : 'applicationData.summary.warning.many',
      { count }
    ),
    repairs: count => translate(
      count === 1 ? 'applicationData.summary.repair.one' : 'applicationData.summary.repair.many',
      { count }
    ),
    notes: count => translate(
      count === 1 ? 'applicationData.summary.note.one' : 'applicationData.summary.note.many',
      { count }
    ),
    noValidationIssues: translate('applicationData.summary.noIssues'),
    noteOnlyCleanup: translate('applicationData.summary.noteOnlyCleanup'),
    normalizedDisplayOrder: translate('applicationData.summary.normalizedDisplayOrder'),
    normalizedRarityOrder: translate('applicationData.summary.normalizedRarityOrder'),
    normalizedDisplayAndRarityOrder: translate('applicationData.summary.normalizedDisplayAndRarityOrder')
  });

  return Object.freeze({
    replacement: Object.freeze({
      title: translate('applicationData.replacement.title'),
      warning: translate('applicationData.replacement.warning'),
      confirm: translate('applicationData.replacement.confirm'),
      cancel: translate('applicationData.replacement.cancel'),
      bindingContext: translate('applicationData.replacement.bindingContext')
    }),
    import: Object.freeze({
      title: translate('applicationData.import.title'),
      guidance: translate('applicationData.import.guidance'),
      placeholder: translate('applicationData.import.placeholder'),
      action: translate('applicationData.import.action'),
      failed: err => translate('applicationData.import.failed', { error: errorDetail(err) }),
      unavailable: err => translate('applicationData.import.unavailable', { error: errorDetail(err) }),
      uploadUnavailable: err => translate('applicationData.import.uploadUnavailable', { error: errorDetail(err) }),
      fileFailed: err => translate('applicationData.import.fileFailed', { error: errorDetail(err) }),
      presetUnavailable: translate('applicationData.import.presetUnavailable'),
      basicPresetSource: translate('applicationData.import.basicPresetSource'),
      advancedPresetSource: translate('applicationData.import.advancedPresetSource'),
      status: (source, text) => translate('applicationData.import.status', { source, summary: text }),
      noChanges: translate('applicationData.import.noChanges'),
      validationTitle: translate('applicationData.import.validationTitle')
    }),
    raw: Object.freeze({
      title: translate('applicationData.raw.title'),
      warning: translate('applicationData.raw.warning'),
      apply: translate('applicationData.raw.apply'),
      copy: translate('applicationData.raw.copy'),
      bindingContext: translate('applicationData.raw.bindingContext'),
      inputLimitLabel: translate('applicationData.raw.inputLimitLabel'),
      invalid: err => translate('applicationData.raw.invalid', { error: errorDetail(err) }),
      copyError: err => translate('applicationData.raw.copyError', { error: errorDetail(err) }),
      validationTitle: translate('applicationData.raw.validationTitle'),
      noChangeSuffix: translate('applicationData.raw.noChangeSuffix'),
      copiedInline: translate('applicationData.raw.copiedInline'),
      copiedStatus: translate('applicationData.raw.copiedStatus'),
      copyFailed: translate('applicationData.raw.copyFailed')
    }),
    validation: Object.freeze({
      explanation: translate('applicationData.validation.explanation'),
      findingsMore: count => translate('applicationData.validation.findingsMore', { count }),
      noFindings: translate('applicationData.validation.noFindings'),
      repairHeading: translate('applicationData.validation.repairHeading'),
      repairsMore: count => translate('applicationData.validation.repairsMore', { count }),
      continueEditing: translate('applicationData.validation.continueEditing'),
      bindingContext: translate('applicationData.validation.bindingContext'),
      severity: severity => translate(
        severity === 'error' ? 'applicationData.validation.severity.error' : 'applicationData.validation.severity.warning'
      ),
      categoryRepair: (categoryName, message) => translate(
        'applicationData.validation.categoryRepair',
        { categoryName, message }
      ),
      changedRepair: (message, before, after) => translate(
        'applicationData.validation.changedRepair',
        { message, before, after }
      )
    }),
    summary
  });
}
