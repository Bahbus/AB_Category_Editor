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

7. **Shared pattern semantics**
   - `src/patternSemantics.js`

8. **Shared range/state scalar semantics**
   - `src/filterScalars.js`

9. **AetherBags export compatibility**
   - `src/exportCompatibility.js`

10. **Shared item-ordering semantics**
   - `src/itemOrdering.js`

11. **Import/export and clipboard/download**
   - `src/importExport.js`
   - `src/exportSnapshots.js`

12. **XIVAPI and lookup**
   - `src/xivapi.js`
   - `src/lookupNames.js`

13. **UI rendering**
   - `src/ui/categoryList.js`
   - `src/ui/categoryEditor.js`
   - `src/ui/colorEditor.js`
   - `src/ui/matchingRulesEditor.js`
   - `src/ui/rangeStateFiltersEditor.js`
   - `src/ui/listEditor.js`
   - `src/ui/formControls.js`
   - modal-specific UI modules

14. **Modal infrastructure**
   - `src/modals.js`

15. **Persistent state**
   - `src/state.js`

16. **Tools**
   - `src/tools/regexToItemIds.js`

17. **Description generation**
   - `src/descriptionGenerator.js`

18. **Static assets and layout**
   - `index.html`
   - `styles.css`

19. **Tests and guardrails**
   - `test/*.test.mjs`
   - `test/applicationDataFlowSource.test.mjs`
   - `test/uiAccessibilitySource.test.mjs`
   - `test/lookupImportExportSource.test.mjs`
   - `testSupport/sourceFiles.mjs`
   - `scripts/check-javascript-syntax.mjs`
   - `scripts/check-imports.mjs`

---

## 2. Application state and orchestration

`src/app.js` owns the top-level mutable state:

- current config data,
- selected category index,
- dirty state,
- monotonic data revision for asynchronous snapshot authority,
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

- JSON-semantic equality ignores object key order while preserving array order, primitive types, and the distinction between negative and ordinary zero.
- manual renumbering writes one-based numeric `Order`/`Priority` values and reports whether category data changed.
- sorting detects array-order changes by object identity and resolves the selected object's new index.
- selected and full Raw JSON helpers keep normalization, confirmation, and live-state mutation boundaries directly testable.
- category reorder helpers validate indices, compute candidate order without live mutation, compare object identity order, preserve moved-object selection, and apply side effects only after a real change.

Full Raw JSON compares the final validated, repaired, normalized, and sorted candidate before destructive confirmation. An identical result closes the editor and reports validation/repair context without replacing data, resetting selection, changing dirty state, or launching automatic lookup.

Phase 40 was merged at `478545235debae9a1dc064b972acc2181cd5a0e1`. Phase 40.1 was merged at `beda975e087bd012f33270b7f1574c6822340bda`; it routes the finalized candidate through `configValidationSummaryText(...)`, so both changed and no-op paths report `validation.config.Categories.length` while replacement remains after confirmation. The Phase 40 change-decision and no-op boundaries are otherwise unchanged. Phase 41 was merged at `2926dc35dbda24fa07beb5b92477feeea47ea23f`. Phase 42 was merged at `ab8997ae53b1136fab56b445fa3c811cf0bd25a9`. Phase 43 was merged at `1790f13b9ed26b23de4cabea3fe9387a11990936`. Phase 44 was merged at `888a5838a062ea34ec279d7a423edbd88d45e66e`.

Post-Phase-44 acceptance confirmed that validated config replacement did not advance snapshot identity, accepted numeric strings could be hidden by native number-input sanitization, and a late Export/Copy result could overwrite a newer modal and its close handler. Phase 44.1 centralizes revision advancement across dirty edits and real whole-config replacement, normalizes only number-input display text, and guards Export/Copy completion with shared modal visibility before any result presentation, save transition, or clipboard work. Phase 44.1 was merged at `80c1e2e8f0194420a06cbde1b3feeb19bbbceaee`; its post-merge review found no application-runtime follow-up and instead confirmed local/hosted verification drift that became Phase 45.

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
7. Apply the validated config through the live replacement boundary only when the finalized candidate is JSON-semantically different; a real replacement advances the centralized data revision.
8. Reset selection.
9. Mark saved for normal import or dirty for editable Raw JSON replacement as appropriate.
10. Render.
11. Show validation/repair summary when meaningful.
12. Optionally auto-lookup referenced IDs.

Important rule:

- Invalid individual numeric IDs inside valid arrays are preserved and warned, not silently removed.
- Category entries themselves must be JSON objects; `null`, arrays, and scalar entries fail validation rather than being repaired into categories.
- Plain Color objects are snapshotted by value before normalization. Missing, non-number, non-finite, or single-overflow components are repaired to defaults with one material, reviewable Color warning before JSON cloning/stringification can convert them to `null`; valid finite single-representable components, including higher-precision values, remain exact. Malformed whole Color values retain separate repair messaging.
- Allowed Rarities normalization compares original JSON types strictly: type-changing coercions are material repairs, while a genuine reorder of unique supported numeric values remains a non-material note.
- Range/state scalar repair delegates to `src/filterScalars.js`: Range Enabled accepts only booleans; Level/Item Level accept signed Int32 values; Vendor Price accepts exact uint-compatible integers; State accepts only numeric 0/1/2; and Filter accepts signed Int32 values. Invalid plain-object components fall back independently while exact boundary values remain unchanged.

---

## 4. Validation architecture

`src/validation.js` provides:

