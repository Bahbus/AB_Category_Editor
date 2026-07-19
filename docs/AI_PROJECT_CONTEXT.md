# AI Project Context

> **Repository:** `Bahbus/AB_Category_Editor`  
> **Purpose:** Static JavaScript editor for AetherBags category configuration files used with Final Fantasy XIV.  
> **Current state:** Phase 67 is implemented locally on `agent/phase-67-english-localization-foundation` from freshly fetched merged Phase 66 `origin/main` at `2d4d4a64f42aeedd6d5e941e420c769d9ef2f838`. A dependency-free, DOM-free localization boundary now separates the explicit English catalog from locale resolution and named interpolation. Application orchestration creates an explicit fixed-English translator and injects it into the Preferences modal; the modal's complete title, introduction, tabs, sections, fields, options, checkboxes, hints, status, and owned accessibility label retain their exact English wording through keyed lookup and escaped template sinks. Unsupported locales fall back to English; unknown keys and missing parameters fail explicitly. Phase 66's synchronous pre-stylesheet appearance bootstrap, exact preference allowlist, and CSP/resource ordering remain independent of the module graph. Local `npm run check` passed with 86 JavaScript files, 38 test files, and 499 tests. In-app browser QA covered exact modal copy, keyboard tabs, preference application/reload persistence, focus restoration, Comfortable/Compact layouts at 1280px, 840px, and 390px without body/document/modal overflow, and no CSP violations. CI and GitHub Pages were not run because implementation and publication remain separate.
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

- AetherBags-compatible stored IDs are JSON-number integers from `0` through `4294967295`; numeric strings remain preserved legacy data but block export until explicitly corrected.
- Imported invalid or incompatible numeric IDs are preserved and reported.
- Typed invalid numeric IDs are rejected.
- Preserved invalid imported IDs must not be collected for lookup.
- Validation, lookup normalization, referenced-ID collection, manual lookup search, and regex scanning must agree on row-ID semantics.
- Shared helpers live in `src/rowIds.js`.

### AetherBags export preflight

- `src/exportCompatibility.js` is the DOM-free authority for the complete current category export envelope.
- Export / Copy and Download commit the active control and run the same preflight before compression.
- Confirmed envelope or `System.Text.Json` incompatibilities block compression, clipboard/download work, and saved-state transitions.
- Review-only warnings, including predictable AetherBags Item Sort Criteria normalization, remain exportable.
- Omitted or explicitly empty Item Sort Criteria is a clean Use Global default. Omitted or empty Custom Item Order is also clean unless normalized criteria actively selects Custom Order; neither field is inserted or rewritten merely to change finding presentation.
- Unknown properties are preserved and are not errors merely because the editor does not interpret them.
- Every enumerable value, including unknown nested properties, must retain JSON serialization fidelity; non-finite numbers, cycles, and other unserializable shapes block with a JSON-path finding before export work begins.
- Negative zero must retain its sign in Raw JSON change decisions and blocks export at its exact JSON path before `JSON.stringify` can normalize it to ordinary zero.
- Own `toJSON` accessors are inspected only through property descriptors and block without invoking getters, setters, serializers, or export callbacks; function-valued own `toJSON` data properties remain custom-serialization blockers regardless of enumerability.
- Missing Format/Version and omitted upstream-defaulted category members are review warnings, not unreadable blockers. Unexpected string Format and signed-Int32 Version values are also warnings because the pinned importer ignores them.
- Order and Priority are signed Int32 JSON-number integers; numeric strings, fractions, non-finite values, and coercion-only values are preserved for correction but are not export-compatible.

### Duplicate handling

- Duplicate Order/Priority sort positions are grouped.
- Grouped sort-position warnings use stable category ordering and stable dedupe keys.
- Duplicate list values are reported once per affected field.
- Invalid numeric-ID warnings are grouped once per affected field.
- Duplicate and invalid issues may both count when both conditions apply.

### Allowed Item Name Patterns

- AetherBags stores `AllowedItemNamePatterns` as `List<string>` and evaluates nonblank entries with case-insensitive, culture-invariant .NET regex.
- Browser validation enforces only reliable structural requirements: every element must be a string and must not be empty or whitespace-only.
- Nonblank .NET-only syntax such as `(?>a)` is valid structured input even when JavaScript cannot compile it.
- Structurally invalid imported elements are reported individually and preserved for explicit correction.
- The browser converter is an approximation using fixed case-insensitive JavaScript regex; converter incompatibility is not an AetherBags-invalid finding.

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

Phase 44.1 was merged at `80c1e2e8f0194420a06cbde1b3feeb19bbbceaee`.

### Post-Phase-44.1 review and Phase 45

The post-merge review confirmed a verification-contract gap rather than an application-runtime defect:

- the documented `npm run check` command syntax-checked only `src/app.js`, leaving DOM-only production modules to hosted CI's independent file walk,
- two push/pull-request workflows duplicated syntax, import, and test commands,
- only one workflow explicitly pinned Node 22.

Phase 45 resolves the verification and CI drift without changing runtime source:

- `scripts/check-javascript-syntax.mjs` resolves the repository root from its own location, walks regular directories without following symlinks, skips `.git` and `node_modules`, deterministically discovers every `.js` and `.mjs` file, and invokes the current Node executable with `--check` for each file,
- syntax failures produce a failed result and nonzero direct-invocation exit; success reports the exact checked-file count,
- `npm run check` now runs the exhaustive syntax checker, the existing relative-import checker, and the full Node test suite; `npm test` remains `node --test`,
- focused temporary-fixture tests cover nested `.js`/`.mjs` discovery, deterministic ordering, exclusions, directory-symlink handling, and real valid/invalid syntax-check results,
- the duplicate workflows are replaced by one `Project verification` push/pull-request workflow with `contents: read`, `actions/checkout@v4`, `actions/setup-node@v4`, Node 22, and one `npm run check` step,
- no dependency, package lock, build system, or application-runtime source change was introduced.

Validation actually run:

- `npm run check` passed: 56 JavaScript files syntax-checked, all static relative imports resolved, and all 25 test files / 319 tests passed,
- `git diff --check` passed,
- workflow inspection confirmed one workflow and one `npm run check` invocation on Node 22,
- diff inspection confirmed changes are limited to verification tooling, workflow configuration, tests, package metadata, and durable documentation.

CI and browser QA were not run.

### Phase 46

Phase 46 was merged at `26dd5564830ec7d5f6209d7a37077e4836a25a47` through PR #82.

- The standalone full-width Regex → Item IDs card and its explanatory markup are removed.
- The existing Allowed Item Name Patterns `listEditor(...)` result is retained as `patternsCard`, leaving the reusable list-editor API unchanged and preserving the four rule-card order and two-column responsive grid.
- A `type="button"` action labeled `Convert patterns to Item IDs` is appended to the patterns card's existing input/Add row and directly invokes `openRegexToItemIdsTool`, so categories with no saved patterns can still open the custom-regex workflow.
- The dedicated `.pattern-converter-action` class right-aligns the action when space permits and allows its text to wrap within the card without horizontal overflow.
- Focused source coverage verifies row placement, type, label, dependency wiring, semantic class, removal of the standalone card, and the existing rule that name patterns do not use numeric row-ID deduplication.

Validation actually run:

- focused `test/sourceChecks.test.mjs` passed all 59 tests,
- `npm run check` passed: 56 JavaScript files syntax-checked, all static relative imports resolved, and all 25 test files / 320 tests passed,
- `git diff --check origin/main` passed,
- in-app browser QA was attempted, but the browser transport closed before connection; wide, 840px-boundary, and phone-width runtime QA could not be completed,
- CI was not run.

### Post-Phase-46 review and Phase 47

The post-merge review confirmed that reusable typed list entry always treated commas as multi-value separators. That contract remains correct for Allowed UI Category IDs and Allowed Item IDs, but it split valid regex/name patterns such as `^A{1,3}$` and `^Foo, Bar$` into corrupted fragments.

Phase 47 on `agent/phase-47-pattern-entry-integrity` resolves the finding without changing converter composition or numeric list behavior:

