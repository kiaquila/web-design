# Chaijaná

This directory keeps the two Chaijaná deliverables separate while publishing
them as one experience:

- `website/` — the complete multilingual restaurant website and deployable app;
- `menu/` — the standalone, no-framework ES/EN/RU menu and its canonical data.

The website build synchronizes the generated menu into its public output. Edit
menu content only in `menu/src/menu-data.ts`, run `npm run check` in `menu/`,
then run `npm test` in `website/` before publishing.

The repository history preserves each design iteration. Tag `chaijana-iteration-01`
marks the first mixed site/menu prototype before the website and menu were split.