- category-name checks,
- Order/Priority finite-number checks,
- grouped duplicate sort-position detection,
- structural Allowed Item Name Pattern validation,
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

### Stored pattern semantics

The pinned AetherBags implementation is authoritative: `AllowedItemNamePatterns` is `List<string>`; the matcher skips null/empty/whitespace entries; and `RegexCache` uses case-insensitive, culture-invariant .NET regex and returns `null` when .NET compilation fails.

The dependency-free browser cannot execute or fully validate .NET syntax. `src/patternSemantics.js` therefore classifies only the structural facts the browser knows: a stored element is usable when it is a nonblank string. `src/validation.js` reports every non-string or blank element at its original position and preserves imported data. Duplicate-pattern warnings consider only structurally usable entries, preventing duplicate findings for repeated invalid elements. The legacy `validateRegexPattern` export remains as a compatibility alias to the structural validator.

### Range and state scalar semantics

`src/filterScalars.js` is shared by import repair and validation so JSON numeric strings, blanks, booleans-as-numbers, nullish values, arrays, objects, fractions, non-finite values, and width-incompatible integers cannot pass through JavaScript coercion. Level, Item Level, and State Filter use `-2147483648..2147483647`; Vendor Price uses `0..4294967295`; State remains restricted to 0/1/2. Validation messages identify Enabled, Min, Max, State, or Filter while keeping stable filter fields for category summaries.

The pre/post import merge helper is DOM-free. Category-scoped findings receive a private symbol-backed reference to their source category object; merge-local tokens derived from that reference distinguish category instances even when IDs are duplicated, blank, or missing. Repeated findings for the same object still dedupe across analyses, separate component messages remain distinct, and grouped SortPosition findings keep their stable key. The private identity is not enumerable, serialized, exported, or displayed.

### AetherBags compatibility analysis

`src/exportCompatibility.js` is the central, DOM-free description of the current AetherBags category-import envelope. It checks the root, every category scalar, `Vector4` components, sort criteria, `CustomItemOrder`, rule lists, range/state fields, and `ForkedFromKey` without mutating configuration data. Findings carry stable fields, category labels/indices, severity counts, and an explicit `blocksExport` decision. `src/validation.js` reuses category/root compatibility findings for import review and category issue badges rather than maintaining a second schema.

Deserialization/use failures are blocking. Predictable post-deserialization behavior such as upstream property defaults, ignored Format/Version values, unsupported/duplicate/defaulted Item Sort Criteria, or unsupported numeric State values is a warning and remains exportable. Blank string patterns retain Phase 48's review finding but do not become an AetherBags deserialization blocker; non-string pattern elements do block. Unknown properties remain preserved and are not schema errors merely because the editor does not interpret them.

Item Sort Criteria sorts items already matched into a category; it does not affect category membership. Its upstream normalization treats an omitted or empty list as a single Use Global / Ascending criterion, so those shapes are compatible and intentionally produce no finding. Supplied unsupported criteria, duplicate fields, missing criterion members, or Use Global mixed with other criteria remain reviewable when normalization discards or rewrites them. Malformed containers/entries and incompatible Field/Direction scalar types remain blocking.

Export representability and safe structured editability are separate decisions. Compatible unknown criterion properties remain silent and exportable, but any criterion with own enumerable members beyond `Field` and `Direction` makes the stored list unsafe for structured mutation because the controls cannot round-trip those members. The Item Ordering UI therefore preserves the stored list exactly and routes that category to selected-category Raw JSON; analysis, render, disclosure, and routing do not normalize or dirty it.

Custom Item Order is a list of item-ID ranks used only when the normalized criteria contains Custom Order. Omitted or empty lists are silent when Custom Order is not selected. When it is selected, an omitted or empty list produces one category-scoped warning because custom ranks cannot contribute; a sole Custom Order criterion falls back to AetherBags' non-global default, while mixed criteria continue through the remaining ordering rules. Cross-field analysis follows upstream order: a valid Use Global criterion anywhere replaces the full normalized criteria list before the Custom Order decision. Duplicate custom item IDs are reviewable only when Custom Order is active because only the first position is used; malformed lists and incompatible uint item IDs remain blocking regardless. Analysis never inserts, removes, or rewrites either ordering property.

Phase 50.1 adds a serialization-fidelity pass ahead of the envelope analysis. Its iterative, cycle-safe traversal inspects every enumerable value and reports stable JSON paths without mutation. Finite plain JSON values pass unchanged; non-finite numbers, cycles, BigInt, undefined/function/symbol values, array holes or extra properties, accessors/custom serialization, non-plain objects, and controlled final serialization failures block before export callbacks. This makes unknown-property preservation include the value that will actually survive JSON serialization rather than only the in-memory property name/shape.

Phase 50.2 makes that traversal reject negative zero at its exact JSON path before `JSON.stringify` can normalize it to `0`. It also inspects every own `toJSON` descriptor before enumerability filtering: function-valued data properties and accessor descriptors block, while accessor values are never read and no getter, setter, serializer, or export callback is invoked. Other non-enumerable members remain ignored when they cannot influence JSON output.

The pinned `CategoryExportData` defaults missing Format to `AetherBags_Category` and Version to `1`, while its current import path only tests that Categories is non-null and non-empty. Correctly assignable but unexpected Format/Version values are ignored. `UserCategoryDefinition`, `CategoryRuleSet`, nested filters, `Vector4`, and sort criteria likewise supply initializers or CLR value defaults for omitted members. The analyzer reports those effects as reviewable defaulting/semantic warnings; explicit null, malformed, or incompatible JSON types remain blocking unless the complete import/use path is demonstrably safe.

