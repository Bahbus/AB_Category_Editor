# AI Project Context

> **Repository:** `Bahbus/AB_Category_Editor`  
> **Purpose:** Static JavaScript editor for AetherBags category configuration files used with Final Fantasy XIV.  
> **Current state:** Phase 44 is merged at `888a5838a062ea34ec279d7a423edbd88d45e66e`. Post-merge acceptance confirmed replacement-revision, numeric-string display, and asynchronous export-modal ownership gaps. Phase 44.1 resolves them on `agent/phase-44-1-snapshot-identity-number-display`; `npm run check` passes all 24 test files / 317 tests. Focused in-app browser QA was attempted, but the browser connection was unavailable. CI was not run.
> **Historical planning thread:** https://chatgpt.com/c/6a34e61a-51b4-83e8-8afb-ff833b85aafe  
> **Primary verification command:** `npm run check`  

---

## 1. How to use this documentation

This file is the concise entry point for AI assistants, Work sessions, coding agents, and future planning threads.

Read in this order:

1. `docs/AI_PROJECT_CONTEXT.md` — project rules, workflow, current state, and invariants.
2. `docs/ARCHITECTURE.md` — code structure and runtime/data-flow details.
3. `docs/REVIEW_HISTORY.md` — phase history and previously fixed regressions.

Treat these files as durable project memory. GitHub remains the source of truth for committed code.

---

## 2. Project summary

`AB_Category_Editor` is a no-build, static JavaScript application for creating, importing, editing, validating, looking up, and exporting AetherBags category configuration data.

Core capabilities:

- JSON and gzip+Base64 import.
- Structured category editing.
- Full-config Raw JSON editing.
- Category sorting, renumbering, duplication, deletion, and drag/drop reorder.
- Validation and import-repair summaries.
- XIVAPI-based Item and ItemUICategory name lookup.
- Regex-to-Item-ID scanning.
- Generated category descriptions.
- Persistent editor preferences and lookup cache.
- Responsive UI, modal focus management, and accessibility polish.

The app intentionally has:

- no build step,
- no new dependencies unless clearly justified,
- browser-native APIs where practical,
- tests and source checks run through Node.

---

## 3. Standard workflow

The project uses this recurring workflow:

1. Write a numbered phase task.
2. Implement the phase.
3. Validate implementation against the written acceptance criteria.
4. If a follow-up is required, write `X.1`.
5. If no follow-up is required, perform a full deep-dive review of the repository.
6. Check:
   - bugs and regressions,
   - data loss,
   - import/export compatibility,
   - validation correctness,
   - lookup edge cases,
   - accessibility,
   - dirty-state behavior,
   - modal/focus behavior,
   - responsive CSS,
   - test coverage,
   - brittle source checks,
   - small UX inconsistencies,
   - maintainability risks.
7. Do not call something a confirmed bug until surrounding code and tests support that conclusion.
8. Never claim CI or tests ran unless they were actually executed.
9. Prefer `npm run check` as the standard verification command.

---

## 4. Core behavioral contracts

These are high-value invariants. Preserve them unless a deliberate phase explicitly changes them.

### Data and export compatibility

- Preserve the AetherBags JSON schema and exported category data shape.
- Preserve Raw JSON editing behavior.
- Preserve JSON import.
- Preserve gzip+Base64 import/export.
- Do not silently discard preserved imported values unless a repair rule explicitly requires it.
- Import warnings and repairs should be reviewable without unnecessarily blocking valid imports.

### Numeric row IDs

Valid row-ID values:

- non-negative integer numbers,
- digit-only strings such as `"0"`, `"123"`, and `"00123"`.

Invalid row-ID values include:

- `null`,
- `undefined`,
- empty or whitespace-only strings,
- booleans,
- objects,
- arrays,
- negatives,
- decimals,
- negative/decimal strings,
- non-numeric strings.

Rules:

- Imported invalid numeric IDs warn but are preserved.
- Typed invalid numeric IDs are rejected.
- Preserved invalid imported IDs must not be collected for lookup.
- Validation, lookup normalization, referenced-ID collection, manual lookup search, and regex scanning must agree on row-ID semantics.
- Shared helpers live in `src/rowIds.js`.