- exported DOM-free `tokenizeListInput(...)` trims typed input, defaults to comma splitting, and can preserve the complete trimmed value as one token,
- `listEditor(...)` adds narrow `splitInputOnCommas` and `inputPlaceholder` options whose defaults retain the established numeric editor contract,
- Allowed Item Name Patterns disables comma splitting and uses `Add one regex/name pattern`, while both numeric ID editors continue using the defaults,
- validation and parsing still complete before list mutation or input clearing, so an invalid submitted pattern adds nothing and remains available for correction,
- direct behavior tests cover default numeric-style splitting, both comma-bearing examples, blank input, and outer-whitespace trimming; focused source checks preserve the Phase 46 composition and dedupe guardrails.

Validation actually run:

- focused `test/listEditor.test.mjs` and `test/sourceChecks.test.mjs` passed all 64 tests,
- `npm run check` passed: 57 JavaScript files syntax-checked, all static relative imports resolved, and all 26 test files / 325 tests passed,
- `git diff --check origin/main` passed,
- in-app browser QA was attempted, but the browser transport closed during connection; wide desktop, the 840px stacking boundary, narrow phone, and interactive comma-bearing pattern checks were unavailable,
- CI was not run.

Phase 47 merged through PR #83 at `8340c9f8417865242a0bf1faba7b3dd156614cc5`. The post-merge review passed `npm run check` with 57 JavaScript files, 26 test files, and 325 tests; exact tree/diff verification passed; GitHub CI and Pages were verified successful; deployed `listEditor.js` matched merged source; browser QA was unavailable because the browser transport closed.

### Phase 48

The pinned AetherBags commit `368bd4677b16594d9d4624efc8269ada7408d4f5` confirms that `AllowedItemNamePatterns` is `List<string>`, `UserCategoryMatcher` skips null/empty/whitespace patterns, and `RegexCache` uses `RegexOptions.CultureInvariant | RegexOptions.IgnoreCase` while returning `null` for invalid .NET patterns.

- Stored-pattern validation now accepts every nonblank string without using JavaScript compilation as AetherBags authority.
- Non-string, empty, and whitespace-only elements produce indexed errors without coercion, deletion, mutation, or duplicate invalid-element findings.
- `src/patternSemantics.js` owns DOM-free storage classification, usable converter-option selection, fixed case-insensitive browser compilation, and original-index removal.
- The converter has no flags field, clearly describes .NET versus JavaScript behavior, rejects blank and JavaScript-incompatible input before scan state, leases, busy UI, fetches, or data mutation, and retains custom entry.
- Saved converter choices omit unusable elements with corrective guidance while retaining original source indices for optional removal.
- Phase 46 placement and Phase 47 comma/numeric tokenization contracts remain covered.

Validation actually run:

- focused behavior and source coverage passed all 119 tests across the touched suites,
- `npm run check` passed: 59 JavaScript files syntax-checked, all static relative imports resolved, and all 27 test files / 336 tests passed,
- `git diff --check origin/main` passed with no output,
- complete diff inspection found no dependency, import/export, dirty-state, modal/focus, responsive, or unrelated architecture changes,
- in-app browser QA was attempted, but the browser transport closed before discovery; desktop, 840px, phone, and interactive runtime checks were unavailable,
- Phase 48 merged through PR #84 at `4aa67ed97b89f35e0bf468628536d2993819b182` and required no 48.1.
- Its post-merge review passed `npm run check` with 59 JavaScript files, 27 test files, and 336 tests; the branch tree exactly matched merged `origin/main`; `git diff --check origin/main` passed; desktop-keyring authentication was verified; PR checks, post-merge Project verification, and GitHub Pages succeeded; deployed `patternSemantics.js` and `regexToItemIds.js` matched merged local source; and browser QA passed stored `(?>a)`, early JavaScript-incompatibility handling, blank custom rejection, and overflow-free desktop/840px/390px layouts.

### Phase 49

The same pinned AetherBags commit declares Level and Item Level bounds as `int`, Vendor Price bounds as `uint`, range Enabled as `bool`, and State/Filter as `int`.

- `src/filterScalars.js` is the DOM-free authority for actual JSON booleans, finite JavaScript integers, signed Int32-compatible Level/Item Level and Filter values, exact uint-compatible Vendor Price values, and State values 0/1/2.
- Import validation rejects coercion-only values, fractions, negative/out-of-range Vendor Price, unsupported State, and non-integer Filter values with component-specific findings.
- Plain-object repair applies each component's established default without coercion; schema-valid signed Level/Item Level and unusual integer Filter values remain exact and reviewable repairs retain before/after context.
- Range number input decisions accept only integers, enforce Vendor Price bounds, keep invalid live text out of the model and dirty path, expose accessible validation, and restore the committed value and sliders on blur.
- State rendering no longer mutates Filter values, and segmented State display/changes retain strict 0/1/2 behavior.

Validation actually run:

- focused scalar, configuration, validation, form-control, and source coverage passed 162 tests,
- `npm run check` passed: 61 JavaScript files syntax-checked, all static relative imports resolved, and all 28 test files / 347 tests passed,
- `git diff --check origin/main` passed with no output,
- in-app browser QA was attempted twice, but the browser transport closed before connection; desktop, 840px, phone, and interactive runtime checks were unavailable,
- CI and GitHub Pages were not run because Phase 49 is not published.

### Phase 49.1

The post-merge Phase 49 review found three acceptance misses: finite JavaScript integers beyond C# `int` were accepted for Level, Item Level, and State Filter; one invalid live Vendor Price component produced an incomplete message and invalidated both inputs; and finding merge dedupe collapsed distinct category findings when IDs were duplicated or absent.

- Explicit `INT32_MIN`/`INT32_MAX` constants and `isSignedInt32Scalar(...)` now govern Level, Item Level, State, and State Filter classification, validation, repair, and typed range decisions. Vendor Price retains exact `0..4294967295` uint compatibility.
- Width-incompatible stored values repair independently to established component defaults without coercion, while exact signed Int32 and uint boundary values remain unchanged.
- DOM-free range validity decisions provide bound-specific messages and per-component invalid/description state. Invalid live input remains non-mutating and restores on blur; reversed valid ranges retain the shared two-input warning.
- Import findings carry private category-object identity for merge dedupe. Distinct duplicate-ID, blank-ID, and missing-ID categories retain separate findings, while repeated analyses of the same category and grouped SortPosition findings still dedupe stably.

Validation actually run:

- focused scalar, configuration, validation, form-control, and source coverage passed 167 tests,
- `npm run check` passed: 61 JavaScript files syntax-checked, all static relative imports resolved, and all 28 test files / 352 tests passed,
- `git diff --check origin/main` passed with no output,
- in-app browser QA was attempted twice, but the browser transport closed before initialization; desktop, 840px, phone, and interactive boundary/accessibility checks were unavailable,
- CI and GitHub Pages were not run because implementation and publication remain separate.

### Phase 50

The verified upstream AetherBags authority remains commit `368bd4677b16594d9d4624efc8269ada7408d4f5`, still `master`/HEAD during implementation. Its `CategoryExportData`, `UserCategoryDefinition`, `CategoryRuleSet`, range/state types, Int32-backed sort enums, `Vector4`, and default `System.Text.Json` options define the boundary.

- `src/exportCompatibility.js` analyzes the full export shape without mutation and returns stable category-scoped findings, severity counts, and explicit blocking decisions.
- The analyzer validates root format/version/categories, category booleans and strings, signed Int32 Order/Priority, finite single-representable Color components, Item Sort Criteria, uint lists, rule strings/rarities, Phase 49.1 range/state scalars, and optional `ForkedFromKey`; unknown properties remain untouched.
- Unsupported, duplicate, empty, or Use Global Item Sort Criteria normalization is reported as reviewable warning behavior when deserialization itself remains possible.
- Export / Copy and Download share one preflight helper. Blocking findings return before busy/compression, copy, download, revision-snapshot completion, dirty clearing, or saved-state changes and open an accessible corrective summary.
- Order/Priority controls accept only signed Int32 JSON numbers, retain invalid transient and imported text for accessible correction, restore blank blur, preserve same-value no-ops, and allow an explicit same-text edit to replace a numeric string with a number.
- Typed Item/UI Category IDs use exact uint parsing. Boundaries `0` and `4294967295` are accepted; overflow, unsafe integers, fractions, negatives, coercion-only values, and oversized digit strings are rejected atomically without rounding.
- Category creation and duplication cannot overflow Order/Priority beyond Int32.
- Non-finite or single-overflow Color components are repaired before any JSON clone/stringify path can turn them into `null`, with one material category repair. Rarity type changes such as `["1"] -> [1]` and `[true] -> [1]` are material; genuine valid reorder-only normalization remains non-material.
- Phase 48 pattern storage behavior, Phase 49/49.1 scalar widths and category identity, Raw JSON/import no-ops, dirty/revision snapshots, modal/focus behavior, lookup leases, responsive CSS, and the dependency-free architecture remain covered.