---

## 5. Shared row-ID architecture

`src/rowIds.js` is authoritative for strict numeric row-ID semantics.

Expected helpers:

- `isValidRowIdValue(value)`
- `normalizeRowIdValue(value)`
- `invalidRowIds(values)`

Valid values:

- unsigned 32-bit integer numbers,
- exact digit-only strings within uint range for legacy lookup/display normalization.

Normalization:

- returns numeric row ID for valid input,
- returns `null` for invalid input,
- never rounds unsafe or oversized digit strings,
- does not mutate source values.

Typed list entry uses `parseTypedRowIdValue(...)` and accepts only exact `0..4294967295` values. Stored numeric strings remain available to tolerant lookup normalization but are export-incompatible until explicitly corrected to JSON numbers.

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
- comma-separated input by default with a per-editor opt-out,
- reusable input placeholders,
- parser/formatter hooks,
- validation hooks,
- optional dedupe,
- remove pills,
- lookup-name display,
- batch lookup button,
- manual search,
- accessible contextual labels.

Important options include:

- `splitInputOnCommas`
- `inputPlaceholder`
- `dedupeValues`
- `dedupeKey`
- `validateValue`
- `validateList`
- lookup dependencies
- `onItemsChanged`

### Numeric list behavior

Numeric ID editors:

- retain default comma-separated batch entry and the default numeric-oriented placeholder,
- reject invalid typed values,
- dedupe numerically,
- normalize lookup result IDs,
- report all-duplicate no-op,
- report partial duplicate skips calmly.

### Name-pattern entry

Allowed Item Name Patterns opts out of comma splitting and uses the placeholder `Add one regex/name pattern`. The DOM-free `tokenizeListInput(...)` helper trims only surrounding input whitespace in this mode and returns the complete value as one token, preserving regex quantifiers and literal commas. The existing add handler validates and parses that one token before mutation or input clearing. Nonblank strings, including .NET-only syntax such as `(?>a)`, are accepted; blank input remains atomic and correctable.

### Lookup busy behavior

The list lookup handler tracks whether busy UI was actually shown before calling `hideBusy()`.

Do not decrement shared busy state for an operation that returned before `showBusy()`.

### Ordered-list focus recovery

The ordered-list option uses the shared DOM-free list-mutation focus plan after add, move, and removal. Move actions first try the corresponding action on the moved pill and then another enabled action on that pill. Removal prefers the next surviving Remove control, then the previous one, and finally the persistent input. Focus helpers explicitly skip disabled and hidden targets. Non-ordered list editors retain their established behavior.

### Button roles in lists

List pills deliberately do not use the standalone square icon-button target. Their ordered movement and removal controls use an 18px borderless `.pill-icon-button` target so the pill itself stays compact. Enabled movement glyphs gain an accent-colored text glow on hover/focus; destructive `×` glyphs use the danger color/glow; disabled glyphs remain muted without a glow. The complete value/list meaning is carried by matching `aria-label` and `title` attributes. Non-ordered pills receive only the destructive removal control; movement remains opt-in with ordered behavior.

Lookup-enabled lists wrap the pill list in `.pill-list-shell`. The contextual search icon is positioned inside that shell and hidden unless the list has an unresolved valid ID. The pill list reserves icon space only when lookup is supported. Its vertical position is derived from `--pill-list-border-width`, `--pill-list-padding`, `--pill-row-height`, and the density-aware `--button-icon-target`, so the 30px Comfortable and 26px Compact button boxes share the first 28px pill's center while later pill rows do not affect placement. List-entry `+` buttons are disabled from the trimmed value of the adjacent text input and resynchronize after input and successful/no-op clears.

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
- validation refreshes even on restore,
- committed state keeps the original JSON value separate from its strict finite-number interpretation,
- accepted numeric strings remain unchanged in the model on numeric no-ops,
- the browser-accepted number-input display is retained when nonblank; if native sanitization blanks an accepted numeric string, its canonical finite interpretation is displayed instead,
- display normalization runs at control creation and committed-value restoration without rewriting the original JSON value,
- invalid imported nullish, blank, boolean, array, object, and nonnumeric values remain untouched and visibly invalid on blank or non-committing blur,
- one deliberate finite edit replaces an invalid committed value once and refreshes validation from the corrected model value.
- Order/Priority opt into signed Int32-only commits, exact display of incompatible imported JSON, and explicit JSON-number correction. Invalid transient fractions/overflow remain visible and accessible without model, callback, or dirty-state changes; blank blur and Enter-to-blur behavior remain unchanged.

### Range input contract

- live finite input updates range and UI,
- blank blur restores previous underlying value,
- invalid non-finite blur restores previous value,
- unchanged blur does not call `onChange()`,
- reversed range is preserved but warned,
- sliders and numeric inputs remain synchronized,
- same-value live number, blur, and slider events do not mutate or notify; a real change mutates once and notifies once,
- typed Level/Item Level input commits only signed Int32 values; Vendor Price enforces `0..uint.MaxValue`,
- invalid live text does not mutate, notify, move the paired slider, or dirty; it exposes a component- and bound-specific error and restores the committed value and slider state on blur,
- component-specific parse, width, or stored-value errors mark and describe only the affected numeric input,
- reversed valid ranges expose their warning to both numeric inputs through `aria-describedby`; valid ranges remove that association.

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
- generated-description UI,
- raw category JSON,
- validation UI,
- actions such as duplicate/delete/move.

