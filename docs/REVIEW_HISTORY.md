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
policy, and a primary-set size budget.

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

## Recording future work

For each completed numbered phase:

1. Update the current-state summary in `AI_PROJECT_CONTEXT.md`.
2. Add a concise verified result here, including honest QA boundaries.
3. Update `ARCHITECTURE.md` only when current architecture actually changed;
   otherwise record Architecture as not applicable in the issue and pull
   request.
4. Put extended evidence in a new indexed history archive when it would make
   this entry point a journal again.
5. Update the linked issue and Project item. Create a separate issue only for a
   newly verified deferred finding.
