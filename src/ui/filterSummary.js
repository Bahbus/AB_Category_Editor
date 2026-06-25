import { RANGE_FILTERS, STATE_FILTER_KEYS } from '../constants.js';
import { validateRangeFilter, validateStateFilter } from '../validation.js';

const RANGE_FILTER_NAMES = Object.fromEntries(RANGE_FILTERS.map(filter => [filter.key, filter.label]));

export function countRangeFilterIssues(rules) {
  return Object.keys(RANGE_FILTER_NAMES).reduce((count, key) => (
    rules?.[key] && ('Min' in rules[key] || 'Max' in rules[key]) ? count + validateRangeFilter(key, rules[key]).filter(item => item.severity === 'error' || item.severity === 'warning').length : count
  ), 0);
}

export function countStateFilterIssues(rules) {
  return STATE_FILTER_KEYS.reduce((count, key) => (
    rules?.[key] ? count + validateStateFilter(key, rules[key]).filter(item => item.severity === 'error' || item.severity === 'warning').length : count
  ), 0);
}

export function rangeFiltersSummaryParts(rules) {
  const activeNames = Object.entries(RANGE_FILTER_NAMES)
    .filter(([key]) => rules?.[key]?.Enabled === true)
    .map(([, name]) => name);
  const issueCount = countRangeFilterIssues(rules);
  const badges = [];
  if (activeNames.length === 1) badges.push({ label: activeNames[0], tone: 'success' });
  else if (activeNames.length === 2) activeNames.forEach(name => badges.push({ label: name, tone: 'success' }));
  else if (activeNames.length > 2) badges.push({ label: `${activeNames.length} active`, tone: 'success' });
  return { title: 'Range Filters', badges, issueCount };
}

export function rangeFiltersSummary(rules) {
  const { title, badges } = rangeFiltersSummaryParts(rules);
  return [title, ...badges.map(badge => badge.label)].join(' · ');
}

export function stateFiltersSummaryParts(rules) {
  let required = 0;
  let excluded = 0;
  for (const key of STATE_FILTER_KEYS) {
    const state = Number(rules?.[key]?.State ?? 0);
    if (state === 1) required += 1;
    if (state === 2) excluded += 1;
  }
  const issueCount = countStateFilterIssues(rules);
  const badges = [];
  if (required) badges.push({ label: `${required} required`, tone: 'required' });
  if (excluded) badges.push({ label: `${excluded} excluded`, tone: 'excluded' });
  return { title: 'State Filters', badges, issueCount };
}

export function stateFiltersSummary(rules) {
  const { title, badges } = stateFiltersSummaryParts(rules);
  return [title, ...badges.map(badge => badge.label)].join(' · ');
}
