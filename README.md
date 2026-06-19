# AetherBags Category Editor

A browser-based editor for AetherBags category exports for FFXIV.

## Features

- Import/paste AetherBags gzip+Base64 category data
- Export/copy updated gzip+Base64 data
- Upload/download `.txt` exports
- Edit categories, rules, colors, ranges, and state filters
- Lookup FFXIV Item and ItemUICategory names through XIVAPI
- Convert regex item-name filters into explicit item IDs

## GitHub Pages

This project is static HTML/CSS/JS. To publish it with GitHub Pages:

1. Put these files in a public GitHub repository.
2. Go to repository **Settings → Pages**.
3. Set **Source** to `Deploy from a branch`.
4. Set **Branch** to `main` and folder to `/root`.
5. Save.

Your site should publish at:

```text
https://<username>.github.io/<repository-name>/
```

## Privacy

This editor runs in your browser. Your category data is not uploaded to this repository.
XIVAPI lookups are only used when resolving item/category names or scanning item names.
