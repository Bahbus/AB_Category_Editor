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
import {
  animateReorderMotion,
  cancelReorderMotion,
  captureReorderMotion,
  createOccurrenceMotionKeys,
  moveOccurrenceMotionKey,
  syncOccurrenceMotionKeys
} from '../reorderMotion.js';

const UI_ITEM_SORT_FIELDS = Object.freeze([
  ...ITEM_SORT_FIELDS.filter(option => option.value !== 5),
  ITEM_SORT_FIELDS.find(option => option.value === 5)
]);

const FIELD_MESSAGE_KEYS = new Map([
  [0, 'itemOrdering.criteria.field.useGlobal'],
  [1, 'itemOrdering.criteria.field.quantity'],
  [2, 'itemOrdering.criteria.field.name'],
  [3, 'itemOrdering.criteria.field.rarity'],
  [4, 'itemOrdering.criteria.field.itemId'],
  [5, 'itemOrdering.criteria.field.customOrder'],
  [6, 'itemOrdering.criteria.field.gameCategory'],
  [7, 'itemOrdering.criteria.field.itemLevel']
]);

const DIRECTION_MESSAGE_KEYS = new Map([
  [0, 'itemOrdering.criteria.direction.ascending'],
  [1, 'itemOrdering.criteria.direction.descending']
]);

export function createItemOrderingMessages(translate) {
  const fieldLabel = value => translate(FIELD_MESSAGE_KEYS.get(value));
  const directionLabel = value => translate(DIRECTION_MESSAGE_KEYS.get(value));
  return Object.freeze({
    title: translate('itemOrdering.title'),
    summaryBadge: analysis => {
      if (analysis.customOrderingApplied) return translate('itemOrdering.summary.customOrder');
      const count = analysis.normalizedCriteria.length;
      if (count > 1 || analysis.normalizedCriteria[0]?.Field !== 0) {
        return translate(count === 1 ? 'itemOrdering.summary.criterion.one' : 'itemOrdering.summary.criterion.many', { count });
      }
      return translate('itemOrdering.summary.useGlobal');
    },
    issueCount: count => translate(count === 1 ? 'itemOrdering.summary.issue.one' : 'itemOrdering.summary.issue.many', { count }),
    introduction: translate('itemOrdering.introduction'),
    criteria: Object.freeze({
      title: translate('itemOrdering.criteria.title'),
      hint: translate('itemOrdering.criteria.hint'),
      group: position => translate('itemOrdering.criteria.group', { position }),
      field: translate('itemOrdering.criteria.field.label'),
      fieldAccessible: position => translate('itemOrdering.criteria.field.accessible', { position }),
      fieldLabel,
      direction: translate('itemOrdering.criteria.direction.label'),
      directionAccessible: position => translate('itemOrdering.criteria.direction.accessible', { position }),
      directionLabel,
      move: (position, offset) => translate('itemOrdering.criteria.move', {
        position,
        direction: translate(offset < 0 ? 'itemOrdering.criteria.movement.up' : 'itemOrdering.criteria.movement.down')
      }),
      remove: position => translate('itemOrdering.criteria.remove', { position }),
      addLabel: translate('itemOrdering.criteria.add.label'),
      addField: translate('itemOrdering.criteria.add.field'),
      addAction: translate('itemOrdering.criteria.add.action'),
      rawAdditionalProperties: translate('itemOrdering.criteria.raw.additionalProperties'),
      rawUnsafe: translate('itemOrdering.criteria.raw.unsafe'),
      rawAction: translate('itemOrdering.criteria.raw.action'),
      normalizedPreview: preview => translate('itemOrdering.criteria.normalized.preview', { preview }),
      normalizedAction: translate('itemOrdering.criteria.normalized.action'),
      normalizedSuccess: translate('itemOrdering.criteria.normalized.success')
    }),
    customOrder: Object.freeze({
      title: translate('itemOrdering.customOrder.title'),
      active: translate('itemOrdering.customOrder.active'),
      inactive: translate('itemOrdering.customOrder.inactive'),
      rawDescription: translate('itemOrdering.customOrder.raw.description'),
      rawAction: translate('itemOrdering.customOrder.raw.action'),
      ranksTitle: translate('itemOrdering.customItemRanks.title'),
      ranksHint: translate('itemOrdering.customItemRanks.hint'),
      ranksPlaceholder: translate('itemOrdering.customItemRanks.placeholder'),
      ranksError: translate('itemOrdering.customItemRanks.error')
    })
  });
}

