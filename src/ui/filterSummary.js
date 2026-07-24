import { RANGE_FILTERS, STATE_FILTER_KEYS } from '../constants.js';
import { validateRangeFilter, validateStateFilter } from '../validation.js';

export function countRangeFilterIssues(rules) {
  return RANGE_FILTERS.reduce((count, { key }) => (
    rules?.[key] && ('Min' in rules[key] || 'Max' in rules[key]) ? count + validateRangeFilter(key, rules[key]).filter(item => item.severity === 'error' || item.severity === 'warning').length : count
  ), 0);
}

export function countStateFilterIssues(rules) {
  return STATE_FILTER_KEYS.reduce((count, key) => (
    rules?.[key] ? count + validateStateFilter(key, rules[key]).filter(item => item.severity === 'error' || item.severity === 'warning').length : count
  ), 0);
}

export function rangeFiltersSummaryParts(rules, messages = {}) {
  const activeNames = RANGE_FILTERS
    .filter(({ key }) => rules?.[key]?.Enabled === true)
    .map(filter => messages.rangeLabel?.(filter.key) ?? filter.label);
  const issueCount = countRangeFilterIssues(rules);
  const badges = [];
  if (activeNames.length === 1) badges.push({ label: activeNames[0], tone: 'success' });
  else if (activeNames.length === 2) activeNames.forEach(name => badges.push({ label: name, tone: 'success' }));
  else if (activeNames.length > 2) badges.push({ label: messages.rangeActive?.(activeNames.length) ?? `${activeNames.length} active`, tone: 'success' });
  return { title: messages.rangeTitle ?? 'Range Filters', badges, issueCount };
}

export function rangeFiltersSummary(rules, messages) {
  const { title, badges } = rangeFiltersSummaryParts(rules, messages);
  return [title, ...badges.map(badge => badge.label)].join(' · ');
}

export function stateFiltersSummaryParts(rules, messages = {}) {
  let required = 0;
  let excluded = 0;
  for (const key of STATE_FILTER_KEYS) {
    const state = Number(rules?.[key]?.State ?? 0);
    if (state === 1) required += 1;
    if (state === 2) excluded += 1;
  }
  const issueCount = countStateFilterIssues(rules);
  const badges = [];
  if (required) badges.push({ label: messages.stateRequired?.(required) ?? `${required} required`, tone: 'required' });
  if (excluded) badges.push({ label: messages.stateExcluded?.(excluded) ?? `${excluded} excluded`, tone: 'excluded' });
  return { title: messages.stateTitle ?? 'State Filters', badges, issueCount };
}

export function stateFiltersSummary(rules, messages) {
  const { title, badges } = stateFiltersSummaryParts(rules, messages);
  return [title, ...badges.map(badge => badge.label)].join(' · ');
}
