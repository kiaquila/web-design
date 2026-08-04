# Chaijaná

This directory keeps the two Chaijaná deliverables separate while publishing
them as one experience:

- `website/` — the complete multilingual restaurant website and deployable app;
- `menu/` — the standalone, no-framework ES/EN/RU menu and its canonical data.

The website build synchronizes the generated menu into its public output. Edit
menu content only in `menu/src/menu-data.ts`, run `npm run check` in `menu/`,
then run `npm test` in `website/` before publishing.

Both share one design system — *Chaijaná Noir*: warm near-black ground, a
gold-leaf accent ramp, self-hosted Cormorant Garamond for display, and inline
SVG arabesque ornaments. Tokens live at the top of `menu/src/styles.css` and
`website/app/globals.css` and are kept in sync by hand.

## Working documents

- [`CONTENT-AUDIT.md`](./CONTENT-AUDIT.md) — line-by-line comparison against the
  live site and the three menu PDFs: what was restored, what was deliberately
  unified, and what still needs the restaurant's confirmation.
- [`PHOTO-BRIEF.md`](./PHOTO-BRIEF.md) — which images to reshoot or regenerate,
  in what format and at what priority.

The repository history preserves each design iteration. Tag `chaijana-iteration-01`
marks the first mixed site/menu prototype before the website and menu were split.