### Duplicate handling

- Duplicate Order/Priority sort positions are grouped.
- Grouped sort-position warnings use stable category ordering and stable dedupe keys.
- Duplicate list values are reported once per affected field.
- Invalid numeric-ID warnings are grouped once per affected field.
- Duplicate and invalid issues may both count when both conditions apply.

### Lookup behavior

- Useful cached names are distinct from unresolved/sentinel names.
- Automatic lookup success/failure status remains quiet.
- Manual lookup reports visible success/failure status.
- Batch lookup must cache only rows belonging to the current chunk.
- Unresolved multi-row batch results fall back to individual lookup.
- Busy overlay must only be hidden if it was shown.
- Manual search results must normalize row IDs before caching, displaying, or adding.
- Lookup cache keys remain strings; normalized list values are numeric.

### Dirty state

- Structural or actual data changes mark dirty.
- Focusing/blurring unchanged numeric fields must not mark dirty.
- Blank number/range blur restores the previous value instead of coercing to `0`.
- No-op Regex → Item IDs actions must not mark dirty.
- Before unload, active editable fields are committed before dirty-state evaluation.

### Modal and accessibility behavior

- Modal background app content becomes inert and `aria-hidden` only while a modal is active.
- Modal focus is requested before background inerting.
- Focus trap remains functional.
- Modal RAF/version guard prevents stale deferred focus.
- Focus returns appropriately on close.
- Important icon-only controls require accessible labels.
- Category list entries remain keyboard selectable.
- Validation state should use `aria-invalid` and `aria-describedby` where relevant.

### Layout and styling

- Preserve responsive stacked layout behavior.
- Preserve `100vh` fallback and `100dvh`.
- Preserve theme and density preferences.
- Avoid introducing missing theme tokens or weak high-contrast behavior.

---

## 5. Current phase status

### Phase 35

Implemented and validated functionally:

- Regex → Item IDs no longer marks dirty or reports `Added 0 item ID(s).` when nothing changed.
- Regex status text distinguishes IDs added, regex removed, both, and no change.
- Blank Order/Priority blur restores the previous value.
- Blank Range Min/Max blur restores the previous value.
- `extractSheetRowsById(...)` uses strict explicit/fallback row-ID normalization.
- Typed list add can report partial duplicate skips.

### Phase 35.1

Validated and passed.

Coverage added for:

  - Regex → Item IDs no-change behavior,
  - blank `numberInput(...)` blur restore,
  - blank range-number blur restore,
  - partial duplicate-skip list status.

### Phase 36

Validated and passed.

- Color objects are repaired safely during import and RGB blur restores committed values without false dirty state.
- Category add/duplicate and numeric-ID dedupe use the established safe numeric policies.
- Busy-overlay release behavior remains scoped to the operation that showed it.

### Phase 37

Validated and passed.

- Selected-category Raw JSON is parsed and shape-normalized as a local candidate before it replaces live state.
- `null`, arrays, and scalar category entries are rejected without changing the selected category or dirty state.

### Phase 38

Implemented, merged, and validated.

- Persisted lookup-cache data is normalized to the exact two-bucket runtime shape before use.
- Malformed buckets and values are dropped while string names and established sentinels remain intact.
- Invalid range Min/Max controls share an associated validation message through `aria-describedby`.
- The post-merge `npm run check` run passed all 19 test files.

### Phase 39

Implemented, merged at `8d22220e8d067848f446be2524b0736b83677d41`, and validated.

- Referenced-ID lookup, per-list lookup, and Regex → Item IDs scanning acquire application-owned cache-producer coordination and release it in `finally`.
- Overlapping operations remain tracked until the final idempotent lease is released.
- Lookup-cache clearing is disabled and visibly explained while a producer is active, with a second active-state check in the clear callback.
- Successful clearing retains the established non-dirty, category-preserving behavior.
- `npm run check` passed all 20 test files.

### Post-Phase-39 deep review

Confirmed four no-op dirty-state and selection-fidelity defects:

- Sort by Order dirtied already-sorted data and reset selection.
- Renumber dirtied already-correct numeric positions.
- selected-category Raw JSON replaced and dirtied an identical normalized category.
- full Raw JSON confirmed, replaced, reset selection, dirtied, and could auto-lookup an identical normalized config.

