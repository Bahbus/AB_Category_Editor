const ENGLISH_STAT_NAMES = Object.freeze({
  criticalHit: 'Critical Hit',
  directHit: 'Direct Hit',
  determination: 'Determination',
  skillSpeed: 'Skill Speed',
  spellSpeed: 'Spell Speed',
  tenacity: 'Tenacity',
  piety: 'Piety',
  craftsmanship: 'Craftsmanship',
  control: 'Control',
  cp: 'CP',
  gathering: 'Gathering',
  perception: 'Perception',
  gp: 'GP',
  strength: 'Strength',
  dexterity: 'Dexterity',
  intelligence: 'Intelligence',
  mind: 'Mind'
});

const ENGLISH_SAVAGE_RAIDS = Object.freeze({
  'arcadion.lightHeavyweight': 'the Arcadion: Light-heavyweight Tier (Savage)',
  'arcadion.cruiserweight': 'the Arcadion: Cruiserweight Tier (Savage)',
  'arcadion.heavyweight': 'the Arcadion: Heavyweight Tier (Savage)',
  'pandaemonium.asphodelos': 'Pandaemonium: Asphodelos (Savage)',
  'pandaemonium.abyssos': 'Pandaemonium: Abyssos (Savage)',
  'pandaemonium.anabaseios': 'Pandaemonium: Anabaseios (Savage)',
  'eden.gate': "Eden's Gate (Savage)",
  'eden.verse': "Eden's Verse (Savage)",
  'eden.promise': "Eden's Promise (Savage)",
  'omega.deltascape': 'the Deltascape (Savage)',
  'omega.sigmascape': 'the Sigmascape (Savage)',
  'omega.alphascape': 'the Alphascape (Savage)',
  'alexander.gordias': 'Alexander: Gordias (Savage)',
  'alexander.midas': 'Alexander: Midas (Savage)',
  'alexander.creator': 'Alexander: The Creator (Savage)'
});

