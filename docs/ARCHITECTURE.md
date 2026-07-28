# Architecture

> **Role:** Current runtime, data, security, testing, and repository-governance architecture.
> **History:** Phase chronology and old validation evidence live in [`REVIEW_HISTORY.md`](REVIEW_HISTORY.md) and the [history index](history/README.md).

## System shape

`AB_Category_Editor` is a no-build static application:

```text
index.html
  -> startupPreferences.js (classic, synchronous appearance bootstrap)
  -> styles.css
  -> src/app.js (module composition and orchestration)
       -> DOM-free data/decision modules
       -> focused UI owners under src/ui/
       -> browser service boundaries
```

There is no framework, package runtime, build artifact, server-side component,
analytics layer, or mutable global locale. State is in browser memory plus
bounded `localStorage` preferences and lookup cache. GitHub Pages serves the
same static source.

## Application composition and state

`src/app.js` owns live configuration, selection, dirty/saved state, monotonic
data revision, lookup-cache coordination, modal/tool launchers, translator
creation, and top-level rendering. It injects narrow callbacks and services
into UI owners; leaf modules do not import application orchestration.

Important rendering boundaries:

- full render replaces category list and selected editor;
- category-list rendering preserves selection by object identity;
- focused editor leaves refresh local sections when a full replacement is not
  required;
- structural rerenders query connected replacement controls before focus;
- no-op decisions return before mutation, revision, dirty state, callback, or
  render work.

`src/categoryChanges.js` holds shared DOM-free change and focus plans for
identity-aware sorting, strict renumbering, Raw JSON apply decisions, category
reorder, and post-render structural focus.

## Configuration, validation, and compatibility

`src/config.js` owns default creation, shape normalization, import repair, and
category sorting helpers. Import follows parse, pre-repair analysis,
validation/repair, post-repair analysis, stable finding merge, confirmation,
semantic change decision, live replacement, selection/render, summary, and
optional lookup.

`src/validation.js` owns editor validation and category issue counts.
Supporting authorities include:

- `src/rowIds.js` — strict row-ID interpretation and normalization;
- `src/optionalNumbers.js` — optional finite-number interpretation;
- `src/filterScalars.js` — Int32/uint/range/state classification and repair;
- `src/patternSemantics.js` — stored-pattern structural validity and browser
  converter compatibility;
- `src/itemOrdering.js` — Item Sort Criteria and Custom Item Order decisions,
  summaries, normalization, relevance, focus-safe mutations, and the narrow
  optional finding-message interface with exact-English defaults;
- `src/exportCompatibility.js` — serialization fidelity and complete
  AetherBags export-envelope analysis.

Pre/post repair finding merge carries private category-object identity so
duplicate or absent public IDs do not collapse distinct findings. Grouped sort
findings retain stable keys. None of the private identity metadata is
enumerable, displayed, persisted, or exported.

Export compatibility separates:

- JSON serialization fidelity;
- AetherBags deserialization/width/type compatibility;
- review-only defaulting or normalization;
- safe structured editability.

Both Export / Copy and Download commit the active control and run the same
preflight before compression or output callbacks.

## UI ownership

`src/ui/categoryEditor.js` is the selected-category shell. It owns the header,
category-wide validation presentation, Raw JSON route, structural actions, card
order, cross-card orchestration, and a DOM-free shell-message adapter.
`src/ui/categoryList.js` owns the populated sidebar's display fallbacks,
selection text, drag/search guidance, badges, count status, and corresponding
DOM-free message adapter.

Focused leaves own cohesive surfaces:

- `basicEditor.js` — Basics, its DOM-free UI-message adapter,
  generated-description workflow, and local validation refresh;
- `colorEditor.js` — its DOM-free UI-message adapter, linked RGBA controls, and
  display snapshots;
- `itemOrderingEditor.js` — criteria/custom-rank composition and local
  ordering refresh;
- `matchingRulesEditor.js` — the four matching-rule cards and converter entry;
- `rangeStateFiltersEditor.js` — Range and State disclosure cards plus their
  stable-keyed DOM-free UI-message adapter;