function optionNodes(options, selected, labelForOption, excluded = new Set()) {
  return options.filter(option => !excluded.has(option.value) || option.value === selected).map(option => {
    const node = document.createElement('option');
    node.value = String(option.value);
    node.textContent = labelForOption(option.value);
    node.selected = option.value === selected;
    return node;
  });
}

function orderingSummary(analysis, messages) {
  const issueCount = analysis.issues.length;
  const badges = [{ label: messages.summaryBadge(analysis), tone: analysis.customOrderingApplied ? 'success' : '' }];
  if (issueCount) badges.push({ label: messages.issueCount(issueCount), tone: 'warning' });
  return { title: messages.title, badges, issueCount };
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
  const messages = createItemOrderingMessages(translate);
  const details = document.createElement('details');
  details.className = 'card item-ordering-card';
  details.innerHTML = '<summary></summary><div class="details-body item-ordering-body"></div>';
  const body = details.querySelector('.item-ordering-body');
  const criteriaMotionKeys = createOccurrenceMotionKeys(analyzeItemOrdering(category).effectiveCriteria.length, 'criterion');

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
    setDetailsSummary(details, orderingSummary(analysis, messages));
  }

  function renderCriteriaEditor(analysis, issueId) {
    const section = document.createElement('section');
    section.className = 'ordering-section';
    const heading = document.createElement('h3');
    heading.textContent = messages.criteria.title;
    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = messages.criteria.hint;
    section.append(heading, hint);
    if (!analysis.criteriaStructuredEditable) {
      const description = analysis.criteriaHasAdditionalProperties
        ? messages.criteria.rawAdditionalProperties
        : messages.criteria.rawUnsafe;
      section.appendChild(rawCorrectionAction(messages.criteria.rawAction, description));
      return section;
    }

    const criteria = analysis.effectiveCriteria;
    syncOccurrenceMotionKeys(criteriaMotionKeys, criteria.length, 'criterion');
    const rows = document.createElement('div');
    rows.className = 'ordering-criteria-list';
    const usedFields = new Set(criteria.map(criterion => criterion.Field));
    criteria.forEach((criterion, index) => {
      const row = document.createElement('div');
      row.className = 'ordering-criterion-row';
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', messages.criteria.group(index + 1));
      row.dataset.reorderMotionKey = criteriaMotionKeys[index];

      const fieldLabel = document.createElement('label');
      fieldLabel.textContent = messages.criteria.field;
      const field = document.createElement('select');
      field.setAttribute('aria-label', messages.criteria.fieldAccessible(index + 1));
      field.dataset.orderingFocus = `field-${index}`;
      if (analysis.criteriaIssues.length) field.setAttribute('aria-describedby', issueId);
      field.append(...optionNodes(UI_ITEM_SORT_FIELDS, criterion.Field, messages.criteria.fieldLabel, new Set([...usedFields].filter(value => value !== criterion.Field))));
      field.onchange = () => applyCriteriaDecision(decideCriterionChange(criteria, index, 'Field', Number(field.value)), '', `field-${index}`);
      fieldLabel.appendChild(field);

      const directionLabel = document.createElement('label');
      directionLabel.textContent = messages.criteria.direction;
      const direction = document.createElement('select');
      direction.setAttribute('aria-label', messages.criteria.directionAccessible(index + 1));
      direction.dataset.orderingFocus = `direction-${index}`;
      if (analysis.criteriaIssues.length) direction.setAttribute('aria-describedby', issueId);
      direction.disabled = criterion.Field === 0;
      direction.append(...optionNodes(ITEM_SORT_DIRECTIONS, criterion.Field === 0 ? 0 : criterion.Direction, messages.criteria.directionLabel));
      direction.onchange = () => applyCriteriaDecision(decideCriterionChange(criteria, index, 'Direction', Number(direction.value)), '', `direction-${index}`);
      directionLabel.appendChild(direction);

      const actions = document.createElement('div');
      actions.className = 'ordering-row-actions';
      for (const [glyph, offset] of [['↑', -1], ['↓', 1]]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'icon-button movement-button';
        button.textContent = glyph;
        button.disabled = index + offset < 0 || index + offset >= criteria.length;
        const movementLabel = messages.criteria.move(index + 1, offset);
        button.setAttribute('aria-label', movementLabel);
        syncButtonTooltip(button, movementLabel);
        button.dataset.orderingFocus = `move-${offset}-${index}`;
        button.onclick = () => {
          const plan = listMutationFocusPlan('move', index, criteria.length, offset);
          const movedIndex = plan.indices[0];
          const decision = decideOrderedMove(criteria, index, offset);
          if (!decision.changed) return;
          const positions = captureReorderMotion(rows);
          moveOccurrenceMotionKey(criteriaMotionKeys, index, offset);
          applyCriteriaDecision(decision, '', [
            `move-${offset}-${movedIndex}`,
            `move-${offset * -1}-${movedIndex}`,
            `field-${movedIndex}`,
            'add-field'
          ]);
          animateReorderMotion(body.querySelector('.ordering-criteria-list'), positions);
        };
        actions.appendChild(button);
      }
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'icon-button danger';
      remove.textContent = '×';
      const removeLabel = messages.criteria.remove(index + 1);
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
      label.textContent = messages.criteria.addLabel;
      const select = document.createElement('select');
      select.setAttribute('aria-label', messages.criteria.addField);
      select.dataset.orderingFocus = 'add-field';
      select.append(...optionNodes(available, available[0].value, messages.criteria.fieldLabel));
      label.appendChild(select);
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'icon-button add-icon-button ordering-contextual-icon';
      add.textContent = '+';
      add.setAttribute('aria-label', messages.criteria.addAction);
      add.title = messages.criteria.addAction;
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
        const field = messages.criteria.fieldLabel(criterion.Field);
        const direction = messages.criteria.directionLabel(criterion.Direction);
        return `${field} / ${direction}`;
      }).join(', ');
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = messages.criteria.normalizedPreview(preview);
      repair.appendChild(hint);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = messages.criteria.normalizedAction;
      button.onclick = () => {
        const current = analyzeItemOrdering(category);
        applyCriteriaDecision(decideCanonicalCriteriaRepair(category.ItemSortCriteria, current.normalizedCriteria), messages.criteria.normalizedSuccess);
      };
      repair.appendChild(button);
      section.appendChild(repair);
    }
    return section;
  }

  function renderCustomOrderEditor(analysis) {
    const section = document.createElement('section');
    section.className = 'ordering-section custom-order-section';
    const heading = document.createElement('h3');
    heading.textContent = messages.customOrder.title;
    section.appendChild(heading);
    if (!analysis.customRepresentable || (analysis.customPresent && !analysis.validCustomOrder)) {
      section.appendChild(rawCorrectionAction(messages.customOrder.rawAction, messages.customOrder.rawDescription));
      return section;
    }
    const state = document.createElement('p');
    state.className = analysis.retainedInactiveCustomOrder ? 'field-warning' : 'hint';
    state.textContent = analysis.retainedInactiveCustomOrder
      ? messages.customOrder.inactive
      : messages.customOrder.active;
    section.appendChild(state);
    const values = analysis.customOrder;
    const customItemRanksError = messages.customOrder.ranksError;
    const editor = listEditor(messages.customOrder.ranksTitle, values, text => {
      const value = parseTypedRowIdValue(text);
      if (value === null) throw new Error(customItemRanksError);
      return value;
    }, value => `#${value}`, {
      hint: messages.customOrder.ranksHint,
      lookupSheet: 'Item',
      dedupeValues: true,
      dedupeKey: normalizeRowIdValue,
      ordered: true,
      preserveInputOnNoop: true,
      inputPlaceholder: messages.customOrder.ranksPlaceholder,
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
    cancelReorderMotion(body);
    body.replaceChildren();
    const intro = document.createElement('p');
    intro.className = 'hint ordering-intro';
    intro.textContent = messages.introduction;
    const issues = document.createElement('div');
    issues.id = issueId;
    issues.className = 'validation-list ordering-validation';
    issues.hidden = analysis.issues.length === 0;
    issues.innerHTML = analysis.issues.map(item => `<p class="field-${escapeHtml(item.severity)}">${escapeHtml(item.message)}</p>`).join('');
    body.append(intro, issues, renderCriteriaEditor(analysis, issueId));
    if (analysis.customOrderRelevant) body.appendChild(renderCustomOrderEditor(analysis));
    setDetailsSummary(details, orderingSummary(analysis, messages));
  }

  renderBody();
  return details;
}
