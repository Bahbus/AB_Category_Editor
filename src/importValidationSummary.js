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

function materialRepairSummary(repairs = []) {
  const count = reviewableImportRepairs(repairs).length;
  if (!count) return '';
  return `${count} import ${count === 1 ? 'repair' : 'repairs'}`;
}

export function validationSummaryText(categoryCount, analysis, repairs = []) {
  const counts = analysis.counts || {};
  const parts = [`Imported ${categoryCount.toLocaleString()} ${categoryCount === 1 ? 'category' : 'categories'}`];
  const repairSummary = materialRepairSummary(repairs);
  if (counts.error) parts.push(`${counts.error} ${counts.error === 1 ? 'error' : 'errors'}`);
  if (counts.warning) parts.push(`${counts.warning} ${counts.warning === 1 ? 'warning' : 'warnings'}`);
  if (repairSummary) parts.push(repairSummary);
  if (counts.note) parts.push(`${counts.note} ${counts.note === 1 ? 'note' : 'notes'}`);
  if (!counts.error && !counts.warning && !counts.note && !repairSummary) parts.push('no validation issues');
  if (!counts.error && !counts.warning && counts.note && !repairSummary) parts.push('note-only cleanup');
  const nonMaterialSummary = nonMaterialRepairSummary(repairs);
  if (nonMaterialSummary) parts.push(nonMaterialSummary);
  return parts.join(' · ');
}

export function configValidationSummaryText(config, analysis, repairs = []) {
  return validationSummaryText(config.Categories.length, analysis, repairs);
}

export function nonMaterialRepairSummary(repairs = []) {
  const nonMaterialRepairs = repairs.filter(repair => !isMaterialImportRepair(repair));
  if (!nonMaterialRepairs.length) return '';
  const hasDisplayOrder = nonMaterialRepairs.some(repair => repair.field === 'Categories');
  const hasRarityOrder = nonMaterialRepairs.some(repair => repair.field === 'AllowedRarities');
  if (hasDisplayOrder && hasRarityOrder) return 'normalized display and rarity order';
  if (hasDisplayOrder) return 'normalized display order';
  if (hasRarityOrder) return 'normalized rarity order';
  return 'note-only cleanup';
}
