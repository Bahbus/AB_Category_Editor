import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { analyzeCategoryIntent } from '../src/descriptionAnalysis.js';
import { generateCategoryDescription } from '../src/descriptionGenerator.js';
import { parseImportedText } from '../src/importExport.js';
import { ADVANCED_PRESET_BASE64, BASIC_PRESET_BASE64 } from '../src/presets.js';
import { DESCRIPTION_LOOKUP_FIXTURE, fixtureLookupName } from '../testSupport/descriptionLookupFixture.mjs';

async function categoriesByName(preset) {
  const config = await parseImportedText(preset);
  return new Map(config.Categories.map(category => [category.Name, category]));
}

function assertClean(text) {
  assert.ok(text.length <= 140, `${text.length}: ${text}`);
  assert.doesNotMatch(text, /\b(ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality)\b/);
  assert.doesNotMatch(text, /\b(\w+)\s+\1\b/i);
  assert.doesNotMatch(text, /from items from|that are within|specific game item categories/i);
}

test('description analysis and rendering stay DOM-free, network-free, and dependency-free', async () => {
  const [analysisSource, generatorSource, messagesSource, packageSource] = await Promise.all([
    readFile(new URL('../src/descriptionAnalysis.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/descriptionGenerator.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/descriptionMessages.js', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8')
  ]);
  const combined = `${analysisSource}\n${generatorSource}\n${messagesSource}`;

  assert.doesNotMatch(combined, /\b(document|window|fetch|XMLHttpRequest|WebSocket|localStorage)\b/);
  assert.doesNotMatch(combined, /localization|locales\/|presets|xivapi|app\.js/);
  assert.deepEqual(JSON.parse(packageSource).dependencies, undefined);
  assert.deepEqual(JSON.parse(packageSource).devDependencies, undefined);
  assert.match(generatorSource, /from '\.\/descriptionAnalysis\.js'/);
  assert.match(generatorSource, /from '\.\/descriptionMessages\.js'/);
  assert.doesNotMatch(generatorSource, /export\s*\{[^}]*analyze(?:CategoryIntent|ExplicitSources)/s);
});

test('bundled-preset corpus corrects misleading inference and covers clear category families', async () => {
  const basic = await categoriesByName(BASIC_PRESET_BASE64);
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const cases = [
    [basic, 'Materia Clusters', /clusters exchanged for materia/i, /combat materia|melding/i],
    [basic, 'DoH DoL Weapons', /All tools for Disciples of Hand and Land/i, /combat equipment/i],
    [basic, 'Soul Gems', /items matching this category's selected rules/i, /crafting material|recipe component/i],
    [basic, 'Drugs', /Medicine and other stat-boosting consumables/i],
    [advanced, 'Misc. Medicine', /Medicine and other stat-boosting consumables/i],
    [advanced, 'Tacklebox', /Fishing tackle and supplies/i],
    [advanced, 'Tools', /All tools for Disciples of Hand and Land/i],
    [advanced, 'Outdoor Furnishings', /Furnishings that can be placed outdoors/i],
    [advanced, 'Indoor Furnishings', /Furnishings that can be placed indoors/i],
    [basic, 'Other', /items matching this category's selected rules/i],
    [basic, 'Materias', /Materia.*melding/i],
    [advanced, 'Strength Potions', /Potions that temporarily increase Strength/i],
    [basic, 'Gear', /equippable gear/i],
    [basic, 'Triple Triad Cards', /Triple Triad cards/i],
    [advanced, 'Raid Tokens', /Tokens exchanged for gear and other rewards/i]
  ];

  for (const [categories, name, expected, forbidden] of cases) {
    const category = categories.get(name);
    assert.ok(category, `bundled category ${name}`);
    const text = generateCategoryDescription(category);
    assert.match(text, expected, `${name}: ${text}`);
    if (forbidden) assert.doesNotMatch(text, forbidden, `${name}: ${text}`);
    assertClean(text);
  }
});

test('verified Advanced categories have complete deterministic lookup fixtures', async () => {
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const cases = [
    ['Buffs', 'Item'],
    ['Extreme Totems', 'Item'],
    ['Ultimate Totems', 'Item'],
    ['Augment Materials', 'Item'],
    ['Weapons', 'ItemUICategory'],
    ['Tools', 'ItemUICategory'],
    ['Armor', 'ItemUICategory'],
    ['Accessories', 'ItemUICategory'],
    ['Tacklebox', 'ItemUICategory']
  ];

  for (const [name, sheet] of cases) {
    const ids = sheet === 'Item'
      ? advanced.get(name).Rules.AllowedItemIds
      : advanced.get(name).Rules.AllowedUiCategoryIds;
    assert.ok(ids.length > 0, name);
    for (const id of ids) assert.ok(DESCRIPTION_LOOKUP_FIXTURE[sheet][id], `${name}: ${sheet} ${id}`);
  }
});

test('full lookup generation stays evidence-faithful for verified Advanced failures', async () => {
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const cases = [
    ['Buffs', /Items that provide company buffs/i, /equippable gear|combat equipment/i],
    ['Extreme Totems', /Totems earned from Extreme trials/i],
    ['Ultimate Totems', /Totems earned from Ultimate raids/i, /\btrial/i],
    ['Augment Materials', /Materials used to augment tome gear/i, /recipe components/i],
    ['Weapons', /All job weapons for Disciples of War and Magic/i],
    ['Tools', /All tools for Disciples of Hand and Land/i],
    ['Armor', /All head, body, hand, leg, and foot armor/i],
    ['Accessories', /All accessories and shields/i],
    ['Tacklebox', /Fishing tackle and supplies/i]
  ];

  for (const [name, expected, forbidden] of cases) {
    const text = generateCategoryDescription(advanced.get(name), { lookupName: fixtureLookupName });
    assert.match(text, expected, `${name}: ${text}`);
    if (forbidden) assert.doesNotMatch(text, forbidden, `${name}: ${text}`);
    assertClean(text);
  }
});

test('partial and missing verified lookup data stays conservative', async () => {
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const buffs = advanced.get('Buffs');
  const partialBuffs = generateCategoryDescription(buffs, {
    lookupName: (sheet, id) => sheet === 'Item' && id === 14953 ? fixtureLookupName(sheet, id) : ''
  });
  assert.equal(partialBuffs, 'Items that provide company buffs.');
  assert.doesNotMatch(partialBuffs, /equippable gear/i);

  const augment = advanced.get('Augment Materials');
  const partialAugment = generateCategoryDescription(augment, {
    lookupName: (sheet, id) => sheet === 'Item' && id === 41699 ? fixtureLookupName(sheet, id) : ''
  });
  assert.match(partialAugment, /Gear augmentation materials/i);
  assert.doesNotMatch(partialAugment, /tome gear|recipe components/i);

  assert.equal(generateCategoryDescription(buffs, { lookupName: () => '' }), 'Items that provide company buffs.');
});

test('all bundled categories stay clean without lookup and with the deterministic lookup corpus', async () => {
  const [basic, advanced] = await Promise.all([
    parseImportedText(BASIC_PRESET_BASE64),
    parseImportedText(ADVANCED_PRESET_BASE64)
  ]);
  assert.equal(basic.Categories.length, 24);
  assert.equal(advanced.Categories.length, 55);

  for (const category of [...basic.Categories, ...advanced.Categories]) {
    const withoutLookup = generateCategoryDescription(category);
    const withLookup = generateCategoryDescription(category, { lookupName: fixtureLookupName });
    assertClean(withoutLookup);
    assertClean(withLookup);
    assert.ok(withLookup.length <= 80, `${category.Name}: ${withLookup.length}: ${withLookup}`);
  }
});

test('bundled descriptions keep concise domain-specific variety instead of one repeated frame', async () => {
  const [basic, advanced] = await Promise.all([
    categoriesByName(BASIC_PRESET_BASE64),
    categoriesByName(ADVANCED_PRESET_BASE64)
  ]);
  const cases = [
    [basic, 'Alliance Raid Coins', 'Coins earned from alliance raids and exchanged for gear upgrades.'],
    [basic, 'DoW Weapons & Armor', 'Weapons and armor for Disciples of War and Magic.'],
    [basic, 'BLU Weapons', 'Weapons for Blue Mages.'],
    [basic, 'Umbrite', 'Umbrite used to enhance Anima weapons.'],
    [basic, 'Treasure Maps', 'Timeworn maps used to locate treasure.'],
    [basic, 'Unsung', 'Unsung tokens exchanged for raid gear.'],
    [basic, 'Manuals', 'Manuals that provide temporary bonuses.'],
    [basic, 'Gacha', 'Materiel containers with randomized rewards.'],
    [advanced, 'Coffers', 'Coffers containing gear or glamour items.'],
    [advanced, 'Extreme Materials', 'Materials dropped by Extreme trials.']
  ];

  for (const [categories, name, expected] of cases) {
    assert.equal(generateCategoryDescription(categories.get(name), { lookupName: fixtureLookupName }), expected);
  }
});

test('all Advanced Savage book categories retain their tier and use varied sentence frames', async () => {
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const cases = new Map([
    ['Savage Books (LHW)', 'Proof of clearing the Arcadion: Light-heavyweight Tier (Savage).'],
    ['Savage Books (CW)', 'Proof of clearing the Arcadion: Cruiserweight Tier (Savage).'],
    ['Savage Books (HW)', 'Proof of clearing the Arcadion: Heavyweight Tier (Savage).'],
    ['Savage Books (Asphodelos)', 'Books earned from Pandaemonium: Asphodelos (Savage).'],
    ['Savage Books (Abyssos)', 'Books earned from Pandaemonium: Abyssos (Savage).'],
    ['Savage Books (Anabaseios)', 'Books earned from Pandaemonium: Anabaseios (Savage).'],
    ['Savage Books (Gate)', "Raid books awarded for clearing Eden's Gate (Savage)."],
    ['Savage Books (Verse)', "Raid books awarded for clearing Eden's Verse (Savage)."],
    ['Savage Books (Promise)', "Raid books awarded for clearing Eden's Promise (Savage)."],
    ['Savage Books (Deltascape)', 'Books from the Deltascape (Savage), exchanged for gear.'],
    ['Savage Books (Sigmascape)', 'Books from the Sigmascape (Savage), exchanged for gear.'],
    ['Savage Books (Alphascape)', 'Books from the Alphascape (Savage), exchanged for gear.'],
    ['Savage Books (Gordias)', 'Raid books from Alexander: Gordias (Savage), used to obtain gear.'],
    ['Savage Books (Midas)', 'Raid books from Alexander: Midas (Savage), used to obtain gear.'],
    ['Savage Books (Creator)', 'Raid books from Alexander: The Creator (Savage), used to obtain gear.']
  ]);
  const outputs = [];

  for (const [name, expected] of cases) {
    const text = generateCategoryDescription(advanced.get(name), { lookupName: fixtureLookupName });
    assert.equal(text, expected);
    assertClean(text);
    outputs.push(text);
  }

  assert.equal(new Set(outputs).size, cases.size);
  assert.ok(new Set(outputs.map(text => text.split(/\s+/).slice(0, 3).join(' '))).size >= 5);
});

test('Advanced stat materia and potions use controlled deterministic frame variation', async () => {
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const potionNames = [
    'Strength Potions',
    'Dexterity Potions',
    'Intelligence Potions',
    'Mind Potions',
    'Craftsmanship Potions',
    'Control Potions',
    'CP Potions'
  ];
  const materiaNames = [
    'Critical Hit Materia',
    'Direct Hit Materia',
    'Determination Materia',
    'Spell Speed Materia',
    'Skill Speed Materia',
    'Tenacity Materia',
    'Piety Materia',
    'Craftsmanship Materia',
    'Control Materia',
    'CP Materia',
    'Gathering Materia',
    'Perception Materia',
    'GP Materia'
  ];

  const keysFor = names => names.map(name => analyzeCategoryIntent(advanced.get(name)).messageKey);
  const variantsFor = names => new Set(keysFor(names).map(key => key.match(/v\d$/)?.[0]));
  assert.equal(variantsFor(potionNames).size, 3);
  assert.equal(variantsFor(materiaNames).size, 3);

  for (const name of [...potionNames, ...materiaNames]) {
    const first = generateCategoryDescription(advanced.get(name), { lookupName: fixtureLookupName });
    const second = generateCategoryDescription(advanced.get(name), { lookupName: fixtureLookupName });
    assert.equal(first, second);
    assertClean(first);
  }
});

test('preset-backed explicit IDs, name patterns, ranges, states, and custom order stay concise', async () => {
  const basic = await categoriesByName(BASIC_PRESET_BASE64);
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);

  const explicitIds = structuredClone(advanced.get('Strength Potions'));
  assert.equal(generateCategoryDescription(explicitIds), 'Potions that temporarily increase Strength.');

  const namePattern = structuredClone(advanced.get('Critical Hit Materia'));
  assert.equal(generateCategoryDescription(namePattern), 'Combat materia used to improve Critical Hit.');

  const rangeAndState = structuredClone(basic.get('Gear'));
  rangeAndState.Rules.ItemLevel.Enabled = true;
  rangeAndState.Rules.Dyeable.State = 1;
  rangeAndState.Rules.Untradable.State = 2;
  const rangeAndStateText = generateCategoryDescription(rangeAndState);
  assert.match(rangeAndStateText, /Equippable gear.*dyeable items/i);
  assert.match(rangeAndStateText, /tradeable items/i);
  assert.match(rangeAndStateText, /selected item-level range/i);

  const customOrder = structuredClone(basic.get('Other'));
  customOrder.ItemSortCriteria = [{ Field: 5, Direction: 0 }];
  customOrder.CustomItemOrder = [10, 11];
  assert.equal(generateCategoryDescription(customOrder), 'Uses custom item ordering.');

  for (const category of [explicitIds, namePattern, rangeAndState, customOrder]) {
    assertClean(generateCategoryDescription(category));
  }
});

test('preset-backed generation is deterministic and does not mutate category or lookup state', async () => {
  const basic = await categoriesByName(BASIC_PRESET_BASE64);
  const category = structuredClone(basic.get('Materia Clusters'));
  const before = structuredClone(category);
  const lookupState = new Map([[18030, 'Cracked Anthocluster']]);
  const lookupName = (sheet, id) => sheet === 'Item' ? lookupState.get(id) || '' : '';

  const first = generateCategoryDescription(category, { lookupName });
  const second = generateCategoryDescription(category, { lookupName });

  assert.equal(first, second);
  assert.deepEqual(category, before);
  assert.deepEqual([...lookupState], [[18030, 'Cracked Anthocluster']]);
  assertClean(first);
});