- `listEditor.js` — reusable typed list, ordered pill, lookup, and manual-search
  behavior;
- modal-specific files — Preferences, Help, Lookup Cache, and empty-state
  composition.

Leaves accept model data and narrow callbacks. They do not own global revision,
selection, persistence, locale state, or modal infrastructure.

## Generated descriptions

Generated descriptions have three explicit DOM-free boundaries:

- `src/descriptionAnalysis.js` owns frozen lexical concepts, compound and
  contextual evidence matching, source-aware representative intent/role/stat
  classification, useful cached-name filtering, subtype context, and
  structured summaries of explicit item IDs, UI category IDs, name patterns,
  and complete stable-ID UI-family coverage;
- `src/descriptionGenerator.js` owns ranges and state qualifiers, Custom Item
  Order relevance, semantic message selection, concise assembly, cleanup, the
  deliberate generic fallback, and the final quality guard;
- `src/descriptionMessages.js` owns default-English realization from stable
  message/stat keys, named values, and list formatting behind an injectable
  narrow message interface.

All boundaries are deterministic, dependency-free, network-free, and
non-mutating. They accept an optional synchronous lookup-name reader but never
start lookup work or modify cache state. Direct category-name evidence outranks
stored name-pattern evidence, which outranks lookup-only evidence. For
multi-row explicit sources, a cached-name concept must match a strict majority
of the stored IDs before it can classify the category; a single incidental or
partially resolved name cannot override the safe explicit-rule fallback.
Ultimate/Extreme subtype context remains analysis-owned, augmentation purpose
requires representative resolved material evidence, and generic UI-category
summaries retain exact counts. Complete weapon, tool, armor, and accessory
families are recognized by stable row IDs and may use an `all` quantifier only
when no item, pattern, range, state, or rarity rule narrows that coverage.
Known Savage-book name qualifiers map to stable raid-series/tier keys in
analysis; the realization boundary owns localized raid names and one of five
series-appropriate sentence frames. Stat materia and potion families select
one of three controlled frames from a deterministic category-name hash, keeping
variation reproducible and language-boundary-owned rather than random.
Multiple supported stats compose through the same named-value/list boundary in
source order. When user-authored evidence combines conflicting known Savage,
token, unlockable, or gear subtypes, analysis selects safe family wording;
unrelated cross-family combinations return the deliberate non-useful fallback
instead of allowing priority order to create a false specific claim.
`basicEditor.js`
continues to own explicit review/replacement/copy/cancel and opt-in blank-only
automatic application, while `categoryChanges.js` remains the no-op/mutation
decision authority. Generated descriptions still default to English and do not
use the localization catalog, so #126 remains blocked; the injected realization
boundary lets a future locale provide wording without duplicating semantic
analysis or generator decisions. Bundled preset payloads are not generation
authorities or mutation targets.

## Lookup, cache, and tools

`src/xivapiRequest.js` is the shared deadline/cancellation boundary.
`src/xivapi.js` owns sheet URLs, response extraction, useful-name
classification, batch chunking, fallback, caching, and referenced-ID lookup.

Application-owned cache-producer leases prevent cache-object replacement while
async search, list lookup, global Resolve IDs, or regex scanning is active.
Lease release is idempotent and belongs in `finally`.

The Regex-to-Item-ID tool separates concerns:

- `src/tools/regexToItemIds.js` owns modal state, XIVAPI pagination, candidate
  extraction, progress, result caps, cancellation, cache writes, Add/no-op
  behavior, and saved-pattern removal;
- `src/tools/regexToItemIdsMessages.js` owns converter presentation through a
  DOM-free adapter that accepts the application translator; preformatted
  counts, deadlines, saved patterns, item data, compiler/worker errors, and
  XIVAPI details remain named untranslated inputs;
- `src/tools/regexBatchEvaluator.js` owns module-worker lifecycle, batch
  identity, per-request deadline, stale-result rejection, and termination;
