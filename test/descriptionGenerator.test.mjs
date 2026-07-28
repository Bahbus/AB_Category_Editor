import assert from 'node:assert/strict';
import test from 'node:test';
import { defaultCategory } from '../src/config.js';
import { analyzeCategoryIntent, analyzeExplicitSources } from '../src/descriptionAnalysis.js';
import { generateCategoryDescription, isUsefulGeneratedDescription } from '../src/descriptionGenerator.js';

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
  assert.ok(text.length <= 140, `${text.length}: ${text}`);
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
  assertIntent('Critical Hit Materia', 'materia', /materia.*Critical Hit|Critical Hit.*materia/i, null);
});

test('materia descriptions preserve readable stat casing and role-specific purpose', () => {
  const examples = [
    ['Craftsmanship Materia', /materia.*Craftsmanship|Craftsmanship.*materia/i, /crafting/i],
    ['Critical Hit Materia', /materia.*Critical Hit|Critical Hit.*materia/i, /combat/i],
    ['Gathering Materia', /materia.*Gathering|Gathering.*materia/i, /gathering/i],
    ['GP Materia', /materia.*GP|GP.*materia/i, /gathering/i]
  ];
  for (const [name, expected, role] of examples) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, expected);
    assert.match(text, role);
    assertClean(text);
  }
});

test('meals and potions use consumable-specific prose', () => {
  const mealText = generateCategoryDescription(category({ Name: 'Meals' }));
  assert.match(mealText, /Meals that provide temporary stat bonuses/i);
  assertClean(mealText);

  for (const [name, expected] of [
    ['Strength Potions', /Potions that temporarily increase Strength/i],
    ['CP Potions', /potion.*temporary.*CP|temporary.*CP.*potion/i]
  ]) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.match(text, expected);
    assertClean(text);
  }
});

test('unlockable subtypes get subtype-specific descriptions', () => {
  const cases = [
    ['Mounts', /Items that unlock mounts/i],
    ['Minions', /Items that unlock minions/i],
    ['Triple Triad Cards', /Triple Triad cards/i],
    ['Orchestrion Rolls', /Orchestrion rolls/i],
    ['Emotes', /Items that unlock emotes/i],
    ['Hairstyles', /Items that unlock hairstyles/i],
    ['Fashion Accessories', /Items that unlock fashion accessories/i]
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
    ['Extreme Totems', /Totems earned from Extreme trials and exchanged for rewards/i],
    ['Ultimate Totems', /Totems earned from Ultimate raids and exchanged for weapons/i],
    ['Savage Books', /Books earned from Savage raids and exchanged for gear/i],
    ['Tomes', /Tomestones exchanged for progression rewards/i],
    ['Scrips', /Crafting and gathering scrips used for vendor exchanges/i]
  ];
  for (const [name, expected] of cases) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.equal(analyzeCategoryIntent(category({ Name: name })).intent, 'tokens');
    assert.match(text, expected);
    assertClean(text);
  }
});

test('known Savage book tiers retain raid identity with deterministic prose variation', () => {
  const cases = new Map([
    ['Savage Books (LHW)', 'Proof of clearing the Arcadion: Light-heavyweight Tier (Savage).'],
    ['Savage Books (CW)', 'Proof of clearing the Arcadion: Cruiserweight Tier (Savage).'],
    ['Savage Books (HW)', 'Proof of clearing the Arcadion: Heavyweight Tier (Savage).'],
    ['Savage Books (Asphodelos)', 'Books earned from Pandaemonium: Asphodelos (Savage).'],
    ['Savage Books (Gate)', "Raid books awarded for clearing Eden's Gate (Savage)."],
    ['Savage Books (Deltascape)', 'Books from the Deltascape (Savage), exchanged for gear.'],
    ['Savage Books (Gordias)', 'Raid books from Alexander: Gordias (Savage), used to obtain gear.']
  ]);
  const frames = new Set();

  for (const [name, expected] of cases) {
    const cat = category({ Name: name });
    const analysis = analyzeCategoryIntent(cat);
    const text = generateCategoryDescription(cat);
    assert.equal(text, expected);
    assert.ok(analysis.raidSeriesKey);
    assert.ok(analysis.raidTierKey);
    frames.add(analysis.messageKey);
    assertClean(text);
  }

  assert.equal(frames.size, 5);
  assert.equal(generateCategoryDescription(category({ Name: 'Savage Books' })), 'Books earned from Savage raids and exchanged for gear.');
});

