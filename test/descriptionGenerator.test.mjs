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
  assert.doesNotMatch(text, /that are within/i);
  assert.ok(text.length < 180, `${text.length}: ${text}`);
}

function assertIntent(name, intent, expectedText, forbiddenText = /\bmateria\b/i) {
  const cat = category({ Name: name });
  const analysis = analyzeCategoryIntent(cat);
  const text = generateCategoryDescription(cat);
  assert.equal(analysis.intent, intent, `${name} intent`);
  assert.match(text, expectedText, `${name} description: ${text}`);
  if (forbiddenText) assert.doesNotMatch(text, forbiddenText, `${name} description: ${text}`);
  assertClean(text);
}

test('blank/simple category returns fallback and is not useful for auto-generation', () => {
  const text = generateCategoryDescription(category({ Name: 'Misc' }));
  assert.equal(text, "Groups items matching this category's selected rules.");
  assert.equal(isUsefulGeneratedDescription(text), false);
});

test('stat/context words do not choose materia without materia identity', () => {
  for (const name of ['Gathering Materials', 'GP Materials', 'Control Materials', 'Perception Materials']) {
    assertIntent(name, 'materials', /materials|recipe/i);
  }
  for (const name of ['Craftsmanship Potions', 'CP Potions', 'Gathering Potions']) {
    assertIntent(name, 'potions', /potion|temporary|boost/i);
  }
  assertIntent('Critical Hit Materia', 'materia', /combat materia.*Critical Hit.*melding/i, null);
});

test('materia descriptions preserve readable stat casing and role-specific purpose', () => {
  const examples = [
    ['Craftsmanship Materia', /crafting materia used to improve Craftsmanship through melding/i],
    ['Critical Hit Materia', /combat materia used to improve Critical Hit through melding/i],
    ['Gathering Materia', /gathering materia used to improve gathering stats through melding/i],
    ['GP Materia', /gathering materia used to improve GP through melding/i]
  ];
  for (const [name, expected] of examples) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, expected);
    assertClean(text);
  }
});

test('meals and potions use consumable-specific prose', () => {
  const mealText = generateCategoryDescription(category({ Name: 'Meals' }));
  assert.match(mealText, /meal consumables that provide temporary stat bonuses/i);
  assertClean(mealText);

  for (const [name, expected] of [
    ['Strength Potions', /Strength potions used for temporary combat stat boosts/i],
    ['CP Potions', /CP potions used for temporary crafting resource boosts/i]
  ]) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, expected);
    assertClean(text);
  }
});

test('unlockable subtypes get subtype-specific descriptions', () => {
  const cases = [
    ['Mounts', /mount unlock items.*collection.*character travel/i],
    ['Minions', /minion unlock items.*cosmetic companions.*collection/i],
    ['Triple Triad Cards', /Triple Triad card unlocks.*collection.*card play/i],
    ['Orchestrion Rolls', /orchestrion roll unlocks.*music collection/i],
    ['Emotes', /emote unlock items.*character expression/i],
    ['Hairstyles', /hairstyle unlock items.*character customization/i],
    ['Fashion Accessories', /fashion accessory unlocks.*cosmetic customization/i]
  ];
  for (const [name, expected] of cases) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.equal(analyzeCategoryIntent(category({ Name: name })).intent, 'unlockables');
    assert.match(text, expected);
    assert.doesNotMatch(text, /such as mounts|minions, cards|broad/i);
    assertClean(text);
  }
});

test('token and exchange subtypes get specific descriptions', () => {
  const cases = [
    ['Extreme Totems', /trial totems used to exchange for weapons, mounts, or other rewards/i],
    ['Savage Books', /savage raid books used to exchange for raid gear and rewards/i],
    ['Tomes', /tomestone currency and exchange items used for progression rewards/i],
    ['Scrips', /crafting and gathering scrip items used for vendor exchanges/i]
  ];
  for (const [name, expected] of cases) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.equal(analyzeCategoryIntent(category({ Name: name })).intent, 'tokens');
    assert.match(text, expected);
    assertClean(text);
  }
});

