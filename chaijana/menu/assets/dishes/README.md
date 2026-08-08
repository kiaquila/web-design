# Dish image hooks

The build knows these optional filenames. Existing files are rendered as circular
medallions; absent files are omitted without a broken-image placeholder. Run
`npm run build` after adding an image.

- `chaijana-experiences.webp` *(client photo)*
- `draniki-salmon.webp` *(client photo)*
- `crispy-eggplant.webp` *(missing)*
- `adjarian-khachapuri.webp` *(client photo)*
- `suyru-lagman.webp` *(missing)*
- `lula-kebab.webp` *(missing)*
- `uzbek-plov.webp` *(client photo)*
- `manti.webp` *(client photo)*
- `kids-menu.webp` *(client photo)*
- `medovik.webp` *(client photo)*
- `uzbek-tea.webp` *(client photo)*
- `fruit-shakes.webp` *(PDF extract — replace)*
- `cocktails.webp` *(missing)*
- `wine.webp` *(missing)*
- `hookah.webp` *(PDF extract — replace)*

Use the restaurant's exact dish photographs (or identical dishes with explicit
approval). Export as **square 1:1 WebP, under 250 KB, at least 1200 px** — the
medallion renders at 330 CSS px, so anything smaller is visibly soft on a retina
screen. Shoot on a black ground: the medallion is a circular crop with only a
light inner vignette, so a photograph on any other background shows a hard disc
edge.

The client-supplied files are 1254 × 1254 masters delivered 2026-08-07. The two
remaining PDF extracts were pulled from the printed carta at 100–130 ppi and are
still placeholders.

Shooting direction, per-file priorities and the website slots are in
[`../../../PHOTO-BRIEF.md`](../../../PHOTO-BRIEF.md). Provenance of the current
extracts is recorded in `mapping.json`.
