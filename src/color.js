export function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
export function componentTo255(v) { return Math.round(clamp01(v) * 255); }
export function componentToHex(v) { return componentTo255(v).toString(16).padStart(2, '0'); }
export function colorToHex(color) { return '#' + componentToHex(color.X) + componentToHex(color.Y) + componentToHex(color.Z); }
export function colorToHexRGBA(color) { return '#' + componentToHex(color.X) + componentToHex(color.Y) + componentToHex(color.Z) + componentToHex(color.W); }
export function hexToRgb01(hex) {
  const clean = hex.replace('#', '');
  return { X: parseInt(clean.slice(0,2), 16) / 255, Y: parseInt(clean.slice(2,4), 16) / 255, Z: parseInt(clean.slice(4,6), 16) / 255 };
}
export function hexToRgba01(hex) {
  const clean = hex.replace('#', '');
  return { X: parseInt(clean.slice(0,2), 16) / 255, Y: parseInt(clean.slice(2,4), 16) / 255, Z: parseInt(clean.slice(4,6), 16) / 255, W: clean.length >= 8 ? parseInt(clean.slice(6,8), 16) / 255 : 1 };
}
export function rgbaCss(color) { return `rgba(${componentTo255(color.X)}, ${componentTo255(color.Y)}, ${componentTo255(color.Z)}, ${clamp01(color.W)})`; }
export function rgbaCssWithMinimumAlpha(color, minimumAlpha) { return `rgba(${componentTo255(color.X)}, ${componentTo255(color.Y)}, ${componentTo255(color.Z)}, ${Math.max(clamp01(color.W), minimumAlpha)})`; }