These became Phase 40.

### Phase 40

Implemented, merged at `478545235debae9a1dc064b972acc2181cd5a0e1`, and post-merge validated.

- Shared pure change helpers provide JSON-semantic equality, strict one-based renumber change detection, identity-aware sorting, and directly testable Raw JSON apply decisions.
- Sort preserves the selected category object and dirties only when identity order changes.
- Manual Renumber dirties only when numeric `Order` or `Priority` values actually change; drag/move remains dirty because category order changes.
- Both Raw JSON paths preserve live state and dirty state for identical normalized candidates; full Raw JSON no-ops bypass replacement confirmation and automatic lookup.
- `npm run check` passed all 21 test files, and `git diff --check` passed.
- The post-merge review reran `npm run check`: syntax and import checks passed and all 21 test files passed; `git diff --check origin/main` also passed.
- Browser QA was not run during the post-merge review.

### Phase 40.1

The post-merge review found that full Raw JSON built its validation summary from the old live category count before applying a changed candidate. The candidate itself was still applied correctly, and the Phase 40 no-op behavior remained correct.

- Full Raw JSON summary creation now uses the final validated, repaired, normalized, and sorted candidate category count.
- The same candidate-derived summary is reused by changed and identical no-op branches without moving live replacement before confirmation.
- Regression tests cover adding categories, removing categories, identical no-op count reporting, and candidate-summary wiring.
- `npm run check` passed: syntax check, static relative-import check, and all 21 test files (272 tests).
- Phase 40.1 was merged at `beda975e087bd012f33270b7f1574c6822340bda`.
- The post-merge review reran `npm run check`: syntax and import checks passed and all 21 test files / 272 tests passed.
- `git diff --check origin/main` passed, and the reviewed tree exactly matched merged `origin/main`.
- Desktop-keyring authentication was verified for the review fetch. Browser QA and CI were not run.

### Phase 41

The post-Phase-40.1 review confirmed that external empty or numeric `text/plain` drops could be coerced into category indices, and that identity-order no-op adjacent drops still renumbered, selected, dirtied, and rerendered.

- Category reorder decisions now validate finite in-range integer indices, compute on a copy, compare the result by object identity and order, and mutate only for a real change.
- Real reorders preserve the moved object as selected and retain optional automatic one-based renumbering.
- Category drag targets activate only for a valid application-owned active drag; external `text/plain` is metadata only and is never read as category identity.
- Invalid and no-op drops do not select, renumber, mark dirty, or structurally rerender, while successful drops and drag end clear transient state safely.
- Direct regression coverage includes both movement directions and placements, adjacent and same-target no-ops, invalid indices, duplicate/JSON-identical objects, exact side-effect counts, optional renumbering, and focused event-wiring guards.
- Focused tests passed: 72 tests across `test/categoryChanges.test.mjs` and `test/sourceChecks.test.mjs`.
- `npm run check` passed: syntax check, static relative-import check, and all 21 test files (279 tests).
- Phase 41 was merged at `2926dc35dbda24fa07beb5b92477feeea47ea23f`.
- The post-merge review reran `npm run check`: syntax and import checks passed and all 21 test files / 279 tests passed.
- `git diff --check origin/main` passed, and the reviewed tree exactly matched merged `origin/main`.
- Desktop-keyring authentication was verified for the review fetch. Browser QA and CI were not run.

### Phase 42

The post-Phase-41 review confirmed that unchanged 8-bit color-control events could quantize higher-precision imported RGBA data and falsely dirty the document, Hex RGBA `change` followed by `blur` could commit twice, and replacing an identical generated description could dirty and rerender without changing data.

