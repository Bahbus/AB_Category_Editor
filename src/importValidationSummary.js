export function isMaterialImportRepair(repair) {
  if (!repair) return false;
  if (repair.material === false) return false;
  if (repair.severity === 'error' || repair.severity === 'warning') return true;
  if (repair.material === true) return true;
  return repair.field !== 'Categories';
}

export function reviewableImportRepairs(repairs = []) {
  return repairs.filter(isMaterialImportRepair);
}

export function reviewableImportFindings(findings = []) {
  return findings.filter(item => item?.severity === 'error' || item?.severity === 'warning');
}

export function shouldShowImportValidationModal(validation) {
  const findings = validation?.analysis?.findings || validation?.findings || [];
  if (reviewableImportFindings(findings).length) return true;
  return reviewableImportRepairs(validation?.repairs || []).length > 0;
}

export function importStatusSeverity(analysis = {}, repairs = []) {
  const counts = analysis.counts || {};
  return counts.error || counts.warning || reviewableImportRepairs(repairs).length ? 'warn' : 'ok';
}

const DEFAULT_MESSAGES = Object.freeze({
  importedCategories: count => `Imported ${count.toLocaleString()} ${count === 1 ? 'category' : 'categories'}`,
  errors: count => `${count} ${count === 1 ? 'error' : 'errors'}`,
  warnings: count => `${count} ${count === 1 ? 'warning' : 'warnings'}`,
  repairs: count => `${count} import ${count === 1 ? 'repair' : 'repairs'}`,
  notes: count => `${count} ${count === 1 ? 'note' : 'notes'}`,
  noValidationIssues: 'no validation issues',
  noteOnlyCleanup: 'note-only cleanup',
  normalizedDisplayOrder: 'normalized display order',
  normalizedRarityOrder: 'normalized rarity order',
  normalizedDisplayAndRarityOrder: 'normalized display and rarity order'
});

function materialRepairSummary(repairs = [], messages = DEFAULT_MESSAGES) {
  const count = reviewableImportRepairs(repairs).length;
  if (!count) return '';
  return messages.repairs(count);
}

export function validationSummaryText(categoryCount, analysis, repairs = [], messages = DEFAULT_MESSAGES) {
  const counts = analysis.counts || {};
  const parts = [messages.importedCategories(categoryCount)];
  const repairSummary = materialRepairSummary(repairs, messages);
  if (counts.error) parts.push(messages.errors(counts.error));
  if (counts.warning) parts.push(messages.warnings(counts.warning));
  if (repairSummary) parts.push(repairSummary);
  if (counts.note) parts.push(messages.notes(counts.note));
  if (!counts.error && !counts.warning && !counts.note && !repairSummary) parts.push(messages.noValidationIssues);
  if (!counts.error && !counts.warning && counts.note && !repairSummary) parts.push(messages.noteOnlyCleanup);
  const nonMaterialSummary = nonMaterialRepairSummary(repairs, messages);
  if (nonMaterialSummary) parts.push(nonMaterialSummary);
  return parts.join(' · ');
}

export function configValidationSummaryText(config, analysis, repairs = [], messages = DEFAULT_MESSAGES) {
  return validationSummaryText(config.Categories.length, analysis, repairs, messages);
}

export function nonMaterialRepairSummary(repairs = [], messages = DEFAULT_MESSAGES) {
  const nonMaterialRepairs = repairs.filter(repair => !isMaterialImportRepair(repair));
  if (!nonMaterialRepairs.length) return '';
  const hasDisplayOrder = nonMaterialRepairs.some(repair => repair.field === 'Categories');
  const hasRarityOrder = nonMaterialRepairs.some(repair => repair.field === 'AllowedRarities');
  if (hasDisplayOrder && hasRarityOrder) return messages.normalizedDisplayAndRarityOrder;
  if (hasDisplayOrder) return messages.normalizedDisplayOrder;
  if (hasRarityOrder) return messages.normalizedRarityOrder;
  return messages.noteOnlyCleanup;
}