Validation actually run:

- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 370 tests passed.
- `git diff --check origin/main` passed with no output.
- Upstream AetherBags `master` was fetched/inspected and remained `368bd4677b16594d9d4624efc8269ada7408d4f5`.
- In-app browser QA was attempted twice but unavailable because the browser transport closed during initialization; valid/blocked export, repair-summary, keyboard/focus, and responsive runtime checks were not completed.
- CI and GitHub Pages were not run because publication remains separate.

Deferred work remains unchanged: import/decompression size limits, regex worker/time isolation, CSP/theme bootstrap and Actions SHA hardening, a DOM/E2E harness, and broader pill/list UI redesign are not part of Phase 50.

### Phase 50.1

Phase 50.1 closes post-merge serialization-fidelity and compatibility-classification gaps.

- A DOM-free iterative traversal checks every enumerable root, category, rule, object, and array value without mutation.
- Non-finite numbers receive blocking JSON-path findings before `JSON.stringify`, compression, clipboard/download callbacks, snapshot completion, or saved-state changes.
- Cycles, BigInt, undefined/function/symbol values, sparse arrays, extra array properties, accessors, custom serialization, non-plain objects, and controlled final JSON serialization failures are reported as blocking instead of escaping as pre-compression exceptions.
- Ordinary finite unknown properties remain untouched and survive a JSON serialization round trip.
- Missing Format/Version use upstream defaults; unexpected string Format, null Format, and signed-Int32 Version values are ignored by the pinned importer and remain reviewable warnings.
- Missing category, rule, range/state, Color-component, and sort-criterion members with upstream initializers/value defaults are semantic/defaulting warnings. Explicit null, malformed, or width/type-incompatible members remain blocking unless the complete current path proves them safe.
- The editor still generates the canonical format/version and complete category shape.
- The compatibility modal now distinguishes serialization/read blockers from values AetherBags safely defaults or ignores, and long paths/titles wrap without narrow-screen overflow.

Validation actually run:

- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 375 tests passed.
- `git diff --check origin/main` passed with no output.
- Upstream AetherBags `master` remained `368bd4677b16594d9d4624efc8269ada7408d4f5` and the import/default/use paths were inspected directly.
- In-app browser QA imported nested unknown `1e400`, confirmed Export / Copy and Download both blocked with the exact JSON path before busy/output work, preserved both dirty and saved state in separate runs, retained accessible modal inert/focus/return behavior, and passed desktop, 840px, and 390px overflow checks.
- CI and GitHub Pages were not run because implementation and publication remain separate.

### Phase 50.2

Phase 50.2 closes the remaining Phase 50.1 serialization-fidelity gaps without widening the compatibility boundary.

- `jsonSemanticEqual(...)` distinguishes `-0` from `0` while retaining established object-key-order, array-order, primitive-type, and otherwise-identical JSON no-op behavior.
- The shared iterative serialization-fidelity traversal reports negative zero as a path-specific blocker before either export callback or `JSON.stringify` can normalize it.
- Own `toJSON` descriptors are inspected regardless of enumerability. Function-valued data properties and accessor descriptors block at the exact path; accessors are never read and getters, serializers, and export callbacks remain uninvoked.
- Ordinary non-enumerable properties remain ignored when they cannot affect JSON serialization, and ordinary finite zero remains exportable.

Validation actually run:

- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 381 tests passed.
- `git diff --check origin/main` passed with no output.
- In-app browser QA applied valid Raw JSON with `$.Phase502Nested.negativeZero`, confirmed Export / Copy and Download both blocked with that readable path, retained `Changes not exported`, produced no download, restored focus and modal inert/ARIA state, and had no horizontal overflow at 1280px, 840px, or 390px widths.
- CI and GitHub Pages were not run because implementation and publication remain separate.

### Phase 51

Phase 51 makes item-ordering compatibility findings actionable without adding structured ordering controls.

- Item Sort Criteria controls how matched items are sorted within a category; omission or an empty array deterministically normalizes to Use Global / Ascending and is intentionally silent.
- Custom Item Order supplies item-ID ranks only when normalized criteria includes Custom Order; omission or an empty array is silent otherwise.
- Normalized Custom Order with no custom item list produces one category-stable warning because custom ranks cannot be applied and AetherBags uses a different ordering. A sole Custom Order criterion falls back to the non-global default. Use Global anywhere in the supplied criteria overrides that cross-field warning, matching upstream normalization order.
- Supplied unsupported criteria, duplicate fields/item IDs, Use Global mixed with other criteria, missing criterion members, and other meaningful rewrites remain reviewable. Malformed containers/entries, incompatible scalar widths/types, and incompatible custom item IDs remain blocking.
- Analysis does not insert either property, mutate imported data, dirty the document, change saved-state behavior, or alter export shape.
- Both bundled presets are parsed through the normal importer in regression coverage. The 24-category basic preset retains omitted ordering properties with no ordering findings, issue badges, or ordering-driven modal requirement; the advanced preset retains its three unrelated duplicate sort-position warnings.

Validation actually run:

- `npm run check` passed: 63 JavaScript files syntax-checked, all static relative imports resolved, and all 29 test files / 386 tests passed,
- `git diff --check origin/main` passed with no output,
- upstream AetherBags `master` was reconfirmed at `368bd4677b16594d9d4624efc8269ada7408d4f5`, including import, normalization, ordering UI, and runtime sorting paths,
- in-app browser QA loaded the 24-category basic preset without a review modal or issue badges, completed Export/Copy, reported the downloaded export, showed one actionable Custom Order omission warning with modal focus and background inert/ARIA state, restored focus to Raw JSON on close, and found no horizontal overflow at desktop, 840px, or 390px,
- CI and GitHub Pages were not run because implementation and publication remain separate.

---

## 6. Known future concerns

### `src/ui/categoryEditor.js`

This remains a maintainability hotspot, but the focused Basics, matching-rule, Color, and Range/State leaves now own their local composition. The shell currently owns:

- raw category JSON,
- selected-category header and category-wide validation UI,
- category actions.

Do not refactor it merely for aesthetics. Split it when future feature work would otherwise make the file materially harder to maintain.

The remaining plausible focused module is `rawCategoryEditor.js` if future feature work demonstrates enough friction to justify it.

### Source-check brittleness

Source checks are useful for DOM-heavy static code, but regex-based checks can become formatting-sensitive. Prefer direct behavior tests where practical without introducing unnecessary dependencies.

### Localization

Phase 67 establishes the English-only foundation:

- `src/locales/en.js` is the explicit plain-text English catalog.
- `src/localization.js` owns DOM-free locale resolution, stable keyed lookup, and named interpolation.
- Unsupported locales deterministically use English; unknown keys and missing named parameters throw rather than rendering missing data or unresolved placeholders.
- `src/app.js` owns an explicit fixed-English translator and injects it into the Preferences modal. There is no mutable global locale or user-visible language control.
- The complete Preferences modal is the only migrated proof slice. Translation results entering its existing HTML-template sinks remain escaped; modal-title and status APIs continue to receive plain text.

Deferred sequence:

