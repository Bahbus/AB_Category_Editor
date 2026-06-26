import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultCategory } from '../src/config.js';
import { analyzeCategoryIntent, generateCategoryDescription, isUsefulGeneratedDescription } from '../src/descriptionGenerator.js';

function category(overrides = {}) {
  const cat = defaultCategory(0);
  Object.assign(cat, overrides);
  return cat;
}

function assertClean(text) {
  assert.doesNotMatch(text, /specific game item categories|ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality/);
  assert.doesNotMatch(text, /\b(items items|gear gear)\b/i);
  assert.ok(text.length < 180);
}

test('blank/simple category returns fallback and is not useful for auto-generation', () => {
  const text = generateCategoryDescription(category({ Name: 'Misc' }));
  assert.equal(text, "Groups items matching this category's selected rules.");
  assert.equal(isUsefulGeneratedDescription(text), false);
});

test('crafting materia gets crafting-specific description', () => {
  const text = generateCategoryDescription(category({ Name: 'Craftsmanship Materia' }));
  assert.match(text, /crafting materia/i);
  assert.match(text, /melding|stat customization|synthesis/i);
  assert.doesNotMatch(text, /selected rules/i);
  assertClean(text);
});

test('combat materia gets melding/stat customization description', () => {
  const text = generateCategoryDescription(category({ Name: 'Critical Hit Materia' }));
  assert.match(text, /combat materia|materia/i);
  assert.match(text, /melding|stat customization/i);
  assertClean(text);
});

test('gathering materia gets gathering-specific description', () => {
  const text = generateCategoryDescription(category({ Name: 'Gathering Materia' }));
  assert.match(text, /gathering materia/i);
  assert.match(text, /melding|gathering stat/i);
  assertClean(text);
});

test('meal category mentions temporary stat buffs', () => {
  const text = generateCategoryDescription(category({ Name: 'Meals' }));
  assert.match(text, /meal|consumables/i);
  assert.match(text, /temporary|buffs|bonuses/i);
  assertClean(text);
});

test('strength potions mention temporary stat boosts', () => {
  const text = generateCategoryDescription(category({ Name: 'Strength Potions' }));
  assert.match(text, /potion/i);
  assert.match(text, /temporary|boost/i);
  assertClean(text);
});

test('mounts/minions/cards/emotes are treated as unlockables or collectibles', () => {
  for (const name of ['Mounts', 'Minions', 'Triple Triad Cards', 'Emotes', 'Hairstyles']) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, /collectible|unlock/i);
    assert.doesNotMatch(text, /equipment/i);
    assertClean(text);
  }
});

test('savage books or extreme totems are treated as exchange/reward items', () => {
  for (const name of ['Savage Books', 'Extreme Totems']) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, /exchange|reward|turn-ins|vendors/i);
    assertClean(text);
  }
});

test('crafting materials mention recipe components', () => {
  const text = generateCategoryDescription(category({ Name: 'Crafting Materials' }));
  assert.match(text, /crafting materials|recipe components/i);
  assertClean(text);
});

test('gear with item level mentions item-level range naturally', () => {
  const cat = category({ Name: 'Endgame Gear' });
  cat.Rules.ItemLevel.Enabled = true;
  const text = generateCategoryDescription(cat);
  assert.match(text, /gear/i);
  assert.match(text, /within the selected item-level range/i);
  assertClean(text);
});

test('dye/glamour state produces appearance-related phrasing', () => {
  const cat = category({ Name: 'Dyes and Glamour' });
  cat.Rules.Dyeable.State = 1;
  cat.Rules.Glamourable.State = 1;
  const text = generateCategoryDescription(cat);
  assert.match(text, /appearance|glamour|color/i);
  assert.match(text, /dyeable|usable for glamour/i);
  assertClean(text);
});

test('explicit item IDs, UI categories, and patterns produce selection phrasing', () => {
  const cat = category({ Name: 'Manual Picks' });
  cat.Rules.AllowedItemIds = [1, 2, 3];
  cat.Rules.AllowedItemNamePatterns = ['foo'];
  cat.Rules.AllowedUiCategoryIds = [5];
  const text = generateCategoryDescription(cat);
  assert.match(text, /manually selected/i);
  assert.match(text, /name patterns|in-game categories/i);
  assertClean(text);
});

test('required and excluded state filters produce natural phrasing without raw keys', () => {
  const cat = category({ Name: 'Tradeable Dye Gear' });
  cat.Rules.Untradable.State = 2;
  cat.Rules.Dyeable.State = 1;
  cat.Rules.HighQuality.State = 1;
  const text = generateCategoryDescription(cat);
  assert.match(text, /tradeable/i);
  assert.match(text, /dyeable|high-quality/i);
  assertClean(text);
});

test('analyzer returns transparent intent metadata', () => {
  const analysis = analyzeCategoryIntent(category({ Name: 'CP Potions' }));
  assert.equal(analysis.intent, 'potions');
  assert.equal(analysis.confidence, 'high');
  assert.ok(analysis.traits.includes('crafting'));
  assert.match(analysis.phrase, /crafting potions/i);
});
