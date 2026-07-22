# Review History

> **Repository:** `Bahbus/AB_Category_Editor`  
> **Purpose:** Durable record of important review phases, bugs found, accepted fixes, and current validation state.

This file is intentionally concise. It records durable outcomes, not every conversational detail.

---

## Earlier project evolution before Phase 27

The detailed phase-by-phase record available in this project context begins at Phase 27. Earlier exact phase numbers and acceptance criteria are not reliably recoverable from the current conversation history, so this section records only durable foundations that were already established by the time the later review cycle began.

### Core editor foundation

The project had already evolved into a static, no-build JavaScript application for editing AetherBags category configuration data.

Durable foundations included:

- structured category editing,
- category selection and list rendering,
- add/duplicate/delete/move/reorder workflows,
- direct category field editing,
- persistent dirty/save state,
- export controls,
- responsive browser UI.

### Import, export, and Raw JSON

The application already supported multiple ways to move configuration data in and out of the editor:

- JSON import,
- gzip+Base64 import,
- export/copy,
- file download,
- Raw JSON editing.

Later phases hardened these paths rather than inventing them from scratch.

The lasting contract became:

- preserve AetherBags JSON compatibility,
- preserve Raw JSON behavior,
- preserve gzip+Base64 behavior,
- make validation and repair visible without silently discarding user data.

### Configuration shaping and validation

A config-normalization and validation framework had already been established.

It handled concepts such as:

- default category/rule shapes,
- missing/malformed fields,
- numeric Order/Priority validation,
- regex validation,
- range filters,
- state filters,
- rarities,
- category issue counts,
- import repairs and findings.

Later phases focused heavily on reducing duplicate warnings, grouping findings, tightening coercion rules, and making import summaries more accurate.

### XIVAPI lookup and cache system

The app already had an XIVAPI-backed lookup layer for:

- Item names,
- ItemUICategory names,
- batch lookup,
- individual fallback lookup,
- cached names,
- persistent lookup cache,
- manual search.

The later review history mainly hardened correctness around:

- unusable/sentinel names,
- missing rows,
- retry behavior,
- row-ID normalization,
- batch chunk boundaries,
- automatic versus manual status severity,
- busy-overlay behavior.

### Reusable list editing

Reusable list-editor behavior was already present for fields such as:

- Allowed Item IDs,
- Allowed UI Category IDs,
- regex/name patterns.

Later phases expanded this with:

- numeric dedupe,
- grouped duplicate warnings,
- strict typed numeric validation,
- partial duplicate-skip status,
- lookup integration,
- contextual accessibility labels.

### Category editor controls

The category editor already had reusable control patterns for:

- text fields,
- numeric fields,
- switches,
- segmented state controls,
- range sliders,
- color editing,
- rarity selection.

Later work concentrated on:

- avoiding unnecessary full rerenders,
- preserving focus,
- preventing no-op dirty state,
- restoring blank numeric inputs instead of coercing them to zero,
- improving validation feedback.

### Modal and accessibility foundation

The project already used shared modal infrastructure and later refined it substantially.

Durable modal/accessibility behavior now includes:

- focus trapping,
- focus restoration,
- background inertness,
- `aria-hidden`,
- focus-before-inert ordering,
- stale RAF focus guards,
- keyboard-accessible category selection,
- contextual labels for important controls.

### Preferences, themes, and responsive layout

The application had already established appearance and behavior preferences, including theme and density handling.

Later phases improved:

- responsive stacked layout,
- `100vh` fallback plus `100dvh`,
- high-contrast behavior,
- link-button theming,
- help/preferences consistency.

### Generated descriptions and tools

By the later recorded phases, the project also contained:

- generated category descriptions,
- XIVAPI-aware description inputs,
- Regex → Item IDs scanning.

Subsequent reviews focused on correctness and UX around:

- unusable lookup names,
- no-op actions,
- strict row-ID normalization,
- accurate status messages,
- scan cancellation,
- duplicate handling.

### Why the detailed history starts at Phase 27

Phase 27 is the earliest point for which this context currently has a reliable, structured phase-by-phase record.

Earlier work is therefore summarized by durable subsystem and behavior rather than assigned invented phase numbers. If older chat history, Git history, PR descriptions, or task text is later recovered, this section can be backfilled with exact earlier phases.

---

## Phase 27

Validated.

Key outcomes:

- import status/toast severity accounted for material repairs,
- static fallback empty state updated,
- range live edits scheduled,
- accessibility polish added,
- `.link-button` themed,
- modal copy fixed.

---

## Phase 28

Validated with follow-up.

### Phase 28.1

Fixed:

- missing responsive CSS,
- modal focus/inert ordering.

Passed after follow-up.

---

## Phase 29

Validated with follow-up.

### Phase 29.1

Fixed:

- `fetchLookupBatch(...)` sentinel retry failure reporting.

Passed after follow-up.

---

## Phase 30

Validated with follow-up.

### Phase 30.1

Fixed:

- `(unnamed)` and `unnamed` lookup names treated as unusable.

Passed after follow-up.

### Deep-review findings after 30.1

Found:

1. Manual lookup search needed row-ID normalization before display/cache/add.
2. Automatic lookup success needed quiet status when `quiet === true`.
3. Manual lookup search needed a no-usable-results state.
4. `fetchLookupBatch(...)` needed to cache only the current chunk.

These became Phase 31.

---

## Phase 31

Passed.

Implemented:

- manual search normalizes row IDs,
- invalid/non-integer IDs skipped,
- only useful names cached,
- numeric duplicate prevention,
- no-usable-results fallback,
- quiet automatic lookup success,
- lookup batch caches only the current chunk.

---

## Phase 31.1

Introduced grouped duplicate Order/Priority import warnings.

A bug was then discovered where the same grouped warning could appear twice with category names in reversed order.

### Phase 31.2

Passed.

Fixed:

- stable category-name sorting,
- `sortPositionKey`,
- grouped sort-position dedupe in validation merge,
- tests for stable message order and stable key.

---

## Deep review after Phase 31.2

Found:

1. Manual lookup result Add buttons lacked contextual accessibility labels.
2. Typed numeric list add could create duplicates.
3. Duplicate list warnings were repeated and generic.
4. `categoryEditor.js` was becoming a maintainability risk.

These became Phase 32.

---

## Phase 32

Passed.

Implemented:

- contextual `aria-label`/`title` for lookup-result Add buttons,
- reusable list dedupe options:
  - `dedupeValues`
  - `dedupeKey`,
- numeric ID editors opted into numeric dedupe,
- grouped duplicate list warnings,
- category issue counts aligned with grouped warnings,
- supporting tests/source checks.

---

## Deep review after Phase 32

Found:

1. Typed/imported numeric IDs could be negative or malformed.
2. List lookup showed busy UI even when all IDs were cached.
3. `categoryEditor.js` remained a maintainability risk.
4. Source checks were useful but increasingly brittle.

These led to Phase 33.

---

## Phase 33

Mostly passed, but a real acceptance miss required follow-up.

Implemented:

- imported numeric ID warnings,
- typed numeric ID rejection,
- invalid values preserved but warned,
- one invalid issue per affected field,
- lookup busy overlay only after missing IDs exist.

### Bug found

`invalidRowIds(...)` used `Number(value)`, causing JavaScript coercion to accept invalid values such as:

- `null`,
- `''`,
- whitespace-only strings,
- `false`,
- `true`.

This required Phase 33.1.

---

## Phase 33.1

Passed.

Implemented strict imported row-ID validation.

Accepted:

- non-negative integer numbers,
- digit-only strings.

Rejected:

- nullish values,
- booleans,
- objects,
- arrays,
- negatives,
- decimals,
- malformed strings.

Invalid imported values remained preserved and warning-only.

---

## Deep review after Phase 33.1

Important findings included:

1. Referenced-ID lookup still used loose numeric coercion.
2. Regex → Item IDs also loosely converted row IDs.
3. List lookup could call `hideBusy()` without showing busy.
4. Number inputs could dirty unchanged values on blur.
5. Range number blur could also commit unchanged values.
6. `categoryEditor.js` remained a maintainability hotspot.

These became Phase 34.

---

## Phase 34

Passed with no follow-up.

Implemented:

- shared strict row-ID helper module,
- validation uses shared helpers,
- lookup normalization uses strict helpers,
- referenced-ID collection ignores invalid preserved values,
- regex scanner uses strict row-ID normalization,
- manual lookup search uses shared row-ID normalization,
- list lookup tracks whether busy UI was shown,
- unchanged number blur no longer dirties,
- unchanged range number blur no longer dirties,
- direct row-ID and lookup-collection tests added.

---

## Deep review after Phase 34

Found:

1. Regex → Item IDs could mark dirty and report `Added 0 item ID(s).` when no change occurred.
2. Blank number blur still became `0` through `Number('')`.
3. Blank range blur also became `0`.
4. `extractSheetRowsById(...)` could trust an invalid explicit row ID over a valid fallback key.
5. Typed list add silently skipped partial duplicates.
6. `categoryEditor.js` remained a future maintainability risk.

These became Phase 35.

---

## Phase 35

Functionally passed.

Implemented:

- Regex → Item IDs no-op path no longer marks dirty,
- no more `Added 0 item ID(s).`,
- accurate regex add/remove/combined status,
- blank Order/Priority blur restores previous value,
- blank range Min/Max blur restores previous value,
- strict explicit/fallback row-ID normalization in row extraction,
- partial duplicate-skip status for typed list add,
- strict row-extraction regression test.

### Validation result

Runtime implementation looked correct, but required source-check coverage was incomplete.

That required Phase 35.1.

---

## Phase 35.1

Validated and passed.

Coverage confirmed:

1. Regex → Item IDs no-change path.
2. Blank `numberInput(...)` blur restore.
3. Blank range-number blur restore.
4. Partial duplicate-skip status.

Runtime behavior remained unchanged.

---

## Phase 36

Validated and passed.

Implemented:

- malformed Color values are repaired as material import repairs,
- RGB blur restores the committed value and only dirties actual component changes,
- category add/duplicate sort values and numeric-ID dedupe use the established strict helpers,
- automatic lookup and export release only busy UI they showed.

---

## Deep review after Phase 36

Found a data-safety bug in selected-category Raw JSON: it assigned parsed `null`, arrays, or scalars into live categories before `ensureShape(...)` could reject or repair them. Arrays could also acquire named repair properties that JSON export omits.

This became Phase 37.

---

## Phase 37

Validated and passed.

Implemented atomic selected-category Raw JSON application:

- parsed and shape-normalized the candidate before replacing live state,
- rejected `null`, arrays, and scalar category entries,
- preserved the current selected category and dirty state on parse or shape failure.

## Deep review after Phase 37

Found:

1. Persisted lookup-cache JSON could be syntactically valid but structurally unsafe, allowing `null`, arrays, scalars, malformed buckets, and non-string entries to reach app consumers.
2. Reversed or non-finite range-number inputs had visible validation and `aria-invalid`, but no `aria-describedby` link to the reason.
3. Durable project context still listed Phase 37 as upcoming rather than recording its result and the next review work.

These became Phase 38.

---

# Cross-phase durable invariants

The following behaviors were repeatedly established and should be treated as project contracts.

## Import/export

- Preserve AetherBags JSON compatibility.
- Preserve Raw JSON editing.
- Preserve gzip+Base64 import/export.
- Preserve import-repair reporting.

## Numeric row IDs

- Shared strict semantics in `src/rowIds.js`.
- Invalid imported IDs warn but remain preserved.
- Typed invalid IDs are rejected.
- Invalid preserved IDs are excluded from lookup.
- Validation and all lookup/scanning paths must agree.

## Duplicate warnings

- Group sort-position duplicates.
- Use stable grouped keys.
- Group duplicate list warnings per field.
- Keep invalid and duplicate issues separate when both apply.

## Lookup

- Use `isUsefulLookupName(...)`.
- Retry unresolved/sentinel names.
- Cache only current chunk rows.
- Keep automatic success/failure statuses quiet.
- Keep manual lookup visibly informative.
- Do not hide shared busy state unless the operation showed it.

## Dirty state

- Do not mark dirty for no-op actions.
- Unchanged blur does not dirty.
- Blank number/range blur restores prior value.
- Before unload commits active editable fields.

## Accessibility/modals

- Contextual button labels.
- Keyboard-selectable category list.
- Modal focus trap.
- Focus-before-inert ordering.
- App inert/`aria-hidden` only while modal active.
- RAF/version guard for deferred modal focus.
- Preserve focus restoration.

## Responsive UI

- Keep responsive stacked layout.
- Keep `100vh` fallback plus `100dvh`.
- Keep theme and density behavior.

---

# Deferred or future work

## Localization

Phase 67 established the DOM-free English localization mechanics and migrated the complete Preferences modal. Phase 68 additionally migrated the complete About / Help and Lookup Cache modal surfaces. Phase 69 completed the safe reorderable rich-message prerequisite for semantically marked-up Help prose. Phase 70 migrated the persistent document/brand, sidebar, and topbar application chrome. One application-owned fixed-English translator is injected into the persistent chrome and all three modal entrypoints; catalogs remain frozen plain strings, translated template values are escaped, and runtime statuses use plain-text sinks.

No locale preference, second locale, pluralization layer, broad validation/status extraction, or generated-description localization exists yet.

Recommended future sequence:

1. Extract broader UI/status and remaining message families in explicitly scoped, bounded phases.
2. Add persisted language preference and fallback UI through application state/orchestration.
3. Add locale key-parity tests with the second locale.
4. Treat generated descriptions separately with language-aware templates.

## Category editor modularization

`src/ui/categoryEditor.js` is the largest maintainability concern.

Refactor only when feature work justifies the split.

Potential future modules:

- `basicEditor.js`
- `colorEditor.js`
- `ruleListEditors.js`
- `rangeFiltersEditor.js`
- `stateFiltersEditor.js`
- `rawCategoryEditor.js`

## Testing strategy

Continue favoring:

- direct tests for pure logic,
- source checks for wiring that is impractical to exercise without adding unnecessary DOM infrastructure.

Periodically prune brittle source checks.

---

## Phase 38

Implemented, merged, and validated.

Fixed:

- malformed persisted lookup-cache data is normalized before application use,
- the runtime cache retains the exact `Item` and `ItemUICategory` buckets,
- range Min/Max validation is associated with both inputs through `aria-describedby`.

The post-merge `npm run check` run passed all 19 test files.

## Phase 39

Implemented, merged at `8d22220e8d067848f446be2524b0736b83677d41`, and validated.

Finding:

- asynchronous referenced-ID lookup, per-list lookup, and regex scanning could retain an old cache object while cache clearing replaced the application cache, allowing fetched names and success reporting to diverge from persisted/rendered state.

Resolution:

- application-owned coordination tracks overlapping cache producers with idempotent release leases,
- all three producers release in `finally` on success, failure, and cancellation paths,
- the Lookup Cache modal disables and explains clearing while work is active,
- the clear callback re-checks active state and reports refusal rather than silently ignoring it,
- clearing after release retains the existing non-dirty, category-preserving contract.

Validation actually run:

- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 20 test files.

## Deep review after Phase 39

Confirmed four false-change paths: Sort by Order always dirtied and reset selection; Renumber always dirtied already-correct numeric positions; selected-category Raw JSON always replaced and dirtied an identical normalized category; and full Raw JSON could confirm, replace, reset selection, dirty, and auto-lookup an identical normalized config. These became Phase 40.

## Phase 40

Implemented, merged at `478545235debae9a1dc064b972acc2181cd5a0e1`, and post-merge validated.

