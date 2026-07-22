import { escapeHtml, setStatus, syncButtonTooltip } from '../dom.js';
import { parseTypedRowIdValue, normalizeRowIdValue } from '../rowIds.js';
import {
  ITEM_SORT_FIELDS,
  ITEM_SORT_DIRECTIONS,
  analyzeItemOrdering,
  decideCanonicalCriteriaRepair,
  decideCriterionAdd,
  decideCriterionChange,
  decideCriterionRemove,
  decideOrderedMove,
  listMutationFocusPlan
} from '../itemOrdering.js';
import { setDetailsSummary } from './detailsSummary.js';
import { listEditor } from './listEditor.js';

const UI_ITEM_SORT_FIELDS = Object.freeze([
  ...ITEM_SORT_FIELDS.filter(option => option.value !== 5),
  ITEM_SORT_FIELDS.find(option => option.value === 5)
]);

function optionNodes(options, selected, excluded = new Set()) {
  return options.filter(option => !excluded.has(option.value) || option.value === selected).map(option => {
    const node = document.createElement('option');
    node.value = String(option.value);
    node.textContent = option.label;
    node.selected = option.value === selected;
    return node;
  });
}

function orderingSummary(analysis) {
  const issueCount = analysis.issues.length;
  const badges = [{ label: analysis.badge, tone: analysis.customOrderingApplied ? 'success' : '' }];
  if (issueCount) badges.push({ label: `${issueCount} ${issueCount === 1 ? 'issue' : 'issues'}`, tone: 'warning' });
  return { title: 'Item Ordering', badges, issueCount };
}

