# Chaijaná website

Multilingual restaurant website for Chaijaná by KaplinЪ in Palermo Hollywood,
Buenos Aires. The site preserves the restaurant’s official Spanish, English,
and Russian content, contact channels, and photography in a responsive,
performance-focused redesign.

## Routes

- `/` — Spanish website
- `/en` — English website
- `/ru` — Russian website
- `/menu/index.html`, `/menu/en.html`, `/menu/ru.html` — standalone menu links

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
npm test
```

The production build uses the existing Vinext and Sites configuration. Official
optimized images live in `public/images/restaurant/`; the page itself does not
load images, fonts, or scripts from third-party CDNs.

`npm run build` first rebuilds the lightweight menu from its canonical sibling
source in `../menu/`, then copies it into `public/menu/`. The website and menu
therefore deploy together without duplicating their source of truth or relying
on previously generated HTML.
