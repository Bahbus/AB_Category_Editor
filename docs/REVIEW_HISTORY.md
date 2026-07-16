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

Feasible and intentionally deferred.

Recommended future sequence:

1. English-only i18n foundation.
2. Extract UI chrome and messages.
3. Add language preference and fallback.
4. Add locale key-parity tests.
5. Treat generated descriptions separately with language-aware templates.

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

# Current next step

Review Phase 52.1 locally. Commit or publish only when separately requested.
