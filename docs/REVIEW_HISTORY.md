# Review History

> **Role:** Concise chronological index and recent verified phase record.
> **Live status:** GitHub [Project #2](https://github.com/users/Bahbus/projects/2) and repository issues are authoritative for priority and status.

## How to use this record

Read this file after [`AI_PROJECT_CONTEXT.md`](AI_PROJECT_CONTEXT.md) and
[`ARCHITECTURE.md`](ARCHITECTURE.md). Use the [history index](history/README.md)
when an older phase, regression, validation count, or decision needs detailed
evidence. This primary file does not duplicate current behavioral contracts or
runtime architecture.

## Chronological index

| Range | Detailed record | Durable theme |
| --- | --- | --- |
| Before Phase 27 | [Phases 27-77 archive: earlier foundations](history/PHASES_27_77.md#earlier-project-evolution-before-phase-27) | Static editor, import/export, validation, lookup, accessibility, preferences |
| Phases 27-37 | [Phases 27-77 archive: Phase 27](history/PHASES_27_77.md#phase-27) | Early repair, lookup, dirty-state, modal, and row-ID hardening |
| Phases 38-45 | [Phases 27-77 archive: Phase 38](history/PHASES_27_77.md#phase-38) | Cache ownership, no-op fidelity, revisions, and verification unification |
| Phases 46-54 | [Phases 27-77 archive: Phase 46](history/PHASES_27_77.md#phase-46) | Pattern integrity, compatibility, Item Ordering, controls, and preset corrections |
| Phases 56-66 | [Phases 27-77 archive: Phase 56](history/PHASES_27_77.md#phase-56) | Source-guard ownership, UI leaves, limits, workers, deadlines, CSP |
| Phases 67-73.2 | [Phases 27-77 archive: Phase 67](history/PHASES_27_77.md#phase-67) | Localization foundation and repository governance |
| Phases 74-77 | [Phases 27-77 archive: Phase 74](history/PHASES_27_77.md#phase-74) | Focus containment, bounded localization, and reorder motion |
| Phase 78 onward | This file and future indexed archives | Compact durable-document architecture |

The archive is deliberately one continuous Phase 27-77 record. Phase 78 did
not split or copy its sections across multiple archives, so each historical
phase has one detailed repository location.

## Recent verified record

### Phase 73-73.2: repository governance

Project #2, repository-linked issues, public issue forms, the off-chooser
maintainer phase template, and the ready-for-review pull-request contract were
established and corrected. GitHub's issue-form validator rejected optional
empty `title` values even though generic YAML parsing accepted them; focused
coverage now guards that constraint. The public chooser was subsequently
observed working on `main`.

### Phase 74: clipboard and modal focus containment

Clipboard fallback restores focus only while it still owns focus, and modal Tab
navigation re-enters an open modal from either direction. Direct tests are
authoritative for the fallback path that browser automation could not force.

### Phase 75: matching-rule and list-editor localization

Matching-rule and reusable list-editor-owned UI copy moved through the single
injected translator with exact English output and safe sinks. This completed
one bounded child of [Issue #122](https://github.com/Bahbus/AB_Category_Editor/issues/122).

### Phase 76: progressive reorder motion

One dependency-free FLIP-style boundary covers successful category, criterion,
and Custom Item Rank reorders while immediate mutation, focus, accessibility,
dirty/no-op, and reduced-motion behavior remain authoritative. Automated
browser tooling proved fallback and interaction behavior but did not prove
visible animation, reduced-motion emulation, or committed drag.

### Phase 77: Item Ordering localization

Item Ordering editor-owned copy and accessible names moved through its injected
translator and DOM-free message adapter. Ordering decisions and compatibility
findings remained exact English for a later validation-family child of
[Issue #122](https://github.com/Bahbus/AB_Category_Editor/issues/122).
Phase 77 merged through PR #141. Its final local verification passed 96
JavaScript files, all static relative imports, and 45 test files / 555 tests.

### Phase 78: durable-document architecture

Issue [#143](https://github.com/Bahbus/AB_Category_Editor/issues/143) separates
the three primary entry points into current context, current architecture, and
historical evidence. The former detailed Phase 27-77 review journal is
preserved intact in the indexed archive. Governance coverage checks document
roles, routing, internal links, archive coverage, relevance-based update
policy, and a primary-set size budget. Phase 78 merged through ready-for-review
PR #144.

Before Phase 78, the primary set was 4,141 lines and 410,198 bytes:

- `AI_PROJECT_CONTEXT.md`: 1,273 lines / 143,529 bytes;
- `ARCHITECTURE.md`: 930 lines / 109,713 bytes;
- `REVIEW_HISTORY.md`: 1,938 lines / 156,956 bytes.

Final Phase 78 verification:

- the primary set is 638 lines / 30,165 bytes, down 84.6% by lines and 92.6%
  by bytes from the measured baseline;
- focused `test/repositoryGovernance.test.mjs` passed all 15 tests;
- `npm run check` passed: 96 JavaScript files syntax-checked, all static
  relative imports resolved, and 45 test files / 560 tests passed;
- `git diff --check origin/main` passed with no output;
- changed-file inspection found documentation, governance templates, and one
  focused governance test only. Browser QA is not applicable because no
  application runtime file changed.

### Phase 78.1: merge-neutral review contracts

Durable current context and governance templates describe delivered
capabilities and verified evidence without predicting merge state or copying
live Project fields. Project #2 remains authoritative for operational status.
Review guidance classifies changed-file relevance, runs the complete check
contract once per exact tree, permits the verified compact reporter for routine
success, preserves ordinary or targeted reruns for diagnostics, and narrows
history and Project queries to relevant records. Focused governance coverage
protects these contracts without fixing the repository to a particular current
phase number.

Verification on the exact implementation tree:

- focused `test/repositoryGovernance.test.mjs` passed all 17 tests;
- ordinary `npm run check` and
  `npm run check -- --test-reporter=dot` each passed the same 96-file syntax
  check, static relative-import check, and complete 562-test suite;
- `git diff --check origin/main` passed with no output;
- changed-file inspection found only current-context/history documentation, two
  governance templates, and focused governance coverage.
  `docs/ARCHITECTURE.md` and application runtime files are unchanged, so
  architecture updates and browser QA are not applicable.

### Phase 79: Basics and Color localization

Basics- and Color-card-owned UI copy, statuses, technical display data, and
accessible names route through the one translator already created at
application composition. Each leaf owns a directly testable DOM-free message
adapter; catalog values stay plain text and reach escaped text or explicit
text/property/attribute sinks. Stable internal RGB tokens, rather than
translated labels, remain the element-ID source.

Generated category-description templates, DOM-free validation findings,
category-shell copy, Advanced, Range/State, sidebar, Regex, and other deferred
families are unchanged. Existing description, clipboard, signed-number, color
fidelity, scheduling, validation, focus, dirty/no-op, responsive, CSP, and
dependency boundaries remain in place.

Verification on the exact implementation tree:

- focused Basics, Color, localization, category/data-flow, accessibility,
  trust-boundary, and governance coverage passed 201 tests;
- `npm run check` passed: 97 JavaScript files syntax-checked, all static
  relative imports resolved, and 46 test files / 567 tests passed;
- `git diff --check origin/main` passed with no output;
- browser QA used a populated advanced preset in Comfortable and Compact
  density at 1280 px, 840 px, and 390 px with zero horizontal overflow;
- live browser checks covered Name/header/sidebar and Description updates,
  generated-description review, successful clipboard copy, cancel/return
  focus, signed Order validation/restoration, Hex/RGB/alpha synchronization,
  Enabled/Pinned validation, and the displayed-color no-op path;
- the native color input was verified as a labeled `type=color` control but its
  browser-native picker was not automated; the successful clipboard path was
  exercised, while the fallback path could not be forced by the available
  tooling;
- no application console error or CSP violation appeared. The browser host's
  own Electron development warning and the preset's expected three validation
  warnings were observed and are not application regressions.

### Phase 80: Range and State filter localization

Range and State filter editor-owned headings, display labels, summary badges,
structured range messages, segmented choices, and accessible names route
through the one translator already created at application composition. One
stable-keyed DOM-free adapter supplies the same messages to initial and
refreshed summaries, editor cards, and shared controls. Schema keys and
validation/compatibility findings remain untranslated, while existing DOM-free
summary and range-decision callers retain exact-English defaults.

The confirmed production-unused `stateFilterLabel()` export and its test-only
contract are removed. Existing range/state mutation order, dirty/no-op
behavior, validation, restoration, state values, summary refresh, description
triggers, deferred sidebar rendering, focus, accessibility, responsive
layout, import/export, safe sinks, and dependency boundaries remain in place.

Verification on the exact implementation tree:

- focused Range/State localization, editor/summary, form-control, category
  composition, accessibility, validation, import/export source, and governance
  suites passed;
- ordinary and compact `npm run check` passed: 98 JavaScript files
  syntax-checked, all static relative imports resolved, and 47 test files / 572
  tests passed;
- `git diff --check origin/main` passed with no output;
- browser QA used a populated advanced preset with both disclosure sections
  open in Comfortable and Compact density at 1280 px, 840 px, and 390 px,
  with zero document, app, editor, Range-grid, or State-grid horizontal
  overflow;
- live browser checks covered exact headings, choices, number labels, slider
  names, state-group names, range enablement, summary badges, unchanged input,
  blank restoration, out-of-range preservation/error association, reversed
  range warnings, valid correction, Required/Excluded changes, checked/invalid
  accessibility state, local focus stability, and Preferences return focus;
- the in-app browser's synthetic key presses did not change the styled state
  radio, so keyboard state changes were not claimed from browser automation;
  source and automated behavior coverage remain authoritative for that path;
- no application console error or CSP violation appeared. The browser host's
  own Electron development CSP warning and the preset's expected three
  validation warnings were the only diagnostics observed.

### Phase 80.1: State filter display-ownership cleanup

The production-unused legacy State filter options export and its test-only
duplicate English contract are removed. The catalog-backed Range/State message
adapter remains the sole runtime owner of State choice labels and retains
direct coverage for stable values `0`, `1`, and `2`, tones, exact English
labels, and translator ownership. No executed runtime path, UI structure,
schema, validation, localization output, or behavior changes.

Verification on the exact implementation tree:

- focused form-control and Range/State localization suites passed all 29 tests;
- `npm run check -- --test-reporter=dot` passed: 98 JavaScript files
  syntax-checked, all static relative imports resolved, and 47 test files / 571
  tests passed;
- repository-wide search found no remaining legacy State options definition,
  import, or reference, and `git diff --check origin/main` passed;
- changed files are limited to deletion of the unused export, removal of its
  directly related test-only contract, and this durable review record;
- `docs/AI_PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md` remain accurate and
  unchanged, so context and architecture updates are not applicable;
- browser QA is not applicable because no executed runtime or presentation
  path changed.

### Phase 81: populated category shell localization

The populated category sidebar and selected-category shell-owned header,
actions, delete confirmation, Advanced editor, Raw JSON statuses, fallbacks,
guidance, badges, counts, and accessible names route through two focused
DOM-free message adapters and the one translator created at application
composition. Persisted names, descriptions, IDs, format values, serialized Raw
JSON, generated duplicate names, validation and compatibility findings,
generated descriptions, callback reason strings, and schema keys remain
unchanged data.

The selected-category shell no longer re-exports details-summary, filter-summary,
or Basics-warning helpers that it does not own. Tests import the real owner
modules directly; the owner exports and their behavior remain covered.

Verification on the exact implementation tree:

- focused localization, category-list, category-editor/data-flow, summary,
  accessibility, Raw JSON/import-export, modal/focus, trust-boundary, and
  governance suites passed;
- `npm run check -- --test-reporter=dot` passed: 99 JavaScript files
  syntax-checked, all static relative imports resolved, and 48 test files / 576
  tests passed;
- repository-wide inspection found no stale removed facade import or
  re-export, and `git diff --check origin/main` passed with no output;
- browser QA used the populated advanced preset in Comfortable and Compact
  density at 1280 px, 840 px, and 390 px with zero document, app-shell, or
  editor horizontal overflow;
- live browser checks covered exact sidebar/header/Advanced copy, click,
  Enter, and Space selection focus, search/reorder guidance, contextual action
  availability, move and duplicate focus, delete cancel/confirm focus,
  generated duplicate naming, valid/no-op/invalid selected-category Raw JSON,
  dirty state, enabled on/off, pinned and validation badges, and focus recovery;
- the browser host's Electron development CSP warning, the preset's expected
  three validation warnings, and the intentionally triggered invalid-category
  JSON diagnostic were observed. No unexpected application error or CSP
  violation appeared. Committed drag motion was not automated; move controls
  and automated reorder coverage remain authoritative for mutation behavior.

### Phase 81.1: category-shell message-surface cleanup

The category-list message adapter no longer returns its test-only
`noDescription` member, and the selected-category message adapter no longer
returns its test-only plain delete-question function. Production continues to
use the captured no-description translation through subtitle composition and
the delete-question catalog key through semantic rich-message parts. Exact
English output, catalog keys and values, translator calls, injected ownership,
safe sinks, UI structure, and runtime behavior remain unchanged.

Verification on the exact implementation tree:

- focused category-shell localization, category-list, category-editor,
  application-data-flow, accessibility, localization, and trust-boundary
  suites passed all 91 tests;
- `npm run check -- --test-reporter=dot` passed: 99 JavaScript files
  syntax-checked, all static relative imports resolved, and 48 test files /
  576 tests passed;
- repository-wide inspection found no remaining public-member or test-only
  reference while both catalog keys retain their production adapter paths, and
  `git diff --check origin/main` passed with no output;
- changed runtime scope is limited to deleting the two unused returned
  members; the only other changes are the directly related test cleanup and
  this durable review record;
- `docs/AI_PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md` remain accurate and
  unchanged, so context and architecture updates are not applicable;
- browser QA is not applicable because no executed application or presentation
  path changed.

## Recording future work

For each numbered phase implementation tree:

1. Update `AI_PROJECT_CONTEXT.md` only for capabilities or durable contracts
   changed by the implementation; do not copy live Project fields.
2. Add a concise, merge-neutral verified result here, including honest QA
   boundaries and no prediction that the pull request has merged.
3. Update `ARCHITECTURE.md` only when current architecture actually changed;
   otherwise record Architecture as not applicable in the issue and pull
   request.
4. Put extended evidence in a new indexed history archive when it would make
   this entry point a journal again.
5. Keep live workflow status in the linked issue and Project item. Require a
   post-merge documentation correction only when merged code or verified
   behavior actually disagrees with the durable record. Create a separate issue
   only for a newly verified deferred finding.
