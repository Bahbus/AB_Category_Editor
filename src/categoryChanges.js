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
