export const INITIAL_DATA = {
  "Format": "AetherBags_Category",
  "Version": 1,
  "Categories": []
};

export const XIVAPI_BASE = 'https://v2.xivapi.com/api';
export const LOOKUP_BATCH_SIZE = 100;

export const RARITIES = [
  { id: 1, label: 'Common', color: 'White' },
  { id: 2, label: 'Uncommon', color: 'Green' },
  { id: 3, label: 'Rare', color: 'Blue' },
  { id: 4, label: 'Relic', color: 'Purple' },
  { id: 7, label: 'Aetherial', color: 'Pink' }
];

export const ALLOWED_RARITY_IDS = new Set(RARITIES.map(rarity => rarity.id));