const ENGLISH_MESSAGES = Object.freeze({
  fallback: "Groups items matching this category's selected rules.",
  'intent.materiaClusters': 'Clusters exchanged for materia.',
  'intent.augmentMaterials.tome': 'Materials used to augment tome gear.',
  'intent.augmentMaterials.general': 'Gear augmentation materials.',
  'intent.materia.crafting.stat.v1': ({ stat }) => `Materia that increases ${stat} through melding.`,
  'intent.materia.crafting.stat.v2': ({ stat }) => `${stat}-boosting materia for crafting gear.`,
  'intent.materia.crafting.stat.v3': ({ stat }) => `Materia used to improve ${stat} on crafting gear.`,
  'intent.materia.crafting.general': 'Materia that improve crafting stats through melding.',
  'intent.materia.gathering.stat.v1': ({ stat }) => `Materia that increases ${stat} through melding.`,
  'intent.materia.gathering.stat.v2': ({ stat }) => `${stat}-boosting materia for gathering gear.`,
  'intent.materia.gathering.stat.v3': ({ stat }) => `Materia used to improve ${stat} on gathering gear.`,
  'intent.materia.gathering.general': 'Materia that improve gathering stats through melding.',
  'intent.materia.combat.stat.v1': ({ stat }) => `Materia that increases ${stat} through melding.`,
  'intent.materia.combat.stat.v2': ({ stat }) => `${stat}-boosting materia for combat gear.`,
  'intent.materia.combat.stat.v3': ({ stat }) => `Combat materia used to improve ${stat}.`,
  'intent.materia.combat.general': 'Materia that improve combat stats through melding.',
  'intent.materia.stats.v1': ({ stats }) => `Materia that improve ${stats} through melding.`,
  'intent.materia.stats.v2': ({ stats }) => `Materia for improving ${stats}.`,
  'intent.materia.stats.v3': ({ stats }) => `Stat materia supporting ${stats}.`,
  'intent.medicine': 'Medicine and other stat-boosting consumables.',
  'intent.fishingSupplies': 'Fishing tackle and supplies.',
  'intent.furnishings.outdoor': 'Furnishings that can be placed outdoors.',
  'intent.furnishings.indoor': 'Furnishings that can be placed indoors.',
  'intent.furnishings.general': 'Furnishings for housing.',
  'intent.meals': 'Meals that provide temporary stat bonuses.',
  'intent.potions.stat.v1': ({ stat }) => `Potions that temporarily increase ${stat}.`,
  'intent.potions.stat.v2': ({ stat }) => `Temporary ${stat}-boosting potions.`,
  'intent.potions.stat.v3': ({ stat }) => `Potions for a temporary increase to ${stat}.`,
  'intent.potions.stats.v1': ({ stats }) => `Potions that temporarily improve ${stats}.`,
  'intent.potions.stats.v2': ({ stats }) => `Temporary potions boosting ${stats}.`,
  'intent.potions.stats.v3': ({ stats }) => `Potions for temporary bonuses to ${stats}.`,
  'intent.potions.crafting': 'Potions that temporarily improve crafting stats.',
  'intent.potions.gathering': 'Potions that temporarily improve gathering stats.',
  'intent.potions.combat': 'Potions that temporarily improve combat stats.',
  'intent.tools.all': 'All tools for Disciples of Hand and Land.',
  'intent.tools.general': 'Tools for Disciples of Hand and Land.',
  'intent.gear.weapons.all': 'All job weapons for Disciples of War and Magic.',
  'intent.gear.weapons.general': 'Job weapons for Disciples of War and Magic.',
  'intent.gear.weapons.blueMage': 'Weapons for Blue Mages.',
  'intent.gear.combatSet': 'Weapons and armor for Disciples of War and Magic.',
  'intent.gear.armor.all': 'All head, body, hand, leg, and foot armor.',
  'intent.gear.armor.general': 'Protective armor and equipment.',
  'intent.gear.accessories.all': 'All accessories and shields.',
  'intent.gear.accessories.general': 'Accessories and shields.',
  'intent.gear.general': 'Equippable gear.',
  'intent.unlockables.mount': 'Items that unlock mounts.',
  'intent.unlockables.minion': 'Items that unlock minions.',
  'intent.unlockables.card': 'Triple Triad cards.',
  'intent.unlockables.orchestrion': 'Orchestrion rolls.',
  'intent.unlockables.emote': 'Items that unlock emotes.',
  'intent.unlockables.hairstyle': 'Items that unlock hairstyles.',
  'intent.unlockables.fashionAccessory': 'Items that unlock fashion accessories.',
  'intent.unlockables.general': 'Collectible unlock items.',
  'intent.tokens.ultimate': 'Totems earned from Ultimate raids and exchanged for weapons.',
  'intent.tokens.extreme': 'Totems earned from Extreme trials and exchanged for rewards.',
  'intent.tokens.totem': 'Totems exchanged for weapons, mounts, and other rewards.',
  'intent.tokens.savageBook': 'Books earned from Savage raids and exchanged for gear.',
  'intent.tokens.savageBook.proof': ({ raid }) => `Proof of clearing ${raid}.`,
  'intent.tokens.savageBook.earned': ({ raid }) => `Books earned from ${raid}.`,
  'intent.tokens.savageBook.awarded': ({ raid }) => `Raid books awarded for clearing ${raid}.`,
  'intent.tokens.savageBook.exchange': ({ raid }) => `Books from ${raid}, exchanged for gear.`,
  'intent.tokens.savageBook.records': ({ raid }) => `Raid books from ${raid}, used to obtain gear.`,
  'intent.tokens.irregularTomestone': 'Irregular tomestones exchanged with the Itinerant Moogle.',
  'intent.tokens.tomestone': 'Tomestones exchanged for progression rewards.',
  'intent.tokens.scrip': 'Crafting and gathering scrips used for vendor exchanges.',
  'intent.tokens.general': 'Tokens exchanged for gear and other rewards.',
  'intent.materials.extreme': 'Materials dropped by Extreme trials.',
  'intent.materials.gathered': 'Gathered materials used in crafting recipes.',
  'intent.materials.crafting': 'Crafting materials and recipe components.',
  'intent.appearance.dye': 'Items used to dye gear and furnishings.',
  'intent.appearance.glamour': 'Items used for glamour.',
  'intent.buffs': 'Items that provide company buffs.',
  'intent.coffers': 'Coffers containing gear or glamour items.',
  'intent.allianceRaidCoins': 'Coins earned from alliance raids and exchanged for gear upgrades.',
  'intent.treasureMaps': 'Timeworn maps used to locate treasure.',
  'intent.manuals': 'Manuals that provide temporary bonuses.',
  'intent.gacha': 'Materiel containers with randomized rewards.',
  'intent.umbrite': 'Umbrite used to enhance Anima weapons.',
  'intent.unsung': 'Unsung tokens exchanged for raid gear.',
  'generic.items.none': ({ count }) => `${count} explicitly selected ${count === 1 ? 'item' : 'items'}.`,
  'generic.items.one': ({ name }) => `Contains ${name}.`,
  'generic.items.complete': ({ names }) => `Contains ${names}.`,
  'generic.items.more': ({ names, remaining }) => `Contains ${names}, plus ${remaining} more selected ${remaining === 1 ? 'item' : 'items'}.`,
  'generic.ui.none': ({ count }) => `Items from ${count} selected ${count === 1 ? 'category' : 'categories'}.`,
  'generic.ui.one': ({ name }) => `Items in the ${name} category.`,
  'generic.ui.complete': ({ names }) => `Items in the ${names} categories.`,
  'generic.ui.more': ({ names, remaining }) => `Items across ${names}, plus ${remaining} more ${remaining === 1 ? 'category' : 'categories'}.`,
  'generic.patterns.one': 'Items matched by a selected name pattern.',
  'generic.patterns.many': ({ count }) => `Items matched by ${count} selected name patterns.`,
  'generic.mixed': ({ sources }) => `Items selected by ${sources}.`,
  'generic.customOrder': 'Uses custom item ordering.',
  'generic.rules': 'Items matching the selected rules.',
  'qualifiers': ({ values }) => `Includes only ${values}.`,
  'qualifier.dyeable': 'dyeable items',
  'qualifier.glamourable': 'glamour-ready items',
  'qualifier.repairable': 'repairable items',
  'qualifier.highQuality': 'high-quality items',
  'qualifier.collectable': 'collectable turn-in items',
  'qualifier.tradeable': 'tradeable items',
  'qualifier.untradeable': 'untradeable items',
  'qualifier.desynthesizable': 'desynthesizable items',
  'qualifier.levelAndItemLevel': 'the selected level and item-level ranges',
  'qualifier.itemLevel': 'the selected item-level range',
  'qualifier.level': 'the selected level range',
  'qualifier.vendorPrice': 'the selected vendor-value range',
  'qualifier.rarity.high': 'higher-rarity items',
  'qualifier.rarity.common': 'common items',
  'qualifier.rarity.selected': 'the selected rarities'
});

function interpolate(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ''));
}

function defaultResolve(key, values = {}) {
  const template = ENGLISH_MESSAGES[key];
  if (typeof template === 'function') return template(values);
  if (typeof template === 'string') return interpolate(template, values);
  throw new Error(`Unknown generated-description message: ${key}`);
}

function englishList(values) {
  const items = [...new Set((values || []).filter(Boolean))];
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function createDescriptionMessages({
  resolve = defaultResolve,
  list = englishList,
  statName = key => ENGLISH_STAT_NAMES[key] || '',
  savageRaidName = (seriesKey, tierKey) => ENGLISH_SAVAGE_RAIDS[`${seriesKey}.${tierKey}`] || ''
} = {}) {
  return Object.freeze({
    text(key, values = {}) { return resolve(key, values); },
    list(values) { return list(values); },
    statName(key) { return statName(key); },
    savageRaidName(seriesKey, tierKey) { return savageRaidName(seriesKey, tierKey); }
  });
}

export const DEFAULT_DESCRIPTION_MESSAGES = createDescriptionMessages();
