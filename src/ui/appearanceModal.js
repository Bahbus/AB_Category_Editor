import { escapeHtml, requireScopedEl } from '../dom.js';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', hint: 'Follow your OS/browser color preference.' },
  { value: 'dark', label: 'Dark', hint: 'Neutral dark panels with a calm blue accent.' },
  { value: 'light', label: 'Light', hint: 'Simple light panels with readable dark text.' },
  { value: 'high-contrast', label: 'High Contrast', hint: 'Stronger contrast for improved readability.' },
  { value: 'aetherial', label: 'Aetherial', hint: 'Cool luminous blues, cyan, and violet.' },
  { value: 'dalamud', label: 'Dalamud', hint: 'Restrained plugin-panel charcoal, purple, and warm red tones.' }
];

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable', hint: 'Current spacing and relaxed layout.' },
  { value: 'compact', label: 'Compact', hint: 'Tighter cards, groups, and controls while keeping hit targets usable.' }
];

const CHECKBOX_OPTIONS = [
  { value: 'standard', label: 'Standard', hint: 'Clean native checkboxes.' },
  { value: 'large', label: 'Large', hint: 'Larger native checkboxes and clearer hit targets.' },
  { value: 'pills', label: 'Pills', hint: 'Chip-style rarity choices with real checkbox inputs.' }
];

function preferenceSelect(id, label, value, options) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <label for="${escapeHtml(id)}">${escapeHtml(label)}</label>
    <select id="${escapeHtml(id)}">
      ${options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('')}
    </select>
    <p class="hint">${escapeHtml(options.find(option => option.value === value)?.hint || '')}</p>
  `;
  requireScopedEl(wrap, 'select', 'appearance preference select').value = value;
  return wrap;
}

export function showAppearanceModal({ getEditorPreferences, applyEditorPreferences, setStatus, openModal, commitActiveField }) {
  commitActiveField();
  let preferences = getEditorPreferences();
  const wrap = document.createElement('div');
  wrap.className = 'preferences-modal';
  wrap.innerHTML = `
    <p class="hint">These appearance preferences are stored locally in this browser only. They affect the editor UI and are never included in exported AetherBags category data.</p>
    <div class="grid cols-3" id="appearancePreferenceGrid"></div>
  `;
  const grid = requireScopedEl(wrap, '#appearancePreferenceGrid', 'Appearance preferences');
  grid.append(
    preferenceSelect('themePreference', 'Theme', preferences.theme, THEME_OPTIONS),
    preferenceSelect('densityPreference', 'Density', preferences.density, DENSITY_OPTIONS),
    preferenceSelect('checkboxStylePreference', 'Checkbox style', preferences.checkboxStyle, CHECKBOX_OPTIONS)
  );

  openModal('Appearance Preferences', wrap);

  const bind = (id, key) => {
    const select = requireScopedEl(wrap, `#${id}`, 'Appearance preferences');
    select.addEventListener('change', e => {
      preferences = applyEditorPreferences({ ...getEditorPreferences(), [key]: e.target.value });
      setStatus('Appearance preferences saved locally.', 'ok');
    });
  };

  bind('themePreference', 'theme');
  bind('densityPreference', 'density');
  bind('checkboxStylePreference', 'checkboxStyle');
}
