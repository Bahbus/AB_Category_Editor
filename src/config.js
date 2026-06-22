export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function makeId() {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function defaultRules() {
  return {
    AllowedItemIds: [],
    AllowedItemNamePatterns: [],
    AllowedUiCategoryIds: [],
    AllowedRarities: [],
    Level: { Enabled: false, Min: 0, Max: 200 },
    ItemLevel: { Enabled: false, Min: 0, Max: 2000 },
    VendorPrice: { Enabled: false, Min: 0, Max: 9999999 },
    Untradable: { State: 0, Filter: 0 },
    Unique: { State: 0, Filter: 0 },
    Collectable: { State: 0, Filter: 0 },
    Dyeable: { State: 0, Filter: 0 },
    Repairable: { State: 0, Filter: 0 },
    HighQuality: { State: 0, Filter: 0 },
    Desynthesizable: { State: 0, Filter: 0 },
    Glamourable: { State: 0, Filter: 0 },
    FullySpiritbonded: { State: 0, Filter: 0 }
  };
}

export function defaultCategory(maxOrder = 0) {
  return {
    Enabled: true,
    Pinned: false,
    Id: makeId(),
    Name: 'New Category',
    Description: '',
    Order: maxOrder + 1,
    Priority: maxOrder + 1,
    Color: { X: 1, Y: 1, Z: 1, W: 1 },
    ItemSortCriteria: [{ Field: 0, Direction: 0 }],
    CustomItemOrder: [],
    Rules: defaultRules()
  };
}

export function ensureShape(cat) {
  if (!cat.Color) cat.Color = { X: 1, Y: 1, Z: 1, W: 1 };
  for (const key of ['X','Y','Z','W']) {
    if (typeof cat.Color[key] !== 'number') cat.Color[key] = key === 'W' ? 1 : 1;
  }
  if (!cat.Rules) cat.Rules = defaultRules();
  const r = cat.Rules;
  for (const key of ['AllowedItemIds','AllowedItemNamePatterns','AllowedUiCategoryIds','AllowedRarities']) {
    if (!Array.isArray(r[key])) r[key] = [];
  }
  for (const [key, val] of Object.entries(defaultRules())) {
    if (r[key] === undefined) r[key] = clone(val);
  }
}