Resolution:

- added direct, DOM-free helpers for JSON-semantic equality and change decisions,
- Sort by Order detects identity-order changes and preserves the selected object across reordering,
- manual Renumber changes only non-matching `Order`/`Priority` JSON values and preserves numeric one-based output,
- both Raw JSON paths retain live data and dirty state for identical normalized candidates,
- full Raw JSON no-ops bypass confirmation, replacement, selection reset, and automatic lookup,
- changed candidates retain established behavior, and parse/shape failures remain atomic.

Validation actually run:

- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 21 test files.
- `git diff --check` passed.
- The post-merge review reran `npm run check`: syntax and import checks passed and all 21 test files passed.
- The post-merge `git diff --check origin/main` passed.
- Browser QA was not run during the post-merge review.

## Post-Phase-40 review and Phase 40.1

Confirmed regression:

- full Raw JSON computed `validationSummaryText(getCategories().length, ...)` before applying a changed candidate, so adding or removing categories reported the old live count even though replacement succeeded,
- the Phase 40 identical no-op path remained correct.

Phase 40.1 resolution, merged at `beda975e087bd012f33270b7f1574c6822340bda`:

- summary construction uses the final validated, repaired, normalized, and sorted candidate,
- changed and identical no-op branches reuse the same candidate-derived summary,
- live data remains untouched until changed-candidate confirmation succeeds,
- direct tests cover added, removed, and identical candidate counts, with a focused source check for the DOM-bound wiring.

Validation actually run:

- the post-merge `npm run check` passed: JavaScript syntax check, static relative-import check, and all 21 test files (272 tests),
- `git diff --check origin/main` passed, and the reviewed tree exactly matched merged `origin/main`,
- desktop-keyring GitHub authentication was verified for the review fetch,
- browser QA and CI were not run.

## Post-Phase-40.1 review and Phase 41

Confirmed defects:

- category `dragover` enabled drop targets before validating an application-owned drag,
- category `drop` trusted external `text/plain`, allowing empty text to coerce to index zero and numeric text to act as an internal source,
- adjacent before/after placements could reproduce the same object-identity order but still renumber, select, dirty, and rerender.

Phase 41 resolution, merged at `2926dc35dbda24fa07beb5b92477feeea47ea23f`:

- DOM-free reorder helpers require finite in-range integer indices, compute candidate order without mutating live data, and compare object identity order,
- live category order changes only for a real reorder, with the moved object retained as selected,
- side effects occur exactly once after a real change and preserve optional automatic renumbering,
- category event wiring accepts only valid application-owned drag state and never reads `text/plain` as category identity,
- invalid/no-op drops have no selection, renumber, dirty, or structural-render effects, and successful drop/drag end clear transient state.

Validation actually run:

- the post-merge `npm run check` passed: JavaScript syntax check, static relative-import check, and all 21 test files (279 tests),
- `git diff --check origin/main` passed, and the reviewed tree exactly matched merged `origin/main`,
- desktop-keyring GitHub authentication was verified for the review fetch,
- browser QA and CI were not run.

## Post-Phase-41 review and Phase 42

Confirmed defects:

- unchanged Hex RGBA blur parsed the quantized displayed bytes back into higher-precision imported components, dirtied, and rerendered,
- a real Hex edit could commit once on `change` and again on `blur`,
- native RGB and alpha same-display events could likewise quantize model data and falsely dirty,
- replacing an identical deterministic generated description assigned and dispatched input despite no JSON-value change.

Phase 42 resolution, merged at `ab8997ae53b1136fab56b445fa3c811cf0bd25a9`:

- DOM-free color helpers canonicalize Hex RGBA to uppercase `#RRGGBBAA` and return explicit invalid, valid-no-change, or valid-changed decisions,
- picker and alpha decisions compare against the current displayed RGB and byte snapshots instead of round-tripping model precision,
- every real color change synchronizes controls and refreshes all committed snapshots, so Hex `change` followed by `blur` commits once,
- invalid Hex text retains validity reporting without mutation or dirty work,
- a DOM-free generated-description helper uses strict value equality and invokes its callback exactly once only for a real change,
- Generate bypasses replacement confirmation when current and generated text match, while Replace independently guards stale identical results,
- automatic generation keeps its blank/useful guards and returns the actual change result; manual blank generation keeps established fallback behavior,
- direct helper regression tests and focused DOM-wiring checks cover these boundaries.

Validation actually run:

- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 21 test files (286 tests),
- `git diff --check` passed,
- browser QA and CI were not run.

## Post-Phase-42 review and Phase 43

Confirmed defects:

- plain Color component normalization mutated the same snapshotted object and therefore produced no repair record,
- Order/Priority validation, duplicate grouping, sorting, and next-sort calculations accepted coercion-only values through `Number(value)`,
- manual XIVAPI search did not participate in cache-producer coordination while it awaited and then wrote cache results,
- range number live input and sliders notified on same-value events,
- export awaited automatic clipboard copy before marking the generated snapshot saved, allowing an older completion to clear dirty state after a newer edit.

Phase 43 resolution, merged at `1790f13b9ed26b23de4cabea3fe9387a11990936`:

- plain Color objects are snapshotted by value and component normalization emits one material warning without quantizing valid numeric components; malformed whole values keep distinct messaging,
- a shared strict optional-number helper accepts finite numbers and non-empty finite numeric strings, rejects coercion-only values, and is used consistently by validation, duplicate grouping, import sorting, next-sort calculation, and category duplication,
- manual searches acquire the application-owned producer lease before the network await and release exactly once in `finally` across success, empty, unusable, and error exits,
- directly tested range decisions and application wiring make same-value number and slider events no-ops, real changes notify once, and the following blur remains a no-op,
- the generated export snapshot is marked saved after the modal opens and before automatic clipboard work is awaited,
- unused local summary imports were removed without changing public re-exports.

Validation actually run:

- focused regression tests passed: 138 tests across the touched configuration, validation, range-control, optional-number, and source-check files,
- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 22 test files (298 tests),
- `git diff --check` passed,
- browser QA and CI were not run.

## Post-Phase-43 review and Phase 44

Confirmed defects:

- Export/Copy and Download synchronously snapshotted JSON before asynchronous gzip work but unconditionally marked the document saved after compression, so intervening edits could remain absent from the generated snapshot while losing dirty-state protection,
- Order/Priority controls seeded their committed fallback with `Number(value) || 0`, so blank or otherwise non-committing blur after an invalid import could validate synthetic zero while preserving the invalid value in the model and export.

Phase 44 resolution, merged at `888a5838a062ea34ec279d7a423edbd88d45e66e`:

- every real dirty transition advances a monotonic application data revision, including additional edits while already dirty,
- shared DOM-free export helpers capture the revision immediately before snapshot generation and authorize save state only when the completion still matches the current revision,
- Export/Copy and Download retain dirty state and show non-error stale-snapshot status when newer edits remain unexported; overlapping and out-of-order completions cannot save a newer revision incorrectly,
- Export/Copy still opens the modal before saving a current snapshot and before awaiting automatic clipboard work; clipboard completion remains outside save-state authority,
- number-control commit state retains the original committed JSON value, its strict `optionalFiniteNumber(...)` interpretation, and whether the displayed input deliberately diverged,
- accepted numeric values and strings remain numeric no-ops without model rewriting, while invalid nullish, blank, boolean, array, object, and nonnumeric values stay untouched and invalid on blank or non-committing blur,
- one deliberate finite correction replaces an invalid value, refreshes validation, dirties once, and makes the following blur a no-op.

Validation actually run:

- focused snapshot, form-control, and source-wiring regressions passed: 77 tests,
- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 23 test files (307 tests),
- `git diff --check` passed,
- browser QA and CI were not run.

## Post-Phase-44 acceptance and Phase 44.1

Confirmed defects:

- normal JSON, gzip+Base64, file, and preset imports replaced the validated live config and marked it saved without advancing `dataRevision`, so an export started from the previous config could still pass the snapshot-current check and suppress stale reporting while `dirty === false`,
- accepted finite numeric strings such as `"  +7  "` and `"0x10"` could be sanitized to a blank native number-input value even though the model and `optionalFiniteNumber(...)` validation retained accepted nonblank data,
- Export/Copy generation could finish after another modal opened and replace that modal through `openModal(...)`; overwriting `activeCloseHandler` could leave an awaiting confirmation promise unresolved.

Phase 44.1 resolution, merged at `80c1e2e8f0194420a06cbde1b3feeb19bbbceaee`:

- one centralized revision advancement function is used by both real dirty mutations and real validated-config replacement,
- the replacement boundary compares JSON semantics, assigns and advances only for a changed config, and is shared by normal import, file import, preset import, and changed full Raw JSON,
- saved normal imports and presets invalidate all earlier snapshots, while cancelled, failed, and semantic no-op replacements do not advance snapshot identity,
- snapshot completion decisions depend only on captured/current revision identity; stale callbacks run for dirty and saved-current states, never call the saved transition, and report the correct reason,
- Export/Copy determines revision currency before presenting the result, so a stale modal never calls its snapshot `Current`,
- shared `isModalOpen()` reports backdrop visibility; a late Export/Copy completion releases only its busy operation, then refuses to replace a newer active dialog before result creation, modal opening, save-state work, or automatic clipboard work,
- number-input display normalization keeps any nonblank browser-accepted representation and otherwise shows the canonical finite interpretation of an accepted JSON value,
- normalized focus/blur remains a no-op that preserves accepted string spelling and validates the original JSON value; invalid values remain preserved and invalid, and one deliberate finite correction commits once.

Validation actually run:

- focused application syntax and regression verification passed 107 tests across category-change, export-snapshot, number-control, modal, and source-wiring coverage,
- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 24 test files (317 tests),
- `git diff --check` passed,
- focused in-app browser QA was attempted twice, but the browser connection was unavailable; no substitute browser mechanism was used,
- CI was not run.

## Post-Phase-44.1 review and Phase 45

The post-merge review found no application-runtime follow-up. It confirmed verification and CI drift:

- `npm run check` syntax-checked only `src/app.js`, so it did not parse every DOM-only production module that source checks read as text,
- two push/pull-request workflows repeated syntax, import, and full-test commands,
- only one of the workflows explicitly pinned Node 22.

Phase 45 resolution on `agent/phase-45-unified-verification-ci`:

- added a dependency-free Node syntax checker that resolves the repository root from its script location,
- regular `.js` and `.mjs` files are discovered recursively in deterministic relative-path order, including untracked files,
- `.git`, `node_modules`, non-JavaScript files, and symlink traversal are excluded,
- every discovered file is checked by the current Node executable; any failed invocation produces a failed result and nonzero direct-invocation exit without printing the success summary,
- `npm run check` now runs the exhaustive checker, existing relative-import checker, and complete Node test suite; `npm test` remains unchanged,
- direct temporary-fixture tests cover nested discovery, ordering, every required exclusion, and real valid/invalid checker outcomes,
- the duplicate workflows were replaced with one push/pull-request `Project verification` workflow that grants `contents: read`, uses checkout v4 and setup-node v4, pins Node 22, and invokes only `npm run check`,
- no application-runtime source, dependencies, package lock, build system, or generated output changed.

Validation actually run:

- focused syntax-checker tests passed: 2 tests,
- `npm run check` passed: 56 JavaScript files syntax-checked, all static relative imports resolved, and all 25 test files / 319 tests passed,
- `git diff --check` passed,
- workflow inspection confirmed a single workflow with one `npm run check` invocation on Node 22,
- phase diff inspection confirmed only verification tooling, workflow, tests, package metadata, and durable documentation changed,
- CI and browser QA were not run.

## Phase 46

Phase 46 integrates the existing Regex → Item IDs launch action into Allowed Item Name Patterns without changing the converter workflow:

- the standalone full-width converter card and obsolete explanatory markup are removed,
- `categoryEditor.js` retains the patterns list editor as `patternsCard` and appends a dedicated `type="button"` action to its existing input/Add row,
- the four rule cards retain their established order and the existing two-column/mobile single-column grid,
- the action directly invokes `openRegexToItemIdsTool` and remains available for an empty saved-pattern list,
- `.pattern-converter-action` supplies right alignment plus bounded text wrapping without changing shared button or pill density,
- `listEditor(...)` remains unchanged,
- focused source checks cover composition, explicit type and label, dependency wiring, CSS, standalone-card removal, and independent stable extraction of UI-ID, Item-ID, and pattern calls while preserving the no-row-ID-dedupe assertion for patterns.

Validation actually run:

- focused source checks passed: 59 tests,
- `npm run check` passed: 56 JavaScript files syntax-checked, all static relative imports resolved, and all 25 test files / 320 tests passed,
- `git diff --check origin/main` passed,
- final diff inspection confirmed changes are limited to category-editor composition, one semantic CSS rule, focused source coverage, and durable documentation,
- in-app browser QA was attempted, but the browser transport closed before connection; wide desktop, the 840px stack boundary, and narrow phone runtime checks were unavailable,
- CI was not run.

Phase 46 was merged at `26dd5564830ec7d5f6209d7a37077e4836a25a47` through PR #82.

## Post-Phase-46 review and Phase 47

The post-merge review confirmed one structured-entry integrity defect:

- the reusable list editor unconditionally split typed input on commas, which retained the intended numeric ID batch behavior but corrupted valid Allowed Item Name Patterns such as `^A{1,3}$` and `^Foo, Bar$`.

Phase 47 resolution on `agent/phase-47-pattern-entry-integrity`:

- exported DOM-free `tokenizeListInput(...)` trims outer whitespace and defaults to comma-separated tokenization,
- a narrow `splitInputOnCommas` option lets one editor preserve the complete trimmed input as a single token while keeping the established default enabled,
- a reusable `inputPlaceholder` option defaults to `Add one value, or comma-separated values`,
- Allowed Item Name Patterns disables comma splitting and uses `Add one regex/name pattern`,
- Allowed UI Category IDs and Allowed Item IDs retain the default comma-separated batch contract and placeholder,
- the existing validation-before-mutation flow keeps invalid pattern submission atomic and leaves the typed value available for correction,
- converter placement, explicit button type, label, right alignment, callback wiring, standalone-card absence, and the no-numeric-row-ID-dedupe rule for patterns remain covered.

Validation actually run:

- focused list-editor behavior and source checks passed: 64 tests,
- `npm run check` passed: 57 JavaScript files syntax-checked, all static relative imports resolved, and all 26 test files / 325 tests passed,
- `git diff --check origin/main` passed,
- final diff inspection confirmed changes are limited to list tokenization and placeholder options, pattern-editor configuration, focused tests, and durable documentation,
- in-app browser QA was attempted, but the browser transport closed during connection; wide desktop, the 840px stacking boundary, narrow phone, and interactive comma-bearing pattern checks were unavailable,
- CI was not run.

Phase 47 merged through PR #83 at `8340c9f8417865242a0bf1faba7b3dd156614cc5`. Phase 48 startup verified freshly fetched `origin/main` at that exact commit.

Post-Phase-47 review evidence:

- `npm run check` passed with 57 JavaScript files checked, 26 test files, and 325 tests,
- exact tree/diff verification passed,
- GitHub CI and GitHub Pages were verified successful,
- deployed `listEditor.js` matched the merged source,
- browser QA was unavailable because the browser transport closed.

## Phase 48

The pinned AetherBags commit `368bd4677b16594d9d4624efc8269ada7408d4f5` confirms:

