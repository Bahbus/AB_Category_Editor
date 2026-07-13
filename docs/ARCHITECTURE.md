# Architecture

> **Repository:** `Bahbus/AB_Category_Editor`  
> **Scope:** Runtime structure, data flow, validation, lookup, editor UI, state, tests, and known architectural pressure points.

---

## 1. High-level architecture

The application is a static, browser-native JavaScript app with no build step.

Primary layers:

1. **Application orchestration**
   - `src/app.js`

2. **Configuration shape/defaults/import repair**
   - `src/config.js`

3. **Category change decisions**
   - `src/categoryChanges.js`

4. **Validation**
   - `src/validation.js`
   - `src/importValidationSummary.js`

5. **Shared row-ID semantics**
   - `src/rowIds.js`

6. **Shared optional-number semantics**
   - `src/optionalNumbers.js`

7. **Import/export and clipboard/download**
   - `src/importExport.js`

8. **XIVAPI and lookup**
   - `src/xivapi.js`
   - `src/lookupNames.js`

9. **UI rendering**
   - `src/ui/categoryList.js`
   - `src/ui/categoryEditor.js`
   - `src/ui/listEditor.js`
   - `src/ui/formControls.js`
   - modal-specific UI modules

10. **Modal infrastructure**
   - `src/modals.js`

11. **Persistent state**
   - `src/state.js`

12. **Tools**
   - `src/tools/regexToItemIds.js`

13. **Description generation**
   - `src/descriptionGenerator.js`

14. **Static assets and layout**
   - `index.html`
   - `styles.css`

15. **Tests and guardrails**
   - `test/*.test.mjs`
   - `scripts/check-imports.mjs`
   - source checks in `test/sourceChecks.test.mjs`

---

## 2. Application state and orchestration

`src/app.js` owns the top-level mutable state:

- current config data,
- selected category index,
- dirty state,
- dragged category index,
- lookup cache,
- active lookup-cache producer coordination,
- editor preferences.

Important responsibilities:

- apply editor preferences,
- render list/editor/export controls,
- import and Raw JSON flows,
- export/copy/download,
- lookup all referenced IDs,
- preset loading,
- modal launch/binding,
- dirty/save-state transitions,
- before-unload protection.

### Rendering contract

Use `renderAll()` only for structural changes.

Local field edits should prefer:

- local control updates,
- local validation refresh,
- `renderList()` when list metadata changes.

This avoids unnecessary rerenders and focus disruption.

### Category change decisions

`src/categoryChanges.js` contains DOM-free behavior used by the application and direct tests:

- JSON-semantic equality ignores object key order while preserving array order and primitive types.
- manual renumbering writes one-based numeric `Order`/`Priority` values and reports whether category data changed.
- sorting detects array-order changes by object identity and resolves the selected object's new index.
- selected and full Raw JSON helpers keep normalization, confirmation, and live-state mutation boundaries directly testable.
- category reorder helpers validate indices, compute candidate order without live mutation, compare object identity order, preserve moved-object selection, and apply side effects only after a real change.

Full Raw JSON compares the final validated, repaired, normalized, and sorted candidate before destructive confirmation. An identical result closes the editor and reports validation/repair context without replacing data, resetting selection, changing dirty state, or launching automatic lookup.

Phase 40 was merged at `478545235debae9a1dc064b972acc2181cd5a0e1`. Phase 40.1 was merged at `beda975e087bd012f33270b7f1574c6822340bda`; it routes the finalized candidate through `configValidationSummaryText(...)`, so both changed and no-op paths report `validation.config.Categories.length` while replacement remains after confirmation. The Phase 40 change-decision and no-op boundaries are otherwise unchanged. Phase 41 was merged at `2926dc35dbda24fa07beb5b92477feeea47ea23f`. Phase 42 was merged at `ab8997ae53b1136fab56b445fa3c811cf0bd25a9`.

