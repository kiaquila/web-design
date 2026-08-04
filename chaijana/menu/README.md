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

The wording and prices were reconciled against the current 16-page ES, EN and RU menu PDFs opened by the project owner. No restaurant story, gallery, booking form, WhatsApp button or social promotion is included here.
