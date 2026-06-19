// Sort imported category configs by their saved Order value before display.
// This keeps plugin-exported category order from becoming the editor's drag/drop baseline.
(function () {
  if (typeof validateConfig !== 'function') {
    console.warn('sort-on-import.js: validateConfig was not found; import sorting patch was not applied.');
    return;
  }

  const originalValidateConfig = validateConfig;

  function numericValue(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function sortCategoriesByOrder(config) {
    if (!config || !Array.isArray(config.Categories)) return config;

    config.Categories = config.Categories
      .map((cat, index) => ({ cat, index }))
      .sort((a, b) => {
        const aOrder = numericValue(a.cat.Order);
        const bOrder = numericValue(b.cat.Order);

        if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder;
        if ((aOrder !== null) !== (bOrder !== null)) return aOrder !== null ? -1 : 1;

        const aPriority = numericValue(a.cat.Priority);
        const bPriority = numericValue(b.cat.Priority);

        if (aPriority !== null && bPriority !== null && aPriority !== bPriority) return aPriority - bPriority;
        if ((aPriority !== null) !== (bPriority !== null)) return aPriority !== null ? -1 : 1;

        return a.index - b.index;
      })
      .map(entry => entry.cat);

    return config;
  }

  validateConfig = function validateConfigAndSortByOrder(config) {
    return sortCategoriesByOrder(originalValidateConfig(config));
  };
})();