Category drag/drop uses only application-owned source state established by `dragstart`. `text/plain` remains optional browser metadata and is never authoritative. `dragover` does not enable a target or alter indicators until the active source is a finite in-range integer. Drop decisions delegate to the identity-aware helper, so adjacent and same-target no-ops have no structural side effects; real changes select the moved object and then apply optional renumbering, one dirty transition, and one structural render.

### Lookup-cache operation coordination

`src/lookupCacheOperations.js` owns a private active-producer count and issues idempotent release leases. `src/app.js` passes only the narrow acquire function into list-editor and regex-tool dependencies rather than exposing application globals.

Long-lived leases cover referenced-ID batch lookup, per-list batch lookup, manual XIVAPI search, and Regex → Item IDs sheet scanning. Each asynchronous producer releases its lease in `finally`, including success, empty or unusable results, failure, and scan cancellation. Overlapping leases are independent and coexist with the busy overlay's own nested counting.

The Lookup Cache modal observes active state, disables clearing with visible explanatory text, and the application re-checks the same state at the clear boundary. This prevents replacement of the cache object while asynchronous producers still hold it.

---

## 3. Configuration and repair flow

`src/config.js` owns:

- default rules/category creation,
- shape normalization,
- import repair,
- category sorting helpers.

Typical import flow:

1. Parse raw input.
2. Analyze pre-repair config.
3. Validate/repair config shape.
4. Analyze repaired config.
5. Merge findings.
6. Ask for replacement confirmation if dirty.
7. Apply validated config.
8. Reset selection.
9. Mark saved for normal import or dirty for editable Raw JSON replacement as appropriate.
10. Render.
11. Show validation/repair summary when meaningful.
12. Optionally auto-lookup referenced IDs.

Important rule:

- Invalid individual numeric IDs inside valid arrays are preserved and warned, not silently removed.
- Category entries themselves must be JSON objects; `null`, arrays, and scalar entries fail validation rather than being repaired into categories.
- Plain Color objects are snapshotted by value before normalization. Missing or non-number components are repaired to defaults with one material, reviewable Color warning; valid numeric components, including higher-precision values, remain exact. Malformed whole Color values retain separate repair messaging.

---

## 4. Validation architecture

`src/validation.js` provides:

- category-name checks,
- Order/Priority finite-number checks,
- grouped duplicate sort-position detection,
- regex validation,
- range validation,
- state-filter validation,
- rarity validation,
- duplicate-list detection,
- invalid row-ID detection,
- issue counts.

Order/Priority decisions use `src/optionalNumbers.js`. They accept finite numbers and non-empty finite numeric strings, while rejecting nullish, blank, boolean, array, object, non-numeric, and non-finite values. Validation, duplicate grouping, import sorting, next-sort calculation, and category duplication share this interpretation; accepted imported strings are preserved until explicit Renumber.

### Grouped duplicate sort positions

Duplicate Order/Priority warnings are grouped across categories.

Stability requirements:

- category names are stably sorted,
- grouped findings carry a `sortPositionKey`,
- import merge dedupes grouped findings by severity, field, and stable sort-position key.

### List issue grouping

For each affected list field:

- duplicate warning counts once,
- invalid numeric-ID warning counts once,
- both can count separately.

---

## 5. Shared row-ID architecture

`src/rowIds.js` is authoritative for strict numeric row-ID semantics.

Expected helpers:

- `isValidRowIdValue(value)`
- `normalizeRowIdValue(value)`
- `invalidRowIds(values)`

Valid values:

- non-negative integer numbers,
- digit-only strings.

Normalization:

- returns numeric row ID for valid input,
- returns `null` for invalid input,
- does not mutate source values.

Consumers include:

- validation,
- lookup normalization,
- referenced-ID collection,
- manual lookup search,
- regex scanner,
- strict row extraction fallback logic.

Avoid reintroducing loose coercion such as:

```js
Number.isInteger(Number(value))
```

for row-ID validity decisions.

---

## 6. XIVAPI and lookup flow