- Extract broader UI chrome, validation/status messages, help, and other modal text.
- Add a persisted locale preference and user-visible fallback behavior through the established state/orchestration boundary.
- Add locale key-parity checks once a second locale exists.
- Keep JSON schema keys untouched.
- Treat generated descriptions separately because they need language-aware templates.

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
node scripts/check-javascript-syntax.mjs
node scripts/check-imports.mjs
node --test
```

Never state these passed unless they were actually run successfully.

---

## Phase 52 current implementation

- `src/itemOrdering.js` is the DOM-free authority for field/direction metadata, upstream-compatible effective criteria, normalization findings, Custom Order activation/application, summary state, canonical repair, and no-op-aware add/change/remove/reorder decisions.
- `src/exportCompatibility.js`, `src/xivapi.js`, and `src/descriptionGenerator.js` consume that authority. Valid active and retained-inactive custom IDs join Resolve IDs; inactive retained ranks are not described as active ordering.
- The collapsed Item Ordering card sits between the Basics/Color grid and the unchanged four matching-rule cards. Omitted or empty criteria display as Use Global without inserting properties or dirtying data.
- Canonical criteria are editable with accessible field/direction, add/remove, and priority controls. Reviewable normalization has a deliberate rewrite action; unrepresentable values route to selected-category Raw JSON and remain untouched.
- Custom ranks reuse the Item lookup/search/cache/lease stack. The reusable list editor's ordered and strict-no-op-input options are opt-in, so Allowed Item IDs, UI Category IDs, and name patterns retain their defaults.
- Real ordering changes refresh inline findings, the details summary, category header, and sidebar locally. Disabled moves, identical selections, duplicate additions, and canonical repair no-ops do not mutate or dirty.

Validation actually run:

- `npm run check`: 66 JavaScript files, all relative imports, 30 test files, 403 tests passed.
- `git diff --check origin/main`: passed with no output.
- In-app browser QA passed the runtime behaviors summarized in the current-state banner, including an untouched 24-category basic-preset export with both ordering properties absent from every category.
- CI and Pages were not run; publication remains separate.

## Phase 52.1 current implementation

- `analyzeItemOrdering(...)` now reports export representability separately from safe structured editability. Criterion objects with own enumerable properties beyond `Field` and `Direction` remain compatible and produce no new finding, but the structured criterion editor is withheld so no edit can discard those properties.
- The Item Ordering card explains the preservation boundary and routes directly to the existing selected-category Raw JSON control without changing category data, dirty state, or findings during analysis, rendering, disclosure changes, or routing.
- A DOM-free list-mutation focus plan covers add, move, and removal boundaries. Criterion controls and opt-in ordered list pills use it to prefer the corresponding moved action, then a useful enabled equivalent, with next/previous removal and add/input fallbacks.
- Existing canonical, reviewable, normalization, custom-rank, lookup, duplicate/no-op, validation-refresh, and description behavior remains unchanged.

Validation actually run:

- `npm run check`: 66 JavaScript files, all relative imports, 30 test files, 408 tests passed.
- `git diff --check origin/main`: passed with no output.
- In-app browser QA was attempted with two fresh tabs and later retried with two additional fresh tabs, but the browser webview did not attach. Desktop, 840px, and 390px runtime checks remain unavailable.
- CI and Pages were not run; publication remains separate.

## Phase 53 current implementation

- Existing CSS now documents and implements standard text, compact text, square icon, primary, destructive, and link-style button roles without a markup-wide rewrite or dependency.
- Category-header and sort-criterion movement actions use the same neutral `↑`/`↓` icon-button treatment. Their precise category- or criterion-specific accessible names and titles remain separate from the visible glyphs, and native disabled boundaries remain in place.
- Ordered Custom Item Rank arrows use compact 18px borderless pill-icon controls so pills retain their dense height. Enabled movement glyphs glow with the accent on hover/focus; `×` is exclusively destructive and glows with the danger color. Disabled glyphs stay muted and do not glow.
- Standalone icon targets are square 30px controls in comfortable density and square 26px controls in compact density, with a separate 14px glyph size. The topbar Help icon intentionally remains 32px. The 18px in-pill exception is confined to controls inside pills.
- Exact `Add` actions now display `+`. List-entry add icons are disabled while their adjacent text field is blank and update with input; the criterion add icon remains available because it accompanies a populated select rather than blank text.
- Sort-criterion removal displays `×`, category deletion displays `🗑`, and each retains a precise contextual accessible name/title. `Duplicate` remains descriptive text.
- Batch lookup displays `🔍`, is positioned inside the pill-list container, and is hidden unless that list contains at least one unresolved ID. Manual name search remains the descriptive `Search` action.
- A final all-button layout audit keeps legacy fixed heights limited to text actions; the `+` beside the criterion select now remains a true 30px/26px square instead of inheriting the former 35px/31px text-button height.
- The visible-label audit also changed `Sort by Order` to sentence-case `Sort by order`; established acronyms and slash-based product actions remain unchanged for clarity.
- Movement, ordering, removal, duplicate, dirty/no-op, lookup, modal, export, and Phase 52.1 focus-recovery callbacks are unchanged.

Validation actually run:

- `npm run check`: 66 JavaScript files, all relative imports, 30 test files, 412 tests passed.
- `git diff --check origin/main`: passed with no output.
- Final-build in-app browser QA populated criteria, three Custom Item Ranks, ordinary ID pills, and an unresolved ID, then covered System, Dark, Light, High Contrast, Aetherial, and Dalamud in comfortable and compact density at 1280px, 840px, and 390px.
- Every matrix entry retained 18×18 borderless pill controls inside 28px pills, 30px/26px standalone icon minima, and zero document/body horizontal overflow. Blank-input `+` controls disabled, enabled after input, and disabled again after clearing; unresolved lookup became visible inside its pill shell and cached/empty lists hid it. Category/criterion/pill glyphs exposed complete contextual names and titles, and disabled arrows remained natively unavailable.
- Pointer hover and keyboard focus traversal were not produced by the browser automation interface, so the actual glow/focus-visible rendering remains source/test verified rather than runtime asserted.
- Two later post-matrix browser retry sessions failed to attach across five fresh-tab attempts in total, so the final criterion-Add square-height correction is source/test verified; the preceding final-build matrix remains valid for every other audited button and layout relationship.
- CI and Pages were not run; publication remains separate.

## Phase 53.1 current implementation

- `--input-control-height` is 38px in Comfortable density and 34px in Compact density. Reusable Allowed-section list Add buttons use that square size and match their associated text input.
- `--ordering-control-height` is 35px / 31px. Add criterion uses that square size and matches its associated select; criterion move/remove icons retain the 30px / 26px standalone size inside a select-height action rail that centers them vertically.
- Category-header arrows, Duplicate, and trash share the 30px / 26px standalone height. Search and Generate retain their existing input-height match and narrow-width stacking.
- `selectedCategoryStructuralFocusPlan(...)` provides a DOM-free focus order for Move up, Move down, Duplicate, and confirmed Delete. Rerenders retain the same Move action when enabled, choose the opposite direction at the first/last boundary, keep Duplicate on the selected copy, and route Delete to the newly selected sidebar category before header-action fallbacks. Deleting the final category falls back to Add category.
- Pill move/remove controls remain borderless 18px targets and keep their established hover glow, but their `:focus-visible` state now has a 2px outline and offset. Theme overrides retain distinct focus treatment, including the High Contrast warning-color outline and halo.
- Disabled buttons omit their tooltip `title` while retaining their accessible name. The shared tooltip synchronizer allows an explicit disabled-state explanation when genuinely needed, but no current button uses that exception.
- The shared button hover border applies only to enabled controls, so disabled controls do not gain an accent outline under the pointer.
- Focused category/source tests cover contextual sizing in both densities without weakening the standalone 24px guard, structural focus plans and wiring, and visible pill focus rather than `outline: 0`.

Validation actually run:

- `npm run check`: 66 JavaScript files, all relative imports, 30 test files, 418 tests passed.
- `git diff --check origin/main`: passed with no output.
- In-app browser QA measured Allowed-section Add controls at 38×38 Comfortable / 34×34 Compact beside equal-height text inputs, Add criterion at 35×35 / 31×31 beside equal-height selects, centered criterion move/remove actions at 30×30 / 26×26, equal-height category-header actions at 30px / 26px, and pills at 18×18.
- Move focus remained on the live same-direction action, changed to the opposite action at disabled boundaries, Duplicate focused the new copy's Duplicate action, and confirmed Delete focused the newly selected sidebar category.
- System, Dark, Light, High Contrast, Aetherial, and Dalamud all produced a solid 2px keyboard-focus outline with 2px offset on pill controls; High Contrast used its yellow outline and halo.
- Comfortable and Compact layouts had zero body/document horizontal overflow at 1280px, 840px, and 390px. CI and Pages were not run; publication remains separate.
- Live disabled-button inspection found no rendered disabled button with a `title`; entering a valid Allowed UI Category ID re-enabled its Add button and restored the normal enabled-state tooltip.
- Pointer hover could not be reliably asserted through browser automation; the enabled-only `button:not(:disabled):hover` selector and focused source guard verify disabled hover exclusion.

## Phase 54 current implementation

- The advanced preset was decoded through `parseImportedText(...)`, the five confirmed `Desciples` values and two swapped Materia descriptions were corrected, and the payload was regenerated through the established gzip+Base64 exporter.
- Decoded comparison against freshly fetched `origin/main` reports exactly seven semantic changes: `$.Categories[0].Description`, `$.Categories[8].Description`, `$.Categories[9].Description`, `$.Categories[10].Description`, `$.Categories[17].Description`, `$.Categories[18].Description`, and `$.Categories[46].Description`. Category count, order, IDs, names, rules, colors, flags, ordering fields, unknown properties, and every other value remain unchanged. The basic preset constant is byte-for-byte identical to `origin/main`.
- Pill-list border width, padding, and first-row height are explicit CSS tokens. `.pill-lookup-button` derives its top offset from those tokens and `--button-icon-target`, producing an 8px Comfortable inset and 10px Compact inset while retaining the existing 7px right inset and reserved right padding.
- Focused preset tests parse through the normal importer, require 55 advanced categories, assert all seven exact descriptions, and reject any remaining `Desciples`. Focused source/CSS coverage retains unresolved-only placement, accessibility wiring, reserved space, and the 30px/26px target contract while proving the derived centers coincide.

Validation actually run:

- `npm run check`: 66 JavaScript files, all relative imports, 30 test files, and 419 tests passed.
- `git diff --check origin/main`: passed with no output.
- In-app browser QA loaded the advanced preset and verified all seven corrected descriptions. Unresolved Item and ItemUICategory actions appeared while resolved/empty states hid them. Comfortable and Compact measurements at 1280px, 840px, and 390px produced a zero-pixel center offset against the first 28px pill, retained 30px/26px square targets and a 7px right inset, and produced zero horizontal overflow. The 25-pill ItemUICategory list wrapped across multiple rows at every width while the lookup action remained aligned with its first row.
- CI and Pages were not run; publication remains separate.

## Phase 56 current implementation

- The former `test/sourceChecks.test.mjs` monolith is replaced by `test/applicationDataFlowSource.test.mjs`, `test/uiAccessibilitySource.test.mjs`, and `test/lookupImportExportSource.test.mjs`. `testSupport/sourceFiles.mjs` owns deterministic repository-root reads and recursive `.js`/`.mjs` source discovery without entering Node's automatic `test/` file discovery.
- The source-guard baseline was 1 file, 1,073 lines, and 79 tests. The new organization is 3 source-guard files and 76 tests. Every surviving original name appears exactly once with no missing or extra name.
- Three source tests were deliberately retired: the import-summary helper test-import assertion is covered by the DOM-free helper suite itself; stable duplicate sort-position grouping is covered by direct validation behavior tests; and lookup chunk ownership is now covered by a direct multi-chunk `fetchLookupBatch(...)` test that rejects an out-of-chunk stale name.
- `decideUniqueItemAdd(...)` and `decideItemRemove(...)` were removed from `src/itemOrdering.js` because neither runtime code nor any reusable behavior consumes them. Their imports and helper-only assertions were removed from `test/itemOrdering.test.mjs`; the remaining ordered-move assertions were already covered by the criterion-decision test.
- Exact labels, callbacks, accessibility names, focus order, CSS dimensions, and no-op sequencing remain guarded. Newline-sensitive adjacency checks were relaxed only to structural whitespace matching. `.button-compact` remains in `styles.css` as the intentional compact-text taxonomy role and remains covered by the button-taxonomy source guard.
- No runtime UI, validation, import/export, lookup, dirty-state, focus, responsive CSS, preset data, or dependency behavior changed.

Validation actually run:

- focused source-guard, item-ordering, and XIVAPI coverage passed all 102 tests;
- source-name accounting confirmed 79 original names, 3 documented retirements, 76 surviving names, and zero duplicates, missing names, or extras;
- `npm run check` passed: 69 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 416 tests passed;
- `git diff --check origin/main` passed with no output;
- browser QA was not required because the runtime diff is limited to removal of the two unconsumed item-ordering helpers;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 57 current implementation

Phase 57 merged through PR #97 at `291ad8db3cef2060a5a891963c9ee4103c2b4c58`.

- `src/ui/matchingRulesEditor.js` owns the existing `grid cols-2` composition for Allowed UI Category IDs, Allowed Item IDs, Allowed Item Name Patterns, and Allowed Rarities in that exact order.
- The module owns its required row-ID parser/dedupe imports, structural pattern validation, list-editor composition, converter placement, rarity metadata/normalization, and the private rarity checkbox renderer. It receives only the category list, dirty callback, narrow rule-change callback, converter launcher, and established list-editor lookup dependencies.
- `src/ui/categoryEditor.js` delegates the grid after Item Ordering and before Range Filters. It retains validation, optional auto-description, and sidebar refresh orchestration through the unchanged validation → description → list-render callback sequence.
- Existing source guards were redirected to the new owner without renaming or duplication. One application/data-flow guard proves delegation and the absence of the moved parsing, list, rarity, and grid composition from `categoryEditor.js`.
- No CSS, reusable list-editor behavior, validation semantics, converter behavior, presets, category structural actions, or unrelated UI ownership changed.

Validation actually run:

- focused category-editor, list-editor, row-ID, validation, pattern, and three source-suite coverage passed all 144 tests;
- source-name accounting confirmed all 76 Phase 56 source-guard names remain exactly once, with zero removals or duplicates, plus one new ownership guard;
- `npm run check` passed: 70 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 417 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px: exact card order, desktop two-column layout, narrower single-column stacking, valid/duplicate/invalid numeric entry behavior, comma-preserving pattern entry, converter placement/opening, rarity toggling/order, unresolved lookup visibility and zero-pixel first-pill alignment, manual search availability, and zero body/document horizontal overflow;
- the only captured console error was the established validation message intentionally triggered by submitting `-1`; no unexpected module-load or runtime errors were observed;
- CI and GitHub Pages were not run because implementation and publication remain separate.

Post-merge review evidence:

- the local Phase 57 tree and merged `main` were identical;
- `npm run check` passed with 70 JavaScript files, all static relative imports resolved, 32 test files, and 417 tests;
- `git diff --check origin/main` passed with no output;
- GitHub post-merge Project verification and GitHub Pages deployment both succeeded for `291ad8d`;
- in-app browser QA was attempted in two fresh tabs, but the webview did not attach, so the post-merge review did not claim runtime QA passed. The successful browser matrix above is implementation-time Phase 57 evidence.

## Phase 58 and Phase 58.1 current implementation

- Phase 58 moved the complete existing Color card and exported `normalizeRgbInputValue(...)` into `src/ui/colorEditor.js`, but its shared visual refresh updated only the picker, Hex RGBA, alpha, preview, and their committed display snapshots. Each R/G/B number control retained an isolated `lastCommitted` closure, so the merged deployment could leave stale byte fields visible after a Hex or native-picker commit.
- Post-merge browser review reproduced the defect from 128/255/255: committing `#11223344` updated the picker, preview, alpha, and sidebar accent while R/G/B remained 128/255/255; focusing stale R and then G unintentionally rewrote the result to `#80223344`.
- Phase 58.1 gives each RGB control a private synchronization hook that rewrites its displayed byte and local committed snapshot from `category.Color`. The existing `updateColorVisuals()` calls all three hooks alongside picker, Hex RGBA, alpha, preview, and shared snapshot refreshes, so Hex, native-picker, RGB, and alpha real commits all converge on one complete linked-control update.
- `src/ui/categoryEditor.js` imports `renderColorEditor(...)`, creates a fresh color-specific scheduled sidebar callback, and appends the returned card after Basics in the unchanged top-grid order. Its existing Range/State scheduler is a separate instance, so Color and filter events cannot share a pending flag.
- The leaf receives only the category, dirty callbacks, and scheduled callback. It does not import category-editor, application-state, or application-orchestration modules. The scheduler implementation remains owned once by `categoryEditor.js`.
- Blank/non-finite RGB restore, finite round/clamp, displayed no-ops, higher-precision native/alpha no-ops, invalid/equivalent/changed Hex decisions, immediate Hex rendering, scheduled RGB/native/alpha rendering, and Enter/change/blur single-commit sequencing remain unchanged. Synchronization performs no dirty call, sidebar render, scheduler call, or focus change.
- Direct normalization and source guards read the Color owner. Focused guards prove the RGB display/baseline refresh, absence of synchronization side effects, Color delegation, absence of color-control implementation from `categoryEditor.js`, Basics-before-Color placement, the narrow leaf dependency boundary, and separate Color versus Range/State scheduler instances.
- `src/ui/categoryEditor.js` is 469 lines after the extraction. Its remaining cohesive pressure points are Basics/generated-description composition, Range filters, State filters, selected-category Raw JSON, validation UI, and category structural actions.
- No CSS, visual design, color quantization, data shape, reusable form control, matching-rule, Item Ordering, preset, dependency, localization, import/export, selection, focus, or non-color editor behavior changed.

