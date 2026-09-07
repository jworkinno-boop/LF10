# Fonts

DM Sans, self-hosted as woff2. Nothing may be fetched at runtime: the nginx CSP
is `default-src 'self'` with `font-src 'self' data:`, and the README's "zero
further requests after load" claim is enforced by it.
**Do not add a Google Fonts `<link>`.**

    dm-sans-latin-wght-normal.woff2       37 kB — U+0000-00FF and friends
    dm-sans-latin-ext-wght-normal.woff2   18 kB — latin-ext
    OFL-DM-Sans.txt                       the licence, which must ship with it

These are variable fonts on the weight axis: `font-weight: 100 1000` in the
`@font-face` block at the top of `src/index.css`, so one file per subset covers
every weight the UI asks for. Upright only — the app uses no italics, and
skipping them saves about 60 kB.

The unicode-ranges are Google's own split, so a page of plain English fetches
only the latin file. Symbols outside both ranges (the audit log's arrow, the
tick, the appearance switch's sun and moon) come from the fallback stack in
`tailwind.config.js`; DM Sans simply does not contain them.

## Refreshing them

    npm run fonts:sync

That copies from `@fontsource-variable/dm-sans` (a devDependency, OFL 1.1) into
this directory — see `scripts/sync-fonts.mjs`. The binaries are committed rather
than imported from node_modules so the CSP story stays a build-time fact.
