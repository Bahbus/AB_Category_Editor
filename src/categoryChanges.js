export function jsonSemanticEqual(left, right) {
  if (left === right) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => jsonSemanticEqual(value, right[index]));
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every(key => Object.hasOwn(right, key) && jsonSemanticEqual(left[key], right[key]));
}

export function applyGeneratedDescriptionChange(category, generated, onChanged = () => {}) {
  if (category.Description === generated) return false;
  category.Description = generated;
  onChanged(generated);
  return true;
}

export function renumberCategories(categories) {
  let changed = false;
  categories.forEach((category, index) => {
    const value = index + 1;
    if (category.Order !== value) { category.Order = value; changed = true; }
    if (category.Priority !== value) { category.Priority = value; changed = true; }
  });
  return changed;
}

export function sortCategoriesPreservingSelection(categories, selectedIndex, compare) {
  const selectedCategory = categories[selectedIndex];
  const sorted = categories.slice().sort(compare);
  const changed = sorted.some((category, index) => category !== categories[index]);
  if (changed) categories.splice(0, categories.length, ...sorted);
  return { changed, selectedCategory, selectedIndex: selectedCategory === undefined ? -1 : categories.indexOf(selectedCategory) };
}

export function reorderCategories(categories, sourceIndex, targetIndex, before) {
  const validIndex = index => Number.isFinite(index) && Number.isInteger(index) && index >= 0 && index < categories.length;
  if (!validIndex(sourceIndex) || !validIndex(targetIndex) || typeof before !== 'boolean') {
    return { changed: false, selectedIndex: -1 };
  }
  if (sourceIndex === targetIndex) return { changed: false, selectedIndex: sourceIndex };

  const movedCategory = categories[sourceIndex];
  const reordered = categories.slice();
  reordered.splice(sourceIndex, 1);
  let insertAt = targetIndex - (sourceIndex < targetIndex ? 1 : 0) + (before ? 0 : 1);
  insertAt = Math.max(0, Math.min(reordered.length, insertAt));
  reordered.splice(insertAt, 0, movedCategory);

  const changed = reordered.some((category, index) => category !== categories[index]);
  if (!changed) return { changed: false, selectedIndex: sourceIndex };
  categories.splice(0, categories.length, ...reordered);
  return { changed: true, selectedIndex: categories.indexOf(movedCategory) };
}

export function applyCategoryReorder({ categories, sourceIndex, targetIndex, before, setSelectedIndex, autoRenumber = false, renumber, markDirty, render }) {
  const result = reorderCategories(categories, sourceIndex, targetIndex, before);
  if (!result.changed) return result;
  setSelectedIndex(result.selectedIndex);
  if (autoRenumber) renumber();
  markDirty();
  render();
  return result;
}

export function applySelectedCategoryCandidate({ categories, selectedIndex, candidate, normalize, onChanged }) {
  normalize(candidate);
  if (jsonSemanticEqual(candidate, categories[selectedIndex])) return false;
  categories[selectedIndex] = candidate;
  onChanged();
  return true;
}

export async function applyFullConfigCandidate({ currentData, candidate, confirmReplace, onChanged, onNoChange }) {
  if (jsonSemanticEqual(candidate, currentData)) { onNoChange(); return false; }
  if (!(await confirmReplace())) return null;
  onChanged();
  return true;
}
