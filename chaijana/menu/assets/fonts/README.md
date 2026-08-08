# Typefaces

Two self-hosted families, subsetted per script so the menu loads nothing from
the network.

## Playfair Display — display

Headings, dish names, prices, the cover, and the italic subtitles.

| File | Subset |
| --- | --- |
| `playfair-display-latin.woff2` | Latin |
| `playfair-display-latin-ext.woff2` | Latin Extended |
| `playfair-display-cyrillic.woff2` | Cyrillic |
| `playfair-display-italic-latin.woff2` | Latin, italic |
| `playfair-display-italic-cyrillic.woff2` | Cyrillic, italic |

Variable weight 400–700 upright, 400–600 italic. It replaced Cormorant
Garamond, which is a deliberately light display Garamond: at menu sizes its
hairlines thinned to nothing against the near-black ground, and its default
fit was too tight for comfortable reading. Playfair carries a denser stem and
a larger x-height, and `styles.css` tracks it out slightly at every size
(`--track-display`, `--track-title`) so the letters keep their air.

Note that 400 is Playfair's lightest cut — the old `font-weight: 300`
declarations had to move to 400 when the face changed.

## Manrope — text and UI

Descriptions, option lists, the top bar, the category rail, and the badges.

| File | Subset |
| --- | --- |
| `manrope-latin.woff2` | Latin |
| `manrope-latin-ext.woff2` | Latin Extended |
| `manrope-cyrillic.woff2` | Cyrillic |

Variable weight 300–800. Before this, the text stack fell through to whatever
sans the host system provided, so the same page rendered in San Francisco on
macOS and Segoe UI on Windows. Manrope keeps one voice everywhere, and its open
apertures hold up at the small tracked-out uppercase sizes the badges and the
category rail use.

## Loading

Each page preloads only the subsets needed above the fold. ES and EN preload
the Latin files; RU preloads both Cyrillic and Latin because its address,
hours, prices, percentages, and language switch contain ASCII. The
`unicode-range` declarations that drive this live at the top of
`chaijana/menu/src/styles.css`; `scripts/build.mjs` emits the locale-specific
preloads, and `tests/menu.test.mjs` asserts the complete matrix.

## Licence

Both are licensed under the SIL Open Font License 1.1. `OFL-PlayfairDisplay.txt`
and `OFL-Manrope.txt` are kept beside the font files, which the licence
requires. Sources: the Google Fonts releases of
[Playfair Display](https://github.com/clauseggers/Playfair-Display) and
[Manrope](https://github.com/sharanda/manrope).

These files are the single copy in the repository. `chaijana/website` serves the
same fonts from `public/fonts/`, generated at build time by
`chaijana/website/scripts/sync-menu.mjs`; that directory is git-ignored.