Validation actually run:

- `npm run check` passed: 71 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 418 tests passed;
- `git diff --check origin/main` passed with no output;
- local browser QA was attempted with two fresh in-app tabs and later retried with two additional fresh tabs, but none of the four webviews attached, so Comfortable/Compact checks at 1280px, 840px, and 390px plus Hex-to-RGB, native-to-RGB, RGB-to-linked-controls, alpha preservation, invalid/equivalent input, stale-blur, focus, and horizontal-overflow checks were unavailable;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 59 current implementation

- `src/ui/rangeStateFiltersEditor.js` owns both unchanged disclosure cards, their private display-name maps and fallback formatting, Range defaults and width-aware bounds, Range Enabled/number/slider composition, State segmented controls, and local disclosure-summary refreshes.
- The leaf receives only `cat.Rules` plus dirty, filter-change, and scheduled-render callbacks. It does not import application state, `categoryEditor.js`, or application orchestration.
- `categoryEditor.js` retains category validation and optional generated-description work behind one narrow callback, retains the shared Range/State scheduler instance, and continues to create a separate Color scheduler with an independent pending flag.
- Each live edit retains the established sequence: the existing control mutates its filter, the leaf marks dirty and refreshes the relevant local summary, the orchestrator refreshes category validation and optionally generates a description, then the leaf requests one scheduled sidebar render.
- Item Ordering, matching rules, Range Filters, State Filters, and Advanced retain their exact order. The public filter-summary re-exports remain in `categoryEditor.js`.
- Existing focused source guards were redirected to the new owner without renaming, and one new ownership/data-flow guard covers delegation, the leaf dependency boundary, scheduler separation, and card order.