- `CategoryRuleSet.AllowedItemNamePatterns` is `List<string>`,
- `UserCategoryMatcher` skips null, empty, and whitespace-only patterns while a nonempty list still participates in identification filtering,
- `RegexCache` uses `RegexOptions.CultureInvariant | RegexOptions.IgnoreCase`, adds `Compiled` when requested, and returns `null` when .NET compilation fails.

Resolution on `agent/phase-48-aetherbags-pattern-semantics`:

- stored configuration validation no longer treats JavaScript compilation as AetherBags authority,
- all nonblank strings, including .NET-only `(?>a)`, remain valid structured entries,
- non-string, empty, and whitespace-only imported elements receive one indexed error each without coercion, deletion, mutation, or duplicate invalid-element findings,
- a shared DOM-free module classifies stored values, selects usable saved converter options, compiles fixed case-insensitive JavaScript approximations, and removes by original source index,
- the converter flags field is removed and UI copy distinguishes AetherBags/.NET behavior from JavaScript compatibility,
- blank and JavaScript-incompatible input returns before scan state, lookup-cache leases, busy UI, fetches, or configuration mutation,
- saved choices omit structurally unusable elements with clear correction guidance while retaining custom regex entry and safe original-index removal,
- scanning, pagination, cancellation, cache leases, matched-ID addition, no-op/dirty behavior, modal placement, and Phase 47 tokenization remain unchanged except for the deliberate dialect, flags, blank, and choice-filter changes.

Validation actually run:

- focused behavior and source coverage passed all 119 tests across the touched suites,
- `npm run check` passed: 59 JavaScript files syntax-checked, all static relative imports resolved, and all 27 test files / 336 tests passed,
- `git diff --check origin/main` passed with no output,
- complete diff inspection found no accidental dependency, import/export, dirty-state, modal/focus, responsive, or unrelated architecture changes,
- Phase 48 merged through PR #84 at `4aa67ed97b89f35e0bf468628536d2993819b182`; its branch tree exactly matched merged `origin/main`,
- desktop-keyring GitHub authentication was verified; PR checks, post-merge Project verification, and GitHub Pages succeeded,
- deployed `patternSemantics.js` and `regexToItemIds.js` exactly matched merged local source,
- browser QA succeeded for storing `(?>a)`, early JavaScript-incompatibility handling, blank custom rejection, and overflow-free desktop, 840px, and 390px layouts,
- Phase 48 required no 48.1.

## Post-Phase-48 review and Phase 49

The post-merge review confirmed a separate range/state scalar integrity defect, not a Phase 48 acceptance miss:

- range and state repair used broad `Number(...)`/truthiness coercion,
- range validation accepted fractional integer-backed values and negative/fractional Vendor Price,
- State Filter accepted fractional values,
- Vendor Price number input committed values such as `1.5` and `-1` despite the upstream `uint` contract, with misleading slider and accessibility state.

Phase 49 resolution on `agent/phase-49-range-state-scalar-integrity`:

- `src/filterScalars.js` defines shared DOM-free boolean, integer, uint-compatible range, State 0/1/2, and integer Filter classification,
- validation reports incompatible Enabled, Min, Max, State, and Filter components without accepting numeric strings, blanks, booleans, nullish values, arrays, objects, fractions, or non-finite values,
- import repair independently restores invalid range components to their filter defaults and invalid state components to zero, while preserving valid signed Level/Item Level integers and unusual integer Filter values,
- validation finding merge moved to the DOM-free validation module and retains stable dedupe without collapsing distinct scalar findings,
- typed range decisions reject fractions and enforce Vendor Price `uint` bounds without mutation or notification; invalid live input exposes associated validation and blur restores committed text and slider state,
- valid integer input and sliders retain exact one-change/no-op behavior, reversed integer ranges retain the existing warning, and State rendering no longer mutates Filter.

Validation actually run:

- focused scalar, configuration, validation, form-control, and source coverage passed 162 tests,
- `npm run check` passed: 61 JavaScript files syntax-checked, all static relative imports resolved, and all 28 test files / 347 tests passed,
- `git diff --check origin/main` passed with no output,
- in-app browser QA was attempted twice, but the browser transport closed before connection; desktop, 840px, phone, and interactive runtime checks were unavailable,
- CI and GitHub Pages were not run because publication is outside Phase 49.

## Post-Phase-49 review and Phase 49.1

Confirmed acceptance misses:

- the shared finite-integer classifier accepted values outside C# `int`, so Level, Item Level, and State Filter could retain or produce values AetherBags cannot deserialize,
- one invalid live Vendor Price component used an incomplete non-negative message and marked both number inputs invalid,
- merge dedupe used category ID as identity, collapsing separate findings for distinct categories with duplicate or absent IDs.

Phase 49.1 resolution on `agent/phase-49-1-int32-scalar-findings`:

- explicit signed Int32 bounds and a DOM-free classifier govern Level, Item Level, State, and State Filter while Vendor Price retains exact uint bounds,
- validation, repair, typed range decisions, slider bounds, and HTML number constraints share the appropriate width limits,
- invalid stored components repair independently to established defaults without coercion, and exact signed/unsigned boundary values remain unchanged,
- DOM-free range validity state produces component- and bound-specific messages; live invalid input remains a model/slider/callback/dirty no-op and blur restores committed state,
- component-specific errors apply `aria-invalid` and `aria-describedby` only to the affected input, while reversed valid ranges retain the established shared warning,
- category findings carry private object identity through analysis and merge, preserving duplicate/blank/missing-ID category instances while repeated same-category findings and grouped SortPosition warnings retain stable dedupe,
- no internal identity data is enumerable, serialized into configuration, or shown to users.

Validation actually run:

- focused scalar, configuration, validation, form-control, and source coverage passed 167 tests,
- `npm run check` passed: 61 JavaScript files syntax-checked, all static relative imports resolved, and all 28 test files / 352 tests passed,
- `git diff --check origin/main` passed with no output,
- complete diff inspection found no dependency, import/export data-shape, dirty-state, modal/focus, lookup, responsive CSS, or unrelated architecture changes,
- in-app browser QA was attempted twice, but the browser transport closed before initialization; desktop, 840px, phone, and interactive boundary/accessibility checks were unavailable,
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 50

Phase 50 establishes an explicit AetherBags export-compatibility boundary against upstream commit `368bd4677b16594d9d4624efc8269ada7408d4f5`, verified as current `master`/HEAD during implementation.

Resolution on `agent/phase-50-aetherbags-export-compatibility`:

- added a DOM-free full-envelope analyzer for `CategoryExportData`, `UserCategoryDefinition`, `CategoryRuleSet`, `Vector4`, Item Sort Criteria, uint lists, range/state scalars, and optional `ForkedFromKey`, while preserving unknown properties,
- attached stable category identity/labels and severity/blocking counts so import review, category badges, and export preflight share compatibility logic,
- classified confirmed envelope/default-`System.Text.Json` failures as blocking and predictable AetherBags normalization/discard behavior as reviewable, exportable warnings,
- routed Export / Copy and Download through one preflight before busy UI and compression; blocking results perform no gzip, copy, download, revision/snapshot, dirty-clear, or saved-state work and show an accessible corrective summary,
- constrained Order/Priority validation and commits to signed Int32 JSON numbers, preserved incompatible imported/transient text, retained blank/Enter/same-value no-op behavior, and supported explicit numeric-string correction,
- constrained typed Allowed Item/UI Category IDs to exact uint values with atomic comma-batch rejection and no unsafe rounding, while preserving tolerant in-range legacy lookup display,
- prevented category creation/duplication from overflowing Int32 sort positions,
- repaired non-finite and single-overflow Color components before JSON serialization could silently convert them to `null`, with a material category repair,
- made rarity type-changing coercions material while retaining genuine supported-number reorder-only normalization as non-material,
- retained Phase 48 pattern semantics, Phase 49/49.1 scalar widths and category identity, import/Raw JSON no-op behavior, dirty/revision snapshots, modal/focus, lookup-cache coordination, responsive CSS, and the dependency-free architecture.

Validation actually run:

- focused compatibility/config/row-ID/form/validation/source coverage passed,
- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 370 tests passed,
- `git diff --check origin/main` passed with no output,
- upstream AetherBags `master` and the relevant source types/options were inspected at `368bd4677b16594d9d4624efc8269ada7408d4f5`,
- in-app browser QA was attempted twice, but the browser transport closed during initialization; valid export, blocked invalid Order/row ID, Color repair summary, keyboard/focus, and desktop/840px/phone runtime checks were unavailable,
- CI and GitHub Pages were not run because publication remains separate.

Deferred work remains import/decompression size limits, browser-regex worker/time isolation, CSP/theme-bootstrap and Actions SHA hardening, a browser DOM/E2E harness, and broader pill-list/lookup UI redesign.

## Phase 50.1

Post-merge review confirmed two Phase 50 analyzer gaps:

- unknown nested non-finite numbers could pass compatibility analysis and then be silently serialized as `null`, losing preserved imported data,
- missing/defaulted or ignored-but-correctly-typed envelope values were described as unreadable even though the pinned AetherBags importer supplies defaults and only requires a non-empty Categories list.

Resolution on `agent/phase-50-1-export-fidelity-compatibility`:

- added a DOM-free, non-mutating, iterative, cycle-safe JSON serialization-fidelity traversal across every enumerable root, category, rule, object, and array value,
- blocking fidelity findings carry exact JSON paths and cover non-finite numbers plus controlled unserializable shapes before `JSON.stringify`, compression, export callbacks, or saved-state work,
- finite unknown root/category/rule values remain preserved and survive a JSON round trip unchanged,
- missing Format/Version and upstream-defaulted omitted category/rule/nested members are warnings rather than unreadable blockers,
- unexpected string Format, null Format, and signed-Int32 Version values are warnings because the current importer assigns and ignores them, while JSON types `System.Text.Json` cannot assign remain blocking,
- explicit null and malformed category/rule members retain blocking treatment except where the full current path proves null safe,
- the editor's generated export format/version and complete default category shape remain unchanged,
- one shared Export / Copy and Download callback boundary remains in place, with blocking fidelity findings occurring before busy UI, compression, clipboard/download output, snapshot completion, or saved-state changes,
- compatibility-modal copy now separates unsafe serialization/read failures from values AetherBags safely defaults or ignores, and long titles/JSON paths wrap inside narrow viewports.

Validation actually run:

- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 375 tests passed,
- `git diff --check origin/main` passed with no output,
- upstream AetherBags `master` and the relevant defaults/import/use paths were verified at `368bd4677b16594d9d4624efc8269ada7408d4f5`,
- in-app browser QA imported nested unknown `1e400`, confirmed Export / Copy and Download both blocked at `$.Categories[0].UnknownNested.overflow` before busy/output work, preserved saved/dirty state, confirmed modal inert/focus/return behavior, and passed desktop, 840px, and 390px overflow checks,
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 50.2

Post-Phase-50.1 review confirmed three remaining serialization-fidelity defects:

- valid JSON negative zero passed traversal and was normalized to `0` by export serialization,
- JSON-semantic equality collapsed `-0` and `0`, allowing Raw JSON sign-only changes to be discarded as false no-ops,
- a non-enumerable own `toJSON` accessor escaped descriptor classification and could be invoked by final serialization.

Resolution on `agent/phase-50-2-serialization-fidelity-completion`:

- JSON-semantic equality now distinguishes negative and ordinary zero without changing established behavior for other JSON values,
- the shared iterative traversal blocks negative zero at exact root, category, rule, object-member, and array-member paths before either export callback,
- every own `toJSON` descriptor is inspected regardless of enumerability; function-valued data properties and accessors are path-specific blockers,
- accessor descriptors are classified without reading them, so getter, setter, serializer, and export-callback counts remain zero on blocked preflight,
- ordinary finite zero and unrelated non-enumerable members retain their prior allowed/ignored behavior,
- both Export / Copy and Download retain the same shared preflight and all Phase 50/50.1 classifications and UI/state contracts.

Validation actually run:

- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 381 tests passed,
- `git diff --check origin/main` passed with no output,
- in-app browser QA applied valid Raw JSON containing `$.Phase502Nested.negativeZero`, confirmed Export / Copy and Download both blocked with that readable path while dirty state remained `Changes not exported`, observed no download event, verified focus return and modal inert/ARIA restoration, and found no horizontal overflow at 1280px, 840px, or 390px widths,
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 51

The post-Phase-50.2 review confirmed an item-ordering finding-actionability defect:

- all 24 basic-preset categories omit both `ItemSortCriteria` and `CustomItemOrder`, but the shared analyzer described both harmless upstream defaults as warnings, producing 48 warnings, an import-review modal, and two issue badges per category.

Resolution on `agent/phase-51-actionable-item-ordering-findings`:

- omitted or explicitly empty Item Sort Criteria is silent because upstream normalization deterministically produces Use Global / Ascending,
- omitted or empty Custom Item Order is silent unless normalized criteria includes Custom Order,
- normalized Custom Order with no list produces one stable category-scoped warning because custom ranks cannot be applied; a sole Custom Order criterion falls back to non-global default ordering,
- Use Global anywhere in supplied criteria overrides Custom Order before the cross-field decision, matching upstream normalization order,
- supplied unsupported criteria, duplicate fields/item IDs, mixed Use Global criteria, missing criterion members, and other meaningful rewrites remain reviewable,
- malformed criteria/list containers, malformed criterion entries, incompatible Field/Direction types or widths, and incompatible custom item IDs remain blocking,
- the analyzer remains non-mutating and never inserts ordering properties, changes imported/exported shape, marks dirty, or changes saved-state behavior,
- normal-parser coverage keeps the basic preset at 24 categories with omitted fields, no ordering findings, no ordering issue badges, and no ordering-driven modal; the advanced preset retains exactly three unrelated duplicate sort-position warnings.

Validation actually run:

- upstream AetherBags `master` was reconfirmed at `368bd4677b16594d9d4624efc8269ada7408d4f5`, including import, normalization, ordering UI, and runtime sorting paths,
- focused compatibility/import coverage passed all 24 tests,
- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 386 tests passed,
- `git diff --check origin/main` passed with no output,
- in-app browser QA loaded the 24-category basic preset without a review modal or issue badges, completed Export/Copy and Download, showed one actionable Custom Order warning, preserved modal focus/inert/ARIA/return behavior, and had no horizontal overflow at desktop, 840px, or 390px,
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 52

Resolution on `agent/phase-52-item-ordering-controls`:

- added one DOM-free item-ordering model for metadata, upstream normalization/effective behavior, Custom Order activation, summaries, repairs, and strict change/no-op decisions;
- refactored export compatibility to use that model without changing Phase 50-51 severity or blocking classifications, while clarifying the sole-empty-Custom fallback as Quantity / Descending;
- added the collapsed Item Ordering details card in the required category-level position with accessible criterion controls, unused-field adds, stable priority ordering, explicit normalization rewrite, and Raw JSON correction actions;
- made Custom Item Order an ordered, movable, Item-lookup/search-aware list when active or retained inactive, while leaving malformed containers preserved and leaving all existing list-editor defaults unchanged;
- made duplicate custom additions preserve typed text and perform no data/dirty change;
- refreshed inline, details, category-header, and sidebar findings after each real local ordering edit without a whole-editor rerender;
- included valid active and retained-inactive custom IDs in Resolve IDs, and prevented inactive/empty retained data from being described as active custom ordering;
- preserved omitted/empty basic-preset ordering shapes through open/close and export.

Validation actually run:

- `npm run check` passed: 66 JavaScript files syntax-checked, all static relative imports resolved, and all 30 test files / 403 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed untouched basic-preset export shape, deliberate criterion changes, explicit normalization with immediate issue clearing, invalid custom input association/atomicity, rank addition/reordering/duplicate no-op/lookup, retained-inactive editing, malformed Raw JSON preservation and focus routing, accessible control names, focus continuity, and overflow-free desktop, 840px, and 390px layouts;
- automatic clipboard copy was browser-blocked during the export test, but the generated gzip+Base64 payload was inspected directly and all 24 categories still omitted both ordering properties;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 52.1

The Phase 52 review confirmed two focused gaps:

- a compatible criterion object with an additional property could be rendered from the two-field effective criteria and then silently lose that property on the first structured edit;
- criterion add/final removal and ordered custom-rank move/removal could replace the focused control without a deterministic useful successor.

Resolution on `agent/phase-52-1-ordering-fidelity-focus`:

- item-ordering analysis now distinguishes AetherBags/export representability from safe structured editability without adding warnings or errors for unknown compatible properties;
- any criterion with own enumerable members beyond `Field` and `Direction` keeps its exact stored value, exposes no structured criterion mutation or normalization action, explains the preservation boundary, and routes to selected-category Raw JSON;
- analysis, render, disclosure, and Raw JSON routing remain non-mutating and non-dirty;
- a DOM-free list-mutation focus plan selects added/moved positions and next-then-previous removal boundaries;
- criterion rerenders and opt-in ordered custom-rank pills use enabled-target checks, prefer corresponding moved actions, and fall back to surviving equivalent controls or the relevant add/input control;
- canonical and reviewable criteria, deliberate AetherBags normalization, custom-rank lookup/duplicates/no-ops, validation refresh, descriptions, responsive styling, and all non-ordered list editors retain their Phase 52 behavior.

Validation actually run:

- focused item-ordering, export-compatibility, list-editor, and source coverage passed all 112 tests;
- `npm run check` passed: 66 JavaScript files syntax-checked, all static relative imports resolved, and all 30 test files / 408 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA was attempted with two fresh tabs and later retried with two additional fresh tabs, but the browser webview did not attach. Extra-member export fidelity, Raw JSON routing, keyboard focus, custom-rank lookup/no-op behavior, and desktop/840px/390px overflow could not be verified at runtime;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 53

Phase 53 standardizes button roles and movement presentation without changing application behavior.

Resolution on `agent/phase-53-button-system-consistency`:

- existing CSS defines standard text, compact text, square icon, primary, destructive, and link-style actions, with a neutral movement refinement that reuses existing class names where sensible;
- standalone square icon targets are 30px in comfortable density and 26px in compact density, while the visible glyph remains 14px and the topbar Help control intentionally remains 32px;
- category-header and sort-criterion Move up/Move down text is replaced by neutral `↑`/`↓` controls with precise category- or criterion-specific accessible names and matching titles;
- ordered Custom Item Rank arrows and all pill removals use a deliberate 18px borderless pill-icon exception so pills stay compact; enabled movement glyphs glow with the accent, destructive `×` glyphs use the danger color/glow, and disabled glyphs stay muted without glow;
- exact Add actions display `+`; Add icons beside list text fields are disabled while their trimmed field is blank and update with input/clear state;
- sort-criterion removal displays `×`, category deletion displays `🗑`, and batch lookup displays `🔍`; every icon retains a contextual accessible name/title;
- batch lookup is attached to the pill-list shell and hidden when the list has no unresolved valid IDs, while manual name search remains descriptive text;
- Duplicate remains descriptive text;
- a final all-button layout audit limits the ordering add-row's legacy fixed height to non-icon text buttons, keeping the criterion `+` square at 30px/26px instead of 30×35px or 26×31px;
- native disabled movement boundaries remain unchanged and visually muted, and all Phase 52/52.1 mutation, no-op, lookup, dirty-state, rerender, and focus-recovery callbacks are preserved;
- the visible-label audit made one evidence-backed change, `Sort by Order` to `Sort by order`; established acronyms, slash actions, and descriptive wording remain unchanged.

Validation actually run:

- focused ordering, list, accessibility, label, and CSS coverage passed all 91 tests across the touched suites;
- `npm run check` passed: 66 JavaScript files syntax-checked, all static relative imports resolved, and all 30 test files / 412 tests passed;
- `git diff --check origin/main` passed with no output;
- final-build in-app browser QA populated criterion ordering, three Custom Item Ranks, ordinary ID pills, and an unresolved ID, then covered all six themes, both densities, and 1280px/840px/390px;
- all 36 theme/density/viewport entries kept pill actions at 18×18 inside 28px pills, standalone icon minima at 30px comfortable/26px compact, and zero document/body horizontal overflow;
- blank-input `+` controls disabled, enabled after input, and disabled again after clearing; unresolved lookup appeared inside its pill shell while cached/empty lists hid it; category/criterion/pill icons retained contextual names/titles and disabled arrows remained natively unavailable;
- browser automation did not produce pointer hover or keyboard focus traversal, so glow/focus-visible rendering remains source/test verified rather than runtime asserted;
- two post-audit browser retry sessions failed to attach across five fresh-tab attempts in total, so the criterion-Add square-height correction is source/test verified while the preceding final-build matrix remains the runtime evidence for the otherwise unchanged button system;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 53.1

Live Phase 53 review confirmed three focused gaps:

- Item Sort Criteria selects were 35px Comfortable / 31px Compact while their associated square icons remained 30px / 26px and bottom-aligned,
- selected-category structural `renderAll()` actions could leave focus on `BODY`,
- pill controls suppressed the shared focus outline and relied on glyph glow alone.

Resolution on `agent/phase-53-1-contextual-control-focus`:

- Allowed-section list Add controls use a dedicated 38px / 34px input-paired square target that matches their adjacent text input;
- Add criterion uses the 35px / 31px ordering-control size and matches its select, while criterion move/remove icons retain the 30px / 26px standalone size and are centered within a select-height action rail;
- category-header arrows, Duplicate, and trash share the 30px / 26px action height; Search and Generate retain their existing input-height match, and responsive stacking rules are unchanged;
- a DOM-free selected-category structural focus plan covers Move up/down, Duplicate, and confirmed Delete, including opposite-direction fallback at disabled movement boundaries, selected-sidebar-category focus after removal, and Add category after final removal;
- pill controls retain their compact 18px borderless geometry and existing hover glow while gaining a solid 2px `:focus-visible` outline with 2px offset; High Contrast and Aetherial keep their stronger theme-specific treatment;
- disabled category, criterion, ordered-list, input Add, lookup, and export buttons omit tooltip titles while retaining accessible names; the explicit disabled-reason path exists but is unused;
- the shared accent hover border excludes disabled buttons, preventing pointer hover from outlining unavailable controls;
- focused tests retain the standalone 24px minimum, prove the matched and centered contextual rules in both densities, cover structural focus planning/wiring, and require visible pill focus instead of `outline: 0`.

Validation actually run:

- focused category-change and source coverage passed all 100 tests;
- `npm run check` passed: 66 JavaScript files syntax-checked, all static relative imports resolved, and all 30 test files / 418 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA measured Allowed-section Add controls and inputs at 38×38 Comfortable / 34×34 Compact, Add criterion and its select at 35×35 / 31×31, criterion move/remove actions at 30×30 / 26×26 with zero vertical center offset, category-header actions at an equal 30px / 26px height, and pill controls at 18×18;
- Move up/down retained a meaningful live action and switched to the opposite action at disabled boundaries, Duplicate focused the new copy's Duplicate action, and confirmed Delete focused the newly selected sidebar category;
- System, Dark, Light, High Contrast, Aetherial, and Dalamud all exposed a solid 2px keyboard-focus outline with 2px offset on pill controls, with the High Contrast yellow outline/halo remaining distinct;
- live disabled-button inspection found no rendered disabled button with a tooltip title, while entering an Allowed UI Category ID re-enabled its Add button and restored the normal enabled-state tooltip;
- browser automation did not expose a reliable pointer-hover pseudo-state, so disabled hover suppression is source/test verified by the enabled-only selector rather than claimed as runtime asserted;
- Comfortable and Compact passed 1280px, 840px, and 390px checks with clean wrapping/stacking and zero body/document horizontal overflow;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 54

Confirmed review defects:

- the advanced preset contained five `Desciples` misspellings and swapped the Spell Speed Materia and Skill Speed Materia stat descriptions,
- the contextual lookup action used a fixed 7px top offset, placing its center 1px above the first pill in Comfortable density and 3px above it in Compact density.

Resolution on `agent/phase-54-preset-copy-lookup-alignment`:

- decoded the advanced preset through the normal importer, corrected exactly the five misspellings and two swapped Materia descriptions, and regenerated its gzip+Base64 payload through the established exporter,
- retained exactly 55 advanced categories and left the basic preset byte-for-byte unchanged,
- decoded recursive comparison against `origin/main` reports only `$.Categories[0].Description`, `$.Categories[8].Description`, `$.Categories[9].Description`, `$.Categories[10].Description`, `$.Categories[17].Description`, `$.Categories[18].Description`, and `$.Categories[46].Description`; every other root, category, rule, flag, ordering, and unknown value remains unchanged,
- made the pill-list border, padding, and first-row height explicit tokens and derived lookup positioning from those values plus the existing density-aware square target,
- retained top-right placement, 30px/26px sizing, glyph and accessible name/title, unresolved-only visibility, reserved space, lookup behavior, cache/busy coordination, wrapping, and first-row rather than full-container alignment,
- added focused normal-importer preset assertions and CSS/source coverage without testing the opaque payload string itself.

Validation actually run:

- focused preset and source coverage passed all 84 tests before the full run,
- `npm run check` passed: 66 JavaScript files syntax-checked, all static relative imports resolved, and all 30 test files / 419 tests passed,
- `git diff --check origin/main` passed with no output,
- in-app browser QA loaded the advanced preset and verified all seven corrected descriptions; unresolved Item and ItemUICategory actions were visible while resolved/empty states hid them,
- Comfortable and Compact measurements at 1280px, 840px, and 390px retained 30px/26px square targets, a 7px right inset, reserved list space, a zero-pixel lookup/first-pill center offset, and zero body/document horizontal overflow,
- the ItemUICategory test list contained 25 pills and wrapped across multiple rows at every width while the action stayed aligned to the first row,
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 56

The post-Phase-54 maintenance review confirmed source-guard growth and two genuine test-only production exports:

- `test/sourceChecks.test.mjs` had grown to 1,073 lines and 79 tests spanning unrelated architecture, UI, accessibility, styling, lookup, import/export, modal, and no-op contracts;
- several regexes depended on exact line breaks even when statement order and ownership were the real contract;
- `decideUniqueItemAdd(...)` and `decideItemRemove(...)` were imported only by `test/itemOrdering.test.mjs`; runtime custom ordering uses the reusable list editor instead;
- `.button-compact` has no current markup consumer but is an intentional compact-text taxonomy role and is not an orphan.

Resolution on `agent/phase-56-source-guardrail-maintenance`:

- replaced the monolith with application/data-flow, UI/accessibility/focus/responsive, and lookup/import/export/no-op source suites plus a deterministic test-only repository source reader;
- preserved 76 still-valuable source-guard names exactly once and relaxed only brittle formatting dependencies while keeping precise structural assertions;
- retired the source assertion that inspected which module the direct import-summary tests import, because the DOM-free tests themselves prove that dependency boundary;
- retired the duplicate sort-position implementation regex because direct validation tests prove grouping, stable ordering, finding identity, dedupe, and multi-group behavior;
- replaced the lookup-chunk implementation regex with a direct multi-chunk behavior test that supplies an out-of-chunk stale row and proves the later owning chunk supplies the cached value;
- removed `decideUniqueItemAdd(...)`, `decideItemRemove(...)`, their test imports, and the helper-only test; existing criterion coverage retains `decideOrderedMove(...)` boundary and movement behavior;
- retained `.button-compact`, its compact-text documentation, and its formatting-tolerant taxonomy guard;
- made no runtime UI, validation, import/export, lookup, dirty-state, focus, responsive CSS, preset, or dependency change.

Validation actually run:

- focused source-guard, item-ordering, and XIVAPI coverage passed all 102 tests;
- source-name accounting confirmed 79 original names, 3 documented retirements, 76 surviving names, and zero duplicate, missing, or extra names;
- `npm run check` passed: 69 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 416 tests passed;
- `git diff --check origin/main` passed with no output;
- browser QA was not required because the runtime diff contains only the two dead helper deletions;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 57

The post-Phase-56 maintainability review confirmed that the 698-line `src/ui/categoryEditor.js` still mixed category-shell orchestration with a cohesive matching-rule leaf area.

Phase 57 merged through PR #97 at `291ad8db3cef2060a5a891963c9ee4103c2b4c58`.

Resolution on `agent/phase-57-matching-rules-editor-extraction`:

- added `src/ui/matchingRulesEditor.js` as the focused owner of the existing Allowed UI Category IDs, Allowed Item IDs, Allowed Item Name Patterns, and Allowed Rarities grid;
- moved the private rarity renderer, strict typed uint parser wiring, normalized numeric dedupe, lookup-aware list composition, structural pattern validation, comma-preserving input configuration, and converter placement without changing their behavior;
- retained the exact four-card order, two-column/stacked layout classes, card styles, input/button geometry, accessibility names and associations, lookup/search behavior, validation scopes, dirty/no-op behavior, and rarity ordering;
- kept validation refresh, optional description regeneration, and sidebar refresh in `categoryEditor.js` behind one narrow rule-change callback with the established sequencing;
- removed moved imports and direct rule-card construction from `categoryEditor.js`, reducing it from 698 to 649 lines without introducing circular dependencies;
- redirected existing source guards to the new owner without renaming or duplication and added one focused delegation/ownership guard;
- made no CSS, list-editor, validation, converter, preset, category structural-action, export, Raw JSON, range/state, or color change.

Validation actually run:

- focused category-editor, list-editor, row-ID, validation, pattern, and source coverage passed all 144 tests;
- source-name accounting confirmed all 76 surviving Phase 56 guard names exactly once, zero missing or duplicate names, and one new ownership guard;
- `npm run check` passed: 70 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 417 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px, including exact ordering, desktop two-column placement, narrower stacking, valid/duplicate/invalid numeric behavior, comma-preserving patterns, converter placement/opening, rarity toggling, unresolved lookup visibility/alignment, manual search availability, and zero horizontal overflow;
- the intentionally submitted invalid `-1` produced the established validation console message; no unexpected module-load or runtime errors were observed;
- CI and GitHub Pages were not run because implementation and publication remain separate.

Post-merge review evidence:

- the local Phase 57 tree and merged `main` were identical;
- `npm run check` passed with 70 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 417 tests passed;
- `git diff --check origin/main` passed with no output;
- GitHub post-merge Project verification and GitHub Pages deployment both succeeded for `291ad8d`;
- in-app browser QA was attempted in two fresh tabs, but the webview did not attach. This post-merge attempt did not produce runtime QA evidence; the successful browser matrix recorded above belongs to Phase 57 implementation time.

## Phase 57.1

Phase 57.1 merged through PR #98 at `d531186c6677cfbedb9310d35639eba843edc935`.

- corrected durable Regex → Item IDs ownership wording so `matchingRulesEditor.js` owns converter placement while `categoryEditor.js` supplies the launcher callback;
- refreshed all three project documents to the verified Phase 57 post-merge baseline;
- made no runtime source, CSS, data, test, dependency, or behavior change.

## Phase 58

