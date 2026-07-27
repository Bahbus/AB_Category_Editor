import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { generateCategoryDescription } from '../src/descriptionGenerator.js';
import { parseImportedText } from '../src/importExport.js';
import { ADVANCED_PRESET_BASE64, BASIC_PRESET_BASE64 } from '../src/presets.js';

async function categoriesByName(preset) {
  const config = await parseImportedText(preset);
  return new Map(config.Categories.map(category => [category.Name, category]));
}

function assertClean(text) {
  assert.ok(text.length < 180, `${text.length}: ${text}`);
  assert.doesNotMatch(text, /\b(ItemLevel|AllowedItemIds|AllowedUiCategoryIds|HighQuality)\b/);
  assert.doesNotMatch(text, /\b(\w+)\s+\1\b/i);
  assert.doesNotMatch(text, /from items from|that are within|specific game item categories/i);
}

test('description analysis and rendering stay DOM-free, network-free, and dependency-free', async () => {
  const [analysisSource, generatorSource, packageSource] = await Promise.all([
    readFile(new URL('../src/descriptionAnalysis.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/descriptionGenerator.js', import.meta.url), 'utf8'),
    readFile(new URL('../package.json', import.meta.url), 'utf8')
  ]);
  const combined = `${analysisSource}\n${generatorSource}`;

  assert.doesNotMatch(combined, /\b(document|window|fetch|XMLHttpRequest|WebSocket|localStorage)\b/);
  assert.doesNotMatch(combined, /localization|locales\/|presets|xivapi|app\.js/);
  assert.deepEqual(JSON.parse(packageSource).dependencies, undefined);
  assert.deepEqual(JSON.parse(packageSource).devDependencies, undefined);
  assert.match(generatorSource, /from '\.\/descriptionAnalysis\.js'/);
});

test('bundled-preset corpus corrects misleading inference and covers clear category families', async () => {
  const basic = await categoriesByName(BASIC_PRESET_BASE64);
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);
  const cases = [
    [basic, 'Materia Clusters', /clusters exchanged for materia/i, /combat materia|melding/i],
    [basic, 'DoH DoL Weapons', /crafting and gathering tools/i, /combat equipment/i],
    [basic, 'Soul Gems', /items matching this category's selected rules/i, /crafting material|recipe component/i],
    [basic, 'Drugs', /medicine consumables/i],
    [advanced, 'Misc. Medicine', /medicine consumables/i],
    [advanced, 'Tacklebox', /fishing tackle and supplies/i],
    [advanced, 'Tools', /crafting and gathering tools/i],
    [advanced, 'Outdoor Furnishings', /furnishings for outdoor housing spaces/i],
    [advanced, 'Indoor Furnishings', /furnishings for indoor housing spaces/i],
    [basic, 'Other', /items matching this category's selected rules/i],
    [basic, 'Materias', /materia.*melding/i],
    [advanced, 'Strength Potions', /Strength potions.*combat stat boosts/i],
    [basic, 'Gear', /equippable gear/i],
    [basic, 'Triple Triad Cards', /Triple Triad card unlocks/i],
    [advanced, 'Raid Tokens', /exchange tokens and reward items/i]
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

test('preset-backed explicit IDs, name patterns, ranges, states, and custom order stay concise', async () => {
  const basic = await categoriesByName(BASIC_PRESET_BASE64);
  const advanced = await categoriesByName(ADVANCED_PRESET_BASE64);

  const explicitIds = structuredClone(advanced.get('Strength Potions'));
  assert.match(generateCategoryDescription(explicitIds), /limited to selected item entries/i);

  const namePattern = structuredClone(advanced.get('Critical Hit Materia'));
  assert.match(generateCategoryDescription(namePattern), /matched by selected name patterns/i);

  const rangeAndState = structuredClone(basic.get('Gear'));
  rangeAndState.Rules.ItemLevel.Enabled = true;
  rangeAndState.Rules.Dyeable.State = 1;
  rangeAndState.Rules.Untradable.State = 2;
  const rangeAndStateText = generateCategoryDescription(rangeAndState);
  assert.match(rangeAndStateText, /dyeable.*gear/i);
  assert.match(rangeAndStateText, /tradeable items/i);
  assert.match(rangeAndStateText, /selected item-level range/i);

  const customOrder = structuredClone(basic.get('Other'));
  customOrder.ItemSortCriteria = [{ Field: 5, Direction: 0 }];
  customOrder.CustomItemOrder = [10, 11];
  assert.equal(generateCategoryDescription(customOrder), 'Groups custom item ordering.');

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