Validation actually run:

- focused filter-scalar, form-control, description, validation, category-editor, summary, and three source-suite coverage passed all 197 tests;
- `npm run check` passed: 72 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 419 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px: Range/State order and summaries, three-column desktop and single-column narrower layouts, Enabled/Min/slider edits, blank and invalid-value restoration, State segmented changes, labels/roles, focus retention, and zero body/document horizontal overflow;
- a fresh-tab retry for a separate live Maximum commit did not attach, so Maximum edit behavior remains focused-test/source verified rather than runtime asserted;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 60 current implementation

- `src/ui/basicEditor.js` owns the existing Basics card: Enabled/Pinned and the local warning area; Name/Description; the Generate action and review modal; generated-description blank, identical, copy, replace, and cancel paths; signed-Int32 Order/Priority controls; the Basics-only debounced sidebar helper; and description-input synchronization.
- The leaf receives the selected category, category list, dirty/list services, Name/header and category-validation callbacks, lookup/preferences/clipboard services, and active-field commit callback. It returns only `{ card, maybeAutoGenerateDescription, refreshValidation }` and does not import application state, the category shell, or sibling editor leaves.
- `categoryEditor.js` retains the selected-category header and issue badge, overall card order, category-wide validation, structural actions, the shared Range/State scheduler, the separate Color scheduler, and cross-card orchestration. It re-exports `getBasicSwitchWarnings` from the leaf.
- Item Ordering, matching-rule, Range, and State callbacks retain validation before optional generation and then their existing immediate or scheduled sidebar refresh. Basics remains before Color, and all later cards retain their established order.
- Existing generated-description and text-control guards now read the leaf owner. A focused ownership/data-flow guard proves delegation, absence of moved controls/modal from the shell, the narrow controller API, Basics-before-Color order, callback ordering, scheduler separation, and the public warning re-export.
- `src/ui/categoryEditor.js` fell from 404 to 285 lines. `src/ui/basicEditor.js` is 163 lines. No CSS, data-shape, validation, import/export, lookup, selection, focus, scheduler, dependency, or visual-design behavior changed.

Validation actually run:

- focused category-change, category-editor, form-control, summary, and three source-suite coverage passed all 150 tests;
- `npm run check` passed: 73 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 420 tests passed;
- `git diff --check origin/main` passed with no output;
- in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px with Basics-before-Color placement and zero body/document horizontal overflow. Live checks passed Name/header/debounced-sidebar synchronization; blank, identical, replacement-confirmed, copied, and cancelled generation; Name-blur and downstream rule auto-generation; Enabled/Pinned warning and issue-badge behavior; Order/Priority unchanged, blank, invalid, valid, restoration, and focus continuity; and generated-description modal initial/return focus and close state. No browser console errors were recorded;
- CI and GitHub Pages were not run because implementation and publication remain separate.

## Phase 61 current implementation

- `analyzeItemOrdering(...)` exposes the DOM-free `customOrderRelevant` result. It is true when normalized criteria actively contains Custom Item Order, a valid nonempty custom rank list is retained while inactive, or the stored custom-order container/items are malformed or incompatible and require visible Raw JSON correction.
- Inactive omitted and valid empty Custom Item Order values produce `customOrderRelevant === false`. The Item Ordering body does not append the Custom Item Order section at all; the former instructional placeholder is removed, and no extra disclosure, CSS concealment, focusable hidden controls, or reserved body element was added.
- Active omitted/empty lists keep the existing actionable warning and ranked editor. Active nonempty lists keep the existing editor and applied-order summary. Retained inactive nonempty lists keep their warning, editor, exact IDs, and Resolve IDs participation. Malformed inactive data keeps the existing `Edit in Raw JSON` route without mutation.
- Criterion add/change/remove continues through the existing local Item Ordering rerender. Field and direction changes now pass explicit surviving focus keys. Removing the final retained rank while inactive rerenders the Item Ordering body, omits the now-irrelevant section, and focuses the surviving Add criterion select.
- Rendering or omitting the section does not insert or delete `CustomItemOrder`, change criteria, clear ranks, mark dirty, invoke callbacks, alter warnings/descriptions/export analysis, or normalize stored data.

Validation actually run:

- focused item-ordering, lookup, accessibility/focus, description, export-compatibility, application-data-flow, category-editor, and list-editor coverage passed all 129 tests;
- `npm run check` passed: 73 JavaScript files syntax-checked, all static relative imports resolved, and all 32 test files / 423 tests passed;
- `git diff --check origin/main` passed with no output;
- final-build in-app browser QA passed Comfortable and Compact at 1280px, 840px, and 390px: inactive empty data rendered only the Item Sort Criteria section with zero reserved Custom Item Order body element and zero body/document horizontal overflow; selecting Custom Item Order showed the section and active-empty warning immediately; adding ranks cleared the warning; switching to Quantity retained the ranked editor and inactive warning; removing the final retained rank removed the entire section and focused the live Add criterion select; malformed inactive data kept the Raw JSON correction action visible; and no console errors were recorded;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold.

## Phase 62 current implementation

