// Replace the generic Allowed Rarities list editor with fixed rarity checkboxes.
(function () {
  const RARITIES = [
    { id: 1, label: 'Common', color: 'White' },
    { id: 2, label: 'Uncommon', color: 'Green' },
    { id: 3, label: 'Rare', color: 'Blue' },
    { id: 4, label: 'Relic', color: 'Purple' },
    { id: 7, label: 'Aetherial', color: 'Pink' }
  ];

  const ALLOWED_IDS = new Set(RARITIES.map(rarity => rarity.id));

  function normalizeAllowedRarities(cat) {
    const rules = cat.Rules || (cat.Rules = {});
    const original = Array.isArray(rules.AllowedRarities) ? rules.AllowedRarities : [];
    const normalized = [];
    const seen = new Set();

    for (const raw of original) {
      const value = Number(raw);
      if (!ALLOWED_IDS.has(value) || seen.has(value)) continue;
      normalized.push(value);
      seen.add(value);
    }

    normalized.sort((a, b) => a - b);
    rules.AllowedRarities = normalized;
    return normalized;
  }

  function findAllowedRaritiesCard() {
    return Array.from(document.querySelectorAll('.card')).find(card => {
      const heading = card.querySelector('h3');
      return heading && heading.textContent.trim() === 'Allowed Rarities';
    });
  }

  function replaceAllowedRaritiesEditor() {
    if (typeof getCategories !== 'function' || typeof ensureShape !== 'function') return;
    if (typeof selectedIndex === 'undefined') return;

    const cat = getCategories()[selectedIndex];
    if (!cat) return;
    ensureShape(cat);

    const card = findAllowedRaritiesCard();
    if (!card) return;

    const selected = new Set(normalizeAllowedRarities(cat));

    card.innerHTML = `
      <h3>Allowed Rarities</h3>
      <p class="hint">Select the item rarities this category accepts. Leave all unchecked to ignore rarity.</p>
      <div class="rarity-checkbox-grid"></div>
    `;

    const grid = card.querySelector('.rarity-checkbox-grid');

    for (const rarity of RARITIES) {
      const label = document.createElement('label');
      label.className = 'check rarity-check';
      label.innerHTML = `
        <input type="checkbox" value="${rarity.id}" ${selected.has(rarity.id) ? 'checked' : ''}>
        <span>${rarity.id} - ${rarity.label} (${rarity.color})</span>
      `;

      label.querySelector('input').onchange = () => {
        const values = Array.from(grid.querySelectorAll('input[type="checkbox"]:checked'))
          .map(input => Number(input.value))
          .filter(value => ALLOWED_IDS.has(value))
          .sort((a, b) => a - b);

        cat.Rules.AllowedRarities = values;
        markDirty('Allowed rarities changed');
      };

      grid.appendChild(label);
    }
  }

  if (typeof renderEditor === 'function') {
    const originalRenderEditor = renderEditor;
    renderEditor = function renderEditorWithRarityCheckboxes() {
      originalRenderEditor();
      replaceAllowedRaritiesEditor();
    };
  } else {
    console.warn('rarities-checkboxes.js: renderEditor was not found; rarity checkbox patch was not applied.');
  }

  replaceAllowedRaritiesEditor();
})();
