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

# Current next step

Implement and validate Phase 38 — Lookup Cache Recovery, Range Validation Accessibility, and Context Advance. If it passes without a Phase 38.1 follow-up, continue phase planning from verified deep-review findings.