- `src/actionAvailability.js` centralizes side-effect-free decisions for trimmed nonblank text, manual-search running state, normalized lookup-result duplicates, converter Scan/Add work, identity-order sorting, exact one-based numeric renumbering, uncached referenced IDs, and empty/busy cache clearing.
- Every reusable manual XIVAPI Search starts disabled, enables for nonblank text, disables before acquiring its producer lease, and recomputes from the current input in `finally`. Blank click/Enter paths remain inert. Result Add actions disable for IDs already present and all rendered actions for the same normalized ID resynchronize immediately after an add; accessible names remain and disabled tooltip titles are removed.
- Import, full Raw JSON Apply/Copy, and selected-category Raw JSON Apply recompute from trimmed input. Empty/whitespace-only candidates disable; malformed nonblank candidates remain enabled and retain their established errors, confirmation, no-op, repair, clipboard, replacement, and focus behavior.
- Converter Scan follows trimmed pattern plus active-scan state and still explains JavaScript-incompatible nonblank .NET patterns. Add matched IDs requires a new normalized ID or a currently removable saved pattern, stays disabled while scanning, and resynchronizes after scan/cancel, pattern selection, and removal-option changes.
- Sort, Renumber, and Resolve IDs recompute after existing list/all-render transitions. Resolve remains disabled for no references and fully cached references, disables only while its own lookup is active, and recomputes after completion. Cache clearing requires at least one stored entry and no active lookup/scan producer; the modal subscription retains the race-safe clear guard.

Complete button inventory outcome:

- Contextual native-disabled controls are category Search Clear when its field has no characters; category/category-criterion/ordered-list movement at their boundaries; ordinary list Add for blank input; per-list unresolved-name lookup visibility/running state; export/download for zero categories; and every Phase 62 control listed above.
- Add category, Duplicate, Delete opener, list/criterion removal, criterion Add, normalization repair, and generated-description actions stay enabled when rendered because they mutate data or provide established no-op/correction feedback. Regex conversion stays available with no saved patterns because it supports custom input.
- Import/Upload/Raw JSON/Lookup Cache/Preferences/Help/preset openers, selected-category and Raw JSON correction routes, category selection, preference tabs, modal Close/Cancel, destructive confirmations, and clipboard retry actions stay enabled because they navigate, open or close a surface, confirm/cancel, expose cache state, select a file, or provide correction/clipboard feedback. The active preference tab remains a standard operable tab, not an unavailable action.
- Clear category Search stays enabled for any characters, including whitespace, because its assigned action removes the entered characters and restores input focus even when trimmed filtering is inactive. Generate remains enabled for identical output because the established identical-description feedback is useful work.

Validation actually run:

- focused availability, category-change, pattern, DOM/tooltip, cache-operation, lookup/import/export/no-op, and accessibility/source coverage passed all 117 tests;
- `npm run check` passed: 75 JavaScript files syntax-checked, all static relative imports resolved, and all 33 test files / 432 tests passed;
- `git diff --check origin/main` passed with no output;
- final-build in-app browser QA passed Search blank/nonblank/running/post-request and duplicate Add synchronization; Import and both Raw JSON blank/malformed behavior; converter blank/incompatible/running/new-ID/all-duplicate keep/all-duplicate saved-pattern removal behavior; exact Sort/Renumber/Resolve transitions; nonempty/empty cache clearing; modal feedback and return-focus paths; and accessible disabled names with zero disabled tooltip titles;
- Comfortable and Compact passed at 1280px, the 840px stacking boundary, and 390px with zero document horizontal overflow. Expected validation and lookup-warning feedback was exercised and no unexpected console error was recorded;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold.

## Phase 63 current implementation

- `src/importExport.js` documents shared production ceilings: 32 MiB selected files, 32 MiB UTF-8 JSON text, 8 MiB decoded compressed gzip input, and 32 MiB decompressed gzip output.
- Plain/imported JSON and both Raw JSON paths count UTF-8 bytes before `JSON.parse`. Base64 is scanned without first constructing a whitespace-stripped copy, rejects an oversized decoded estimate before `atob`, and rechecks the returned binary length defensively.
- Gzip decompression now reads byte chunks incrementally, rejects and cancels as soon as output crosses the ceiling, releases the reader on every exit, and uses streaming `TextDecoder` calls so Unicode split across chunks remains exact.
- File uploads check `file.size` before `file.text()`. Full Raw JSON Copy uses the same boundary before clipboard work. Oversized candidates return through existing inline/status errors before validation, confirmation, replacement, selection, lookup, dirty/save transitions, compression, clipboard/download, or structural rendering.
- Normal JSON, gzip+Base64, bundled presets, whitespace-tolerant Base64, Unicode, repair summaries, semantic Raw JSON no-ops, confirmation order, upload/modal focus behavior, export generation, and Phase 62 action availability remain unchanged within the limits.

Validation actually run:

- focused ingestion, Raw JSON/source wiring, import-summary, category-change, and preset coverage passed all 121 tests;
- `npm run check` passed: 75 JavaScript files syntax-checked, all static relative imports resolved, and all 33 test files / 444 tests passed;
- `git diff --check origin/main` passed with no output before the durable-document update and was rerun on the final diff;
- in-app browser QA passed normal plain JSON and bundled gzip+Base64 import, unchanged full and selected Raw JSON with `No changes`, Import modal initial/return focus plus background `aria-hidden`, and zero body/document horizontal overflow in Comfortable and Compact at 1280px, 840px, and 390px;
- the browser file chooser was unavailable to automation, and no 32 MiB browser payload was created. Exact/over file, JSON, Base64, and decompression boundaries remain direct small-limit test authority. No unexpected application console error was observed; only the expected import-review warning and Electron's development CSP warning appeared;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold.

## Phase 64 current implementation

- `src/tools/regexBatchWorker.js` is the only runtime owner of `regex.test(name)`. It compiles each request with fixed `i` behavior and returns only serializable batch identity, evaluated-count, match, limit, or error data.
- `src/tools/regexBatchEvaluator.js` constructs the module worker with `new URL('./regexBatchWorker.js', import.meta.url)`, sends at most 50 normalized candidates at once, and enforces a 1,000 ms deadline per request. Fifty candidates keeps cloning and ordinary work small; one second leaves conservative room for slower phones while stopping pathological JavaScript evaluation promptly off the UI thread.
- The evaluator injects worker and timer boundaries for deterministic tests, rejects construction/post/runtime/message failures without fallback, clears its one pending timer/listener state on every exit, ignores stale scan/batch replies, and terminates the underlying worker once through an idempotent lifecycle.
- `src/tools/regexToItemIds.js` still owns XIVAPI fetch/pagination, row extraction, strict ID normalization, stable unique-match collection, the exact configured maximum, the 300-result display cap, completed-batch progress, useful-name caching/persistence, Add and optional saved-pattern removal, dirty/no-op state, modal rendering, focus return, busy UI, and the application-owned lookup-cache producer lease.
- Cancel and modal Close mark the scan canceled, abort its fetch controller, and terminate the evaluator immediately. Timeout also aborts the fetch controller, retains only matches from completed batches, and explicitly says that slow JavaScript conversion does not mean the pattern is invalid for AetherBags/.NET.
- Blank and JavaScript-incompatible patterns still return before worker construction, match reset, cache lease/busy state, fetch work, or data mutation. Main-thread compilation remains syntax-only; there is no main-thread regex evaluation fallback.

Validation actually run:

- focused worker/evaluator, pattern, availability, converter, lookup/cache, no-op, and source coverage passed all 65 tests;
- `npm run check` passed: 78 JavaScript files syntax-checked, all static relative imports resolved, and all 34 test files / 460 tests passed;
- `git diff --check origin/main` passed with no output before the durable-document update and was rerun on the final diff;
- complete diff inspection confirmed changes are limited to the worker/evaluator boundary, converter integration, focused tests/source guards, and the three durable documents; no dependency, schema, preset, import/export, CSS, AetherBags compatibility, or unrelated editor change was introduced;
- final-build in-app browser QA passed a custom fixed-`i` scan, saved-pattern scan, progress, exact match addition, duplicate-only disabled Add, optional saved-pattern removal, cancellation during a pathological pre-completion batch, ordinary active-scan cancellation with completed progress, pathological one-second timeout with responsive controls and AetherBags-safe copy, and modal Close during a scan with return focus, hidden busy state, restored background ARIA, and an enabled non-busy cache clear action;
- the Regex → Item IDs modal had zero body, document, and modal horizontal overflow in Comfortable and Compact at 1280px, 840px, and 390px. No unexpected application console error appeared; the deliberate timeout status and Electron's development CSP warning were expected. CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold.