- `src/tools/regexBatchWorker.js` is the only runtime owner of
  `regex.test(name)`.

There is no main-thread evaluation fallback.

## Import, export, and resource bounds

`src/importExport.js` owns JSON/gzip+Base64 parsing, compression, download, and
clipboard boundaries. Production limits are:

- selected file: 32 MiB;
- UTF-8 JSON text: 32 MiB;
- decoded compressed input: 8 MiB;
- decompressed output: 32 MiB.

Base64 sizing is checked before decoding allocation. Decompression counts
streamed bytes before accepting/decoding a chunk and cancels on overflow.
Clipboard fallback cleans up its hidden textarea and restores focus only while
it still owns focus.

Export snapshot currency is governed by the application data revision, not by
async completion order.

Application-owned import, dirty-work replacement, import-validation
presentation, and full Raw JSON copy route through
`src/ui/applicationDataMessages.js`. `src/importValidationSummary.js` remains
the DOM-free classification and summary-composition authority: runtime callers
may inject the adapter's narrow summary-message interface, while callers that
omit it retain byte-for-byte English defaults. Validation findings and repair
objects remain decision-owned data and are escaped only when the application
renders the summary.

Application-owned export availability, busy/failure copy, saved-state labels,
Export / Copy and Download completion copy, revision-current/stale
presentation, and the blocked compatibility modal route through
`src/ui/applicationExportMessages.js`. The adapter accepts the composition-owned
translator and does not import catalogs, locale state, DOM, application
orchestration, export decisions, or snapshot decisions. Counts, filenames,
error details, Base64 content, compatibility locations, and compatibility
findings remain untranslated dynamic or decision-owned data and continue
through escaped HTML or explicit text/property sinks.

Application-owned global lookup progress/outcomes, lookup-cache clear outcomes,
and category sort/renumber no-op statuses route through
`src/ui/applicationOperationsMessages.js`. The same DOM-free module owns the
stable-identifier-to-localized-display-label boundary used by the global
Resolve IDs workflow and reusable list editor. `src/xivapi.js` continues to
receive and report stable sheet identifiers and owns no localized display
label. Counts, batch positions, row/sheet failure identifiers, and lower-layer
error details remain interpolated data consumed through plain-text status and
busy-overlay sinks.

## Modal, focus, and accessibility

`src/modals.js` owns the shared modal shell, focus trap, focus return,
background inert/ARIA state, and versioned deferred focus. Opening requests
modal focus before background inerting; closing restores paired state.

Category selection, category structural actions, criteria, and ordered list
actions have explicit focus-recovery plans. Accessible names are contextual and
native disabled state remains authoritative. Range validation uses associated
messages; icon and pill controls retain visible theme-aware focus.

## Localization

`src/localization.js` owns locale resolution, named interpolation, and DOM-free
rich-message part parsing. `src/locales/en.js` is the frozen flat plain-text
catalog. `src/app.js` creates one fixed-English translator and injects it into
application chrome, application-data and application-export workflows, the
populated category list, the selected-category shell, and the Regex converter
launcher. `categoryEditor.js` uses its shell adapter and forwards that
translator to the Basics, Color, Item Ordering, Matching Rules, and Range/State
leaves. The category list, application-data workflows, application-export
workflows, and Regex tool own separate adapters for their sidebar,
import/full-Raw-JSON, output/compatibility, and converter-presentation families.
The Item Ordering adapter additionally owns the complete Item Sort Criteria and
Custom Item Order finding interface. Application composition passes that same
interface through the populated editor, category issue counts,
selected-category validation, import/full Raw JSON pre/post-repair analysis,
and the complete export-preflight chain. `analyzeItemOrdering()` supplies
byte-for-byte English defaults when callers omit the interface, so XIVAPI and
generated-description decision-only consumers do not acquire translator or UI
ownership.
The Range/State adapter supplies the same message object to editor cards,
summaries, range controls, state choices, and accessible names. Its DOM-free
summary and range-decision helpers, plus import-validation summary composition,
retain optional exact-English defaults for existing callers. Translated values
stay in escaped text or explicit text/property/attribute sinks.

