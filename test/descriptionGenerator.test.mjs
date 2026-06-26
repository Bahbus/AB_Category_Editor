import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultCategory } from '../src/config.js';
import { analyzeCategoryIntent, analyzeExplicitSources, generateCategoryDescription, isUsefulGeneratedDescription } from '../src/descriptionGenerator.js';

function category(overrides = {}) {
  const cat = defaultCategory(0);
  Object.assign(cat, overrides);
  return cat;
}

function assertClean(text) {
  assert.doesNotMatch(text, /specific game item categories|ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality/);
  assert.doesNotMatch(text, /from manually selected items|from items from|items from selected in-game item categories/i);
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
  assert.equal(generateCategoryDescription(itemIds), 'Groups selected item entries.');

  const uiCats = category({ Name: 'Manual Picks' });
  uiCats.Rules.AllowedUiCategoryIds = [5];
  assert.equal(generateCategoryDescription(uiCats), 'Groups selected item categories.');

  const regex = category({ Name: 'Manual Picks' });
  regex.Rules.AllowedItemNamePatterns = ['foo'];
  assert.equal(generateCategoryDescription(regex), 'Groups items matched by selected name patterns.');

  const mixed = category({ Name: 'Manual Picks' });
  mixed.Rules.AllowedItemIds = [1];
  mixed.Rules.AllowedItemNamePatterns = ['foo'];
  assert.equal(generateCategoryDescription(mixed), 'Groups selected item entries and name-pattern matches.');
});

test('explicit source combinations use clean deterministic fallback phrases', () => {
  const cases = [
    [['AllowedItemIds'], 'Groups selected item entries.'],
    [['AllowedUiCategoryIds'], 'Groups selected item categories.'],
    [['AllowedItemNamePatterns'], 'Groups items matched by selected name patterns.'],
    [['AllowedItemIds', 'AllowedUiCategoryIds'], 'Groups selected item entries and item categories.'],
    [['AllowedItemIds', 'AllowedItemNamePatterns'], 'Groups selected item entries and name-pattern matches.'],
    [['AllowedUiCategoryIds', 'AllowedItemNamePatterns'], 'Groups item categories and name-pattern matches.'],
    [['AllowedItemIds', 'AllowedUiCategoryIds', 'AllowedItemNamePatterns'], 'Groups selected item entries, item categories, and name-pattern matches.']
  ];
  for (const [keys, expected] of cases) {
    const cat = category({ Name: 'Manual Picks' });
    if (keys.includes('AllowedItemIds')) cat.Rules.AllowedItemIds = [1];
    if (keys.includes('AllowedUiCategoryIds')) cat.Rules.AllowedUiCategoryIds = [2];
    if (keys.includes('AllowedItemNamePatterns')) cat.Rules.AllowedItemNamePatterns = ['foo'];
    const text = generateCategoryDescription(cat);
    assert.equal(text, expected);
    assertClean(text);
  }
});

test('cache-aware UI category descriptions prefer cached category names', () => {
  const lookupName = (sheet, id) => sheet === 'ItemUICategory' ? ({ 1: 'Materia', 2: 'Medicine', 3: 'Minion' }[id] || '') : '';
  const one = category({ Name: 'Favorites' });
  one.Rules.AllowedUiCategoryIds = [1];
  assert.match(generateCategoryDescription(one, { lookupName }), /Materia/i);

  const two = category({ Name: 'Favorites' });
  two.Rules.AllowedUiCategoryIds = [1, 2];
  assert.match(generateCategoryDescription(two, { lookupName }), /Materia.*Medicine|Medicine.*Materia/i);

  const mixed = category({ Name: 'Favorites' });
  mixed.Rules.AllowedUiCategoryIds = [3, 99];
  assert.match(generateCategoryDescription(mixed, { lookupName }), /Minion/i);

  const none = category({ Name: 'Favorites' });
  none.Rules.AllowedUiCategoryIds = [99];
  assert.equal(generateCategoryDescription(none, { lookupName }), 'Groups selected item categories.');
  for (const cat of [one, two, mixed, none]) assertClean(generateCategoryDescription(cat, { lookupName }));
});

test('cache-aware item descriptions prefer cached item names and summaries', () => {
  const names = { 10: 'Grade IX Strength Tincture', 11: 'Grade IX Dexterity Tincture', 12: 'Grade IX Intelligence Tincture', 13: 'Legendary Kamuy Fife' };
  const lookupName = (sheet, id) => sheet === 'Item' ? (names[id] || '') : '';
  const one = category({ Name: 'Favorites' });
  one.Rules.AllowedItemIds = [10];
  assert.match(generateCategoryDescription(one, { lookupName }), /Grade IX Strength Tincture/i);

  const several = category({ Name: 'Favorites' });
  several.Rules.AllowedItemIds = [10, 11, 12];
  assert.match(generateCategoryDescription(several, { lookupName }), /Tincture|potion/i);

  const mixed = category({ Name: 'Favorites' });
  mixed.Rules.AllowedItemIds = [13, 99];
  assert.match(generateCategoryDescription(mixed, { lookupName }), /Legendary Kamuy Fife|mount unlock/i);

  const none = category({ Name: 'Favorites' });
  none.Rules.AllowedItemIds = [99];
  assert.equal(generateCategoryDescription(none, { lookupName }), 'Groups selected item entries.');
  for (const cat of [one, several, mixed, none]) assertClean(generateCategoryDescription(cat, { lookupName }));
});

test('structured explicit analysis reports cached names without mutating lookup state', () => {
  const cat = category({ Name: 'Manual Picks' });
  cat.Rules.AllowedItemIds = [10, 99];
  cat.Rules.AllowedUiCategoryIds = [1];
  cat.Rules.AllowedItemNamePatterns = ['foo'];
  const calls = [];
  const analysis = analyzeExplicitSources(cat.Rules, { lookupName: (sheet, id) => {
    calls.push([sheet, id]);
    return sheet === 'Item' && id === 10 ? 'Grade IX Strength Tincture' : sheet === 'ItemUICategory' && id === 1 ? 'Materia' : '';
  } });
  assert.deepEqual(analysis.itemIds.names, ['Grade IX Strength Tincture']);
  assert.deepEqual(analysis.uiCategoryIds.names, ['Materia']);
  assert.equal(analysis.itemIds.uncachedCount, 1);
  assert.ok(calls.some(([sheet]) => sheet === 'Item'));
  assert.ok(calls.some(([sheet]) => sheet === 'ItemUICategory'));
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