## Phase 65 current implementation

- `src/xivapiRequest.js` is the shared DOM-free request boundary. Its production policy is 15,000 ms per request, with optional caller signal, injected fetch/timer functions, and a test-only deadline override.
- The boundary owns an internal abort controller, adopts an already-aborted caller reason before starting fetch/timer work, settles timeout or caller cancellation exactly once, ignores late fetch settlement, and removes its timer and caller listener after success, HTTP failure, JSON failure, timeout, or cancellation.
- `XivapiRequestTimeoutError` distinguishes the automatic deadline from user cancellation. Existing HTTP error text, JSON failure classification, URL/query construction, English selection, and strict row-ID normalization remain unchanged.
- Batch lookup forwards the same request options through multi-row and single-row fallback requests. A timed-out multi-ID chunk records one established failure entry per ID and stops that chunk without bisection or individual retries; ordinary failures retain recursive bisection and single-row fallback. No timeout writes sentinel names or replaces a useful cached name.
- Manual Search, per-list lookup, global Resolve IDs, and regex scanning keep their existing `finally` ownership of producer leases, busy state, action availability, and status severity. Regex network timeout copy is distinct from Phase 64 JavaScript-worker timeout and user cancellation, and completed worker batches/cache writes remain usable.
- No timeout or cancellation mutates category data, marks dirty, clears saved state, replaces the lookup-cache object, changes its schema, or changes native disabled-state policy.

Validation actually run:

- focused request, XIVAPI, worker/evaluator, converter, lookup/cache, action-availability, and source coverage passed 32 request/XIVAPI tests and 111 related integration/source tests;
- `npm run check` passed: 80 JavaScript files syntax-checked, all static relative imports resolved, and all 35 test files / 478 tests passed;
- `git diff --check origin/main` passed with no output, and complete diff inspection found no unrelated change;
- ordinary in-app browser QA passed manual Item Search, per-list Item lookup, global Resolve IDs, and regex scanning. A controlled same-origin nonanswering XIVAPI endpoint with a temporary one-second deadline exercised Search, per-list/global Resolve IDs, and regex request timeout recovery; a temporary five-second deadline exercised user Cancel distinctly as `Regex scan canceled`. Controls recomputed, busy state cleared, and Add matched IDs stayed disabled with no completed matches;
- modal Close restored focus to Convert patterns to Item IDs and removed background `aria-hidden`. Comfortable and Compact each had equal document/body client and scroll widths at 1280px, 840px, and 390px;
- production code was restored to the real XIVAPI endpoint and 15,000 ms deadline before final validation. No real 15-second stalled request, native file chooser, CI, or GitHub Pages run was performed because deterministic seams cover the production policy and implementation/publication remain separate. Phase 55 remains on hold.

## Phase 66 current implementation

- `src/startupPreferences.js` owns the synchronous pre-stylesheet appearance bootstrap as an external same-origin classic script. It retains the `aetherbagsEditorPreferences` key, six established Theme values, two Density values, HTML defaults, malformed/absent/unavailable-storage tolerance, and nonfatal behavior. It does not import or wait for `src/app.js`, modules, or DOM readiness. Direct tests execute the script with controlled storage/document boundaries and iterate `EDITOR_PREFERENCE_OPTIONS`, so the deliberately duplicated startup literals cannot drift silently from `src/state.js`.
- `index.html` places the CSP meta immediately after the charset declaration, before the favicon, startup bootstrap, stylesheet, and application module. The exact effective policy is `default-src 'self'; base-uri 'none'; object-src 'none'; script-src 'self'; script-src-attr 'none'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self'; connect-src 'self' https://v2.xivapi.com; worker-src 'self'; frame-src 'none'; form-action 'none'`.
- The CSP deliberately allows inline style attributes, not inline style elements or script, because runtime code sets category color/tint variables, Color preview background, range-fill variables, busy-progress geometry, toast transitions, and clipboard-fallback positioning. Same-origin favicon/images need no `data:` or `blob:` allowance. Blob downloads are navigation/download behavior rather than a fetched image/script/worker resource, so no experimental `navigate-to` restriction is added. The meta policy cannot provide response-header-only protection such as `frame-ancestors`, cannot run in Report-Only mode, and governs only resources encountered after the meta element.
- `.github/workflows/project-verification.yml` pins official `actions/checkout` v4.3.1 at `34e114876b0b11c390a56381ad16ebd13914f8d5` and official `actions/setup-node` v4.4.0 at `49933ea5288caeca8642d1e84afbd3f7d6820020`, with readable version comments. Node 22, `contents: read`, push/pull-request triggers, and the single `npm run check` step are unchanged.

Validation actually run:

- focused startup/CSP/workflow/clipboard coverage passed all 13 tests;
- `npm run check` passed: 83 JavaScript files syntax-checked, all static relative imports resolved, and all 37 test files / 491 tests passed;
- `git diff --check origin/main` passed with no output, and complete diff inspection found no dependency, build, schema, preset, localization, service-worker, server, analytics, remote-asset, or unrelated UI change;
- in-app browser QA loaded the local CSP build in Aetherial Theme with both Comfortable and Compact stored Density values, verified preference changes and synchronous reload persistence, and found equal body/document client and scroll widths at 1280px, 840px, and 390px in both densities;
- browser QA also passed a real XIVAPI Item Search, same-origin module-worker scan construction/progress/cancellation with a retained completed match, bundled-preset and normal JSON import, Export/Copy with successful clipboard copy, Blob Download completion status, modal initial/return focus plus background inert/ARIA restoration, and live category/color/range/progress inline styles. No CSP violation was recorded. Electron's generic development CSP warning and the deliberately triggered import-review warning were the only console warnings;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold. Localization remains deferred with the existing English-foundation, message extraction, locale preference/fallback, key-parity, and separate generated-description stages.

## Phase 67 current implementation

- `src/locales/en.js` owns a frozen, flat, plain-text English catalog. It currently contains only the complete Preferences modal surface: title, introduction, tablist accessibility label, tab/section text, Theme/Density labels and every option/hint, both behavior checkbox labels/hints, and the saved-status message.
- `src/localization.js` owns the DOM-free catalog registry, default English locale, unsupported-locale resolution, stable keyed lookup, and named-parameter interpolation. Unknown keys and missing named parameters throw explicit errors; catalogs never supply HTML fragments.
- `src/app.js` constructs one fixed-English translator and injects it into `showPreferencesModal(...)`. No mutable global locale, locale storage, language preference, selector, or startup-bootstrap dependency was added.
- `src/ui/preferencesModal.js` retains every ID, option value, control order, tab/panel relationship, keyboard handler, callback, and status severity. Every translation used inside `innerHTML` or an attribute passes through `escapeHtml(...)`; modal title and status remain plain-text sinks.
- Static `index.html` chrome, empty-state Preferences guidance, Help, validation/export messages, lookup/search text, category-editor strings, generated descriptions, schema/presets, import/export, service worker, analytics, dependencies, and unrelated modules remain unchanged.

Validation actually run:

- focused localization, Preferences, state/persistence, accessibility/data-flow, startup, and CSP coverage passed all 81 tests;
- `npm run check` passed: 86 JavaScript files syntax-checked, all static relative imports resolved, and all 38 test files / 499 tests passed;
- `git diff --check origin/main` passed with no output before durable-document updates and was rerun on the final diff;
- in-app browser QA verified the exact English title, introduction, tablist label, tabs/sections, field/option labels, option hints, behavior labels/hints, and saved-status copy; ArrowRight/ArrowLeft and End/Home tab navigation retained selected-panel, focus, `aria-selected`, and roving-`tabindex` behavior;
- Theme, Density, and behavior changes applied immediately and survived reload; modal Close restored focus to Preferences. Comfortable and Compact each retained equal body/document client and scroll widths, and equal modal client/scroll widths, at 1280px, 840px, and 390px;
- no CSP violation or unexpected application warning/error appeared. Electron's generic development CSP warning was the only warning. Original local preference values and the browser viewport were restored after QA;
- CI and GitHub Pages were not run because implementation and publication remain separate. Phase 55 remains on hold. Broader extraction, locale preference/fallback UI, locale parity, and localized generated descriptions remain deferred.
