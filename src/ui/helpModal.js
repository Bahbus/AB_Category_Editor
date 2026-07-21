import { escapeHtml } from '../dom.js';
import { openModal } from '../modals.js';

export function showHelpModal({ translate }) {
  const wrap = document.createElement('div');
  wrap.className = 'help-modal';
  wrap.innerHTML = `
    <p>${escapeHtml(translate('help.introduction'))}</p>
    <h3>${escapeHtml(translate('help.workflow.title'))}</h3>
    <ul>
      <li><strong>${escapeHtml(translate('help.workflow.import.label'))}</strong> ${escapeHtml(translate('help.workflow.import.description'))}</li>
      <li><strong>${escapeHtml(translate('help.workflow.upload.label'))}</strong> ${escapeHtml(translate('help.workflow.upload.description'))}</li>
      <li><strong>${escapeHtml(translate('help.workflow.export.label'))}</strong> ${escapeHtml(translate('help.workflow.export.description'))}</li>
      <li><strong>${escapeHtml(translate('help.workflow.download.label'))}</strong> ${escapeHtml(translate('help.workflow.download.beforeExtension'))} <code>${escapeHtml(translate('help.workflow.download.extension'))}</code> ${escapeHtml(translate('help.workflow.download.afterExtension'))}</li>
      <li>${escapeHtml(translate('help.workflow.reimport'))}</li>
    </ul>
    <h3>${escapeHtml(translate('help.lookup.title'))}</h3>
    <ul>
      <li><strong>${escapeHtml(translate('help.lookup.resolveIds.label'))}</strong> ${escapeHtml(translate('help.lookup.resolveIds.description'))}</li>
      <li><strong>${escapeHtml(translate('help.lookup.cache.label'))}</strong> ${escapeHtml(translate('help.lookup.cache.description'))}</li>
      <li><strong>${escapeHtml(translate('help.lookup.regex.label'))}</strong> ${escapeHtml(translate('help.lookup.regex.description'))}</li>
    </ul>
    <h3>${escapeHtml(translate('help.preferences.title'))}</h3>
    <ul>
      <li><strong>${escapeHtml(translate('help.preferences.preferences.label'))}</strong> ${escapeHtml(translate('help.preferences.preferences.description'))}</li>
      <li><strong>${escapeHtml(translate('help.preferences.generate.label'))}</strong> ${escapeHtml(translate('help.preferences.generate.description'))}</li>
      <li><strong>${escapeHtml(translate('help.preferences.autoLookup.label'))}</strong> ${escapeHtml(translate('help.preferences.behavior.joiner'))} <strong>${escapeHtml(translate('help.preferences.autoGenerate.label'))}</strong> ${escapeHtml(translate('help.preferences.behavior.description'))}</li>
      <li>${escapeHtml(translate('help.preferences.storage.beforeName'))} <code>${escapeHtml(translate('help.preferences.storage.name'))}</code> ${escapeHtml(translate('help.preferences.storage.afterName'))}</li>
    </ul>
    <h3>${escapeHtml(translate('help.privacy.title'))}</h3>
    <ul>
      <li>${escapeHtml(translate('help.privacy.localProcessing'))}</li>
      <li>${escapeHtml(translate('help.privacy.storage.beforeName'))} <code>${escapeHtml(translate('help.privacy.storage.name'))}</code> ${escapeHtml(translate('help.privacy.storage.afterName'))}</li>
      <li>${escapeHtml(translate('help.privacy.xivapi'))}</li>
      <li>${escapeHtml(translate('help.privacy.repository'))}</li>
    </ul>
  `;
  openModal(translate('help.title'), wrap);
}
