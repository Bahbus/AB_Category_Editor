<!-- Maintainer workflow template. This file is deliberately outside .github/ISSUE_TEMPLATE so it does not appear in the public issue chooser. -->

## Summary

<!-- State the verified problem or bounded improvement and the intended delivered capability. Write durable records so they remain true before and after merge. -->

## Review evidence and Project decision

<!-- Record the focused evidence that justified this phase and the severity/impact-aware selection decision. Confirm every actionable finding was recorded in its owning repository issue before selection. Keep live Status, Priority, Area, and Phase values in Project #2 rather than duplicating them in durable documents. -->

## Source issues and relationships

- Primary issue: #
- Also closes or advances: #
- Related, blocked, or deferred issues: #

<!-- List every tracked issue this coherent phase packs. Explain their relationships and the shared ownership and verification boundary; do not use a multi-issue phase as an unrelated grab bag. -->

## Implementation

<!-- List precise in-scope delivered capabilities and explicit exclusions without predicting that a pull request has merged. -->

## Behavioral contracts

<!-- List data, dirty-state, focus, accessibility, responsive, compatibility, security, and architectural behavior that must remain unchanged. -->

## Verification

<!-- Classify the changed-file scope first. Include focused coverage, the complete check contract once per exact tree, diff checks, and browser/security/runtime QA only when relevant. `npm run check -- --test-reporter=dot` is allowed for compact routine verification; use ordinary `npm run check` or a targeted rerun for failure diagnostics. Read history archives only when older evidence is relevant, and query the current issue/Project item instead of the entire completed board. -->

## Completion synchronization

- [ ] Update `docs/AI_PROJECT_CONTEXT.md` and `docs/REVIEW_HISTORY.md` only for delivered capabilities, durable contracts, and verified evidence; keep the wording merge-neutral.
- [ ] Update `docs/ARCHITECTURE.md` and any other affected document when its current content changed; otherwise record that document as not applicable instead of adding repetitive phase boilerplate.
- [ ] Keep live workflow values in Project #2, synchronize every issue this phase closes or advances, and record each newly verified deferred finding in the most relevant new or existing repository issue.
- [ ] Request a post-merge documentation correction only when merged code or verified behavior actually disagrees with the durable record.
- [ ] Link the pull request to every issue it completes with a closing keyword, and identify every issue it advances without closing, so Project workflows can synchronize the affected items after merge.
