(() => {
  try {
    const raw = localStorage.getItem('aetherbagsEditorPreferences');
    if (!raw) return;
    const preferences = JSON.parse(raw);
    const themes = new Set(['system', 'dark', 'light', 'high-contrast', 'aetherial', 'dalamud']);
    const densities = new Set(['comfortable', 'compact']);
    const root = document.documentElement;
    if (themes.has(preferences.theme)) root.dataset.theme = preferences.theme;
    if (densities.has(preferences.density)) root.dataset.density = preferences.density;
  } catch {
    // Appearance preferences are optional; keep the HTML defaults on failure.
  }
})();
