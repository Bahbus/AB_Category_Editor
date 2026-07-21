const EMPTY_STATE_SEMANTIC_ELEMENTS = Object.freeze({
  strong: 'strong'
});

const strong = text => ({ kind: 'strong', text });

function textElement(documentRef, tagName, text, className = '') {
  const element = documentRef.createElement(tagName);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function appendEmptyStateRichMessage(target, parts, documentRef = document) {
  for (const part of parts) {
    if (part.type === 'text') {
      target.appendChild(documentRef.createTextNode(part.value));
      continue;
    }
    if (part.type !== 'placeholder') {
      throw new Error(`Unknown rich-message part type: ${part.type}`);
    }
    const tagName = EMPTY_STATE_SEMANTIC_ELEMENTS[part.value?.kind];
    if (!tagName) {
      throw new Error(`Unsupported empty-state rich-message semantic: ${part.value?.kind}`);
    }
    const element = documentRef.createElement(tagName);
    element.textContent = part.value.text;
    target.appendChild(element);
  }
}

function presetButton(documentRef, { id, label, description, callback, commitActiveField }) {
  const button = documentRef.createElement('button');
  button.id = id;
  button.type = 'button';
  button.className = 'link-button';
  button.textContent = label;
  button.setAttribute('title', description);
  button.setAttribute('aria-label', description);
  if (typeof callback === 'function') {
    button.addEventListener('click', () => {
      commitActiveField();
      callback();
    });
  }
  return button;
}

export function buildEmptyState({
  translate,
  loadBasicPresets = null,
  loadAdvancedPresets = null,
  commitActiveField = () => {}
}, documentRef = document) {
  const card = documentRef.createElement('div');
  card.className = 'card empty-state-card';
  card.appendChild(textElement(documentRef, 'h2', translate('emptyState.title')));
  card.appendChild(textElement(documentRef, 'p', translate('emptyState.startWith'), 'hint'));

  const list = documentRef.createElement('ul');
  list.className = 'hint';

  const workflow = documentRef.createElement('li');
  appendEmptyStateRichMessage(workflow, translate.rich('emptyState.workflow.message', {
    importPaste: strong(translate('action.importPaste')),
    upload: strong(translate('action.upload'))
  }), documentRef);
  list.appendChild(workflow);

  const basicItem = documentRef.createElement('li');
  basicItem.appendChild(presetButton(documentRef, {
    id: 'loadBasicPresets',
    label: translate('emptyState.basicPreset.label'),
    description: translate('emptyState.basicPreset.description'),
    callback: loadBasicPresets,
    commitActiveField
  }));
  list.appendChild(basicItem);

  const advancedItem = documentRef.createElement('li');
  advancedItem.appendChild(presetButton(documentRef, {
    id: 'loadAdvancedPresets',
    label: translate('emptyState.advancedPreset.label'),
    description: translate('emptyState.advancedPreset.description'),
    callback: loadAdvancedPresets,
    commitActiveField
  }));
  list.appendChild(advancedItem);
  list.appendChild(textElement(documentRef, 'li', translate('emptyState.addManually')));
  card.appendChild(list);

  card.appendChild(textElement(documentRef, 'p', translate('emptyState.preferencesGuidance', {
    preferences: translate('action.preferences')
  }), 'hint'));
  card.appendChild(textElement(documentRef, 'p', translate('emptyState.helpGuidance'), 'hint'));
  return card;
}
