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
  summaries, normalization, relevance, and focus-safe mutations;
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
application chrome, the populated category list, and the selected-category
shell. `categoryEditor.js` uses its shell adapter and forwards that translator
to the Basics, Color, Item Ordering, Matching Rules, and Range/State leaves.
The category list owns a separate adapter for its sidebar family. The
Range/State adapter supplies the same message object to editor cards,
summaries, range controls, state choices, and accessible names. Its DOM-free
summary and range-decision helpers retain optional exact-English defaults for
existing callers. Translated values stay in escaped text or explicit
text/property/attribute sinks.

UI modules own semantic node construction and safe sinks. Rich messages allow
only caller-defined semantic parts; catalog content does not supply HTML.
Localization ownership is intentionally incremental. The remaining message
families are tracked by
[Issue #122](https://github.com/Bahbus/AB_Category_Editor/issues/122);
locale persistence and a second locale are separate later decisions.

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

Repository workflow surfaces:

- `.github/ISSUE_TEMPLATE/` — friendly public bug, improvement,
  accessibility/usability, documentation, and general forms plus private
  security routing;
- `.github/maintainer/numbered-phase-issue.md` — evidence/scope/contracts body
  outside the public chooser;
- `.github/pull_request_template.md` — closing issue, actual verification,
  relevance-based durable updates, Project synchronization, and
  ready-for-review policy;
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
- A lightweight real-browser harness remains a Project candidate, not an
  implicit dependency mandate.

## Related records

- Current workflow and behavioral contracts:
  [`AI_PROJECT_CONTEXT.md`](AI_PROJECT_CONTEXT.md)
- Recent verified results: [`REVIEW_HISTORY.md`](REVIEW_HISTORY.md)
- Detailed historical evidence: [`history/README.md`](history/README.md)
