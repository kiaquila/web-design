# Dish image hooks

The build knows these optional filenames. Existing files are rendered as circular
medallions; absent files are omitted without a broken-image placeholder. Run
`npm run build` after adding an image.

- `chaijana-experiences.webp`
- `draniki-salmon.webp`
- `crispy-eggplant.webp` *(missing)*
- `adjarian-khachapuri.webp`
- `suyru-lagman.webp` *(missing)*
- `lula-kebab.webp` *(missing)*
- `uzbek-plov.webp`
- `manti.webp`
- `kids-menu.webp`
- `medovik.webp`
- `uzbek-tea.webp`
- `fruit-shakes.webp`
- `cocktails.webp` *(missing)*
- `wine.webp` *(missing)*
- `hookah.webp`

Use the restaurant's exact dish photographs (or identical dishes with explicit
approval). Export as **square 1:1 WebP, 2000 × 2000 px, under 250 KB** — the
medallion renders at 330 CSS px, so anything below 1200 px is visibly soft on a
retina screen. The files currently in this folder were extracted from the printed
PDF at 100–130 ppi and are placeholders.

Shooting direction, per-file priorities and the website slots are in
[`../../../PHOTO-BRIEF.md`](../../../PHOTO-BRIEF.md). Provenance of the current
extracts is recorded in `mapping.json`.
