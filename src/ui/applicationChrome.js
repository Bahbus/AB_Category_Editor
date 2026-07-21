const TEXT_TARGETS = Object.freeze([
  ['.brand h1', 'app.name'],
  ['label[for="search"]', 'chrome.sidebar.search.label'],
  ['#clearSearch', 'action.clear'],
  ['#addCategory', 'action.addCategory'],
  ['#sortByOrder', 'action.sortByOrder'],
  ['#renumber', 'action.renumber'],
  ['.switch-control .switch-label', 'chrome.sidebar.autoRenumberAfterDrag'],
  ['.topbar-group-file .topbar-group-label', 'chrome.topbar.fileData.title'],
  ['#showImport', 'action.importPaste'],
  ['#uploadFile', 'action.upload'],
  ['#showExportCopy', 'action.exportCopy'],
  ['#downloadBase64', 'action.download'],
  ['#showRaw', 'action.rawJson'],
  ['.topbar-group-tools .topbar-group-label', 'chrome.topbar.tools.title'],
  ['#lookupReferencedIds', 'action.resolveIds'],
  ['#showLookupCache', 'action.lookupCache'],
  ['.topbar-group-help .topbar-group-label', 'chrome.topbar.help'],
  ['#showPreferences', 'action.preferences']
]);

const ATTRIBUTE_TARGETS = Object.freeze([
  ['#search', 'placeholder', 'chrome.sidebar.search.placeholder'],
  ['#clearSearch', 'aria-label', 'action.clearSearch'],
  ['.topbar', 'aria-label', 'chrome.topbar.editorControls.label'],
  ['.topbar-group-file', 'aria-label', 'chrome.topbar.fileData.label'],
  ['.topbar-group-tools', 'aria-label', 'chrome.topbar.tools.label'],
  ['.topbar-group-help', 'aria-label', 'chrome.topbar.help'],
  ['#showHelp', 'title', 'action.aboutHelp'],
  ['#showHelp', 'aria-label', 'action.aboutHelp']
]);

function requiredTarget(documentRef, selector) {
  const target = documentRef.querySelector(selector);
  if (!target) throw new Error(`Missing application chrome target: ${selector}`);
  return target;
}

export function applyApplicationChromeLocalization(translate, documentRef = document) {
  documentRef.title = translate('app.name');
  for (const [selector, key] of TEXT_TARGETS) {
    requiredTarget(documentRef, selector).textContent = translate(key);
  }
  for (const [selector, attribute, key] of ATTRIBUTE_TARGETS) {
    requiredTarget(documentRef, selector).setAttribute(attribute, translate(key));
  }
}
