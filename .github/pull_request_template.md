## Summary

<!-- Describe the delivered capability and its verified source issue in terms that remain true before and after merge. Do not predict that this pull request has merged. -->

<!-- List every issue this pull request completes or materially advances. -->

Closes #
Advances #

## Scope and behavioral contracts

<!-- List important preserved behavior and explicit exclusions. -->

## Verification actually run

- [ ] Changed-file scope classified before selecting runtime, browser, security, or deployment reruns
- [ ] Focused tests or source checks appropriate to the change
- [ ] Complete check contract run once for this exact tree: canonical `npm run check`, or output-compact `npm run check -- --test-reporter=dot`
- [ ] Ordinary `npm run check` or a targeted test rerun used for diagnostics after any compact failure
- [ ] `git diff --check origin/main`
- [ ] Browser QA completed, or explicitly documented as not applicable/unavailable

## Durable synchronization

- [ ] Updated `docs/AI_PROJECT_CONTEXT.md` and `docs/REVIEW_HISTORY.md` only for delivered capabilities, durable contracts, and verified evidence, using merge-neutral wording
- [ ] Updated `docs/ARCHITECTURE.md` and other affected documents when their current content changed, or explicitly recorded them as not applicable
- [ ] Kept live Status, Priority, Area, and Phase values in Project #2; synchronized every issue this pull request closes or advances without loading the entire completed board
- [ ] Read history archives only when older evidence was relevant
- [ ] Requested post-merge documentation correction only if merged code or verified behavior actually disagrees with the durable record
- [ ] Recorded every new deferred finding in the most relevant new or existing repository issue
- [ ] This pull request is ready for review, not a draft