test('gear, materials, and appearance categories use natural intent prose', () => {
  for (const [name, expected] of [
    ['Crafting Materials', /crafting materials and recipe components/i],
    ['Gathering Materials', /gathered materials used in crafting recipes/i],
    ['Weapons', /weapons and combat equipment/i],
    ['Armor', /protective armor and equipment/i],
    ['Accessories', /equippable accessories/i],
    ['Dyes', /dyes for color and appearance customization/i],
    ['Glamour', /glamour items for appearance customization/i]
  ]) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, expected);
    assertClean(text);
  }
});

test('gear with item level mentions item-level range naturally', () => {
  const cat = category({ Name: 'Endgame Gear' });
  cat.Rules.ItemLevel.Enabled = true;
  const text = generateCategoryDescription(cat);
  assert.match(text, /gear/i);
  assert.match(text, /within the selected item-level range/i);
  assertClean(text);
});

test('level and item-level ranges combine cleanly', () => {
  const cat = category({ Name: 'Leveling Gear' });
  cat.Rules.ItemLevel.Enabled = true;
  cat.Rules.Level.Enabled = true;
  const text = generateCategoryDescription(cat);
  assert.match(text, /within the selected level and item-level ranges/i);
  assert.doesNotMatch(text, /item-level range and within the selected level range/i);
  assertClean(text);
});

test('state filters produce natural phrasing without raw keys', () => {
  const cat = category({ Name: 'Tradeable Dye Gear' });
  cat.Rules.Untradable.State = 2;
  cat.Rules.Dyeable.State = 1;
  cat.Rules.HighQuality.State = 1;
  const text = generateCategoryDescription(cat);
  assert.match(text, /dyeable.*high-quality.*gear|high-quality.*dyeable.*gear/i);
  assert.match(text, /tradeable items/i);
  assertClean(text);
});

test('generic explicit rules use useful fallback phrases', () => {
  const itemIds = category({ Name: 'Manual Picks' });
  itemIds.Rules.AllowedItemIds = [1, 2, 3];
  assert.equal(generateCategoryDescription(itemIds), 'Groups manually selected items.');

  const uiCats = category({ Name: 'Manual Picks' });
  uiCats.Rules.AllowedUiCategoryIds = [5];
  assert.equal(generateCategoryDescription(uiCats), 'Groups items from selected in-game item categories.');

  const regex = category({ Name: 'Manual Picks' });
  regex.Rules.AllowedItemNamePatterns = ['foo'];
  assert.equal(generateCategoryDescription(regex), 'Groups name-pattern matches.');

  const mixed = category({ Name: 'Manual Picks' });
  mixed.Rules.AllowedItemIds = [1];
  mixed.Rules.AllowedItemNamePatterns = ['foo'];
  assert.equal(generateCategoryDescription(mixed), 'Groups manually selected items and name-pattern matches.');
});

test('quality guards avoid raw keys and awkward prose for clear intents', () => {
  for (const name of ['Critical Hit Materia', 'Mounts', 'Extreme Totems', 'Gathering Materials', 'CP Potions']) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.doesNotMatch(text, /selected category rules|specific game item categories|ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality|that are within/i);
    assert.doesNotMatch(text, /\b(\w+)\s+\1\b/i);
    assert.doesNotMatch(text, FALLBACK_RE);
    assertClean(text);
  }
});

test('lookup names can conservatively select a high-confidence category intent', () => {
  const cat = category({ Name: 'Favorites' });
  cat.Rules.AllowedUiCategoryIds = [1];
  const text = generateCategoryDescription(cat, { lookupName: (type, id) => type === 'ItemUICategory' && id === 1 ? 'Materia' : '' });
  const analysis = analyzeCategoryIntent(cat, { lookupName: () => 'Materia' });
  assert.equal(analysis.intent, 'materia');
  assert.match(text, /materia/i);
  assertClean(text);
});

const FALLBACK_RE = /Groups items matching this category's selected rules\./;
