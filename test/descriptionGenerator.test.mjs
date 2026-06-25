import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultCategory } from '../src/config.js';
import { generateCategoryDescription, isUsefulGeneratedDescription } from '../src/descriptionGenerator.js';

function category(overrides = {}) {
  const cat = defaultCategory(0);
  Object.assign(cat, overrides);
  return cat;
}

test('blank/simple category returns fallback and is not useful for auto-generation', () => {
  const text = generateCategoryDescription(category({ Name: 'Misc' }));
  assert.equal(text, "Groups items matching this category's selected rules.");
  assert.equal(isUsefulGeneratedDescription(text), false);
});

test('materia name produces materia-related phrasing', () => {
  const text = generateCategoryDescription(category({ Name: 'Crafting Materia' }));
  assert.match(text, /materia/i);
  assert.ok(text.length < 180);
});

test('gear name plus Item Level range produces item-level equipment phrasing', () => {
  const cat = category({ Name: 'Endgame Gear' });
  cat.Rules.ItemLevel.Enabled = true;
  const text = generateCategoryDescription(cat);
  assert.match(text, /equipment/i);
  assert.match(text, /item-level/i);
  assert.doesNotMatch(text, /ItemLevel|AllowedItemIds|HighQuality/);
});

test('explicit item IDs and regex patterns produce selection phrasing', () => {
  const cat = category();
  cat.Rules.AllowedItemIds = [1, 2, 3];
  cat.Rules.AllowedItemNamePatterns = ['materia'];
  const text = generateCategoryDescription(cat);
  assert.match(text, /manually selected/i);
  assert.match(text, /name patterns/i);
  assert.ok(text.length < 180);
});

test('required and excluded state filters produce natural phrasing without raw keys', () => {
  const cat = category({ Name: 'Tradeable Dye Gear' });
  cat.Rules.Untradable.State = 2;
  cat.Rules.Dyeable.State = 1;
  cat.Rules.HighQuality.State = 1;
  const text = generateCategoryDescription(cat);
  assert.match(text, /tradeable/i);
  assert.match(text, /dyeable|HQ/i);
  assert.doesNotMatch(text, /Untradable|Dyeable|HighQuality/);
});

test('multiple filters stay concise instead of raw appended list', () => {
  const cat = category({ Name: 'Materia Tokens' });
  cat.Rules.AllowedUiCategoryIds = [2];
  cat.Rules.ItemLevel.Enabled = true;
  cat.Rules.Level.Enabled = true;
  cat.Rules.AllowedRarities = [2, 3];
  cat.Rules.Collectable.State = 1;
  const text = generateCategoryDescription(cat);
  assert.match(text, /specific game item categories|materia|tokens/i);
  assert.doesNotMatch(text, /AllowedUiCategoryIds|Collectable|ItemLevel/);
  assert.ok(text.length < 180);
});