test('gear, materials, and appearance categories use natural intent prose', () => {
  for (const [name, expected] of [
    ['Crafting Materials', /Crafting materials and recipe components/i],
    ['Gathering Materials', /Gathered materials used in crafting recipes/i],
    ['Augment Materials', /Gear augmentation materials/i],
    ['Weapons', /Job weapons for Disciples of War and Magic/i],
    ['Armor', /Protective armor and equipment/i],
    ['Accessories', /Accessories and shields/i],
    ['Dyes', /Items used to dye gear and furnishings/i],
    ['Glamour', /Items used for glamour/i]
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
  assert.match(text, /Includes only the selected item-level range/i);
  assertClean(text);
});

test('level and item-level ranges combine cleanly', () => {
  const cat = category({ Name: 'Leveling Gear' });
  cat.Rules.ItemLevel.Enabled = true;
  cat.Rules.Level.Enabled = true;
  const text = generateCategoryDescription(cat);
  assert.match(text, /Includes only the selected level and item-level ranges/i);
  assert.doesNotMatch(text, /item-level range and within the selected level range/i);
  assertClean(text);
});

test('state filters produce natural phrasing without raw keys', () => {
  const cat = category({ Name: 'Tradeable Dye Gear' });
  cat.Rules.Untradable.State = 2;
  cat.Rules.Dyeable.State = 1;
  cat.Rules.HighQuality.State = 1;
  const text = generateCategoryDescription(cat);
  assert.match(text, /Equippable gear.*Includes only dyeable items.*high-quality items/i);
  assert.match(text, /tradeable items/i);
  assertClean(text);
});

test('generic explicit rules use useful fallback phrases', () => {
  const itemIds = category({ Name: 'Manual Picks' });
  itemIds.Rules.AllowedItemIds = [1, 2, 3];
  assert.equal(generateCategoryDescription(itemIds), '3 explicitly selected items.');

  const uiCats = category({ Name: 'Manual Picks' });
  uiCats.Rules.AllowedUiCategoryIds = [5];
  assert.equal(generateCategoryDescription(uiCats), 'Items from 1 selected category.');

  const regex = category({ Name: 'Manual Picks' });
  regex.Rules.AllowedItemNamePatterns = ['foo'];
  assert.equal(generateCategoryDescription(regex), 'Items matched by a selected name pattern.');

  const mixed = category({ Name: 'Manual Picks' });
  mixed.Rules.AllowedItemIds = [1];
  mixed.Rules.AllowedItemNamePatterns = ['foo'];
  assert.equal(generateCategoryDescription(mixed), 'Items selected by explicit item IDs and name patterns.');
});

test('explicit source combinations use clean deterministic fallback phrases', () => {
  const cases = [
    [['AllowedItemIds'], '1 explicitly selected item.'],
    [['AllowedUiCategoryIds'], 'Items from 1 selected category.'],
    [['AllowedItemNamePatterns'], 'Items matched by a selected name pattern.'],
    [['AllowedItemIds', 'AllowedUiCategoryIds'], 'Items selected by explicit item IDs and item categories.'],
    [['AllowedItemIds', 'AllowedItemNamePatterns'], 'Items selected by explicit item IDs and name patterns.'],
    [['AllowedUiCategoryIds', 'AllowedItemNamePatterns'], 'Items selected by item categories and name patterns.'],
    [['AllowedItemIds', 'AllowedUiCategoryIds', 'AllowedItemNamePatterns'], 'Items selected by explicit item IDs, item categories, and name patterns.']
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
  assert.equal(generateCategoryDescription(none, { lookupName }), 'Items from 1 selected category.');
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
  assert.equal(generateCategoryDescription(none, { lookupName }), '1 explicitly selected item.');
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

test('lookup-only intent requires representative evidence across explicit item lists', () => {
  const cat = category({ Name: 'Favorites' });
  cat.Rules.AllowedItemIds = [1, 2, 3, 4];
  const names = {
    1: 'Company-issue Engineering Manual',
    2: 'Company-issue Survival Manual',
    3: 'Squadron Gear Maintenance Manual',
    4: 'Priority Aetheryte Pass'
  };
  const options = { lookupName: (sheet, id) => sheet === 'Item' ? names[id] || '' : '' };
  const analysis = analyzeCategoryIntent(cat, options);
  const text = generateCategoryDescription(cat, options);

  assert.equal(analysis.intent, 'generic');
  assert.match(text, /Contains .+ plus 2 more selected items/i);
  assert.doesNotMatch(text, /equippable gear|weapons|combat equipment/i);
  assertClean(text);
});

test('direct name-pattern identity outranks representative lookup-only evidence', () => {
  const cat = category({ Name: 'Favorites' });
  cat.Rules.AllowedItemNamePatterns = ['Materia'];
  cat.Rules.AllowedItemIds = [1, 2, 3];
  const options = {
    lookupName: (sheet, id) => sheet === 'Item' ? `Grade IX ${['Strength', 'Dexterity', 'Mind'][id - 1]} Tincture` : ''
  };

  assert.equal(analyzeCategoryIntent(cat, options).intent, 'materia');
  assert.match(generateCategoryDescription(cat, options), /materia/i);
});

test('partial lookup evidence stays non-exhaustive and quantifies the unresolved remainder', () => {
  const cat = category({ Name: 'Favorites' });
  cat.Rules.AllowedItemIds = [10, 11, 12];
  const options = { lookupName: (sheet, id) => sheet === 'Item' && id === 10 ? 'Legendary Kamuy Fife' : '' };
  const analysis = analyzeCategoryIntent(cat, options);
  const text = generateCategoryDescription(cat, options);

  assert.equal(analysis.intent, 'generic');
  assert.equal(text, 'Contains Legendary Kamuy Fife, plus 2 more selected items.');
  assert.doesNotMatch(text, /mount unlock items/i);
});

test('UI category summaries distinguish complete lists from truncated examples', () => {
  const lookupName = (sheet, id) => sheet === 'ItemUICategory'
    ? ({ 1: 'Materia', 2: 'Medicine', 3: 'Minion', 4: 'Shield', 5: 'Ring' }[id] || '')
    : '';

  const complete = category({ Name: 'Favorites' });
  complete.Rules.AllowedUiCategoryIds = [1, 2, 3];
  assert.equal(
    generateCategoryDescription(complete, { lookupName }),
    'Items in the Materia, Medicine, and Minion categories.'
  );

  const truncated = category({ Name: 'Favorites' });
  truncated.Rules.AllowedUiCategoryIds = [1, 2, 3, 4, 5];
  const text = generateCategoryDescription(truncated, { lookupName });
  assert.equal(text, 'Items across Materia, Medicine, and Minion, plus 2 more categories.');
  assertClean(text);
});

const FALLBACK_RE = /Groups items matching this category's selected rules\./;

test('generated descriptions filter unusable cached item lookup names', () => {
  const cat = category({ Name: 'Manual Picks' });
  cat.Rules.AllowedItemIds = [10];
  const text = generateCategoryDescription(cat, { lookupName: (sheet, id) => sheet === 'Item' && id === 10 ? '(unnamed)' : '' });
  assert.equal(text, '1 explicitly selected item.');
  assert.doesNotMatch(text, /name unavailable|unknown|not looked up|unnamed/i);
});

test('generated descriptions filter unusable cached UI category lookup names', () => {
  const cat = category({ Name: 'Manual Picks' });
  cat.Rules.AllowedUiCategoryIds = [20];
  const text = generateCategoryDescription(cat, { lookupName: (sheet, id) => sheet === 'ItemUICategory' && id === 20 ? '(name unavailable)' : '' });
  assert.equal(text, 'Items from 1 selected category.');
  assert.doesNotMatch(text, /name unavailable|unknown|not looked up|unnamed/i);
});

test('generated descriptions keep usable cached names while omitting unusable names', () => {
  const cat = category({ Name: 'Manual Picks' });
  cat.Rules.AllowedItemIds = [10, 11];
  const lookupName = (sheet, id) => sheet === 'Item' ? ({ 10: 'Grade IX Strength Tincture', 11: 'unnamed' }[id] || '') : '';
  const text = generateCategoryDescription(cat, { lookupName });
  assert.match(text, /Grade IX Strength Tincture|tincture|potion/i);
  assert.doesNotMatch(text, /name unavailable|unknown|not looked up|unnamed/i);
});

test('generated descriptions mention only active usable custom ordering', () => {
  const retained = category({ Name: 'Misc', ItemSortCriteria: [{ Field: 0, Direction: 0 }], CustomItemOrder: [10, 11] });
  assert.doesNotMatch(generateCategoryDescription(retained), /custom item ordering/i);
  const active = category({ Name: 'Misc', ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [10, 11] });
  assert.match(generateCategoryDescription(active), /custom item ordering/i);
  const emptyActive = category({ Name: 'Misc', ItemSortCriteria: [{ Field: 5, Direction: 0 }], CustomItemOrder: [] });
  assert.doesNotMatch(generateCategoryDescription(emptyActive), /custom item ordering/i);
});

test('known complete UI-category families use all only while no other rule narrows them', () => {
  const weaponIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 84, 87, 88, 89, 96, 97, 98, 105, 106, 107, 108, 109, 110, 111];
  const complete = category({ Name: 'Weapons' });
  complete.Rules.AllowedUiCategoryIds = weaponIds;
  assert.equal(generateCategoryDescription(complete), 'All job weapons for Disciples of War and Magic.');

  const narrowed = structuredClone(complete);
  narrowed.Rules.ItemLevel.Enabled = true;
  assert.equal(
    generateCategoryDescription(narrowed),
    'Job weapons for Disciples of War and Magic. Includes only the selected item-level range.'
  );
});

test('semantic realization accepts an injected stable-keyed message interface', () => {
  const messages = {
    text(key) {
      if (key === 'fallback') return 'Localized fallback.';
      assert.equal(key, 'intent.buffs');
      return 'Localized semantic result.';
    },
    list(values) { return values.join(' + '); },
    statName() { return ''; }
  };
  assert.equal(
    generateCategoryDescription(category({ Name: 'Buffs' }), { descriptionMessages: messages }),
    'Localized semantic result.'
  );
  const fallback = generateCategoryDescription(category({ Name: 'Misc' }), { descriptionMessages: messages });
  assert.equal(fallback, 'Localized fallback.');
  assert.equal(isUsefulGeneratedDescription(fallback, { descriptionMessages: messages }), false);
});

test('Savage raid realization keeps semantic keys separate from localized names', () => {
  const messages = {
    text(key, values) {
      assert.equal(key, 'intent.tokens.savageBook.proof');
      assert.equal(values.raid, 'Localized raid tier');
      return `Localized books from ${values.raid}.`;
    },
    list(values) { return values.join(' + '); },
    statName() { return ''; },
    savageRaidName(seriesKey, tierKey) {
      assert.equal(seriesKey, 'arcadion');
      assert.equal(tierKey, 'lightHeavyweight');
      return 'Localized raid tier';
    }
  };

  assert.equal(
    generateCategoryDescription(category({ Name: 'Savage Books (LHW)' }), { descriptionMessages: messages }),
    'Localized books from Localized raid tier.'
  );
});

test('combined category evidence composes supported stats and backs off from ambiguous claims', () => {
  const cases = [
    ['Critical Hit and Direct Hit Materia', 'Stat materia supporting Critical Hit and Direct Hit.'],
    ['Craftsmanship and Gathering Materia', 'Stat materia supporting Craftsmanship and Gathering.'],
    ['Strength and Dexterity Potions', 'Potions for temporary bonuses to Strength and Dexterity.'],
    ['Savage Books (LHW + Gordias)', 'Books earned from Savage raids and exchanged for gear.'],
    ['Savage Books (Custom Tier)', 'Books earned from Savage raids and exchanged for gear.'],
    ['Extreme and Ultimate Totems', 'Totems exchanged for weapons, mounts, and other rewards.'],
    ['Mounts and Minions', 'Collectible unlock items.'],
    ['Weapons and Accessories', 'Equippable gear.']
  ];

  for (const [name, expected] of cases) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.equal(text, expected);
    assertClean(text);
  }

  for (const name of ['Weapons and Materia', 'Potions and Meals']) {
    const text = generateCategoryDescription(category({ Name: name }));
    assert.equal(text, "Groups items matching this category's selected rules.");
    assert.equal(isUsefulGeneratedDescription(text), false);
  }

  const patterns = category({ Name: 'Mixed Stat Consumables' });
  patterns.Rules.AllowedItemNamePatterns = ['Critical Hit Materia', 'Direct Hit Materia'];
  assert.match(generateCategoryDescription(patterns), /Critical Hit and Direct Hit/);
});