`src/xivapi.js` owns:

- sheet labels,
- lookup-ID normalization,
- row extraction,
- single and batch lookup,
- referenced-ID collection,
- uncached-ID counting,
- manual XIVAPI search,
- Item sheet pagination for regex scans.

### Lookup sentinels

A cached string may exist but still be unresolved or unusable.

Historically unusable variants include:

- `(name unavailable)`
- `not looked up`
- `(unnamed)`
- `unnamed`

Use `isUsefulLookupName(...)` rather than simple truthiness.

### Batch lookup strategy

`fetchLookupBatch(...)`:

1. normalize and dedupe IDs,
2. skip useful cached names,
3. process chunks,
4. cache only rows from the current chunk,
5. recursively bisect failed batches,
6. retry unresolved IDs individually,
7. record unresolved failures,
8. persist progress/cache.

### Referenced-ID lookup

`collectReferencedIds(...)`:

- shape-normalizes categories,
- collects only strictly valid numeric IDs,
- separates Item and ItemUICategory sets.

Invalid preserved imported values must not become lookup targets.

---

## 7. List editor architecture

`src/ui/listEditor.js` is a reusable list-editing component.

Features:

- typed add,
- comma-separated input,
- parser/formatter hooks,
- validation hooks,
- optional dedupe,
- remove pills,
- lookup-name display,
- batch lookup button,
- manual search,
- accessible contextual labels.

Important options include:

- `dedupeValues`
- `dedupeKey`
- `validateValue`
- `validateList`
- lookup dependencies
- `onItemsChanged`

### Numeric list behavior

Numeric ID editors:

- reject invalid typed values,
- dedupe numerically,
- normalize lookup result IDs,
- report all-duplicate no-op,
- report partial duplicate skips calmly.

### Lookup busy behavior

The list lookup handler tracks whether busy UI was actually shown before calling `hideBusy()`.

Do not decrement shared busy state for an operation that returned before `showBusy()`.

---

## 8. Form controls

`src/ui/formControls.js` owns reusable controls such as:

- number input,
- text input,
- switch input,
- segmented state control,
- range slider with numeric Min/Max inputs.

### Number input contract

- finite values commit,
- unchanged blur does not dirty,
- blank blur restores last committed value,
- min/max clamping remains functional,
- validation refreshes even on restore.

### Range input contract

- live finite input updates range and UI,
- blank blur restores previous underlying value,
- invalid non-finite blur restores previous value,
- unchanged blur does not call `onChange()`,
- reversed range is preserved but warned,
- sliders and numeric inputs remain synchronized,
- same-value live number, blur, and slider events do not mutate or notify; a real change mutates once and notifies once,
- reversed or non-finite ranges expose their validation message to both numeric inputs through `aria-describedby`; valid ranges remove that association.

---

## 9. Category list

`src/ui/categoryList.js` renders:

- category name,
- order/description subtitle,
- validation issue badge,
- enabled state,
- pinned state,
- color accents,
- drag/drop state.

Important behavior:

- keyboard selection via Enter/Space,
- `aria-current` for selected category,
- contextual `aria-label`,
- search disables drag reorder,
- issue counts come from validation.

---

## 10. Category editor

`src/ui/categoryEditor.js` is the primary editor composition module.

It currently owns:

- basic fields,
- color editor,
- generated-description UI,
- numeric ID lists,
- regex patterns,
- rarity selection,
- range filters,
- state filters,
- raw category JSON,
- validation UI,
- actions such as duplicate/delete/move.

This concentration is the main known maintainability risk.

Selected-category Raw JSON is parsed and shape-normalized as a local candidate before it replaces the live selected category. JSON-semantically identical candidates retain the existing object identity, selection, and dirty state. Parse or shape failures leave the current category and dirty state unchanged.

The color editor treats its 8-bit controls as displayed representations rather than lossless model values. Hex RGBA, native RGB, and alpha commits compare canonical input against refreshed displayed snapshots before parsing; same-display events therefore preserve higher-precision imported components. Every real color change synchronizes the linked controls and snapshots before later `change`/`blur` events can fire.

