# Display typeface

Cormorant Garamond, subsetted per script and self-hosted so the menu loads
nothing from the network.

| File | Subset |
| --- | --- |
| `cormorant-garamond-latin.woff2` | Latin |
| `cormorant-garamond-latin-ext.woff2` | Latin Extended |
| `cormorant-garamond-cyrillic.woff2` | Cyrillic |
| `cormorant-garamond-italic-latin.woff2` | Latin, italic |
| `cormorant-garamond-italic-cyrillic.woff2` | Cyrillic, italic |

Each page loads only the subsets its script needs — the ES and EN pages never
fetch the Cyrillic files, and vice versa. The `unicode-range` declarations that
drive this live at the top of `chaijana/menu/src/styles.css`.

Licensed under the SIL Open Font License 1.1 — see `OFL.txt`, which the licence
requires to travel with the font files. Source: the Google Fonts release of
[Cormorant](https://github.com/CatharsisFonts/Cormorant).

These files are the single copy in the repository. `chaijana/website` serves the
same fonts from `public/fonts/`, generated at build time by
`chaijana/website/scripts/sync-menu.mjs`; that directory is git-ignored.
