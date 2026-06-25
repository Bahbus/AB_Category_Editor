import { escapeHtml } from '../dom.js';

export function renderDetailsSummaryHtml(parts) {
  const title = escapeHtml(parts?.title ?? '');
  const badges = Array.isArray(parts?.badges) ? parts.badges : [];
  return `<span class="details-summary-content"><span class="details-summary-title">${title}</span><span class="details-summary-badges">${badges.map(badge => `<span class="ui-badge details-summary-badge${badge.tone ? ` ${escapeHtml(badge.tone)} ui-badge-${escapeHtml(badge.tone)}` : ''}">${escapeHtml(badge.label)}</span>`).join('')}</span></span>`;
}

function ensureDetailsSummaryParts(details) {
  const summary = details.querySelector('summary');
  if (!summary) return null;

  let content = summary.querySelector('.details-summary-content');
  if (!content) {
    summary.textContent = '';

    content = document.createElement('span');
    content.className = 'details-summary-content';

    const title = document.createElement('span');
    title.className = 'details-summary-title';

    const badges = document.createElement('span');
    badges.className = 'details-summary-badges';

    content.append(title, badges);
    summary.appendChild(content);
  }

  let title = content.querySelector('.details-summary-title');
  if (!title) {
    title = document.createElement('span');
    title.className = 'details-summary-title';
    content.prepend(title);
  }

  let badges = content.querySelector('.details-summary-badges');
  if (!badges) {
    badges = document.createElement('span');
    badges.className = 'details-summary-badges';
    content.appendChild(badges);
  }

  return { summary, content, title, badges };
}

export function setDetailsSummary(details, parts) {
  const summaryParts = ensureDetailsSummaryParts(details);
  if (!summaryParts) return;

  const badges = Array.isArray(parts?.badges) ? parts.badges : [];
  summaryParts.title.textContent = parts?.title ?? '';
  summaryParts.badges.replaceChildren(...badges.map(badge => {
    const node = document.createElement('span');
    node.classList.add('ui-badge', 'details-summary-badge');
    if (badge.tone) node.classList.add(badge.tone, `ui-badge-${badge.tone}`);
    node.textContent = badge.label;
    return node;
  }));
  details.classList.toggle('has-validation-issues', (parts?.issueCount || 0) > 0);
}
