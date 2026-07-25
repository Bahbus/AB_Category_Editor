function errorDetail(err) {
  return err instanceof Error ? err.message : String(err);
}

export function createApplicationExportMessages(translate) {
  return Object.freeze({
    savedState: Object.freeze({
      changesNotExported: translate('applicationExport.savedState.changesNotExported'),
      exported: translate('applicationExport.savedState.exported'),
      downloaded: translate('applicationExport.savedState.downloaded')
    }),
    availability: Object.freeze({
      exportEmpty: translate('applicationExport.availability.exportEmpty'),
      downloadEmpty: translate('applicationExport.availability.downloadEmpty')
    }),
    busy: Object.freeze({
      exportTitle: translate('applicationExport.busy.exportTitle'),
      downloadTitle: translate('applicationExport.busy.downloadTitle'),
      compression: translate('applicationExport.busy.compression')
    }),
    failure: Object.freeze({
      export: err => translate('applicationExport.failure.export', { error: errorDetail(err) }),
      download: err => translate('applicationExport.failure.download', { error: errorDetail(err) })
    }),
    compatibility: Object.freeze({
      title: translate('applicationExport.compatibility.title'),
      heading: translate('applicationExport.compatibility.heading'),
      explanation: count => translate('applicationExport.compatibility.explanation', { count }),
      guidance: translate('applicationExport.compatibility.guidance'),
      truncated: count => translate('applicationExport.compatibility.truncated', { count }),
      continueEditing: translate('applicationExport.compatibility.continueEditing'),
      bindingContext: translate('applicationExport.compatibility.bindingContext'),
      status: count => translate('applicationExport.compatibility.status', { count })
    }),
    export: Object.freeze({
      activeDialog: translate('applicationExport.export.activeDialog'),
      title: translate('applicationExport.export.title'),
      currentExplanation: translate('applicationExport.export.currentExplanation'),
      staleExplanation: translate('applicationExport.export.staleExplanation'),
      copyAgain: translate('applicationExport.export.copyAgain'),
      copied: translate('applicationExport.export.copied'),
      automaticCopyBlocked: translate('applicationExport.export.automaticCopyBlocked'),
      retryCopyFailed: translate('applicationExport.export.retryCopyFailed'),
      retryCopyError: translate('applicationExport.export.retryCopyError'),
      bindingContext: translate('applicationExport.export.bindingContext'),
      staleDirtyStatus: translate('applicationExport.export.staleDirtyStatus'),
      staleSavedStatus: translate('applicationExport.export.staleSavedStatus')
    }),
    download: Object.freeze({
      success: filename => translate('applicationExport.download.success', { filename }),
      staleDirty: filename => translate('applicationExport.download.staleDirty', { filename }),
      staleSaved: filename => translate('applicationExport.download.staleSaved', { filename })
    })
  });
}