The post-Phase-57.1 review confirmed that the approximately 176-line Color card, its color-only imports, normalization helper, and source guards were the next cohesive ownership boundary in the 649-line category orchestrator.

Resolution on `agent/phase-58-color-editor-extraction`:

- added `src/ui/colorEditor.js` as the focused owner of the complete existing Color card, native RGB picker, Hex RGBA validity/commit behavior, R/G/B byte controls, alpha slider/output, picker/Hex/alpha display snapshots, and exported `normalizeRgbInputValue(...)`;
- moved color-only imports to the leaf and redirected direct normalization/source coverage to the actual owner;
- made `categoryEditor.js` create and pass a fresh Color-specific scheduled sidebar callback while retaining its separate existing Range/State scheduler instance, preserving independent pending flags without duplicating the scheduler implementation;
- retained the exact Basics-then-Color top-grid order, markup/classes, labels, accessible names and associations, native input types, ranges/steps, no-op precision, invalid/restore behavior, immediate Hex rendering, scheduled RGB/native/alpha rendering, and single-commit Enter/change/blur sequencing;
- added a focused architecture/source guard proving category-level delegation, absence of color-control implementation from the orchestrator, the narrow leaf boundary, independent scheduling, and Basics-before-Color placement;
- reduced `src/ui/categoryEditor.js` from 649 to 469 lines. Remaining pressure points are Basics/generated descriptions, Range/State filters, selected-category Raw JSON, validation UI, and category structural actions;
- made no CSS, visual design, color quantization, data-shape, form-control, matching-rule, Item Ordering, preset, dependency, localization, import/export, selection, focus, or non-color behavior change.

Validation actually run:

- `npm run check` passed: 71 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 418 tests passed;
- `git diff --check origin/main` passed with no output;
- final-build in-app browser QA was attempted with two fresh local tabs, but neither webview attached. Comfortable and Compact checks at 1280px, 840px, and 390px plus live Color synchronization/no-op checks were unavailable;
- CI and GitHub Pages were not run because implementation and publication remain separate.

Post-merge browser review found that Phase 58's extraction retained a pre-existing synchronization gap: `updateColorVisuals()` refreshed picker, Hex RGBA, alpha, preview, and their committed snapshots but had no R/G/B input references. Each numeric control kept an isolated stale `lastCommitted`. From visible RGB 128/255/255, committing `#11223344` left those byte fields unchanged; focusing stale R and then G unintentionally changed the color to `#80223344`.

## Phase 58.1

Resolution on `agent/phase-58-1-color-control-synchronization`:

- each R/G/B control registers a private synchronization hook that updates its displayed byte and closure-owned committed snapshot from `category.Color`;
- `updateColorVisuals()` invokes all three hooks alongside picker, Hex RGBA, alpha, preview, and shared committed-display refreshes, covering every real Hex, native-picker, RGB, and alpha commit through the existing paths;
- synchronization itself performs no dirty call, duplicate sidebar render, scheduled render, or focus change;
- blank/non-finite restoration, invalid Hex visibility, canonical equivalent no-ops, higher-precision no-ops, alpha preservation, immediate versus scheduled sidebar behavior, Enter/change/blur single-commit behavior, the Phase 58 ownership boundary, and independent Color versus Range/State scheduler instances remain unchanged;
- focused source coverage now requires RGB display/baseline refresh and rejects dirty/render/scheduler/focus side effects inside synchronization.

Validation actually run:

- focused Color, accessibility, summary, and application-data-flow coverage passed all 67 tests;
- `npm run check` passed: 71 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 418 tests passed;
- `git diff --check origin/main` passed with no output;
- local browser QA was attempted with two fresh in-app tabs and later retried with two additional fresh tabs, but none of the four webviews attached. Comfortable and Compact checks at 1280px, 840px, and 390px plus Hex-to-RGB, native-to-RGB, RGB-to-linked-controls, alpha preservation, invalid/equivalent input, stale-blur, focus, and horizontal-overflow checks were unavailable;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 59

The post-Phase-58.1 maintainability plan identified the contiguous Range/State block as the next cohesive ownership boundary in the 469-line category orchestrator.

Resolution on `agent/phase-59-range-state-filter-extraction`:

- added `src/ui/rangeStateFiltersEditor.js` as the focused owner of the existing Range Filters and State Filters disclosure cards;
- moved private range/state display-name maps and fallback formatting, Range defaults and signed-Int32/uint bounds, Range Enabled switches and number/slider composition, State segmented controls, and local disclosure-summary refreshes without changing markup, classes, labels, values, or responsive grids;
- kept category validation and optional generated-description work in `categoryEditor.js` behind one narrow callback, and kept the existing shared Range/State scheduled sidebar callback in the orchestrator;
- preserved the distinct Color scheduler instance and independent pending flag introduced in Phase 58;
- preserved the exact Item Ordering, matching rules, Range Filters, State Filters, Advanced order and the established public filter-summary re-exports from `categoryEditor.js`;
- redirected focused source guards to the new owner without renaming them, added one ownership/data-flow guard, and reduced `categoryEditor.js` from 469 to 404 lines;
- made no CSS, visual design, data-shape, validation, generated-description, import/export, focus, preset, lookup, dependency, or unrelated editor change.

Validation actually run:

- focused filter-scalar, form-control, description, validation, category-editor, summary, and source coverage passed all 197 tests;
- `npm run check` passed: 72 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 419 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px: Range/State order and disclosure summaries, three-column desktop and single-column narrower grids, Enabled/Min/slider edits, blank and invalid-value restoration, State segmented changes, accessible labels/radiogroups, focus continuity, and zero body/document horizontal overflow;
- a fresh-tab retry for a separate live Maximum commit did not attach, so Maximum edit behavior remains focused-test/source verified rather than runtime asserted;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 60

The post-Phase-59 maintainability plan identified the contiguous Basics card and generated-description controller as the next cohesive ownership boundary in the 404-line category orchestrator.

Resolution on `agent/phase-60-basics-description-extraction`:

- added `src/ui/basicEditor.js` as the focused owner of the existing Basics card, including Enabled/Pinned and the local warning area, Name/Description, Generate and the generated-description review modal, all blank/identical/copy/replace/cancel paths, Order/Priority controls, description-input synchronization, and the Basics-only debounced sidebar helper;
- passed only the selected category, category list, dirty/list callbacks, Name/header and category-validation callbacks, lookup/preferences/clipboard services, and active-field commit into the leaf, which returns only the card, optional automatic generation, and local validation refresh;
- kept the selected-category header and issue badge, category-wide validation, card order, structural actions, shared Range/State scheduler, separate Color scheduler, and cross-card coordination in `categoryEditor.js`;
- preserved the exact Item Ordering, matching-rule, Range, and State sequence of validation refresh before optional description generation followed by their existing immediate or scheduled sidebar refresh;
- preserved the public `getBasicSwitchWarnings` import contract through a `categoryEditor.js` re-export;
- redirected focused generated-description and text-control guards to `basicEditor.js`, added one ownership/data-flow guard, and reduced `categoryEditor.js` from 404 to 285 lines; the new leaf is 163 lines;
- made no CSS, visual design, markup/class/label, validation, generated-description decision, signed-Int32 display/commit, data-shape, import/export, lookup, focus, selection, scheduler, dependency, or unrelated editor change.

Validation actually run:

- focused category-change, category-editor, form-control, summary, and three source-suite coverage passed all 150 tests;
- `npm run check` passed: 73 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 420 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px: Basics preceded Color, layouts retained zero body/document horizontal overflow, and live checks covered Name/header/debounced-sidebar synchronization; blank, identical, replacement-confirmed, copied, and cancelled description generation; Name-blur and downstream rule auto-generation; Enabled/Pinned warnings; Order/Priority unchanged, blank, invalid, valid, restoration, and focus continuity; modal initial/return focus and close state; and zero console errors;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 61

The post-Phase-60 task identified an item-ordering relevance issue rather than a configuration-semantics defect: inactive omitted and valid empty Custom Item Order data still rendered a full section containing only an instructional placeholder.

Resolution on `agent/phase-61-contextual-custom-order-visibility` from merged Phase 60 `origin/main` at `a889aa368681c8679f723834b85e02ce2c51eb20`:

- `analyzeItemOrdering(...)` now returns one DOM-free `customOrderRelevant` decision;
- normalized active Custom Item Order criteria, valid nonempty retained inactive ranks, malformed containers, and incompatible item-ID values keep the complete existing section visible;
- inactive omitted and valid empty values omit the section entirely, with the obsolete “Add Custom Item Order as a sort criterion…” placeholder removed;
- no extra disclosure, CSS concealment, hidden focus target, or reserved body element was introduced;
- criterion add/change/remove keeps the existing local rerender path and passes explicit surviving field/direction focus targets;
- clearing the final retained rank while inactive rerenders the local Item Ordering body, removes the now-irrelevant section, and focuses the surviving Add criterion select;
- active warnings/editors, retained-data warnings/editors, Raw JSON correction, lookup and Resolve IDs participation, descriptions, issue counts, export analysis, dirty/no-op behavior, callbacks, disclosure position/state, and stored data remain unchanged;
- render alone never inserts or deletes `CustomItemOrder`, rewrites criteria, clears ranks, normalizes malformed data, or marks dirty.

Validation actually run:

- focused item-ordering, lookup, accessibility/focus, description, export-compatibility, application-data-flow, category-editor, and list-editor coverage passed all 129 tests;
- `npm run check` passed: 73 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 423 tests passed;
- `git diff --check origin/main` passed with no output;
- final-build in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px: inactive empty data had no Custom Item Order section or reserved body element; active selection showed the existing warning/editor immediately; ranks cleared that warning; changing away retained nonempty ranks with the existing warning; final-rank removal hid the section and focused Add criterion; malformed inactive data exposed `Edit in Raw JSON`; all six density/viewport combinations had zero body/document horizontal overflow; and the console contained no errors;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 62

The post-Phase-61 action inventory confirmed that several controls still relied on click-handler no-ops or blind post-async enabling even when native UI state could prove that no work was available.

Resolution on `agent/phase-62-contextual-action-availability` from merged Phase 61 `origin/main` at `abdc54143b246cae66df9cc9767d73bd1842bad8`:

- added `src/actionAvailability.js` for trimmed text, normalized lookup-result duplication, converter Scan/Add, exact Sort/Renumber, uncached referenced-ID, and empty/busy cache decisions;
- made reusable manual Search buttons live, running-safe, Enter-safe, and post-request current-input-aware; duplicate result Add actions now disable together by normalized ID while retaining race/no-op guards and accessible names without disabled titles;
- made Import, full Raw JSON Apply/Copy, and selected Raw JSON Apply disabled only for trimmed-empty candidates, preserving malformed-nonblank validation and every existing confirmation/no-op/repair/clipboard/replacement path;
- made converter Scan pattern/running-aware and Add matched IDs dependent on a new normalized ID or removable selected saved pattern, including all-duplicate keep/removal and cancel/finish resynchronization;
- made Sort identity-order-aware, Renumber exact one-based-number-aware, Resolve IDs uncached-reference/own-running-aware, and cache clearing entry-count/producer-aware through existing render and subscription boundaries;
- audited all remaining buttons. Mutation actions are contextual when a boundary or missing candidate removes their work; correction, validation, modal, navigation, close/cancel, confirmation, clipboard retry, file-selection, preset, and generated-description feedback actions remain enabled when rendered for their established useful work;
- preserved configuration/import/export semantics, validation rules, lookup/cache leases, dirty/no-op contracts, focus/modal behavior, responsive layout, button labels/sizes, dependencies, and Phase 61 Custom Item Order relevance.

Validation actually run:

- focused availability, category-change, pattern, DOM/tooltip, cache-operation, lookup/import/export/no-op, and accessibility/source coverage passed all 117 tests;
- `npm run check` passed: 75 JavaScript files syntax-checked, all static relative imports resolved, and all 33 test files / 432 tests passed;
- `git diff --check origin/main` passed with no output;
- final-build in-app browser QA passed all required blank/nonblank/running/post-request, duplicate, validation, converter, Sort/Renumber/Resolve, and cache transitions. Disabled controls retained accessible names and zero disabled controls retained tooltip titles;
- Comfortable and Compact passed at 1280px, the 840px stacking boundary, and 390px with zero horizontal overflow; expected validation/lookup feedback was exercised with no unexpected console errors;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 63

Phase 63 bounds every user-controlled configuration ingestion and correction path from merged Phase 62 `origin/main` at `002555f65776e058bdac3e2e27dba76b513013d7`.

Resolution on `agent/phase-63-bounded-import-processing`:

- added shared production limits in `src/importExport.js`: 32 MiB selected file, 32 MiB UTF-8 JSON text, 8 MiB decoded gzip input, and 32 MiB decompressed output;
- added allocation-free UTF-8 size decisions and a shared pre-parse JSON helper used by plain import, full Raw JSON, and selected-category Raw JSON;
- bounded Base64 before `atob` by counting permitted whitespace separately, retained whitespace-tolerant decoding, and added a defensive post-decode byte check;
- replaced `new Response(decompressionStream).text()` with incremental reader consumption, cumulative byte checks, immediate overflow cancellation, `finally` release, and streaming UTF-8 decoding across chunk splits;
- checked uploaded `file.size` before `file.text()` and checked full Raw JSON before clipboard Copy;
- kept oversized nonblank actions clickable so their existing surfaces report whether file, JSON input, compressed data, or decompressed JSON exceeded the applicable production limit;
- kept every rejection before validation, destructive confirmation, replacement, selection, lookup, dirty/save state, compression, clipboard/download, or structural rendering;
- preserved normal JSON/gzip imports, bundled presets, repair and compatibility summaries, semantic Raw JSON no-ops, Unicode, export round trips, lookup behavior, focus/modal contracts, responsive styles, and Phase 62 availability decisions.

Validation actually run:

- focused ingestion, application/source wiring, category-change, import-summary, and preset coverage passed all 121 tests;
- `npm run check` passed: 75 JavaScript files syntax-checked, all static relative imports resolved, and all 33 test files / 444 tests passed;
- `git diff --check origin/main` passed with no output;
- complete diff inspection confirmed no preset payload, schema, export-size cap, dependency, CSS, button-state, lookup, dirty-state, validation/repair, or responsive change;
- in-app browser QA passed normal plain JSON, bundled gzip+Base64, unchanged full and selected Raw JSON, Import modal focus/background ARIA/return behavior, and zero horizontal overflow in Comfortable and Compact at 1280px, 840px, and 390px;
- the in-app surface could not drive the native file chooser, and a 32 MiB browser payload was deliberately not created. Direct injected-limit tests are authoritative for exact file and resource boundaries. No unexpected application console errors appeared; the expected import-review warning and Electron development CSP warning were the only warnings;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold.

## Phase 64

Phase 64 isolates Regex → Item IDs JavaScript evaluation from freshly fetched merged Phase 63 `origin/main` at `e087a2c0b57fe967690b5c0f3ceaa64f63605a74`.

Resolution on `agent/phase-64-regex-worker-timeout`:

- added dependency-free `src/tools/regexBatchWorker.js` as the dedicated module-worker owner of fixed-`i` `regex.test(name)` evaluation;
- added `src/tools/regexBatchEvaluator.js` with repository-relative worker construction, explicit scan/batch identity, at most 50 normalized candidates per request, a deterministic 1,000 ms per-batch deadline, injected worker/timer seams, stale-reply rejection, and idempotent one-time underlying termination;
- retained main-thread syntax-only JavaScript compilation for Phase 48 early compatibility copy but removed every main-thread evaluation path and added no fallback for worker construction, post, runtime, message, or timeout failures;
- kept XIVAPI fetch/pagination, row extraction, strict numeric ID normalization, completed-batch progress, stable unique matches, exact configured maximum, 300-result display cap, useful-name cache writes/persistence, result addition, optional original-index pattern removal, and dirty/no-op behavior in `regexToItemIds.js`;
- made Cancel and modal Close abort the active fetch controller and terminate the current worker immediately through the same idempotent scan-stop boundary; timeout terminates at the evaluator deadline, aborts fetch state, retains prior completed batches, and explicitly avoids calling the pattern AetherBags/.NET-invalid;
- kept the application-owned lookup-cache producer lease, busy overlay, active-scan/button synchronization, and availability notification under outer `finally` cleanup across success, cancel, timeout, close, worker error, and network failure;
- added deterministic direct and source coverage without executing a deliberately catastrophic regex in the Node test process;
- made no dependency, build, schema, preset, import/export, validation, AetherBags compatibility, CSS, label, or unrelated editor change.

Validation actually run:

- focused worker/evaluator, pattern, action-availability, converter, lookup/cache, no-op, and source coverage passed all 65 tests;
- `npm run check` passed: 78 JavaScript files syntax-checked, all static relative imports resolved, and all 34 test files / 460 tests passed;
- `git diff --check origin/main` passed with no output before and after durable-document updates;
- complete diff inspection found no unrelated change;
- final-build in-app browser QA passed custom and saved worker scans, progress, match addition, duplicate-only disabled Add, optional saved-pattern removal, pathological cancellation before a batch completed, ordinary active cancellation with completed progress, deterministic pathological timeout with responsive controls and AetherBags-safe copy, and modal Close with focus return plus busy/background/cache-producer release;
- Comfortable and Compact passed at 1280px, 840px, and 390px with zero body, document, or converter-modal horizontal overflow. No unexpected application console error appeared; the deliberate timeout status and Electron's development CSP warning were expected;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold.

## Phase 65

Phase 65 bounds every XIVAPI request lifetime from freshly fetched merged Phase 64 `origin/main` at `f37a37b2dc118902844afc23f255ecc84f6a193f`.

Resolution on `agent/phase-65-xivapi-request-deadlines`:

- added dependency-free, DOM-free `src/xivapiRequest.js` with a documented 15,000 ms production deadline, optional caller signal, injected fetch/timer seams, and an optional deterministic test override;
- combined caller and deadline cancellation through one internal abort controller without polling, preserved caller reasons, introduced distinct `XivapiRequestTimeoutError`, ignored late settlement, and cleared every timer/listener across success, HTTP/JSON failure, timeout, and cancellation;
- routed multi-row lookup, single-row fallback, manual search, and paginated Item-sheet fetches through the boundary while retaining URLs, English selection, HTTP messages, JSON behavior, strict row normalization, and scan cancellation;
- stopped timeout retry explosions by reporting every ID in a timed-out chunk once through the existing failure boundary without bisection, individual retries, sentinel cache writes, or useful-name replacement; ordinary failures retain recursive fallback and earlier completed chunks remain cached;
- kept manual/quiet status policy, producer-lease ownership, nested busy ownership, action recomputation, cache-clearing coordination, partial lookup/scan progress, Phase 62 native disabled state, Phase 64 worker lifecycle, and no-op dirty/save behavior;
- made regex XIVAPI timeout status distinct from user cancellation and JavaScript-worker evaluation timeout, while retaining completed matches/cache writes and enabling Add only when completed work remains;
- added focused deterministic request, fallback, partial-progress, cancellation, and source coverage without dependencies or real 15-second test waits;
- made no UI redesign, retry/Cancel control, cache schema, worker policy, import/export, preset, CSS, dependency, build, CSP, Actions, localization, pill-list, or Phase 55 change.

Validation actually run:

- focused request/XIVAPI coverage passed all 32 tests; related worker/evaluator, converter, lookup/cache, action-availability, and source coverage passed all 111 tests;
- `npm run check` passed: 80 JavaScript files syntax-checked, all static relative imports resolved, and all 35 test files / 478 tests passed;
- `git diff --check origin/main` passed with no output, and complete diff inspection found no unrelated change;
- ordinary in-app browser QA passed manual Item Search, per-list lookup, global Resolve IDs, and regex scanning. A temporary same-origin nonanswering endpoint and one-second deadline exercised timeout recovery for Search, both Resolve paths, and regex; a five-second deadline exercised user Cancel distinctly. Busy overlays cleared, producer-owned controls recovered, and regex Add remained unavailable with no completed matches;
- modal close restored launcher focus and removed background `aria-hidden`; Comfortable and Compact had no body/document horizontal overflow at 1280px, 840px, or 390px;
- the real XIVAPI endpoint and 15,000 ms production deadline were restored before final validation. A real 15-second stalled request, CI, and GitHub Pages were not run because deterministic seams cover the policy and implementation/publication remain separate. Phase 55 remains on hold.

## Phase 66

Phase 66 establishes explicit browser and CI trust boundaries from freshly fetched merged Phase 65 `origin/main` at `43fab8d3bd6fbc09216ed2e3ecb84c53393d302b`.

Resolution on `agent/phase-66-static-trust-boundaries`:

- moved the inline Theme/Density bootstrap into synchronous same-origin `src/startupPreferences.js`, before `styles.css` and independent of the application module graph;
- preserved the exact preference key, six Theme values, two Density values, HTML defaults, malformed/absent/unavailable-storage tolerance, and nonfatal startup behavior, with direct parity tests against `src/state.js`;
- added the early meta policy `default-src 'self'; base-uri 'none'; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; connect-src 'self' https://v2.xivapi.com; worker-src 'self'; frame-src 'none'; form-action 'none'`;
- kept inline/evaluated JavaScript blocked while limiting inline CSS permission to style attributes required by category colors, Color preview, range fill, progress geometry, toast transitions, and clipboard fallback;
- retained same-origin local/controlled requests, the exact XIVAPI origin, the same-origin module worker, same-origin favicon, file import, clipboard fallback, Blob download, modal behavior, and application navigation without adding `data:`/`blob:` resource allowances or an experimental navigation restriction;
- documented that meta delivery is not a response-header substitute and intentionally omitted ineffective `frame-ancestors`, reporting, or other header-only claims;
- pinned official checkout v4.3.1 to `34e114876b0b11c390a56381ad16ebd13914f8d5` and setup-node v4.4.0 to `49933ea5288caeca8642d1e84afbd3f7d6820020`, retaining readable comments, Node 22, `contents: read`, push/pull-request triggers, and one `npm run check`;
- made no dependency, build, service-worker, server, analytics, remote-asset, schema, preset, localization, or unrelated UI change. Phase 55 remains on hold and localization remains deferred under the existing staged roadmap.

Validation actually run:

- focused startup/CSP/workflow/clipboard coverage passed all 13 tests;
- `npm run check` passed: 83 JavaScript files syntax-checked, all static relative imports resolved, and all 37 test files / 491 tests passed;
- `git diff --check origin/main` passed with no output, and complete diff inspection found no unrelated change;
- final local in-app browser QA passed stored Theme/Density startup and reload, Preferences updates, real XIVAPI Item Search, module-worker construction/progress/cancellation, bundled and normal JSON import, Export/Copy with clipboard success, Blob Download completion status, modal initial/return focus and background inert/ARIA restoration, and deliberate runtime category/color/range/progress inline styles;
- Comfortable and Compact each retained equal body/document client and scroll widths at 1280px, 840px, and 390px. No CSP violation was recorded; Electron's generic development CSP warning and the deliberately triggered import-review warning were the only warnings;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 67

Phase 67 establishes the English localization foundation from freshly fetched merged Phase 66 `origin/main` at `2d4d4a64f42aeedd6d5e941e420c769d9ef2f838`.

Resolution on `agent/phase-67-english-localization-foundation`:

- added frozen plain-text `src/locales/en.js` as the explicit English catalog and dependency-free, DOM-free `src/localization.js` for locale resolution, stable keyed lookup, and named interpolation;
- made unsupported locales deterministically fall back to English and made unknown keys or missing named parameters throw instead of silently rendering `undefined` or unresolved placeholders;
- created an explicit fixed-English translator in application orchestration and injected it into the Preferences modal without adding mutable global locale state, persistence, a language preference, or a selector;
- migrated the complete Preferences modal title, introduction, tablist accessibility label, tabs/sections, Theme/Density fields and all option labels/hints, behavior checkbox labels/hints, and saved status while preserving exact English wording;
- escaped every translation entering existing HTML-template or attribute sinks and kept modal title/status translation values in existing plain-text sinks; catalogs contain no HTML fragments;
- preserved IDs, control and option order/values, tab/panel semantics, keyboard navigation, focus restoration, preference callbacks/persistence, Theme/Density startup behavior, dirty state, and Phase 66 CSP/bootstrap behavior;
- left static `index.html` chrome, empty-state and Help references, validation/export messages, lookup/search text, category-editor strings, generated descriptions, schema, presets, import/export, service workers, analytics, dependencies, and unrelated UI unchanged. Phase 55 remains on hold.

Validation actually run:

- focused localization, Preferences, state/persistence, accessibility/data-flow, startup, and CSP coverage passed all 81 tests;
- `npm run check` passed: 86 JavaScript files syntax-checked, all static relative imports resolved, and all 38 test files / 499 tests passed;
- `git diff --check origin/main` passed with no output before and after durable-document updates, and complete diff inspection found no unrelated change;
- in-app browser QA verified exact English copy, ArrowRight/ArrowLeft and End/Home tab selection/focus and roving `tabindex`, Theme/Density/behavior application, reload persistence, and launcher focus restoration;
- Comfortable and Compact passed at 1280px, 840px, and 390px with equal body/document/modal client and scroll widths. No CSP violation or unexpected application warning/error appeared; Electron's generic development CSP warning was the only warning. Original local preferences and viewport were restored;
- CI and GitHub Pages were not run because implementation and publication remain separate. Broader string extraction, locale preference/fallback UI, locale key parity, and localized generated descriptions remain later phases.

## Phase 68

Phase 68 extends the English localization proof boundary from freshly fetched merged Phase 67 `origin/main` at `d66e7c66ce189726ce3ee0c7c03e4697634dcdeb`.

Phase 68 merged through PR #110 at `d53fd23f161480e7fdbd139dfdd0f1e9b2583772`.

Resolution on `agent/phase-68-secondary-modal-localization`:

- extended frozen plain-text `src/locales/en.js` with the complete About / Help and Lookup Cache modal surfaces, splitting Help text at UI-owned `strong` and `code` boundaries and using one named cache-stat template without HTML or pluralization;
- injected the existing single fixed-English translator from `src/app.js` into both modal entrypoints without a second translator, global locale state, persistence, selector, second catalog, or application-orchestration imports in the UI modules;
- migrated every Help-owned title, introduction, heading, workflow/tool/preference/privacy explanation, emphasized label, and code token while preserving exact English wording, content order, four headings/lists, sixteen items, eleven emphasized runs, three code runs, accessibility, focus, responsive layout, and CSP behavior;
- migrated Lookup Cache privacy copy, labels, `toLocaleString()` useful/unresolved statistics, clear action, and active/empty/late-race refusal messages while retaining escaped HTML sinks and plain-text runtime status sinks;
- preserved producer subscriptions, shared availability, defensive clear re-checks, clear/close behavior, unsubscribe-on-close, application-owned success/refusal toasts, lookup cache shape/data, category data, dirty state, and modal focus return;
- left static `index.html` chrome, broader lookup/search, validation/export, category editor, generated descriptions, schema, presets, import/export, startup, CSP, Actions, dependencies, and unrelated UI unchanged. Phase 55 remains on hold.

Validation actually run:

- focused localization, application/data-flow, Help/accessibility, Lookup Cache/import/export, availability, cache-operation, and UI-summary coverage passed all 127 tests;
- `npm run check` passed: 86 JavaScript files syntax-checked, all static relative imports resolved, and all 38 test files / 501 tests passed;
- `git diff --check origin/main` passed with no output before and after durable-document updates, and complete diff inspection found no unrelated change;
- in-app browser QA verified exact Help and Lookup Cache copy; Help headings, lists, emphasis, and code semantics; locale-formatted counts; enabled nonempty clearing; focus containment/return; and background ARIA restoration;
- Comfortable and Compact passed at 1280px, 840px, and 390px with equal body/document/modal client and scroll widths. No CSP violation or unexpected application warning/error appeared; Electron's generic development CSP warning was the only warning. The original Compact preference and viewport were restored;
- the existing browser profile contained 381 useful cached names, so destructive clearing and manufactured empty/active producer states were not exercised. Direct availability, race-refusal, successful-clear, producer, cleanup, and source tests remain authoritative;
- PR checks, post-merge Project verification, and GitHub Pages deployment all passed;
- the post-merge review reran `npm run check`: 86 JavaScript files were syntax-checked, all static relative imports resolved, and all 38 test files / 501 tests passed with zero failures, skips, cancellations, or todos;
- fresh deployed QA passed exact Help and Lookup Cache English copy, Help semantic structure, nonempty locale-formatted cache counts, focus containment/return, background ARIA restoration, CSP behavior, and 840px/390px overflow checks;
- cache clearing was deliberately not exercised against the browser profile's existing data. Direct availability, race-refusal, successful-clear, producer, cleanup, and source tests remain authoritative;
- static chrome and broader validation/status extraction, locale preference/fallback UI, locale key parity, and localized generated descriptions remain later phases. Phase 55 remains on hold.

Post-merge review confirmed one future-localization design limitation rather than a current English runtime bug or Phase 68 regression: several Help sentences are assembled from fixed-order translated fragments around `strong` and `code` nodes. That preserves exact English copy and semantics but constrains translator-controlled word order, grammar, and inflection. Before a real second locale or more semantically rich prose, use complete plain-text templates with named semantic placeholders; keep catalogs HTML-free and localization mechanics DOM-free; and have UI code construct validated text nodes and allowlisted semantic elements without `innerHTML`, raw HTML parsing, or a sanitizer dependency.

## Phase 68.1

Phase 68.1 resynchronizes the three durable project documents with the merged Phase 68 state. It changes documentation only: no runtime source, tests, styles, workflows, package metadata, presets, static assets, or application behavior.

The documentation correction records PR #110 and its post-merge verification, replaces the obsolete proof-slice roadmap with the completed Phase 67/68 boundary, and identifies reorderable rich-message composition as the leading candidate for the next numbered localization phase after this correction is merged and validated. It does not design or implement that mechanism. Phase 55 remains on hold.

Validation actually run:

- `npm run check` passed: 86 JavaScript files syntax-checked, all static relative imports resolved, and all 38 test files / 501 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed with no output;
- `git diff --name-only origin/main` contained exactly `docs/AI_PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/REVIEW_HISTORY.md`;
- browser QA was not rerun because Phase 68.1 changes documentation only. The recorded fresh deployed QA is post-merge Phase 68 evidence, not Phase 68.1 implementation evidence.

## Phase 69

Phase 69 added safe reorderable rich messages and merged through PR #112 at `831c6d7271cd146fda9a306904c7de9372340448`.

Resolution:

- retained the callable `createTranslator(locale)` and unchanged ordinary `formatMessage(...)` behavior while adding one `translate.rich(...)` operation backed by directly testable, DOM-free `formatRichMessage(...)`;
- returned ordered text and opaque placeholder parts according to template order, including repeated placeholders, without inspecting, coercing, cloning, or stringifying placeholder objects;
- reused the existing explicit missing-parameter, unknown-key, and unsupported-locale behavior;
- replaced twelve Help sentences containing semantic markup with complete English templates and named placeholders, removing obsolete descriptions, before/after fragments, translated conjunctions, and duplicate Help-only preference labels;
- rebuilt Help through DOM node operations, appending formatter text as text nodes and creating only UI-owned allowlisted `strong`/`code` placeholders whose contents use `textContent`;
- preserved exact English copy, four headings, four lists, sixteen list items, eleven `strong` runs, three `code` runs, content order, modal behavior, accessibility, focus, responsive layout, and CSP;
- made no second-locale, selector, preference, pluralization, static-chrome, broader localization, generated-description, dependency, build, schema, preset, import/export, cache, dirty-state, converter, service-worker, analytics, or unrelated UI change. Phase 55 remains on hold.

Validation actually run:

- focused localization, Help behavior, accessibility/source, application/data-flow, and static trust-boundary coverage passed all 72 tests;
- `npm run check` passed: 87 JavaScript files syntax-checked, all static relative imports resolved, and all 39 test files / 506 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed with no output before durable-document updates, and the implementation diff was inspected for obsolete fragments and unrelated scope;
- direct behavior tests proved exact rendered English text, `4/4/16/11/3` semantic counts, text-node rendering, `textContent` semantic contents, strong/code allowlist rejection, and synthetic reordered-placeholder rendering without UI logic changes;
- local in-app browser QA passed exact English text, semantic counts, focus containment/return, background inert/ARIA restoration, and zero body/document/modal horizontal overflow at the default 1892px desktop viewport, 840px, and 390px;
- no CSP violation or unexpected application warning/error appeared. Electron's generic development CSP warning was the only warning, and the temporary viewport override was restored;
- both PR verification checks succeeded;
- post-merge Project verification run `29844811387` and Pages deployment run `29844808768` succeeded;
- the post-merge review reran `npm run check`: 87 JavaScript files passed syntax checking, all static relative imports resolved, and all 39 test files / 506 tests passed with zero failures, skips, cancellations, or todos;
- fresh deployed Help QA passed exact English text, four headings, four lists, sixteen list items, eleven `strong` runs, three `code` runs, Close-button focus, launcher focus return, background `aria-hidden` restoration, and zero body/document/modal horizontal overflow at the default viewport, 840px, and 390px;
- no application warning, error, or CSP violation appeared. Electron's generic development CSP warning was the only warning.

## Phase 69.1

Phase 69.1 resynchronizes the three durable project documents with the merged and post-merge-validated Phase 69 state. It changes documentation only: no runtime source, tests, styles, workflows, package metadata, presets, or application behavior.

Validation actually run:

- `npm run check` passed: 87 JavaScript files passed syntax checking, all static relative imports resolved, and all 39 test files / 506 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed with no output;
- `git diff --name-only origin/main` contained exactly `docs/AI_PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/REVIEW_HISTORY.md`;
- browser QA was not rerun because Phase 69.1 changes documentation only. The recorded fresh deployed Help QA is Phase 69 post-merge review evidence, not Phase 69.1 implementation evidence.

## Phase 70

Phase 70 localized the persistent application chrome and merged through PR #114 at `d337e7f4d5c7f4f933a9be9c90d4f80ffe71610e`, from the Phase 69.1 merge baseline `9e8d44e617d10f9db6dbec678296b01a77413c93`.

Resolution:

- added focused UI-owned `src/ui/applicationChrome.js`, injected with the existing single application translator and run once before event binding/rendering;
- migrated exactly the document title/brand, sidebar search and global category actions, and topbar group/action strings while retaining exact English output in both the catalog-backed runtime and immediate `index.html` fallback;
- used only `textContent`, `document.title`, and explicit plain-text `placeholder`, `aria-label`, and `title` attributes, with no HTML parsing, markup catalog values, sanitizer, localization-mechanics import, or orchestration import;
- promoted reusable Help-owned action labels and Help/Lookup Cache titles to neutral shared `action.*` keys, removed the obsolete duplicates, and preserved exact Help text, `4/4/16/11/3` semantics, rich-message ordering/allowlist behavior, and modal behavior;
- preserved all IDs, classes, roles, button types, disabled-state ownership, grouping/order, event wiring, focus, dirty state, data behavior, CSP/startup/style ordering, themes/density/responsive rules, dependencies, schemas, presets, and Phase 55 hold;
- left dynamic statuses, list/editor/search prose, empty-state prose, modal defaults/infrastructure, busy messages, validation/import/export text, Regex converter copy, generated descriptions, locale persistence/selection, second catalogs, parity, and pluralization outside this phase.

Validation actually run:

- focused chrome/localization/Help/accessibility/application/startup/CSP coverage passed all 115 tests;
- `npm run check` passed: 89 JavaScript files syntax-checked, all static relative imports resolved, and all 40 test files / 511 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed before and after durable-document updates;
- direct tests proved exact runtime English, every translator-backed sink, matching HTML fallback, shared-key cleanup, safe sink restrictions, single-translator ownership, startup placement, and retained Help behavior;
- in-app browser QA passed exact visible/accessibility chrome, search clear/Escape with focus retention, empty and one-category contextual global actions, Preferences and About / Help open/close focus return, Help `4/4/16/11/3` semantics, and zero body/document/topbar/sidebar horizontal overflow at the default 1506px desktop viewport, 840px, and 390px;
- no application warning, error, or CSP violation appeared. Electron's generic development CSP warning was the only warning. The temporary viewport override was reset, the QA tab was closed, and no preference was changed;
- Phase 70 changed 13 files with 313 insertions and 39 deletions from the Phase 69.1 merge baseline;
- both PR verification checks passed;
- post-merge Project verification run `29850360304` and Pages deployment run `29850356841` passed;
- the fresh post-merge review reran `npm run check`: 89 JavaScript files passed syntax checking, all static relative imports resolved, and all 40 test files / 511 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed and the reviewed worktree had no diff from `origin/main`;
- fresh deployed QA at `https://bahbus.github.io/AB_Category_Editor/` confirmed the expected localized persistent chrome and accessible names, search Clear and Escape behavior, Preferences and Help focus return, contextual disabled actions, and no horizontal overflow at 1280px, 840px, or 390px.

## Phase 70.1

Phase 70.1 merged through PR #115 at `e458689777ac34ac8fbcabdf1d14bbb24907ad0d`. It resynchronized the three durable project documents with the merged and post-merge-validated Phase 70 state and changed only those documents: no runtime source, tests, styles, workflows, package metadata, presets, localization catalogs, or application behavior.

Validation actually run:

- both PR verification checks passed;
- post-merge Project verification run `29859389669` and Pages deployment run `29859388338` passed;
- the post-merge review reran `npm run check`: 89 JavaScript files passed syntax checking, all static relative imports resolved, and all 40 test files / 511 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed and the reviewed tree matched `origin/main`;
- the merged Phase 70.1 tree changed only `docs/AI_PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/REVIEW_HISTORY.md`;
- `npm run check` passed: 89 JavaScript files passed syntax checking, all static relative imports resolved, and all 40 test files / 511 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed with no output;
- `git diff --name-only origin/main` contained exactly `docs/AI_PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/REVIEW_HISTORY.md`;
- browser QA was not rerun because Phase 70.1 changes documentation only. The recorded deployed QA is Phase 70 post-merge review evidence, not Phase 70.1 implementation evidence.

## Phase 71

The post-Phase-70.1 accessibility review confirmed that ordinary sidebar selection correctly changed the selected category but destroyed the activated `.cat-item` during `renderAll()`, leaving both pointer and keyboard activation focused on `document.body`.

Resolution on `agent/phase-71-sidebar-selection-focus-continuity` from freshly fetched Phase 70.1 `origin/main` at `e458689777ac34ac8fbcabdf1d14bbb24907ad0d`:

- kept category selection and focus recovery inside `src/ui/categoryList.js`;
- retained the exact active-field commit, selected-index update, and full-render sequence, then queried the newly rendered `.cat-item[aria-current="true"]` and focused it only while connected;
- reused the one existing selection handler for pointer click, Enter, and Space, including stable re-selection of the already selected category;
- avoided category names, IDs, stored node references, timeouts, roving tabindex, element-type changes, or generalized focus infrastructure;
- left search input, validation/list refreshes, name edits, drag/drop, structural-action focus planning, and unrelated rerenders outside the recovery path;
- preserved selection, render count/order, active editor updates, search filtering, automatic renumbering, dirty/no-op behavior, category identity, list semantics, `role="button"`, `tabIndex`, `aria-current`, accessible names, and theme focus styling;
- added direct fake-DOM coverage with duplicate names and blank IDs that proves click, Enter, Space, and repeated selection each render once, disconnect the activated node, and focus the connected newly rendered selected entry.

Validation actually run:

- focused `test/categoryList.test.mjs` and `test/uiAccessibilitySource.test.mjs` coverage passed all 43 tests;
- `npm run check` passed: 89 JavaScript files syntax-checked, all static relative imports resolved, and all 40 test files / 512 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed with no output;
- fresh local in-app browser QA passed pointer selection, Enter selection, Space selection, repeated Equipment selection, matching editor heading/content, and unchanged `No changes` state;
- category search retained focus while filtering to two entries and did not focus a sidebar item when the selected Equipment entry was filtered out;
- 1280px, 840px, and 390px each retained equal body/document/sidebar client and scroll widths plus the selected entry's solid 2px outline and visible halo;
- no application warning or error appeared. Electron's generic development CSP warning was the only warning. The temporary viewport override was reset and the QA tab was closed;
- complete diff inspection found no dependency, build, schema, preset, import/export, lookup, converter, ordering, localization-catalog, CSP, workflow, style, or unrelated UI change.

Phase 71 then merged through PR #116 at `ff1017ad6cb9ed1701e2ff8c851d87a0b30d6db1`. PR Project verification, CodeQL JavaScript/TypeScript and Actions analyses, and the CodeQL aggregate check passed. Post-merge Project verification run `29863854786`, Pages deployment run `29863853734`, and main-branch security scan run `29863853827` passed. Fresh post-merge `npm run check` retained the 89-file / 40-file / 512-test zero-failure baseline; `git diff --check origin/main` passed and the reviewed branch tree exactly matched merged `origin/main`. Fresh deployed QA confirmed Enter selection focused the connected newly rendered Equipment entry, updated the editor heading, retained `No changes`, and kept focus in Search while `materia` filtering removed Equipment. No application warning or error appeared; Electron's generic development CSP warning was the only warning.

## Phase 72

Phase 72 extends the existing English localization boundary to the complete no-category guidance card from freshly fetched Phase 71 `origin/main` at `ff1017ad6cb9ed1701e2ff8c851d87a0b30d6db1`.

Resolution on `agent/phase-72-empty-state-localization`:

- added focused `src/ui/emptyState.js` ownership and injected the one existing translator through application orchestration and `categoryEditor.js`, without a second translator, localization import in UI, global locale state, or populated-editor refactor;
- migrated the exact heading, `Start with:` hint, complete workflow sentence, two preset button labels/descriptions, manual-add item, Preferences guidance, and Help guidance to shared action keys plus focused `emptyState.*` keys;
- rendered formatter text as text nodes and semantic contents through `textContent`, with exactly two UI-owned `strong` placeholders and a strong-only local semantic allowlist; a synthetic template can move Upload before Import/Paste without composition changes;
- preserved the exact card/list/hint structure, list order, English text, button IDs/types/classes/titles/accessible names, active-field commit ordering, callbacks, focus/layout, and selection reset to `-1`; populated rendering bypasses the builder;
- kept both preset actions on the existing application-owned ID lookup and normal `importText(...)` path, retaining `sourceLabel`, Base64 payloads, validation, replacement/dirty behavior, and all preset contents;
- removed only the orphaned `PRESETS[*].label` property. The localized catalog now owns the two visible labels, while status-facing `sourceLabel` remains fixed English for a later status family;
- removed the obsolete hardcoded `index.html` card so every displayed empty-state value crosses the injected translator;
- left statuses, validation, populated list/editor text, lookup/search, converter, generated descriptions, locale selection/state, second catalogs, pluralization, schemas, preset data, import/export, lookup/cache, ordering, CSS, CSP, workflows, dependencies, build tooling, and Phase 55 unchanged.

Validation actually run:

- focused localization, empty-state, preset, application/data-flow, accessibility, startup, and CSP coverage passed all 94 tests;
- `npm run check` passed: 91 JavaScript files syntax-checked, all static relative imports resolved, and all 41 test files / 519 tests passed with zero failures, skips, cancellations, or todos;
- fresh local in-app browser QA passed exact text/list/strong semantics; exact button identity, visible/accessibility values, and titles; the normal 24-category basic and 55-category advanced preset paths; populated Weapons rendering; unchanged `No changes`; Preferences/About modal initial/return focus and background inert/ARIA restoration; and zero body/document/editor overflow in Comfortable and Compact at 1280px, 840px, and 390px;
- the advanced preset retained its established three warnings and normalized-display-order summary. No CSP violation or unexpected application error appeared; Electron's generic development CSP warning was the only infrastructure warning;
- the original Comfortable density and viewport were restored and the QA tab was closed;
- CI, GitHub Pages, deployed QA, and publication were not run because implementation and publication remain separate.

Phase 72 then merged through PR #117, “Phase 72: Localize empty-state guidance,” on 2026-07-21 at merge commit `f978b2c0a525615da11c8908da188c7cc84dcff2`. Phase 72 PR checks passed. Post-merge Project verification run `29874069440`, Pages deployment run `29874068838`, and main-branch security scan run `29874069280` passed.

Live `main` immediately advanced to `5167d1297d02192689ccdc22eba1d0f78dd00447` through the one-line test-only `test/staticTrustBoundaries.test.mjs` commit “Potential fix for code scanning alert no. 1: Bad HTML filtering regexp.” It extends the closing-script regexp through the closing-tag boundary and fixes CodeQL alert #1 (`js/bad-tag-filter`). It changes no runtime code or runtime security boundary. On that exact live tree, Project verification run `29874154312`, Pages deployment run `29874153760`, and main-branch security scan run `29874154077` passed.

Fresh review ran `npm run check` against an archive of exact live `origin/main`: 91 JavaScript files passed syntax checking, all static relative imports resolved, and all 41 test files / 519 tests passed with zero failures, skips, cancellations, or todos. Fresh deployed QA confirmed exact empty-state text, list structure, `strong` semantics, and accessibility; the basic preset action reached the populated Materias editor with `No changes`; and 1280px, 840px, and 390px had no horizontal overflow. Electron's generic development CSP warning was the only console warning. The temporary viewport was reset and the QA tab was closed.

## Phase 72.1

Phase 72.1 resynchronizes the three durable project documents with the merged Phase 72 and exact live-main record. It changes documentation only: no runtime source, tests, styles, workflows, package metadata, presets, localization catalogs, or application behavior.

Validation actually run:

