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


export const RANGE_FILTERS = [
  { key: 'Level', label: 'Level', defaults: { Enabled: false, Min: 0, Max: 200 } },
  { key: 'ItemLevel', label: 'Item Level', defaults: { Enabled: false, Min: 0, Max: 2000 } },
  { key: 'VendorPrice', label: 'Vendor Price', defaults: { Enabled: false, Min: 0, Max: 9999999 } }
];

export const RANGE_FILTER_KEYS = RANGE_FILTERS.map(filter => filter.key);

export const STATE_FILTERS = [
  { key: 'Untradable', label: 'Untradable' },
  { key: 'Unique', label: 'Unique' },
  { key: 'Collectable', label: 'Collectable' },
  { key: 'Dyeable', label: 'Dyeable' },
  { key: 'Repairable', label: 'Repairable' },
  { key: 'HighQuality', label: 'High Quality' },
  { key: 'Desynthesizable', label: 'Desynthesizable' },
  { key: 'Glamourable', label: 'Glamourable' },
  { key: 'FullySpiritbonded', label: 'Fully Spiritbonded' }
];

export const STATE_FILTER_KEYS = STATE_FILTERS.map(filter => filter.key);