- Pure color decisions canonicalize Hex RGBA text, distinguish invalid/no-change/changed commits, and compare picker RGB and alpha bytes against their committed displayed snapshots.
- Hex, native picker, and alpha handlers preserve higher-precision model values for same-display events; real changes synchronize all linked controls and refresh every committed snapshot.
- A successful Hex RGBA change updates the committed snapshot before a following blur, making that second event a no-op.
- Generated-description application uses a DOM-free strict-value change helper, and both Generate and Replace independently guard identical text.
- Automatic blank-description generation retains its usefulness gate and reports whether data actually changed; manual blank generation retains its existing fallback behavior.
- Direct helper tests cover canonicalization, invalid/no-op/changed decisions, precision preservation, idempotent hex commits, and exact generated-description callback counts; focused source checks cover DOM wiring.
- `npm run check` passed: syntax check, static relative-import check, and all 21 test files (286 tests).
- `git diff --check` passed.
- Browser QA and CI were not run.

Phase 42 was merged at `ab8997ae53b1136fab56b445fa3c811cf0bd25a9`.

### Post-Phase-42 deep review

Confirmed five integrity defects:

- plain Color objects silently repaired malformed or missing components without a material review record,
- Order/Priority validation and consumers accepted coercion-only values such as `null`, blank strings, booleans, arrays, and objects,
- manual XIVAPI search could write results to a cache object replaced while its request was pending,
- same-value range number and slider events could falsely mark the document dirty,
- automatic clipboard completion from an older export could clear dirty state after a newer edit.

These became Phase 43.

### Phase 43

- Plain Color objects are snapshotted by value before normalization; component changes create one material Color warning while valid numeric precision remains untouched and whole-object repairs retain distinct messaging.
- One strict optional-number interpretation now governs Order/Priority validation, duplicate grouping, import sorting, next-sort calculation, and category duplication. Finite numbers and non-empty finite numeric strings remain accepted without rewriting imported strings.
- Every nonblank manual XIVAPI search holds the application lookup-cache producer lease across the network and result-processing window and releases it once in `finally`.
- Directly tested range-value decisions and application helpers prevent same-value number, blur, and slider events from mutating or notifying; real changes notify once and a following blur is a no-op.
- Export marks the generated snapshot saved immediately after opening the export modal and before awaiting automatic clipboard work.
- Unused local `rangeFiltersSummary` and `stateFiltersSummary` imports were removed while public re-exports remain.
- `npm run check` passed: syntax check, static relative-import check, and all 22 test files (298 tests).
- `git diff --check` passed.
- Browser QA and CI were not run.

Phase 43 was merged at `1790f13b9ed26b23de4cabea3fe9387a11990936`.

### Post-Phase-43 deep review

Confirmed two integrity defects:

- Export/Copy and Download snapshotted JSON before asynchronous gzip work but later cleared dirty state unconditionally, so edits made during compression could be absent from the generated snapshot yet marked saved.
- Order/Priority controls initialized committed fallback state with `Number(value) || 0`, so blank blur after an invalid import could validate a synthetic zero while leaving the invalid JSON value unchanged.

These became Phase 44.

### Phase 44

- Every real dirty transition advances a monotonic data revision, including edits made while the document is already dirty.
- Export/Copy and Download capture the current revision immediately before snapshot generation and call the saved-state transition only when that revision remains current after compression.
- Stale snapshot completions retain dirty state and report that the generated or downloaded snapshot succeeded while newer changes remain unexported; overlapping or out-of-order completions cannot save a newer revision incorrectly.
- Export/Copy retains the Phase 43 boundary: the modal opens before a current snapshot is marked saved, and automatic clipboard completion has no save-state authority.
- Number-control commit state retains the original JSON value, its strict `optionalFiniteNumber(...)` interpretation, and displayed-input divergence. Invalid imported values remain untouched and validated from the original value on blank or non-committing blur; one deliberate finite edit replaces the invalid value once.
- Valid finite values and accepted numeric strings preserve numeric no-op behavior, blank restore, and min/max clamping without rewriting an unchanged numeric string in the model.
- Focused regression tests passed: 77 tests across export snapshot, form-control, and source-wiring coverage.
- `npm run check` passed: syntax check, static relative-import check, and all 23 test files (307 tests).
- `git diff --check` passed.
- Browser QA and CI were not run.

Phase 44 was merged at `888a5838a062ea34ec279d7a423edbd88d45e66e`.

### Post-Phase-44 acceptance findings

Confirmed three tightly related integrity gaps:

- Normal import and preset replacement assigned a new validated live config and marked it saved without advancing the data revision, allowing an older in-flight snapshot to appear current.
- Native number-input sanitization could display accepted numeric strings such as `"  +7  "` and `"0x10"` as blank even though validation and the model retained accepted nonblank values.
- Export/Copy completion could replace a newer active modal, overwrite its close handler, and strand an awaiting confirmation workflow.

These became Phase 44.1.

### Phase 44.1

- Revision advancement is centralized and used by both real dirty mutations and changed validated-config replacement. JSON-semantic replacement no-ops do not assign or advance the revision.
- Normal JSON, gzip+Base64, file, and bundled-preset imports retain their saved-document behavior while invalidating every older in-flight snapshot after a real config replacement.
- Stale Export/Copy and Download completions always report an accurate warning for both dirty and saved-current documents and never invoke the saved transition.
- Export/Copy computes snapshot currency before building its inline explanation, so a stale snapshot is never labeled `Current`.
- Shared modal state exposes read-only `isModalOpen()`. Export/Copy completion checks it before creating result content, opening a modal, changing save state, or attempting automatic clipboard work; a newer dialog remains untouched and the user receives a retry warning.
- Number controls normalize only their displayed representation: browser-sanitized accepted strings receive canonical finite text while the original JSON spelling, validation source, no-op behavior, and dirty state remain unchanged until deliberate input.
- Invalid committed values remain preserved and visibly invalid, and one deliberate finite correction still commits once.
- Focused syntax and behavior verification passed 107 tests across the touched helper and wiring files.
- `npm run check` passed: JavaScript syntax check, static relative-import check, and all 24 test files (317 tests).
- `git diff --check` passed.
- Focused in-app browser QA was attempted twice, but the browser connection was unavailable; no substitute browser mechanism was used.
- CI was not run.

---

## 6. Known future concerns

### `src/ui/categoryEditor.js`

This remains the largest maintainability hotspot. It currently owns:

- basics,
- color,
- generated descriptions,
- numeric/name-pattern list editors,
- rarities,
- range filters,
- state filters,
- raw category JSON,
- validation UI,
- category actions.

Do not refactor it merely for aesthetics. Split it when future feature work would otherwise make the file materially harder to maintain.

Possible future modules:

- `basicEditor.js`
- `colorEditor.js`
- `ruleListEditors.js`
- `rangeFiltersEditor.js`
- `stateFiltersEditor.js`
- `rawCategoryEditor.js`

### Source-check brittleness

Source checks are useful for DOM-heavy static code, but regex-based checks can become formatting-sensitive. Prefer direct behavior tests where practical without introducing unnecessary dependencies.

### Localization

Localization is feasible but deferred.

Recommended eventual approach:

- English-only i18n foundation first.
- Central translation function and locale modules.
- Localize UI text, validation/status messages, help, and modal chrome.
- Keep JSON schema keys untouched.
- Treat generated descriptions separately because they need language-aware templates.
- Add key-parity and English-fallback tests.

---

## 7. Working-environment guidance

Preferred split:

- **Planning/goal thread:** long-lived strategic thread for roadmap, phase design, priorities, and architectural decisions.
- **Repository context files:** durable project memory.
- **Work/local environment:** local file inspection, commands, tests, browser/runtime testing, and repository edits.
- **GitHub:** source of truth for committed code.

A normal web URL to the planning thread is safer than relying on fragile internal task/thread linking.

Do not assume a local clone or local environment state from this document alone. Verify machine and repository state before running local commands.

---

## 8. Review style and decision rules

When validating a phase:

- Compare implementation to the written task, not just intent.
- Separate:
  - functional bugs,
  - acceptance misses,
  - missing tests,
  - optional polish,
  - maintainability concerns.
- Do not require a `.1` for optional polish alone.
- Require a `.1` when:
  - acceptance criteria are materially unmet,
  - behavior is incorrect,
  - important regression coverage explicitly required by the phase is missing.
- Be exhaustive but avoid inflating speculative observations into confirmed bugs.
- Prefer a small focused follow-up phase over bundling unrelated work.

---

## 9. Important commands

Primary verification:

```bash
npm run check
```

Also acceptable individually:

```bash
node --check src/app.js
node scripts/check-imports.mjs
node --test
```

Never state these passed unless they were actually run successfully.