`src/ui/colorEditor.js` is the focused leaf owner for the complete Color card. It returns the existing `card color-card` composition containing the native RGB picker, Hex RGBA field, R/G/B byte controls, and alpha slider/output. It owns color conversion/decision imports, validity presentation, linked-control synchronization, committed display snapshots, and `normalizeRgbInputValue(...)`. Each RGB control registers a private synchronization hook that refreshes both its displayed byte and its closure-owned committed byte from `category.Color`; `updateColorVisuals()` invokes all three hooks with the picker, Hex RGBA, alpha, preview, and shared snapshot refreshes.

`categoryEditor.js` passes only the selected category, dirty callbacks, and a fresh scheduled sidebar callback to the Color leaf. The shared `createScheduledRenderList(...)` implementation remains in `categoryEditor.js`: one instance is retained for Range/State filters and a distinct instance is passed to Color, preserving independent pending flags. The leaf does not import `categoryEditor.js`, application state, or application orchestration.

`src/ui/matchingRulesEditor.js` is the focused leaf owner for the matching-rule grid. It returns the existing two-column grid containing, in order, Allowed UI Category IDs, Allowed Item IDs, Allowed Item Name Patterns with its converter action, and Allowed Rarities. It owns the strict typed row-ID parsers and normalized dedupe wiring, Item and ItemUICategory list lookup composition, structural pattern validation and comma-preserving input configuration, converter placement, and the private rarity checkbox renderer.

`categoryEditor.js` passes the category list, dirty callback, converter launcher, existing list-editor lookup dependencies, and one rule-change callback. That callback retains category-level validation refresh, optional generated-description updates, and sidebar rendering in the established order. The matching-rules module does not depend on `categoryEditor.js`, so the ownership boundary introduces no circular dependency.

`src/ui/rangeStateFiltersEditor.js` is the focused leaf owner for the Range Filters and State Filters disclosure cards. It owns the private range/state display-name maps and fallback formatting, Range defaults and signed-Int32/uint bounds, Range Enabled switches and number/slider composition, State segmented controls, three-column grid markup, and local summary refreshes. It returns the two existing cards to `categoryEditor.js` without changing their disclosure state or markup/classes.

`categoryEditor.js` passes only the selected rules plus dirty, narrow filter-change, and scheduled-render callbacks. The filter-change callback retains category-level validation and optional generated-description orchestration; the existing Range/State scheduler instance is shared by both cards, while Color receives its own separately created instance. The leaf does not import application state, `categoryEditor.js`, or application orchestration.

Selected-category Raw JSON is parsed and shape-normalized as a local candidate before it replaces the live selected category. JSON-semantically identical candidates retain the existing object identity, selection, and dirty state. Parse or shape failures leave the current category and dirty state unchanged.

The color editor treats its 8-bit controls as displayed representations rather than lossless model values. Hex RGBA, native RGB, and alpha commits compare canonical input against refreshed displayed snapshots before parsing; same-display events therefore preserve higher-precision imported components. Phase 58 initially refreshed only picker/Hex/alpha snapshots, leaving each R/G/B input and its private baseline stale after external commits. Phase 58.1 makes every real color change synchronize all linked controls and snapshots before later `change`/`blur` events can fire.

RGB byte controls reject blank and non-finite live input without mutation, restore the last committed byte on blur, and round/clamp deliberate finite input to `0..255`. Displayed no-ops do not dirty or schedule. Native RGB and alpha real changes mark dirty and use the Color-specific scheduled callback; Hex RGBA real changes retain the established immediate dirty-and-render path. Invalid Hex remains visible and reported, equivalent canonical input is restored as a no-op, and Enter/change/blur sequencing cannot commit one edit twice.

Further splits should remain behavior-preserving ownership extractions driven by demonstrated friction.

---

## 11. Regex → Item IDs tool

`src/tools/regexToItemIds.js`:

- selects a structurally usable saved pattern or custom regex,
- explains that AetherBags uses case-insensitive, culture-invariant .NET regex while browser scanning is a JavaScript approximation,
- compiles browser-compatible input with a fixed case-insensitive JavaScript flag,
- scans paginated Item rows,
- supports cancellation,
- normalizes row IDs strictly,
- caches useful names,
- dedupes matches,
- adds matched IDs,
- optionally removes the selected regex.

Important behavior:

- the launch action is composed by `src/ui/matchingRulesEditor.js` into the existing Allowed Item Name Patterns list input/Add row after `categoryEditor.js` supplies the launcher callback; `listEditor(...)` has no converter-specific API,
- `.pattern-converter-action` right-aligns the launch control when row space permits and allows wrapping within the card,
- the action remains present when the saved pattern list is empty because the modal accepts a custom regex,
- no editable regex-flags control exists,
- blank or JavaScript-incompatible input returns before match state, lookup-cache lease acquisition, busy UI, network access, or configuration mutation,
- incompatibility is described as a browser-converter limitation rather than an invalid AetherBags regex,
- non-string and blank saved elements are omitted from choices with correction guidance, and each usable choice retains its original array index for safe optional removal,
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
- `isModalOpen()` exposes read-only backdrop visibility for callers that must not replace an active dialog.

Export/Copy completion checks `isModalOpen()` after releasing only its own busy state and before creating result content, opening the result modal, saving the snapshot, or attempting automatic clipboard work. If another modal is active, the generated presentation attempt is discarded and a retry warning is reported without changing the active close handler, focus, inert state, or save state.

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

