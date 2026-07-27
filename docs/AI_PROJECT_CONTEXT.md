# AI Project Context

> **Repository:** `Bahbus/AB_Category_Editor`
> **Purpose:** Dependency-free static JavaScript editor for AetherBags category configuration files.
> **Current baseline:** The inspected repository provides the capability and durable contracts summarized below. GitHub Project #2 is authoritative for live phase status.
> **Primary verification:** `npm run check`

## Required entry order and document roles

Read these three files completely before planning or reviewing repository work:

1. `docs/AI_PROJECT_CONTEXT.md` — current purpose, workflow, contracts, review
   rules, environment guidance, and live-work routing.
2. [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — current runtime, data, security,
   testing, and governance architecture.
3. [`docs/REVIEW_HISTORY.md`](REVIEW_HISTORY.md) — concise chronology, recent
   verified results, and routing to the
   [repository history index](history/README.md).

These filenames remain the stable project entry contract. They no longer repeat
the same phase diary. Committed code is authoritative for implementation;
GitHub [Project #2](https://github.com/users/Bahbus/projects/2) and repository
issues are authoritative for live priority and status.

## Project summary

The application creates, imports, edits, validates, looks up, and exports
AetherBags category configurations. It supports JSON and gzip+Base64, structured
and Raw JSON editing, category reorder/renumber/duplication/deletion, validation
and repair summaries, XIVAPI name lookup, Regex-to-Item-ID scanning, generated
descriptions, preferences, a persistent lookup cache, responsive layouts,
modal focus management, localization boundaries, and progressive reorder
motion.

The project intentionally has:

- no build step;
- no runtime or development dependency unless a demonstrated benefit warrants
  one;
- browser-native APIs where practical;
- Node-based syntax, static-import, behavior, and source-guard verification.

## Current state

- Basics- and Color-card-owned text and accessible names use the existing
  injected translator through focused DOM-free message adapters. Generated
  description templates and DOM-free validation findings remain exact English.
- Populated Item Ordering editor-owned text, accessible names, and the complete
  Item Sort Criteria and Custom Item Order finding family use the existing
  injected translator. `analyzeItemOrdering()` retains exact-English default
  finding functions for DOM-free decision-only and direct callers, while
  selected-category validation, import/full Raw JSON review, and export
  preflight receive the application-composed finding boundary. Ordering
  decisions and every non-Item-Ordering finding family remain unchanged.
- Populated Range and State filter editor text, summaries, structured-control
  messages, and accessible names use one stable-keyed DOM-free message adapter
  and the existing injected translator. Schema, validation, and compatibility
  metadata remain exact and untranslated.
- The populated category sidebar and selected-category shell text, statuses,
  structural-action names, delete confirmation, and Advanced Raw JSON copy use
  focused DOM-free message adapters and that same translator. Category data,
  generated duplicate names, validation findings, and schema values remain
  exact and untranslated.
- Application-owned Import / Paste, dirty-work replacement, import-validation
  presentation, and full Raw JSON workflow copy use one focused DOM-free
  message adapter and the same translator. The import-summary decision module
  accepts an injected message interface while preserving exact-English defaults
  for direct callers; underlying findings, repairs, filenames, caller-provided
  source labels, and configuration data remain untranslated.
- Application-owned Export / Copy, Download, revisioned snapshot/saved-state
  presentation, and blocked export-compatibility presentation use a separate
  focused DOM-free message adapter and that same translator. Compatibility
  findings, category and field locations, filenames, error details, snapshots,
  and export data remain untranslated dynamic or decision-owned data.
- Application-owned global Resolve IDs, lookup-cache clear outcomes, and
  category sort/renumber no-op presentation use a focused DOM-free operations
  adapter and that same translator. The global workflow and reusable list
  editor derive localized display labels from stable `Item` and
  `ItemUICategory` identifiers through one shared boundary; service identifiers,
  row IDs, failure details, counts, and lookup decisions remain untranslated
  data.
- Regex-to-Item-ID converter-owned modal copy, progress, result summaries,
  status wrappers, and Add/remove outcomes use a focused DOM-free adapter and
  that same translator. Saved patterns, item names and IDs, preformatted
  counts, deadlines, compiler/worker/XIVAPI details, and compatibility
  decisions remain untranslated dynamic or lower-layer data.
- Phase 86 focused Regex, worker, pattern-semantics, lookup/cache,
  action-availability, modal/focus, accessibility, localization,
  trust-boundary, and governance coverage passed 251 tests. `npm run check`
  passed 108 JavaScript files, static relative imports, and 53 test files / 596
  tests. Browser QA covered exact converter presentation, custom and saved
  patterns, incompatible-pattern feedback, bounded success, cancellation, Add
  and saved-pattern removal outcomes, dirty state, focus return, and both
  densities at 1280 px, 840 px, and 390 px without horizontal overflow.
  Timeout, worker-construction, service-failure, active cache-clear refusal,
  invalid-saved-pattern omission, truncation, partial-result, combined
  Add/remove, and all-duplicate Add paths were not forced in the browser.
- Phase 88 focused Item Ordering/default-message/localization,
  selected-category validation, import/full Raw JSON, export-preflight/flow,
  category-editor/list, accessibility, modal/focus, localization,
  trust-boundary, governance, XIVAPI, and description-generation coverage
  passed 328 tests. `npm run check` passed 108 JavaScript files, static
  relative imports, and 53 test files / 601 tests. Browser QA exercised a
  malformed criterion through full Raw JSON review, category and Item Ordering
  issue presentation, blocked export compatibility, normal selected-category
  Raw JSON correction, finding clearance, and restored Export / Copy.
- Phase 85 focused localization, lookup/cache, list-editor, category-operation,
  accessibility, trust-boundary, and governance coverage passed 237 tests.
  `npm run check` passed 106 JavaScript files, static relative imports, and 52
  test files / 591 tests. Browser QA covered Comfortable and Compact density at
  1280 px, 840 px, and 390 px without horizontal overflow and observed normal
  Resolve IDs, shared sheet labels, cache clearing/active guarding, and
  renumbering. Network failure/partial/automatic outcomes and defensively
  unreachable sort/renumber and cache-clear refusal statuses were not forced in
  the browser.
- The broader remaining English message families stay tracked by
  [Issue #122](https://github.com/Bahbus/AB_Category_Editor/issues/122).
- The three primary documents separate current contracts, current
  architecture, and concise verified history. Older detailed evidence is
  preserved in the indexed history archive.
- Governance templates keep durable records capability-based and merge-neutral
  while Project #2 owns live workflow fields.

Do not copy the Project backlog into these files. Consult the live Project
before selecting work, and link only an issue needed to explain a durable
capability or decision.

## Standard workflow

1. Inspect local work before changing branches or files. Never overwrite,
   discard, or silently mix unrelated changes.
2. Fetch `origin/main`; fast-forward only a clean local `main`; confirm local
   `HEAD` equals fetched `origin/main`.
3. Read the three primary documents in the required order.
4. Before selecting phase work, record every actionable review finding in the
   most relevant repository issue: create a focused issue, create or link a
   sub-issue under the relevant roadmap issue, or update an existing issue that
   already owns the finding. Require focused evidence; do not silently drop a
   deferred finding.
5. Classify findings by evidence, impact, severity, urgency, relationship, and
   deferral risk. Distinguish confirmed bugs, material acceptance misses, test
   gaps, maintainability debt, speculative risks, and optional polish, then
   select work from the updated issue tracker and Project #2 instead of
   reflexively selecting the newest finding.
6. Inspect the selected issue and its current Project item; do not repeatedly
   load the entire completed board. Reconcile live `Status`, `Priority`, `Area`,
   and `Phase` fields with verified repository state in Project #2 rather than
   duplicating those values in durable documents.
7. A coherent numbered phase may close or advance multiple related tracked
   issues when they share an explicit ownership and verification boundary and
   packing them reduces repeated setup, verification, documentation, browser
   QA, or publication overhead. Do not create unrelated grab-bag phases.
8. Use one unique `agent/...` branch unless the task explicitly requires
   another strategy. Do not invent a worktree requirement.
9. Implement only the written scope. Keep newly verified deferred work in its
   owning repository issue instead of widening the phase.
10. Classify the changed-file scope before selecting runtime, browser, security,
   or deployment reruns. Run focused checks, the complete check contract once
   per exact tree, and the requested diff checks. Use compact output for routine
   success when helpful, and rerun the ordinary command or a targeted test for
   failure diagnostics. State QA relevance and tooling limits honestly.
11. Record delivered capabilities and verified evidence in merge-neutral terms,
   without predicting a merge or copying live Project fields. Update
   architecture or another document only when its current content changed;
   explicitly record not applicable otherwise. Require a post-merge
   documentation correction only when merged code or verified behavior
   actually disagrees with the durable record.
12. Synchronize every issue the phase closes or advances and its relevant
    Project item, publish the requested pull request state, and never imply that
    an unrun check passed.

## Behavioral contracts

### Data and AetherBags compatibility

- Preserve the AetherBags JSON shape, unknown properties, Raw JSON workflows,
  JSON import, and gzip+Base64 import/export.
- `src/exportCompatibility.js` is the DOM-free export-preflight authority.
  Confirmed serialization or AetherBags incompatibilities block output before
  compression, clipboard/download callbacks, or saved-state transitions;
  review-only normalization warnings remain exportable.
- Missing/defaulted members and ignored compatible Format/Version values remain
  review warnings where the pinned importer proves them safe. Explicit null,
  malformed, width-incompatible, cyclic, non-finite, negative-zero, accessor,
  custom-serialization, and other non-representable values follow the current
  blocking rules.
- Item Sort Criteria and Custom Item Order analysis never inserts, removes, or
  rewrites data merely to change a finding. Unknown criterion properties route
  unsafe structured edits to Raw JSON while remaining preserved.
- Import repair must remain reviewable and must not silently discard preserved
  values.

### Numeric and filter values

- Stored Item and ItemUICategory IDs are uint-compatible JSON-number integers
  from `0` through `4294967295`. Exact digit strings remain tolerated legacy
  lookup/display data but block export until corrected.
- Typed row IDs reject blanks, coercion-only values, negatives, fractions,
  overflow, unsafe integers, and oversized digit strings.
- `src/rowIds.js` owns row-ID validity and normalization. Validation, lookup,
  referenced-ID collection, manual search, and regex scanning must agree.
- Order/Priority and signed range/state fields retain signed Int32 rules.
  Vendor Price retains exact uint bounds; State remains 0/1/2.
- Invalid imported values remain visible for explicit correction rather than
  being silently coerced.

### Validation and patterns

- Duplicate Order/Priority and list findings remain stably grouped. Distinct
  category objects must not collapse merely because IDs or labels match.
- Stored Allowed Item Name Patterns are valid when they are nonblank strings.
  AetherBags uses case-insensitive, culture-invariant .NET regex; JavaScript
  converter incompatibility is not an AetherBags-invalid finding.
- The browser converter stays a fixed-case-insensitive approximation and keeps
  potentially pathological evaluation in the bounded worker path.

### Dirty, revision, and no-op state

- Real structural or value changes mark dirty and advance the data revision.
  No-op sort, renumber, Raw JSON apply, generated description, list action, or
  control commit must not do so.
- Blank numeric blur restores the committed value. Same-display color or range
  events preserve higher-precision imported model values.
- Export/Download snapshots clear dirty state only if their captured revision
  is still current. Older asynchronous completion cannot mark newer edits
  saved or replace a newer modal.
- Changed validated-config replacement advances the revision; semantic no-op
  replacement does not assign or advance it.

### Lookup, cache, and resource ownership

- Useful names remain distinct from unresolved/sentinel values. Automatic
  lookup status stays quiet; manual actions report useful feedback.
- Batch lookup caches only rows from its current chunk, with established
  fallback and timeout behavior.
- Every producer owns and releases its lookup-cache lease in `finally`; cache
  clearing is unavailable while a producer is active and rechecks at commit.
- Request, file, JSON, Base64, gzip, decompression, regex-worker, and result
  limits must fail before unrelated mutation, dirty/save, or output work.

### Focus, modal, accessibility, and controls

- Modal focus is requested before background inerting. Trap, stale-focus guard,
  background `inert`/`aria-hidden`, and close-time focus restoration remain
  paired.
- Clipboard fallback restores focus only if its hidden control still owns
  focus; a newer or disconnected focus target is never overridden.
- Category click, Enter, and Space selection share the same render/focus path.
  Query the connected selected replacement after structural rendering.
- Structural category and ordered-list focus plans retain useful connected
  controls at boundaries. Rerenders unrelated to selection must not steal
  focus.
- Icon-only actions retain contextual accessible names, native disabled state,
  visible keyboard focus, and the established control-size taxonomy.

### Localization and safe sinks

- One translator is created at application composition and injected into UI
  owners. UI leaves do not import catalogs/localization mechanics or create
  locale state.
- `src/locales/en.js` remains a frozen plain-text catalog. Named interpolation
  is explicit; unknown keys or missing parameters fail rather than rendering
  unresolved data.
- Rich messages are parsed DOM-free into text and named semantic parts. UI code
  constructs allowlisted nodes; catalog text never becomes raw HTML, handlers,
  or URLs.
- Keep DOM-free validation/compatibility findings outside a UI-owned
  localization slice unless the issue explicitly includes that family.
  Item Ordering is the current narrow exception: its analyzer accepts an
  optional finding-message interface with exact-English defaults, and
  application composition injects the catalog-backed interface only into
  user-visible analysis routes.

### Layout, motion, CSP, and security

- Preserve responsive stacked layouts, both densities, all themes, `100vh`
  fallback plus `100dvh`, and horizontal-overflow contracts.
- Reorder motion is progressive presentation only. Successful decisions mutate,
  render, announce, and restore focus immediately; reduced motion, missing
  APIs, failed setup, or stale/disconnected nodes suppress animation safely.
- Preserve the external synchronous startup-preference script, CSP ordering and
  allowlist, same-origin module/worker boundaries, safe text/attribute sinks,
  SHA-pinned verification Actions, and dependency-free static deployment.

## Review and scope decisions

- Compare work to the written issue, not merely its theme.
- Record every actionable confirmed finding in its owning repository issue
  before selecting phase work. Require evidence from surrounding code and tests
  before calling something a bug; file size alone is not proof that a source or
  test module should split.
- Distinguish confirmed bugs, material acceptance misses, test gaps,
  maintainability debt, speculative risks, and optional polish. Weigh severity,
  user/data/security/compatibility impact, urgency, relationship to recent work,
  and the cost and risk of deferral.
- Reserve decimal phases for important, tightly related direct corrections to a
  numbered phase, especially material regressions or acceptance failures that
  should not wait. They are not the default for every newly confirmed finding.
- Keep small low-priority findings tracked until they combine naturally with
  related work, accumulate into worthwhile cleanup, or no higher-value work
  remains.
- Pack multiple related issues only when the phase retains a coherent ownership
  and verification boundary; tracking does not justify unrelated grab-bag work.
- Generated-description localization
  [#126](https://github.com/Bahbus/AB_Category_Editor/issues/126) remains
  blocked by significant base-generator improvement
  [#175](https://github.com/Bahbus/AB_Category_Editor/issues/175). Do not begin
  either redesign or localization as incidental review follow-up.
- Read indexed history archives only when older evidence is relevant to the
  current question.
- Prefer direct behavior tests. Use source checks for DOM-heavy wiring,
  architectural ownership, trust boundaries, and repository governance without
  replacing precise behavior coverage.
- Browser QA claims must name what was actually exercised. Do not claim visible
  animation, preference emulation, native file selection, clipboard fallback,
  or drag/drop when the available tooling did not perform it.

## Working environment

- The normal checkout is
  `/var/home/dave/Projects/ABCategoryEditor/AB_Category_Editor`; the parent
  directory is a wrapper, not the Git repository.
- Verify the current checkout, remote, branch, and worktree every run rather
  than trusting this document.
- Desktop-keyring GitHub authentication may be valid even if an isolated
  sandbox cannot see it. Check the host/keyring-backed `gh auth status` before
  requesting reauthentication.
- GitHub committed code is the implementation source of truth. Local checks
  prove the inspected tree only; CI, Pages, deployed QA, and Project state
  require separate verification.

## Verification commands

Primary contract:

```bash
npm run check
```

This ordinary command remains the canonical CI invocation and the direct route
to full failure diagnostics. For output-compact routine agent verification of
the same syntax checker, static-import checker, complete Node test suite, and
exit semantics, use:

```bash
npm run check -- --test-reporter=dot
```

If the compact invocation fails, rerun ordinary `npm run check` or the relevant
targeted test to expose detailed diagnostics.

Focused components:

```bash
node scripts/check-javascript-syntax.mjs
node scripts/check-imports.mjs
node --test
node --test test/repositoryGovernance.test.mjs
git diff --check origin/main
```

## Deeper records

- Current implementation boundaries: [`ARCHITECTURE.md`](ARCHITECTURE.md)
- Recent results and chronology: [`REVIEW_HISTORY.md`](REVIEW_HISTORY.md)
- Detailed Phases 27-77 evidence: [`history/PHASES_27_77.md`](history/PHASES_27_77.md)
- Archive policy and future routing: [`history/README.md`](history/README.md)
