# Chaijaná menu

A no-framework multilingual menu built from one canonical data source. It contains only the current ES, EN and RU restaurant menu: cover details, tasting experiences, food, drinks, wine and hookah.

## Build

```sh
npm run check
```

The build writes:

- `index.html` — Spanish
- `en.html` — English
- `ru.html` — Russian
- `assets/menu.css` — shared local stylesheet

`src/menu-data.ts` is the canonical menu source. `scripts/build.mjs` renders all three HTML files. Dish-image filenames are documented in `assets/dishes/README.md`; missing optional images are hidden automatically.

## Design

The page follows the restaurant's own printed carta rather than a generic web
layout: warm near-black ground with film grain, gold-leaf hairlines, an
arabesque cover frame, ribbon badges for *Especial del Chef* / *Más pedidos*,
dotted price leaders, and dish photographs as circular medallions that alternate
sides down the page. Sections without a medallion fall into two columns, the way
the drink and wine pages read in print.

Everything is local: the display face is a self-hosted, per-script subset of
Cormorant Garamond in `assets/fonts/` (OFL), ornaments are inline SVG, and the
page loads nothing from the network. `@media print` flips the whole thing back
to ink on paper.

## Content provenance

The wording and prices were reconciled against the current 16-page ES, EN and RU
menu PDFs. The line-by-line comparison, the details that were restored and the
open questions for the restaurant are in
[`../CONTENT-AUDIT.md`](../CONTENT-AUDIT.md).

No restaurant story, gallery, booking form, WhatsApp button or social promotion
is included here.