`src/exportSnapshots.js` owns DOM-free revision capture and snapshot-current save decisions.

Clipboard fallback must remove temporary textarea nodes in `finally`.

Centralized revision advancement is used by every real `markDirty(...)` call and every JSON-semantically changed validated-config replacement. Normal import and preset replacement can therefore remain saved documents while still invalidating snapshots created from an earlier live config. Cancelled, failed, or semantic no-op replacements do not advance the revision. Changed full Raw JSON still advances through replacement and dirty paths; callers must rely only on monotonic invalidation, not an exact increment count.

Export/Copy and Download capture the current revision immediately before `makeBase64Export(...)` snapshots the data. After compression, only a matching revision may call the saved-state transition. Every stale completion reports whether newer dirty edits remain unexported or whether a later saved import/preset made the snapshot represent earlier editor data. A stale Export/Copy modal uses the revision decision before presentation and never labels its content `Current`.

A current generated export shown in the modal counts as exported before automatic clipboard work begins. Clipboard success or failure never decides save state, preserving the Phase 43 ordering while the revision guard covers edits made during compression.

Both Export / Copy and Download call the same compatibility-preflight wrapper after committing the active control and before showing busy UI or starting gzip work. A blocked decision opens an accessible, category/field-specific summary and returns without compression, clipboard/download side effects, snapshot-state advancement, or saved-state transitions. A passing decision enters the unchanged Phase 43/44/44.1 async snapshot path.

The shared preflight now runs serialization-fidelity analysis first. Blocking paths therefore include unknown nested values such as `$.Categories[0].UnknownNested.overflow`, and `JSON.stringify` cannot silently turn an imported overflow into `null` before the user sees the problem. Modal copy separates unsafe serialization/read failures from upstream defaults and ignored values. Modal title and validation-path wrapping keep the summary inside desktop, 840px, and 390px viewports.

Negative zero uses the same boundary: Raw JSON change decisions do not collapse it into ordinary zero, and export preflight blocks it with a readable path before snapshot generation. An own `toJSON` accessor is classified entirely from its descriptor, so blocked analysis cannot execute user serialization code.

Browser support errors should be explicit for missing `CompressionStream`/`DecompressionStream`.

### Static button taxonomy

`styles.css` keeps the dependency-free button taxonomy close to the established element/class rules:

- unclassified `button` is the standard text action,
- `.small` and `.button-compact` are compact text actions,
- `.icon-button` is the reusable square icon target,
- `.primary` marks the main forward action,
- `.danger` marks destructive actions,
- `.link-button` remains the inline link-style action,
- `.movement-button` is a neutral semantic refinement for reordering icons.

The shared standalone icon target is 30px in comfortable density and 26px in compact density, while `--button-icon-glyph-size` controls the visible glyph independently. The Help control intentionally retains its existing 32px topbar target. Category and criterion movement share `↑`/`↓` plus precise context-specific names/titles; native `disabled` remains the availability authority. Pill actions use the deliberate compact exception described above.

`--input-control-height` is 38px in Comfortable density and 34px in Compact density. Reusable list-entry Add actions opt into `.input-paired-icon`, making their square target match the adjacent text input without changing lookup-result or standalone icons. `--ordering-control-height` is 35px / 31px and governs criterion selects plus the `.ordering-contextual-icon` Add criterion action. Criterion move/remove buttons retain the 30px / 26px standalone icon target inside an ordering-control-height action rail with centered alignment. Category-header actions likewise share the standalone 30px / 26px height, so descriptive Duplicate aligns with the arrow and trash icons.

High Contrast and Aetherial retain their established focus-visible overrides. The generic button focus-visible rule supplies the accent outline for all other themes. Pill controls add a 2px outline and 2px offset without changing their 18px box or hover glow; the more specific High Contrast and Aetherial theme rules remain visually distinct. Topbar, category-action, criterion-action, pill, and modal rows continue to wrap through their existing flex/grid rules.

Selected-category structural rerenders use `selectedCategoryStructuralFocusPlan(...)` from `src/categoryChanges.js`. Move actions prefer the same direction after rerender and the opposite direction when the preferred action becomes disabled. Duplicate prefers the newly rendered Duplicate action. Confirmed Delete prefers the newly selected `.cat-item[aria-current="true"]`, then live category-header actions; deleting the final category falls back to Add category. The plan changes only post-render focus and does not participate in category mutation, selection, renumbering, modal, dirty-state, or no-op decisions.

The visible-label audit changes `Sort by Order` to `Sort by order`, exact Add actions to `+`, criterion removal to `×`, category deletion to `🗑`, and batch lookup to `🔍`. Each symbol-only control has a contextual accessible name and title. Duplicate remains descriptive text; manual lookup search remains `Search`; acronyms such as JSON and IDs and product actions such as `Import/Paste` and `Export/Copy` remain unchanged.

---

## 16. Testing architecture

Primary command:

```bash
npm run check
```

Typical lower-level checks:

```bash
node scripts/check-javascript-syntax.mjs
node scripts/check-imports.mjs
node --test
```

`scripts/check-javascript-syntax.mjs` resolves the repository root from the script location rather than the caller's working directory. It recursively discovers regular `.js` and `.mjs` files in deterministic relative-path order, including untracked files, while skipping `.git`, `node_modules`, non-JavaScript files, and symlink traversal. Each discovered file is passed to the current Node executable with `--check`; the script reports the checked count only on success and exits nonzero after any failure.

