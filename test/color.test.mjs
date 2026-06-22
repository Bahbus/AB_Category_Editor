import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp01,
  componentTo255,
  componentToHex,
  colorToHex,
  colorToHexRGBA,
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

test('rgba CSS helpers include current alpha or a minimum alpha', () => {
  const transparent = { X: 1, Y: 0.5, Z: 0, W: 0 };
  const opaque = { X: 1, Y: 0.5, Z: 0, W: 1 };

  assert.equal(rgbaCss(transparent), 'rgba(255, 128, 0, 0)');
  assert.equal(rgbaCss(opaque), 'rgba(255, 128, 0, 1)');
  assert.equal(rgbaCssWithMinimumAlpha(transparent, 0.2), 'rgba(255, 128, 0, 0.2)');
});