Do not split it casually. Refactor when future feature work creates real friction.

---

## 11. Regex → Item IDs tool

`src/tools/regexToItemIds.js`:

- selects an existing or custom regex,
- validates flags,
- scans paginated Item rows,
- supports cancellation,
- normalizes row IDs strictly,
- caches useful names,
- dedupes matches,
- adds matched IDs,
- optionally removes the selected regex.

Important behavior:

- no-op add must not mark dirty,
- status must distinguish:
  - IDs added,
  - regex removed,
  - both,
  - no changes.
- matched IDs are numeric.

---

## 12. Description generation

`src/descriptionGenerator.js`:

- infers category intent from:
  - category name,
  - regex patterns,
  - cached lookup names,
  - range/state filters.
- generates human-readable English descriptions.
- filters unusable lookup names.
- falls back when confidence is low or generated text contains known bad artifacts.

Localization note:

Generated-description application is strict-value change-aware. Identical generated text is not assigned and does not invoke dirty/render callbacks; both the initial Generate action and the later Replace callback enforce this independently. Automatic blank generation still requires a useful result, while manual blank generation retains the generator's deliberate fallback output.

Generated descriptions should eventually use language-aware templates. They should not be treated as ordinary UI-string translation.

---

## 13. Modal system

`src/modals.js` owns shared modal behavior.

Key guarantees:

- focus target chosen before app root becomes inert,
- app root becomes inert and `aria-hidden`,
- focus trap is active,
- stale delayed focus is guarded,
- close restores background state,
- previous focus is restored when appropriate.

Avoid bypassing the shared modal infrastructure.

---

## 14. Persistent state

`src/state.js` handles browser-persistent state such as:

- lookup cache,
- editor preferences.

Persisted lookup-cache JSON is shape-normalized before application use. The runtime cache always has independent plain-object `Item` and `ItemUICategory` buckets, preserves only string cache names (including unresolved sentinel strings), and drops malformed data.

Preferences include appearance/behavior settings such as theme and density, plus lookup/description behavior where applicable.

Future localization preferences should integrate here rather than inventing separate persistence.

---

## 15. Import/export

`src/importExport.js` owns:

- clipboard copy with fallback,
- text download,
- gzip compression,
- gzip decompression,
- base64 conversion,
- raw import parsing.

Clipboard fallback must remove temporary textarea nodes in `finally`.

A generated export shown in the modal counts as exported before automatic clipboard work begins. This ordering prevents an older clipboard promise from clearing dirty state after a newer edit while retaining clipboard fallback behavior.

Browser support errors should be explicit for missing `CompressionStream`/`DecompressionStream`.

---

## 16. Testing architecture

Primary command:

```bash
npm run check
```

Typical lower-level checks:

```bash
node --check src/app.js
node scripts/check-imports.mjs
node --test
```

Testing styles:

- direct unit tests for pure logic,
- source checks for DOM-heavy wiring and architectural guardrails.

Use source checks carefully; avoid brittle exact-format matching when a behavior test is practical.

---

## 17. Known architectural pressure points

### Large category editor

`src/ui/categoryEditor.js` is the biggest maintainability hotspot.

Possible future split:

- `basicEditor.js`
- `colorEditor.js`
- `ruleListEditors.js`
- `rangeFiltersEditor.js`
- `stateFiltersEditor.js`
- `rawCategoryEditor.js`

### Source-check growth

As source checks accumulate, periodically review whether:

- the behavior can now be tested directly,
- regex checks overfit whitespace or exact implementation,
- checks duplicate each other.

### Localization

Feasible but deferred.

Recommended sequence:

1. English-only i18n foundation.
2. Extract UI chrome and validation/status messages.
3. Add locale preference and English fallback.
4. Add locale key-parity tests.
5. Localize generated descriptions separately.
