# AI Project Context

> **Repository:** `Bahbus/AB_Category_Editor`  
> **Purpose:** Static JavaScript editor for AetherBags category configuration files used with Final Fantasy XIV.  
> **Current state:** Phases 35.1 through 37 are validated and passed. Phase 38 — Lookup Cache Recovery, Range Validation Accessibility, and Context Advance — is the next implementation target.
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

Next implementation target: normalize persisted lookup-cache shape before app use, associate range-number validation with both inputs through `aria-describedby`, and advance the durable phase context.

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