The single GitHub Actions workflow is `.github/workflows/project-verification.yml`. Pushes and pull requests run the same `npm run check` contract once with read-only repository contents, checkout v4, setup-node v4, and Node 22. The workflow does not duplicate the syntax, import, or test commands.

Phase 45 adds temporary-fixture behavior tests for nested discovery, ordering, exclusions, directory symlinks, valid files, and an invalid-file failure. Its local `npm run check` run syntax-checked 56 files, resolved all static relative imports, and passed all 25 test files / 319 tests. `git diff --check` also passed. CI and browser QA were not run.

Phase 46 adds focused source coverage for composing the converter action into the patterns list row, its explicit button type and label, direct dependency wiring, right-alignment/wrapping class, standalone-card removal, and stable independent extraction of the three list-editor calls for dedupe assertions. Its local `npm run check` run syntax-checked 56 files, resolved all static relative imports, and passed all 25 test files / 320 tests. `git diff --check origin/main` passed. In-app browser QA was attempted but unavailable because the browser transport closed; CI was not run.

Phase 46 was merged at `26dd5564830ec7d5f6209d7a37077e4836a25a47`. Its post-merge review confirmed that unconditional comma splitting corrupted valid name patterns. Phase 47 adds direct tests for default numeric-style comma tokenization, preserved comma-bearing pattern tokens, blank input, and surrounding-whitespace trimming, plus focused source coverage for the pattern-only options and unchanged numeric defaults. Its local `npm run check` run syntax-checked 57 files, resolved all static relative imports, and passed all 26 test files / 325 tests. `git diff --check origin/main` passed. In-app browser QA was attempted but unavailable because the browser transport closed during connection; CI was not run.

Phase 47 merged through PR #83 at `8340c9f8417865242a0bf1faba7b3dd156614cc5`. Its post-merge review passed exact tree/diff verification, GitHub CI, and Pages; deployed `listEditor.js` matched merged source; browser QA remained unavailable because the browser transport closed.

Phase 48 adds direct storage-classification, browser-compatibility, saved-option, original-index removal, import-fidelity, issue-count, and tokenization tests plus DOM source guardrails. Its local `npm run check` run syntax-checked 59 files, resolved all static relative imports, and passed all 27 test files / 336 tests. `git diff --check origin/main` passed with no output. In-app browser QA was attempted but unavailable because the browser transport closed before discovery. CI and Pages were not run for the unpublished phase.

Phase 48 then merged through PR #84 at `4aa67ed97b89f35e0bf468628536d2993819b182` with no 48.1. Its post-merge review reran the same 59-file / 27-file / 336-test check, confirmed an exact branch-tree match and clean `git diff --check origin/main`, verified desktop-keyring authentication, PR checks, post-merge Project verification, Pages, exact deployed `patternSemantics.js` and `regexToItemIds.js`, and browser behavior for `(?>a)`, early incompatibility handling, blank rejection, and desktop/840px/390px overflow.

Phase 49 adds the shared scalar module and direct classification, repair, validation/merge, typed-input decision, no-op/notification, and focused DOM-wiring coverage. Its local `npm run check` run syntax-checked 61 files, resolved all static relative imports, and passed all 28 test files / 347 tests; `git diff --check origin/main` passed with no output. In-app browser QA was attempted twice but unavailable because the browser transport closed; CI and Pages were not run.

Phase 49.1 adds exact Int32 boundary classification and repair coverage, exact uint adjacency coverage, typed range boundary decisions, bound-specific messages, per-component accessibility state, duplicate/absent category-ID finding identity, repeated-analysis dedupe, separate range-component retention, and unchanged grouped SortPosition behavior. Its local `npm run check` run syntax-checked 61 files, resolved all static relative imports, and passed all 28 test files / 352 tests; `git diff --check origin/main` passed with no output. In-app browser QA was attempted twice but unavailable because the browser transport closed before initialization; CI and Pages were not run.

Phase 50 adds direct compatibility-envelope, Int32 Order/Priority, exact uint list, unsafe-digit-string, top-level/category scalar, Item Sort Criteria, unknown-property, Color overflow repair, rarity materiality, and shared preflight behavior coverage. Its local `npm run check` run syntax-checked 63 files, resolved all static relative imports, and passed all 29 test files / 370 tests; `git diff --check origin/main` passed with no output. Upstream AetherBags `master` remained `368bd4677b16594d9d4624efc8269ada7408d4f5`. In-app browser QA was attempted twice but unavailable because the browser transport closed during initialization; CI and Pages were not run.

Phase 50.1 adds direct nested root/category/rule fidelity coverage, exact non-finite JSON paths, callback suppression and non-mutation, finite unknown round trips, cycles/BigInt/sparse arrays/accessors, upstream root defaults/ignored values, omitted category/rule/nested defaults, explicit-null blockers, accurate modal copy, unchanged shared callback wiring, and narrow path/title wrapping. Its local `npm run check` run syntax-checked 63 files, resolved all static relative imports, and passed all 29 test files / 375 tests; `git diff --check origin/main` passed with no output. Browser QA passed both blocked actions, accessible focus/inert/return behavior, unchanged saved-state behavior, and overflow-free desktop, 840px, and 390px layouts. CI and Pages were not run because publication remains separate.

Phase 50.2 adds direct zero-sign equality and Raw JSON decision coverage, exact root/category/rule/object/array negative-zero paths, both export-callback suppression paths, ordinary-zero allowance, enumerable/non-enumerable `toJSON` accessor invocation counters, and retained function-valued `toJSON`, accessor, sparse-array, cycle, non-finite, unknown-property, and default/ignored-member coverage. Its local `npm run check` run syntax-checked 63 files, resolved all static relative imports, and passed all 29 test files / 381 tests; `git diff --check origin/main` passed with no output. Browser QA passed both blocked actions, dirty-state and focus/inert restoration, no-download verification, and overflow-free 1280px, 840px, and 390px layouts. CI and Pages were not run because publication remains separate.

