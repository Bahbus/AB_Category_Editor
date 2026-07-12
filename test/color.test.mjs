import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp01,
  componentTo255,
  componentToHex,
  colorToHex,
  colorToHexRGBA,
  canonicalHexRgba,
  canonicalRgb,
  decideAlphaCommit,
  decideHexRgbaCommit,
  decideRgbCommit,
  hexToRgb01,
  hexToRgba01,
  rgbaCss,
  rgbaCssWithMinimumAlpha
} from '../src/color.js';

test('clamp01 coerces finite values into the 0..1 range', () => {
  assert.equal(clamp01(-0.5), 0);
  assert.equal(clamp01(0.25), 0.25);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(Number.NaN), 0);
});

test('component conversion rounds to byte and hex values', () => {
  assert.equal(componentTo255(0), 0);
  assert.equal(componentTo255(0.5), 128);
  assert.equal(componentTo255(1), 255);
  assert.equal(componentToHex(0.5), '80');
});

test('colorToHex and colorToHexRGBA serialize RGB and alpha', () => {
  const color = { X: 1, Y: 0.5, Z: 0, W: 0 };

  assert.equal(colorToHex(color), '#ff8000');
  assert.equal(colorToHexRGBA(color), '#ff800000');
  assert.equal(colorToHexRGBA({ ...color, W: 1 }), '#ff8000ff');
});

test('hexToRgb01 and hexToRgba01 parse hex and default missing alpha to 1', () => {
  assert.deepEqual(hexToRgb01('#ff8000'), { X: 1, Y: 128 / 255, Z: 0 });
  assert.deepEqual(hexToRgba01('#ff8000'), { X: 1, Y: 128 / 255, Z: 0, W: 1 });
  assert.deepEqual(hexToRgba01('#ff800000'), { X: 1, Y: 128 / 255, Z: 0, W: 0 });
  assert.deepEqual(hexToRgba01('#ff8000ff'), { X: 1, Y: 128 / 255, Z: 0, W: 1 });
});

test('canonical Hex RGBA normalization accepts optional hash and rejects invalid text', () => {
  assert.equal(canonicalHexRgba('#a1b2c3d4'), '#A1B2C3D4');
  assert.equal(canonicalHexRgba('a1B2c3D4'), '#A1B2C3D4');
  for (const invalid of ['', '#123456', '#123456789', '#GG000000']) assert.equal(canonicalHexRgba(invalid), null);
});

test('hex commit decisions distinguish invalid, displayed no-op, and real changes', () => {
  assert.deepEqual(decideHexRgbaCommit('nope', '#10203040'), { status: 'invalid', canonical: null });
  assert.deepEqual(decideHexRgbaCommit('10203040', '#10203040'), { status: 'valid-no-change', canonical: '#10203040' });
  assert.deepEqual(decideHexRgbaCommit('#10203041', '#10203040'), { status: 'valid-changed', canonical: '#10203041' });
});

test('unchanged displayed hex preserves non-byte-aligned imported color exactly', () => {
  const color = { X: 0.123456, Y: 0.234567, Z: 0.345678, W: 0.456789 };
  const before = structuredClone(color);
  const committed = colorToHexRGBA(color).toUpperCase();
  const decision = decideHexRgbaCommit(committed.toLowerCase(), committed);
  if (decision.status === 'valid-changed') Object.assign(color, hexToRgba01(decision.canonical));
  assert.deepEqual(color, before);
});

test('a real hex change updates all components once and makes following blur a no-op', () => {
  const color = { X: 0.123456, Y: 0.234567, Z: 0.345678, W: 0.456789 };
  let committed = colorToHexRGBA(color).toUpperCase();
  let transitions = 0;
  const commit = value => {
    const decision = decideHexRgbaCommit(value, committed);
    if (decision.status !== 'valid-changed') return decision.status;
    Object.assign(color, hexToRgba01(decision.canonical));
    committed = decision.canonical;
    transitions++;
    return decision.status;
  };
  assert.equal(commit('#01020304'), 'valid-changed');
  assert.equal(commit('#01020304'), 'valid-no-change');
  assert.deepEqual(color, { X: 1 / 255, Y: 2 / 255, Z: 3 / 255, W: 4 / 255 });
  assert.equal(transitions, 1);
});

test('RGB and alpha decisions preserve precision on same-display events and detect real changes', () => {
  const color = { X: 0.123456, Y: 0.234567, Z: 0.345678, W: 0.456789 };
  const before = structuredClone(color);
  const rgb = colorToHex(color).toUpperCase();
  const alpha = componentTo255(color.W);
  assert.equal(canonicalRgb(rgb.toLowerCase()), rgb);
  assert.equal(decideRgbCommit(rgb.toLowerCase(), rgb).status, 'valid-no-change');
  assert.equal(decideAlphaCommit(String(alpha), alpha).status, 'valid-no-change');
  assert.deepEqual(color, before);
  assert.equal(decideRgbCommit('#010203', rgb).status, 'valid-changed');
  assert.equal(decideAlphaCommit(alpha === 255 ? 254 : alpha + 1, alpha).status, 'valid-changed');
  assert.equal(decideAlphaCommit('1.5', alpha).status, 'invalid');
});

test('rgba CSS helpers include current alpha or a minimum alpha', () => {
  const transparent = { X: 1, Y: 0.5, Z: 0, W: 0 };
  const opaque = { X: 1, Y: 0.5, Z: 0, W: 1 };

  assert.equal(rgbaCss(transparent), 'rgba(255, 128, 0, 0)');
  assert.equal(rgbaCss(opaque), 'rgba(255, 128, 0, 1)');
  assert.equal(rgbaCssWithMinimumAlpha(transparent, 0.2), 'rgba(255, 128, 0, 0.2)');
});
