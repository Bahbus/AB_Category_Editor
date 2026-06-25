import { el, escapeHtml } from '../dom.js';
import { clamp01, rgbaCssWithMinimumAlpha } from '../color.js';
import { getCategoryIssueCounts } from '../validation.js';

function getCategorySearchText() {
  const search = el('search');
  return search ? search.value.trim() : '';
}

export function isCategorySearchActive() {
  return getCategorySearchText().length > 0;
}

function getCategoryDisplayName(cat) {
  return cat.Name || '(unnamed)';
}

function getCategoryDescriptionText(cat) {
  return String(cat.Description ?? '').trim();
}

function getCategorySubtitle(cat) {
  const order = `#${cat.Order ?? ''}`;
  const description = getCategoryDescriptionText(cat);
  return description ? `${order} · ${description}` : `${order} · No description`;
}

function getCategorySubtitleTitle(cat) {
  return getCategoryDescriptionText(cat) || 'No description';
}

export function computeCategoryIssueCounts(cats = []) {
  return getCategoryIssueCounts(cats);
}

function clearDropClasses() {
  document.querySelectorAll('.cat-item.drop-before, .cat-item.drop-after').forEach(node => {
    node.classList.remove('drop-before', 'drop-after');
  });
}

export function renderCategoryList({
  data,
  getCategories,
  ensureShape,
  getSelectedIndex,
  setSelectedIndex,
  getDraggedIndex,
  setDraggedIndex,
  renumberCategories,
  markDirty,
  renderAll,
  commitActiveField = () => {}
}) {
  function filteredCategoryEntries() {
    const cats = getCategories();
    const q = getCategorySearchText().toLowerCase();
    return cats.map((cat, idx) => { ensureShape(cat); return {cat, idx}; }).filter(({cat}) => {
      const hay = [
        cat.Name, cat.Description, cat.Id,
        ...(cat.Rules?.AllowedItemNamePatterns || []),
        ...(cat.Rules?.AllowedUiCategoryIds || []).map(String),
        ...(cat.Rules?.AllowedItemIds || []).map(String)
      ].join(' ').toLowerCase();
      return !q || hay.includes(q);
    });
  }

  function moveCategory(from, to, before) {
    const cats = getCategories();
    if (from < 0 || from >= cats.length || to < 0 || to >= cats.length) return;
    const [moved] = cats.splice(from, 1);
    let insertAt = to;
    if (from < to) insertAt--;
    if (!before) insertAt++;
    insertAt = Math.max(0, Math.min(cats.length, insertAt));
    cats.splice(insertAt, 0, moved);
    setSelectedIndex(insertAt);
    if (el('autoRenumberDrag').checked) renumberCategories();
    markDirty();
    renderAll();
  }

  const cats = getCategories();
  el('format').textContent = `${data.Format || 'Unknown format'} v${data.Version ?? '?' }`;
  el('count').textContent = cats.length;
  const list = el('categoryList');
  list.innerHTML = '';

  const entries = filteredCategoryEntries();
  const issueCounts = computeCategoryIssueCounts(cats);
  const searchActive = isCategorySearchActive();
  entries.forEach(({cat, idx}) => {
    const item = document.createElement('div');
    const displayName = getCategoryDisplayName(cat);
    const subtitle = getCategorySubtitle(cat);
    const subtitleTitle = getCategorySubtitleTitle(cat);

    const issueCount = issueCounts.get(cat) || 0;
    const issueLabel = `${issueCount} validation ${issueCount === 1 ? 'issue' : 'issues'}`;
    const active = idx === getSelectedIndex();
    item.className = 'cat-item' + (active ? ' active' : '') + (searchActive ? ' reorder-disabled' : '');
    item.draggable = !searchActive;
    item.tabIndex = 0;
    item.role = 'button';
    if (active) item.setAttribute('aria-current', 'true');
    item.setAttribute('aria-label', `Select category ${displayName}. ${subtitle}${issueCount ? `. ${issueLabel}` : ''}`);
    item.title = `Select ${displayName}`;
    item.dataset.index = String(idx);
    item.style.setProperty('--category-color', rgbaCssWithMinimumAlpha(cat.Color, 0.35));
    item.style.setProperty('--category-tint', rgbaCssWithMinimumAlpha({...cat.Color, W: Math.min(clamp01(cat.Color.W) * 0.16, 0.12)}, 0.035));

    function selectCategory() {
      commitActiveField();
      setSelectedIndex(idx);
      renderAll();
    }

    item.onclick = selectCategory;
    item.onkeydown = e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      selectCategory();
    };

    item.ondragstart = ev => {
      commitActiveField();
      if (searchActive) {
        ev.preventDefault();
        return;
      }
      setDraggedIndex(idx);
      item.classList.add('dragging');
      ev.dataTransfer.effectAllowed = 'move';
      ev.dataTransfer.setData('text/plain', String(idx));
    };
    item.ondragend = () => {
      setDraggedIndex(null);
      clearDropClasses();
      item.classList.remove('dragging');
    };
    item.ondragover = ev => {
      if (searchActive) return;
      ev.preventDefault();
      if (getDraggedIndex() === null || getDraggedIndex() === idx) return;
      clearDropClasses();
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      item.classList.add(before ? 'drop-before' : 'drop-after');
    };
    item.ondrop = ev => {
      if (searchActive) return;
      ev.preventDefault();
      const from = getDraggedIndex() ?? Number(ev.dataTransfer.getData('text/plain'));
      const to = idx;
      if (Number.isNaN(from) || from === to) return;
      const rect = item.getBoundingClientRect();
      const before = ev.clientY < rect.top + rect.height / 2;
      moveCategory(from, to, before);
    };

    item.innerHTML = `
      <div class="drag-handle" title="${searchActive ? 'Clear search to reorder' : 'Drag to reorder'}">☰</div>
      <div class="cat-text">
        <div class="cat-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
        <div class="cat-desc" title="${escapeHtml(subtitleTitle)}">${escapeHtml(subtitle)}</div>
      </div>
      <div class="badges">
        ${issueCount ? `<span class="ui-badge ui-badge-warning category-issue-badge" title="${escapeHtml(issueLabel)}" aria-label="${escapeHtml(issueLabel)}">${issueCount}</span>` : ''}
        <span class="ui-badge badge ${cat.Enabled ? 'on ui-badge-success' : 'ui-badge-muted'}">${cat.Enabled ? 'on' : 'off'}</span>
        ${cat.Pinned ? '<span class="ui-badge ui-badge-pin ui-badge-icon badge pin" title="Pinned" aria-label="Pinned"><svg class="badge-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10.8 1.2 14.8 5.2 13.4 6.6 12.6 5.8 9.8 8.6 10.2 10.6 9.2 11.6 6.7 9.1 3.1 12.7 2.2 11.8 5.8 8.2 3.4 5.8 4.4 4.8 6.4 5.2 9.2 2.4 8.4 1.6 9.8.2 10.8 1.2Z"/></svg></span>' : ''}
      </div>
    `;
    list.appendChild(item);
  });

  el('listStatus').textContent = searchActive
    ? `${entries.length} shown · clear search to reorder`
    : `${entries.length} shown · drag categories to reorder`;
}
