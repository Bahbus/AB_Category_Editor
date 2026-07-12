export function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
export function componentTo255(v) { return Math.round(clamp01(v) * 255); }
export function componentToHex(v) { return componentTo255(v).toString(16).padStart(2, '0'); }
export function colorToHex(color) { return '#' + componentToHex(color.X) + componentToHex(color.Y) + componentToHex(color.Z); }
export function colorToHexRGBA(color) { return '#' + componentToHex(color.X) + componentToHex(color.Y) + componentToHex(color.Z) + componentToHex(color.W); }
export function canonicalHexRgba(value) {
  const trimmed = String(value).trim();
  if (!/^#?[0-9a-fA-F]{8}$/.test(trimmed)) return null;
  return `#${trimmed.replace(/^#/, '').toUpperCase()}`;
}
export function decideHexRgbaCommit(value, committedHex) {
  const canonical = canonicalHexRgba(value);
  if (canonical === null) return { status: 'invalid', canonical: null };
  return { status: canonical === committedHex ? 'valid-no-change' : 'valid-changed', canonical };
}
export function canonicalRgb(value) {
  const trimmed = String(value).trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(trimmed)) return null;
  return trimmed.toUpperCase();
}
export function decideRgbCommit(value, displayedRgb) {
  const canonical = canonicalRgb(value);
  if (canonical === null) return { status: 'invalid', canonical: null };
  return { status: canonical === canonicalRgb(displayedRgb) ? 'valid-no-change' : 'valid-changed', canonical };
}
export function decideAlphaCommit(value, displayedByte) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 255) return { status: 'invalid', value: null };
  return { status: numeric === displayedByte ? 'valid-no-change' : 'valid-changed', value: numeric };
}
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