Phase 51 adds direct omitted/empty Use Global equivalence, Custom Order fallback, Use Global precedence, supplied-normalization, malformed ordering, duplicate custom-order ID, stable category identity, shared export-preflight, bundled-preset parser, issue-count, modal-gating, and JSON-shape fidelity coverage. Its local `npm run check` run syntax-checked 63 files, resolved all static relative imports, and passed all 29 test files / 386 tests; `git diff --check origin/main` passed with no output. The basic preset remained 24 categories with neither ordering property inserted and no ordering findings or issue badges; the advanced preset retained its three unrelated duplicate sort-position warnings. Browser QA passed silent basic-preset import, both export actions, one actionable Custom Order warning, modal focus/inert/return behavior, and overflow-free desktop/840px/390px layouts. CI and Pages were not run because publication remains separate.

Phase 52 adds `src/itemOrdering.js` as the shared non-mutating authority used by compatibility analysis, structured UI, global referenced-ID collection, and generated descriptions. `src/ui/itemOrderingEditor.js` owns the disclosure card and local refresh boundary; it never writes ordering properties during analysis/render. Criteria and custom-rank changes are delegated to DOM-free decisions or the reusable list editor's opt-in ordered mode. Blocking containers stay outside structured mutation and route to the existing selected-category Raw JSON control. Valid custom IDs participate in Item lookup even when the list is retained inactive. The local `npm run check` run syntax-checked 66 files, resolved all static relative imports, and passed all 30 test files / 403 tests; `git diff --check origin/main` passed. Browser QA verified omitted-shape export fidelity, normalization repair, local issue clearing, malformed-data preservation/routing/focus, rank validation/add/reorder/duplicate/lookup/retained-inactive behavior, focus continuity, and desktop/840px/390px overflow. CI and Pages were not run because publication remains separate.

Phase 52.1 separates compatible export representation from safe structured criterion editing, routes extra-member criteria to selected-category Raw JSON without mutation, and adds shared DOM-free focus planning for criterion and ordered custom-rank add/move/remove rerenders. Its local `npm run check` run syntax-checked 66 files, resolved all static relative imports, and passed all 30 test files / 408 tests; `git diff --check origin/main` passed. In-app browser QA remained unavailable after the original two attempts and a later two-tab retry because the browser webview did not attach, so desktop/840px/390px runtime checks were not completed. CI and Pages were not run because publication remains separate.

Phase 53 adds focused source coverage for the shared text/compact/icon/primary/danger/link taxonomy, 30px/26px standalone icon targets, the compact 18px pill exception, neutral movement versus destructive removal, contextual accessible names/titles, native disabled boundaries, blank-input Add disabling, unresolved-lookup visibility/placement, and the intentional final glyph labels. Its local `npm run check` run syntax-checked 66 files, resolved all static relative imports, and passed all 30 test files / 412 tests; `git diff --check origin/main` passed. Final-build in-app browser QA passed all six themes, both densities, and 1280px/840px/390px: every matrix entry kept 18×18 pill actions inside 28px pills, 30px/26px standalone minima, and zero horizontal overflow. Runtime interaction also verified blank-input Add transitions, contextual lookup placement/visibility, glyph names/titles, and disabled boundaries. Browser automation did not produce pointer hover or keyboard focus traversal, so glow/focus-visible rendering remains source/test verified. CI and Pages were not run because publication remains separate.

Phase 53.1 adds direct focus-plan tests and focused source guards for matched 38px/34px list Add controls, matched 35px/31px Add criterion controls, centered 30px/26px criterion actions, equal-height category-header actions, the unchanged standalone 24px minimum, structural rerender wiring, visible pill focus outlines, and disabled-button tooltip/hover suppression. `syncButtonTooltip(...)` retains enabled-state titles and supports an explicit disabled-state explanation, but no current control uses that exception; the shared hover border is limited to enabled buttons. Its local `npm run check` run syntax-checked 66 files, resolved all static relative imports, and passed all 30 test files / 418 tests; `git diff --check origin/main` passed. In-app browser QA measured the exact Comfortable/Compact matched and centered relationships, Move/Duplicate/Delete focus restoration, 18px pill geometry and visible keyboard focus across all six themes, and zero overflow at 1280px/840px/390px. CI and Pages were not run because publication remains separate.

Phase 54 adds normal-importer regression coverage for the 55-category advanced preset's seven corrected descriptions and focused CSS/source coverage for density-aware first-row lookup centering. A decoded recursive comparison against `origin/main` is the semantic authority for the opaque advanced payload; it reports only category Description paths 0, 8, 9, 10, 17, 18, and 46, while the basic payload remains byte-for-byte identical. Its local `npm run check` run syntax-checked 66 files, resolved all static relative imports, and passed all 30 test files / 419 tests; `git diff --check origin/main` passed. In-app browser QA verified the descriptions plus unresolved-only Item and ItemUICategory actions, zero center offset, 30px/26px targets, multi-row first-row alignment, reserved space, and zero overflow in both densities at 1280px/840px/390px. CI and Pages were not run because publication remains separate.

