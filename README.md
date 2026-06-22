# AetherBags Category Editor

A browser-based, dependency-free editor for AetherBags category exports for FFXIV.

Published page: <https://bahbus.github.io/AB_Category_Editor/>

## Features

- Import/paste AetherBags gzip+Base64 category data, or upload text/Base64/JSON exports.
- Export/copy updated gzip+Base64 data, or download it as a local `.txt` file.
- Category reorder/editing, including drag/drop ordering, sort-by-order, renumbering, names, descriptions, colors, and enabled/pinned state.
- Rule editing for item IDs, UI category IDs, regex item-name patterns, ranges, state filters, custom sorting, and custom item order.
- Rarity checkboxes for supported AetherBags rarity values.
- Batched XIVAPI lookups for referenced Item and ItemUICategory names.
- Lookup cache backed by browser `localStorage`, with an in-app cache viewer and clear button.
- Regex → Item IDs conversion using cancelable XIVAPI item sheet scans.

## How to use

1. In AetherBags, export or copy your category configuration.
2. Open the editor and use **Import/Paste** for copied text, or **Upload** for a saved text/Base64/JSON file.
3. Edit categories, rules, colors, sorting, rarities, regex filters, and item/category IDs as needed.
4. Use **Export/Copy** to copy updated gzip+Base64 text, or **Download** to save the updated text locally.
5. Import or paste the exported Base64 text back into AetherBags using the plugin's category import workflow.

## Privacy

- The full imported config is processed locally in your browser.
- The app stores lookup names in browser `localStorage` so repeated item/category lookups are faster.
- XIVAPI is contacted only for item/category name lookups, search queries, and item sheet scans used by Regex → Item IDs.
- The app does not upload the full category config to this repository.

## Developer notes

- Keep the app dependency-free and GitHub Pages-compatible.
- Any user/config-provided values inserted into `innerHTML` must be escaped with `escapeHtml()` first. Prefer `textContent` when markup is not needed.

## Development checks

- Run regression tests with `node --test`.
- Check relative module imports with `node scripts/check-imports.mjs`.