- `npm run check` passed: 91 JavaScript files passed syntax checking, all static relative imports resolved, and all 41 test files / 519 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed with no output;
- `git diff --name-only origin/main` contained exactly `docs/AI_PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, and `docs/REVIEW_HISTORY.md`;
- complete diff inspection confirmed historically precise merge-tree/live-main attribution, no stale Phase 72 publication language, and no unrelated scope;
- browser QA was not rerun because Phase 72.1 changes documentation only. The recorded fresh deployed empty-state QA is post-merge/live-main review evidence, not Phase 72.1 implementation evidence.

# Current next step

Phase 72.1 merged through PR #118 at `d140e21f2726eb892b52f56f1f36efde44d4f0ea`.

## Phase 73

Phase 73 moves operational planning from conversational/local memory into a public GitHub Project while retaining committed code and the three durable documents as their appropriate authorities.

Implementation on `agent/phase-73-github-project-governance` from freshly fetched Phase 72.1 `origin/main`:

- created and publicly linked [AB Category Editor Roadmap](https://github.com/users/Bahbus/projects/2), leaving the unrelated empty/closed personal Project #1 untouched;
- kept the Project schema small: built-in `Status`; custom `Priority` (`Next`, `Soon`, `Later`, `On Hold`); `Area` (`Localization`, `UI/UX`, `Reliability`, `Documentation`, `Presets/Data`, `Infrastructure`); and free-text `Phase`;
- verified the Project's enabled built-in workflows for item-added defaults, closed items, merged PRs, linked PRs, sub-issues, and issue closing;
- avoided a repository Action and long-lived personal-token secret because repository `GITHUB_TOKEN` cannot write the user-owned Project and the built-in workflows cover the intended lifecycle;
- created repository issues #119–#128 and added them to the Project with deliberate field values: active Phase 73; the four remaining localization stages; Phase 55 on hold; empty-sidebar and pill/lookup UI candidates; a real-browser harness evaluation; and the eventual Wiki/README migration;
- added `roadmap`, `phase`, `on hold`, `localization`, `ui/ux`, `infrastructure`, `preset/data`, and `reliability` labels while reusing the established `documentation` and `enhancement` labels;
- added structured numbered-phase and review-finding issue forms plus a public-friendly general triage form for bugs, data/compatibility risks, accessibility, UI, features, documentation, and questions; the general form requires a reproducible/proposed workflow, expected/actual behavior, app source, environment, sanitized evidence guidance, and privacy/duplicate checks without internal phase jargon;
- disabled blank issues, linked the Project from issue configuration and README, and added a ready-for-review PR template requiring a closing issue link, actual verification, all three durable-document updates, and Project synchronization;
- added direct repository-governance coverage for the canonical Project links and task/PR contracts;
- changed the publication default from draft to ready for review. PRs must link their issue so Project automation can track and complete the work.

Validation actually run:

- focused `test/repositoryGovernance.test.mjs` passed all 5 tests;
- `npm run check` passed: 92 JavaScript files syntax-checked, all static relative imports resolved, and all 42 test files / 524 tests passed with zero failures, skips, cancellations, or todos;
- the four new issue-template YAML files and existing Project verification workflow parsed successfully;
- live Project inspection confirmed public visibility, repository linkage, ten repository-issue items, intended Status/Priority/Area/Phase values, and six enabled built-in workflows;
- browser QA was not run because repository templates, planning metadata, labels/issues/Project state, and documentation do not change the application runtime;
- after adding new files to intent-to-add visibility, final `git diff --check origin/main` passed with no output; complete diff inspection covered all nine changed files and found no unrelated runtime or workflow change.

# Current next step

Phase 73 implementation and validation are complete; publication remains separate. After merge, run the standard deep review, reconcile the Roadmap, and select the next numbered phase from verified `Soon` candidates. Keep issue #125 / Phase 55 on hold.

Phase 73 merged through ready-for-review PR #129 at `701b4cc34af1c1b7ecfead07e03767c186ba828c`. Project Issue #119 and PR #129 are `Done`.

## Phase 73.1

Issue #130 identified an audience mismatch in the merged governance forms: GitHub cannot make a public-repository issue form visible only to selected maintainers, while the broad review/roadmap and general forms exposed internal workflow language or combined reporters with very different needs.

Resolution on `agent/phase-73-1-issue-template-audience` from freshly fetched Phase 73 `origin/main` at `701b4cc34af1c1b7ecfead07e03767c186ba828c`:

- removed the numbered-phase and review-finding forms from `.github/ISSUE_TEMPLATE/` so they are absent from the public chooser;
- added separate public forms for reproducible bugs, possible improvements/features, accessibility/usability problems, and documentation problems, plus a general question/other route;
- rewrote all public names, descriptions, prompts, examples, checks, and chooser links in simple language without phase, roadmap-candidate, Project-synchronization, architecture, validation, or maintainer-review assumptions;
- kept diagnostic questions where useful: bug and accessibility forms collect steps, expected/actual behavior, app source, and environment; AetherBags version is requested only for relevant compatibility problems;
- retained focused labels and privacy reminders, and added a direct chooser link to GitHub private security advisories so sensitive details are not invited into public issues;
- preserved a complete reusable numbered-phase body at `.github/maintainer/numbered-phase-issue.md`, with README instructions for direct `gh issue create`, required labels, and Project fields;
- documented precisely that maintainer-only creation is a workflow convention because GitHub provides no per-user visibility control for an issue form in a public repository;
- retained the Phase 73 ready-for-review pull-request policy without changing application runtime, dependencies, data, import/export, accessibility, layout, or security behavior.

Validation actually run:

- focused `test/repositoryGovernance.test.mjs` passed all 9 tests;
- PyYAML 6.0.3 parsed all six public chooser/form YAML files as mappings;
- `npm run check` passed: 92 JavaScript files syntax-checked, all static relative imports resolved, and all 42 test files / 528 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` and `git diff --cached --check` passed after staging the complete explicit 14-file phase scope;
- live Project inspection confirmed Issue #130 at Phase `73.1`, Priority `Next`, Area `Infrastructure`, and Status `In Progress` before publication;
- browser QA of the application was not run because no runtime file changed. Live GitHub chooser verification remains a separate post-publication check.

Phase 73.1 merged through ready-for-review PR #131 at `0892b97f8138f268e94f6359a208306ccb84fd14`. The required live chooser inspection then confirmed a release-blocking repository-governance defect: all five public forms were rejected, Blank issue appeared despite `blank_issues_enabled: false`, direct form URLs did not render usable forms, and the community-profile API reported `issue_template: null`.

## Phase 73.2

Issue #132 traced the live failure to `title: ""` in every public form. GitHub's official validation guidance rejects empty or whitespace-only values whenever a field expects a string and directs maintainers to delete an optional key-value pair when it has no value. PyYAML 6.0.3 accepted the documents because this is a GitHub schema rule rather than a generic YAML syntax error; the Phase 73.1 tests never asserted the rule.

Resolution on `agent/phase-73-2-restore-public-issue-forms` from freshly fetched Phase 73.1 `origin/main` at `0892b97f8138f268e94f6359a208306ccb84fd14`:

- removed only the optional empty `title` key from `bug.yml`, `improvement.yml`, `accessibility.yml`, `documentation.yml`, and `general.yml`, without adding noisy title prefixes;
- audited all remaining top-level and body definitions against GitHub's current official issue-form syntax, form schema, and common validation errors; confirmed no additional invalid key, type, ID, label, option, body, or required-value state;
- added a focused source guard for empty and whitespace-only string scalars, direct synthetic regressions for both forms of invalid `title`, and explicit preservation checks for every required text field and required checkbox option;
- preserved the exact five-form public inventory, labels, questions, required/optional split, friendly language, privacy guidance, private-security routing, disabled blank issues, both contact links, off-chooser maintainer phase workflow, and ready-for-review PR policy;
- left README unchanged because user-facing reporting and maintainer instructions did not change;
- changed no application runtime, dependency, data, import/export, localization, layout, accessibility behavior, security behavior, or template taxonomy/copy.

Validation actually run:

- PyYAML 6.0.3 parsed all six public chooser/form YAML files as mappings;
- focused `test/repositoryGovernance.test.mjs` passed all 10 tests;
- `npm run check` passed: 92 JavaScript files syntax-checked, all static relative imports resolved, and all 42 test files / 529 tests passed with zero failures, skips, cancellations, or todos;
- `git diff --check origin/main` passed on the final complete nine-file diff;
- browser QA of the application is not applicable because no runtime surface changed.

Phase 73.2 merged through ready-for-review PR #133 at `60989edeb88aa83030f3bec889d556930d8c0506`. The user's subsequent live chooser observation confirmed that all five public forms render successfully from the default branch. The community-profile endpoint still returns `issue_template: null`; because that signal now conflicts with the working chooser, it is not a reliable YAML-form acceptance oracle and must not override live chooser evidence.

## Post-Phase-73.2 review

The completed review recorded:

- `npm run check` passed with 92 JavaScript files, all static relative imports resolved, and all 42 test files / 529 tests passing;
- experimental Node coverage measured 84.61% lines, 89.61% branches, and 91.39% functions;
- all 47 runtime modules were reachable;
- no open CodeQL or Dependabot alert existed;
- the Project verification workflow remained commit-SHA pinned and read-only;
- local 1280px, 840px, and 390px smoke QA found no horizontal overflow;
- the confirmed next defect was clipboard fallback focus loss: the hidden textarea removed itself after `execCommand('copy')` without restoring the prior control, leaving focus on `body` and weakening modal containment. Existing coverage proved cleanup and CSP compatibility but omitted restoration.

That finding became Issue #134 and Phase 74.

## Phase 74

Resolution on `agent/phase-74-clipboard-fallback-focus` from freshly fetched Phase 73.2 `origin/main` at `60989edeb88aa83030f3bec889d556930d8c0506`:

- preserved primary `navigator.clipboard.writeText(...)` behavior without reading, focusing, or selecting any DOM target on success;
- captured the active element only after primary rejection, before the hidden textarea receives focus;
- retained the exact fallback text, readonly attribute, CSP-compatible inline style properties, selection, `execCommand('copy')`, boolean result, and caller interface;
- recorded whether the temporary textarea still owned focus, removed it in `finally`, and restored only a callable original target still contained by the current document;
- skipped restoration when a newer control acquired focus or the target disconnected during a rerender, and isolated restoration exceptions so they cannot turn successful copying into failure;
- hardened `trapModalFocus(...)` so Tab from outside a visible modal enters at its first focusable control and Shift+Tab enters at its last, while preserving normal boundary cycling and native interior movement;
- preserved clipboard statuses, export snapshot/save authority, dirty state, modal open/close/Escape/return focus, stale RAF/version protection, inert/ARIA behavior, application data, serialization, import/export compatibility, dependencies, CSP, styles, localization, presets, and Phase 55's hold.

Validation actually run:

- focused clipboard, modal, accessibility, import/export, export-snapshot, and compatibility coverage passed all 185 tests;
- direct tests cover primary success without document focus access; fallback true, false, and thrown-copy outcomes; textarea cleanup and connected-target restoration; disconnected and superseded targets; restoration exceptions; outside-focus Tab/Shift+Tab re-entry; normal first/last cycling; and native interior movement;
- `npm run check` passed: 92 JavaScript files syntax-checked, all static relative imports resolved, and all 42 test files / 543 tests passed with zero failures, skips, cancellations, or todos;
- local in-app browser QA loaded the 24-category basic preset, passed Raw JSON Copy with focus retained on Copy and returned to the Raw JSON launcher on close, and passed Export / Copy automatic success with `Exported` save state, modal containment, and return to the Export / Copy launcher;
- forward Tab from the last Raw JSON modal action cycled to Close and Shift+Tab cycled back; background `aria-hidden` was applied only while the modal was open and removed on close;
- body, document, app, and main widths had no horizontal overflow at 1280px, 840px, or 390px; the 390px Export modal and content also had no horizontal overflow;
- the app browser used the primary Clipboard API and did not provide a supported way to force fallback, so live fallback was not claimed and the direct fallback tests remain authoritative;
- no application warning, error, or CSP violation appeared. Electron's generic development CSP warning was the only warning. The temporary viewport override was reset and the QA tab was closed;
- `git diff --check origin/main` passed on the final phase diff;
- Phase 74 was published directly ready for review through PR #135 with `Closes #134`. Both verification runs, CodeQL JavaScript/TypeScript and Actions analyses, and the aggregate CodeQL check passed. Issue #134 and PR #135 remain `In Progress`, Priority `Next`, Area `UI/UX`, Phase `74` in the Roadmap. GitHub Pages, deployed QA, and merge were not run.

# Current next step

Phase 74 merged through PR #135 at `aa81abd8dadafadb24805087ece3f7a9fe7bcc88`.

## Phase 75

Issue #137 scopes the next localization step to the populated matching-rule grid and reusable list editor, including the Custom Item Ranks caller, without widening into Regex converter internals, broad validation/import/export messages, remaining populated editor/sidebar prose, generated descriptions, locale persistence, or a second locale.

Resolution on `agent/phase-75-list-editor-localization` from freshly fetched Phase 74 `origin/main` at `aa81abd8dadafadb24805087ece3f7a9fe7bcc88`:

- threaded the existing single application translator through `categoryEditor.js` into `matchingRulesEditor.js`, `itemOrderingEditor.js`, and every affected `listEditor(...)` call; no UI leaf imports localization mechanics/catalogs or creates locale state;
- added focused English keys for matching-rule titles/hints, converter launch text, rarity labels/guidance, pattern input, and typed Item/UI Category ID structural errors;
- added focused English keys for reusable empty/unresolved text, add/move/remove names, default input, duplicate statuses, lookup labels/progress/busy/completion/failure summaries, search controls/progress/results/statuses, and result Add names;
- kept caller titles, sheet labels, row names/IDs, counts, failure IDs/details, and parser/network errors as plain dynamic data with named interpolation rather than catalog markup;
- localized the relevant-only Custom Item Ranks title, hint, placeholder, and structural error while preserving its ordered focus plan, dedupe, lookup/search/cache leases, and no-op behavior;
- retained strict uint parsing, atomic list validation, comma splitting for numeric IDs, comma-preserving patterns, converter placement/wiring and return focus, rarity normalization, action availability, dirty behavior, list rerender focus, lookup caching/XIVAPI behavior, responsive layout, and import/export behavior;
- added directly tested DOM-free matching-rule and list-editor message adapters plus updated focused source guards for translator flow, localization isolation, safe sinks, and the existing behavioral contracts.

Validation actually run:

- focused localization, list/matching-rule, row-ID, pattern, ordering, action-availability, lookup/request/cache, accessibility, and application/data-flow coverage passed 175 tests;
- `npm run check` passed: 93 JavaScript files syntax-checked, all static relative imports resolved, and all 43 test files / 545 tests passed with zero failures, skips, cancellations, or todos;
- local in-app browser QA loaded the 55-category advanced preset and verified exact matching/list text and accessible names, Add/Search disabled transitions, duplicate status interpolation, comma-bearing pattern entry, converter launch/return focus, relevant Custom Item Ranks rendering, and ordered move/remove names;
- Comfortable and Compact both produced zero body/document/editor horizontal overflow at 1280px, 840px, and 390px. The matching grid retained two columns at 1280px and stacked at 840px/390px; unresolved lookup buttons stayed centered on the first pill;
- no application error or CSP violation appeared. Electron's generic development CSP warning and the advanced preset's expected three-warning import summary were the only warnings. The original Comfortable density and viewport were restored and the QA tab was closed;
- live XIVAPI success was not exercised or required; the existing direct injected lookup/request tests remain authoritative. Complete diff inspection found no dependency, schema, preset, import/export, dirty/save, converter-internal, generated-description, locale-state, CSS, CSP, workflow, or unrelated UI change.

# Current next step

Publish Phase 75 ready for review with `Closes #137`; do not merge it. Keep Issue #125 / Phase 55 on hold, and keep broader localization work under Issue #122.