Phase 56 replaces the single 1,073-line / 79-test source-check file with three ownership-oriented suites: application/data-flow architecture, UI/accessibility/focus/responsive styling, and lookup/import/export/no-op wiring. `testSupport/sourceFiles.mjs` centralizes deterministic repository-root reads and recursive JavaScript discovery outside Node's automatic `test/` discovery. Seventy-six surviving source-guard names remain exactly once. The retired import-helper and duplicate-sort source assertions are covered by existing direct helper/validation behavior tests; the retired lookup-chunk regex is replaced by a direct multi-chunk `fetchLookupBatch(...)` test. Whitespace-sensitive adjacency checks now tolerate harmless formatting while retaining exact structural contracts. `decideUniqueItemAdd(...)` and `decideItemRemove(...)` are removed from `src/itemOrdering.js` because the reusable list editor owns runtime custom-order add/remove behavior and no caller consumes those exports. `.button-compact` remains the documented compact-text taxonomy role and retains a source guard. The local `npm run check` run syntax-checked 69 files, resolved all static relative imports, and passed all 32 test files / 416 tests; focused coverage passed 102 tests, source-name accounting passed, and `git diff --check origin/main` passed. Browser QA was not required because no runtime behavior changed; CI and Pages were not run because publication remains separate.

Phase 57 moved the complete matching-rule grid and private rarity renderer into `src/ui/matchingRulesEditor.js`, including strict typed row-ID and dedupe wiring, lookup/search composition, comma-preserving pattern configuration, converter placement, and rarity normalization. `categoryEditor.js` supplies the converter launcher and retains category-level validation, optional generated-description, and sidebar-refresh orchestration through one narrow callback. Phase 57 merged through PR #97 at `291ad8db3cef2060a5a891963c9ee4103c2b4c58`. Its implementation-time browser QA passed both densities at 1280px, 840px, and 390px. The post-merge review then confirmed an identical local/merged tree, passed `npm run check` with 70 JavaScript files, 32 test files, and 417 tests, and passed `git diff --check origin/main` with no output. GitHub post-merge Project verification and Pages deployment succeeded for `291ad8d`. The post-merge in-app browser attempt used two fresh tabs, but the webview did not attach, so no post-merge runtime pass is claimed.

Phase 58 moves the complete Color card and `normalizeRgbInputValue(...)` into `src/ui/colorEditor.js`. `categoryEditor.js` retains the single scheduler implementation, creates a fresh Color-specific instance for the leaf, and retains a separate instance for Range/State filters. The local `npm run check` run syntax-checked 71 files, resolved all static relative imports, and passed all 32 test files / 418 tests; `git diff --check origin/main` passed with no output. Final-build in-app browser QA was attempted with two fresh local tabs, but neither webview attached, so the Comfortable/Compact 1280px/840px/390px matrix and live Color synchronization/no-op checks remain unavailable. CI and Pages were not run because implementation and publication remain separate.

Post-merge browser review then confirmed that Phase 58 had not actually synchronized the visible R/G/B controls or their private committed snapshots after Hex/native changes. Phase 58.1 adds per-control refresh hooks to the existing shared visual update without changing ownership, dependencies, scheduling, dirty/render counts, or focus. Its local `npm run check` run syntax-checked 71 files, resolved all static relative imports, and passed all 32 test files / 418 tests; `git diff --check origin/main` passed with no output. Local browser QA was attempted with two fresh in-app tabs and later retried with two additional fresh tabs, but none of the four webviews attached, so the requested interactive and responsive matrix was unavailable. CI and Pages were not run because implementation and publication remain separate.

Phase 59 moves the complete existing Range Filters and State Filters disclosure cards into `src/ui/rangeStateFiltersEditor.js`. The leaf owns control composition, private labels/bounds, and local summaries; `categoryEditor.js` retains validation, optional description generation, the shared Range/State scheduler, separate Color scheduling, and overall order. Focused coverage passed 197 tests. The local `npm run check` run syntax-checked 72 files, resolved all static relative imports, and passed all 32 test files / 419 tests; `git diff --check origin/main` passed with no output. In-app browser QA passed both densities at 1280px, 840px, and 390px with desktop three-column and narrower stacked grids, live Range/State summary and control behavior, accessible roles/labels, focus continuity, and zero horizontal overflow. A fresh-tab retry for a separate live Maximum commit did not attach, so that edit remains focused-test/source verified. CI and Pages were not run because implementation and publication remain separate.

Testing styles:

- direct unit tests for pure logic,
- source checks for DOM-heavy wiring and architectural guardrails.

Use source checks carefully; avoid brittle exact-format matching when a behavior test is practical.

---

## 17. Known architectural pressure points

### Large category editor

`src/ui/categoryEditor.js` remains the biggest maintainability hotspot, reduced to 404 lines by the Phase 57 matching-rule, Phase 58 Color, and Phase 59 Range/State extractions.

Possible future split:

- `basicEditor.js`
- `rawCategoryEditor.js`

Phase 57 completed the matching-rule split through `src/ui/matchingRulesEditor.js`, Phase 58 completed the Color split through `src/ui/colorEditor.js`, and Phase 59 completed the combined Range/State split through `src/ui/rangeStateFiltersEditor.js`. Future work should preserve all three narrow dependency/callback boundaries rather than moving application orchestration into a leaf. Remaining pressure is concentrated in Basics/generated descriptions, Raw JSON, validation UI, and category structural actions.

### Source-check growth

Phase 56 established three responsibility-owned source suites plus a shared source-reading helper. As source checks accumulate, keep ownership within those suites and periodically review whether:

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