UI modules own semantic node construction and safe sinks. Rich messages allow
only caller-defined semantic parts; catalog content does not supply HTML.
Localization ownership is intentionally incremental. The remaining message
families are tracked by
[Issue #122](https://github.com/Bahbus/AB_Category_Editor/issues/122);
locale persistence and a second locale are separate later decisions.

Phase 85 verification at this boundary passed 237 focused localization,
lookup/cache, list-editor, category-operation, accessibility, trust-boundary,
and governance tests. `npm run check` passed 106 JavaScript files, static
relative imports, and 52 test files / 591 tests. Comfortable and Compact
browser QA at 1280 px, 840 px, and 390 px found no document, application,
sidebar, or editor horizontal overflow and observed normal global lookup,
shared sheet labels, cache clearing/active guarding, and renumbering.
Network-failure/partial/automatic outcomes and native-disabled defensive
sort/renumber/cache-refusal branches were not forced in the browser.

Phase 86 verification passed 251 focused Regex, worker, pattern-semantics,
lookup/cache, action-availability, modal/focus, accessibility, localization,
trust-boundary, and governance tests. `npm run check` passed 108 JavaScript
files, static relative imports, and 53 test files / 596 tests. Comfortable and
Compact browser QA at 1280 px, 840 px, and 390 px found no document, body,
converter-modal, or results horizontal overflow and observed custom and saved
patterns, browser incompatibility feedback, bounded scanning, cancellation,
Add and saved-pattern removal outcomes, dirty state, and normal modal focus
return. Timeout, worker-construction, service-failure, active cache-clear
refusal, invalid-saved-pattern omission, truncation, partial-result, combined
Add/remove, and all-duplicate Add branches were not forced in the browser.

Phase 88 verification passed 328 focused Item Ordering/default-message/
localization, selected-category validation, import/full Raw JSON,
export-preflight/flow, category-editor/list, accessibility, modal/focus,
localization, trust-boundary, governance, XIVAPI, and description-generation
tests. `npm run check` passed 108 JavaScript files, static relative imports, and
53 test files / 601 tests. Browser QA confirmed the same exact malformed
criterion text in full Raw JSON review, populated Item Ordering presentation,
and blocked export compatibility; selected-category Raw JSON correction cleared
the finding and restored Export / Copy. Custom-order variants and unforced
finding branches remain directly covered rather than claimed from browser QA.

## Reorder motion

`src/reorderMotion.js` is a dependency-free progressive FLIP-style presentation
boundary. It captures keyed rectangles around an already-authorized successful
reorder and requests a 180 ms transform animation for connected replacement
nodes.

Category identity uses object-reference keys. Criteria and ordered primitive
lists use per-occurrence tokens. Missing/throwing animation APIs, reduced
motion, unchanged geometry, disconnection, and stale renders suppress or cancel
motion without affecting mutation, focus, announcements, dirty state, or final
DOM.

## Startup, CSP, and trust boundaries

`src/startupPreferences.js` is an external same-origin classic script placed
before CSS and module startup so theme/density apply synchronously. Its small
literal option set is directly tested against state metadata.

`index.html` places CSP immediately after charset and before fetched resources.
The policy limits scripts, workers, images, connections, frames, forms, base
URLs, and objects to the established static-app needs. Inline style attributes
remain allowed because runtime code sets bounded visual custom properties and
geometry; inline script and inline style elements remain disallowed.

`.github/workflows/project-verification.yml` uses read-only contents permission,
Node 22, immutable official Action SHAs, and one `npm run check` invocation.
No personal Projects token is stored in Actions.

## Testing architecture

Primary contract:

```bash
npm run check
```

It runs exhaustive `.js`/`.mjs` syntax checking, static relative-import
resolution, and `node --test`.

Tests combine:

- direct unit/behavior tests for DOM-free decisions and injected service seams;
- small fake-DOM tests for focus/render ownership where practical;
- source guards for DOM-heavy wiring, safe sinks, CSS/accessibility contracts,
  CSP/workflow trust boundaries, and repository governance.

### Why `testSupport/sourceFiles.mjs` is outside `test/`

Eight current guard suites share `testSupport/sourceFiles.mjs` for deterministic
repository-root reads and recursive JavaScript discovery. It deliberately lives
outside `test/`: Node's automatic `node --test` discovery treats JavaScript
files under test directories as test files, so placing this support-only module
there would count and execute it as a test file. Keep it outside automatic
discovery unless a demonstrable test-runner or ownership benefit justifies a
change.

The responsibility-owned source suites are:

- `test/applicationDataFlowSource.test.mjs`;
- `test/uiAccessibilitySource.test.mjs`;
- `test/lookupImportExportSource.test.mjs`.

Other focused suites may import the same support helper. Prefer behavior tests
over formatting-sensitive regular expressions when behavior is directly
testable.

## Repository planning and governance

GitHub Project #2 is the operational planning layer. Repository issues are the
durable task/evidence units; committed code is the implementation authority.
The Project uses built-in `Status` plus `Priority`, `Area`, and `Phase`.
Project-only draft cards are avoided.

Review triage is issue-first. Every actionable evidence-backed finding is
created, linked as a sub-issue, or added to the existing repository issue that
owns it before phase selection. Maintainers classify its type, impact,
severity, urgency, relationship, and deferral risk, then select work from the
updated issue tracker and Project #2. Small low-impact findings may remain
tracked until they combine naturally, accumulate sufficient value, or
higher-priority work is exhausted.

A numbered phase may close or advance multiple related issues when they share a
coherent ownership and verification boundary and packing reduces repeated
workflow overhead. Decimal phases remain available for important, tightly
related corrections that should not wait, especially material regressions or
acceptance failures; they are not the automatic destination for every review
finding. Unrelated grab-bag phases remain out of bounds.

Repository workflow surfaces:

- `.github/ISSUE_TEMPLATE/` — friendly public bug, improvement,
  accessibility/usability, documentation, and general forms plus private
  security routing;
- `.github/maintainer/numbered-phase-issue.md` — source-issue relationships,
  evidence, ownership boundaries, scope, and contracts outside the public
  chooser;
- `.github/pull_request_template.md` — every completed or advanced issue,
  actual verification, newly tracked deferred findings, relevance-based
  durable updates, Project synchronization, and ready-for-review policy;
- `test/repositoryGovernance.test.mjs` — source and structure guardrails.

The three primary durable documents remain required entry points, but their
roles do not overlap:

- current context and contracts;
- current architecture;
- chronology and archived evidence routing.

Architecture changes only when current boundaries change. A phase that does not
change architecture records that document as not applicable instead of adding
repetitive history.

## Current pressure points

- `src/ui/categoryEditor.js` remains the selected-category orchestration shell.
  Split another leaf only when feature/reliability evidence shows a cohesive
  ownership benefit; file size alone is not sufficient.
- Source guards can become formatting-sensitive. Retire or relax one only when
  direct behavior coverage or a more stable architectural assertion replaces
  its protection.
- Remaining localization families need bounded ownership migrations before
  locale persistence and a second catalog.
- Generated-description localization
  [#126](https://github.com/Bahbus/AB_Category_Editor/issues/126) remains
  blocked pending the post-merge review required after the evidence-fidelity
  work tracked by [#175](https://github.com/Bahbus/AB_Category_Editor/issues/175).
  Phase 91 strengthens the semantic model and introduces an injectable
  default-English realization boundary, including stable Savage raid/tier
  terms; the following review, not this implementation, decides whether
  localization may resume.
- A lightweight real-browser harness remains a Project candidate, not an
  implicit dependency mandate.

## Related records

- Current workflow and behavioral contracts:
  [`AI_PROJECT_CONTEXT.md`](AI_PROJECT_CONTEXT.md)
- Recent verified results: [`REVIEW_HISTORY.md`](REVIEW_HISTORY.md)
- Detailed historical evidence: [`history/README.md`](history/README.md)