export function renderItemOrderingEditor(category, deps = {}) {
  const {
    markDirty,
    renderList,
    onValidationChanged = () => {},
    onOrderingChanged = () => {},
    openRawCategoryEditor = () => {},
    listEditorDeps = {},
    translate
  } = deps;
  const details = document.createElement('details');
  details.className = 'card item-ordering-card';
  details.innerHTML = '<summary></summary><div class="details-body item-ordering-body"></div>';
  const body = details.querySelector('.item-ordering-body');

  function afterChange(message = '') {
    markDirty();
    onValidationChanged();
    onOrderingChanged();
    renderList();
    if (message) setStatus(message, 'ok');
  }

  function focusOrderingControl(focusKey) {
    const focusKeys = Array.isArray(focusKey) ? focusKey : [focusKey];
    for (const key of focusKeys.filter(Boolean)) {
      const target = body.querySelector(`[data-ordering-focus="${key}"]`);
      if (target && !target.disabled && !target.hidden) {
        target.focus();
        return true;
      }
    }
    return false;
  }

  function applyCriteriaDecision(decision, message = '', focusKey = document.activeElement?.dataset?.orderingFocus || '') {
    if (!decision.changed) return false;
    category.ItemSortCriteria = decision.value;
    afterChange(message);
    renderBody();
    focusOrderingControl(focusKey);
    return true;
  }

  function rawCorrectionAction(label, description) {
    const wrap = document.createElement('div');
    wrap.className = 'ordering-raw-correction';
    const text = document.createElement('p');
    text.className = 'hint';
    text.textContent = description;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.onclick = openRawCategoryEditor;
    wrap.append(text, button);
    return wrap;
  }

  function refreshOrderingOverview() {
    const analysis = analyzeItemOrdering(category);
    const issues = body.querySelector('.ordering-validation');
    if (issues) {
      issues.hidden = analysis.issues.length === 0;
      issues.innerHTML = analysis.issues.map(item => `<p class="field-${escapeHtml(item.severity)}">${escapeHtml(item.message)}</p>`).join('');
    }
    setDetailsSummary(details, orderingSummary(analysis));
  }

  function renderCriteriaEditor(analysis, issueId) {
    const section = document.createElement('section');
    section.className = 'ordering-section';
    section.innerHTML = '<h3>Item Sort Criteria</h3><p class="hint">The first criterion sorts matched items; each later criterion breaks ties.</p>';
    if (!analysis.criteriaStructuredEditable) {
      const description = analysis.criteriaHasAdditionalProperties
        ? 'The stored ItemSortCriteria contains additional properties that these structured controls do not represent. Use selected-category Raw JSON to edit it without discarding those properties; the stored value has been preserved exactly.'
        : 'The stored criteria cannot be represented safely by these controls. Open selected-category Raw JSON and correct ItemSortCriteria directly; the raw value has been preserved.';
      section.appendChild(rawCorrectionAction('Edit selected category Raw JSON', description));
      return section;
    }

    const criteria = analysis.effectiveCriteria;
    const rows = document.createElement('div');
    rows.className = 'ordering-criteria-list';
    const usedFields = new Set(criteria.map(criterion => criterion.Field));
    criteria.forEach((criterion, index) => {
      const row = document.createElement('div');
      row.className = 'ordering-criterion-row';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', `Sort criterion ${index + 1}`);

      const fieldLabel = document.createElement('label');
      fieldLabel.textContent = 'Field';
      const field = document.createElement('select');
      field.setAttribute('aria-label', `Field for sort criterion ${index + 1}`);
      field.dataset.orderingFocus = `field-${index}`;
      if (analysis.criteriaIssues.length) field.setAttribute('aria-describedby', issueId);
      field.append(...optionNodes(UI_ITEM_SORT_FIELDS, criterion.Field, new Set([...usedFields].filter(value => value !== criterion.Field))));
      field.onchange = () => applyCriteriaDecision(decideCriterionChange(criteria, index, 'Field', Number(field.value)), '', `field-${index}`);
      fieldLabel.appendChild(field);

      const directionLabel = document.createElement('label');
      directionLabel.textContent = 'Direction';
      const direction = document.createElement('select');
      direction.setAttribute('aria-label', `Direction for sort criterion ${index + 1}`);
      direction.dataset.orderingFocus = `direction-${index}`;
      if (analysis.criteriaIssues.length) direction.setAttribute('aria-describedby', issueId);
      direction.disabled = criterion.Field === 0;
      direction.append(...optionNodes(ITEM_SORT_DIRECTIONS, criterion.Field === 0 ? 0 : criterion.Direction));
      direction.onchange = () => applyCriteriaDecision(decideCriterionChange(criteria, index, 'Direction', Number(direction.value)), '', `direction-${index}`);
      directionLabel.appendChild(direction);

      const actions = document.createElement('div');
      actions.className = 'ordering-row-actions';
      for (const [glyph, directionName, offset] of [['↑', 'up', -1], ['↓', 'down', 1]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-button movement-button';
        button.textContent = glyph;
        button.disabled = index + offset < 0 || index + offset >= criteria.length;
        const movementLabel = `Move sort criterion ${index + 1} ${directionName}`;
        button.setAttribute('aria-label', movementLabel);
        syncButtonTooltip(button, movementLabel);
        button.dataset.orderingFocus = `move-${offset}-${index}`;
        button.onclick = () => {
          const plan = listMutationFocusPlan('move', index, criteria.length, offset);
          const movedIndex = plan.indices[0];
          applyCriteriaDecision(decideOrderedMove(criteria, index, offset), '', [
            `move-${offset}-${movedIndex}`,
            `move-${offset * -1}-${movedIndex}`,
            `field-${movedIndex}`,
            'add-field'
          ]);
        };
        actions.appendChild(button);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon-button danger';
      remove.textContent = '×';
      const removeLabel = `Remove sort criterion ${index + 1}`;
      remove.setAttribute('aria-label', removeLabel);
      remove.title = removeLabel;
      remove.dataset.orderingFocus = `remove-${index}`;
      remove.onclick = () => {
        const plan = listMutationFocusPlan('remove', index, criteria.length - 1);
        applyCriteriaDecision(decideCriterionRemove(criteria, index), '', [
          ...plan.indices.map(position => `remove-${position}`),
          'add-field'
        ]);
      };
      actions.appendChild(remove);
      row.append(fieldLabel, directionLabel, actions);
      rows.appendChild(row);
    });
    const available = UI_ITEM_SORT_FIELDS.filter(option => !usedFields.has(option.value) && !(criteria.length && option.value === 0));
    if (available.length) {
      const addRow = document.createElement('div');
      addRow.className = 'ordering-add-row';
      const label = document.createElement('label');
      label.textContent = 'Add criterion';
      const select = document.createElement('select');
      select.setAttribute('aria-label', 'Field for new sort criterion');
      select.dataset.orderingFocus = 'add-field';
      select.append(...optionNodes(available, available[0].value));
      label.appendChild(select);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'icon-button add-icon-button ordering-contextual-icon';
      add.textContent = '+';
      add.setAttribute('aria-label', 'Add sort criterion');
      add.title = 'Add sort criterion';
      add.dataset.orderingFocus = 'add-button';
      add.onclick = () => {
        const decision = decideCriterionAdd(criteria, Number(select.value), 0);
        const plan = listMutationFocusPlan('add', 0, decision.value.length);
        applyCriteriaDecision(decision, '', [
          ...plan.indices.map(position => `field-${position}`),
          'add-field',
          'add-button'
        ]);
      };
      addRow.append(label, add);
      section.appendChild(addRow);
    }
    section.appendChild(rows);

    if (analysis.criteriaPresent && analysis.criteriaIssues.some(item => !item.blocksExport)) {
      const repair = document.createElement('div');
      repair.className = 'ordering-normalization-action';
      const preview = analysis.normalizedCriteria.map(criterion => {
        const field = ITEM_SORT_FIELDS.find(option => option.value === criterion.Field)?.label;
        const direction = ITEM_SORT_DIRECTIONS.find(option => option.value === criterion.Direction)?.label;
        return `${field} / ${direction}`;
      }).join(', ');
      repair.innerHTML = `<p class="hint">AetherBags-normalized criteria: ${escapeHtml(preview)}. This action rewrites the stored ItemSortCriteria list.</p>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Replace with AetherBags-normalized criteria';
      button.onclick = () => {
        const current = analyzeItemOrdering(category);
        applyCriteriaDecision(decideCanonicalCriteriaRepair(category.ItemSortCriteria, current.normalizedCriteria), 'Stored Item Sort Criteria replaced with the shown AetherBags-normalized list.');
      };
      repair.appendChild(button);
      section.appendChild(repair);
    }
    return section;
  }

  function renderCustomOrderEditor(analysis) {
    const section = document.createElement('section');
    section.className = 'ordering-section custom-order-section';
    section.innerHTML = '<h3>Custom Item Order</h3>';
    if (!analysis.customRepresentable || (analysis.customPresent && !analysis.validCustomOrder)) {
      section.appendChild(rawCorrectionAction('Edit in Raw JSON', 'The stored CustomItemOrder value cannot be edited safely as a ranked list. Open Advanced to correct it without losing the raw value.'));
      return section;
    }
    const state = document.createElement('p');
    state.className = analysis.retainedInactiveCustomOrder ? 'field-warning' : 'hint';
    state.textContent = analysis.retainedInactiveCustomOrder
      ? 'This ranked list is retained and editable, but inactive because Custom Item Order is not a current criterion.'
      : 'Earlier IDs rank first. Ranked items stay ahead of unranked items; Descending reverses only the ranked order.';
    section.appendChild(state);
    const values = analysis.customOrder;
    const customItemRanksError = translate('itemOrdering.customItemRanks.error');
    const editor = listEditor(translate('itemOrdering.customItemRanks.title'), values, text => {
      const value = parseTypedRowIdValue(text);
      if (value === null) throw new Error(customItemRanksError);
      return value;
    }, value => `#${value}`, {
      hint: translate('itemOrdering.customItemRanks.hint'),
      lookupSheet: 'Item',
      dedupeValues: true,
      dedupeKey: normalizeRowIdValue,
      ordered: true,
      preserveInputOnNoop: true,
      inputPlaceholder: translate('itemOrdering.customItemRanks.placeholder'),
      validateValue: text => parseTypedRowIdValue(text) === null
        ? [{ severity: 'error', field: 'CustomItemOrder', message: customItemRanksError }]
        : [],
      validateList: () => analyzeItemOrdering({ ...category, CustomItemOrder: values }).customIssues,
      onItemsChanged: changedValues => {
        category.CustomItemOrder = changedValues.slice();
        onValidationChanged();
        onOrderingChanged();
        renderList();
        if (!analyzeItemOrdering(category).customOrderRelevant) {
          renderBody();
          focusOrderingControl(['add-field', 'field-0']);
          return;
        }
        refreshOrderingOverview();
      },
      ...listEditorDeps,
      markDirty,
      translate
    });
    editor.classList.add('nested-card', 'custom-order-list-editor');
    section.appendChild(editor);
    return section;
  }

  function renderBody() {
    const analysis = analyzeItemOrdering(category);
    const issueId = `item-ordering-issues-${Math.random().toString(36).slice(2)}`;
    body.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'hint ordering-intro';
    intro.textContent = 'Ordering changes how items already matched into this category are displayed; it does not change category membership.';
    const issues = document.createElement('div');
    issues.id = issueId;
    issues.className = 'validation-list ordering-validation';
    issues.hidden = analysis.issues.length === 0;
    issues.innerHTML = analysis.issues.map(item => `<p class="field-${escapeHtml(item.severity)}">${escapeHtml(item.message)}</p>`).join('');
    body.append(intro, issues, renderCriteriaEditor(analysis, issueId));
    if (analysis.customOrderRelevant) body.appendChild(renderCustomOrderEditor(analysis));
    setDetailsSummary(details, orderingSummary(analysis));
  }

  renderBody();
  return details;
}
