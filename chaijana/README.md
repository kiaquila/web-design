# Chaijaná — Chaijaná Noir

**Chaijaná Noir** is the approved redesign concept for Chaijaná: an intimate,
nocturnal expression of the restaurant's Central Asian identity, built around
warm near-black surfaces, restrained gold-leaf detail, editorial food imagery,
and Cormorant Garamond display typography. The concept name and direction apply
to both deliverables in this directory.

This directory keeps the two Chaijaná deliverables separate while publishing
them as one experience:

- `website/` — the complete multilingual restaurant website and deployable app;
- `menu/` — the standalone, no-framework ES/EN/RU menu and its canonical data.

The website build synchronizes the generated menu into its public output. Edit
menu content only in `menu/src/menu-data.ts`, run `npm run check` in `menu/`,
then run `npm test` in `website/` before publishing.

The temporary customer stage is deployed as the `design-chaijana` Cloudflare
Worker. Merges to `main` update its stable `workers.dev` URL; non-production
branches upload isolated preview versions without replacing the stable stage.
Repository-wide setup and retirement instructions live in
[`../docs/stage-hosting.md`](../docs/stage-hosting.md).

Both share one design system — **Chaijaná Noir**: warm near-black ground, a
gold-leaf accent ramp, self-hosted Cormorant Garamond for display, and inline
SVG arabesque ornaments.

**The two stylesheets are synchronised by hand, on purpose.** `menu/` must open
straight from a clone with no build step and no network, so it cannot import
tokens from the website package. `menu/src/styles.css` is the reference
implementation: every `:root` token in `website/app/globals.css` must match it
byte for byte, with one documented exception (`--shell`, wider on the site).
Changing a token means changing both files in the same commit. To check:

```sh
node -e 'const r=p=>{const s=require("fs").readFileSync(p,"utf8"),b=s.slice(s.indexOf(":root {"));return Object.fromEntries([...b.slice(0,b.indexOf("}")).matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(m=>[m[1],m[2].trim()]))};const a=r("chaijana/menu/src/styles.css"),b=r("chaijana/website/app/globals.css");const d=Object.keys(a).filter(k=>k in b&&a[k]!==b[k]&&k!=="--shell");console.log(d.length?"drifted: "+d:"tokens in sync")'
```

The five woff2 subsets live once, in `menu/assets/fonts/` (with their `OFL.txt`).
`website/scripts/sync-menu.mjs` copies them into the git-ignored
`website/public/fonts/` at build time.

## Working documents

- [`CONTENT-AUDIT.md`](./CONTENT-AUDIT.md) — line-by-line comparison against the
  live site and the three menu PDFs: what was restored, what was deliberately
  unified, and what still needs the restaurant's confirmation.
- [`PHOTO-BRIEF.md`](./PHOTO-BRIEF.md) — which images to reshoot or regenerate,
  in what format and at what priority.

The repository history preserves each design iteration. Tag `chaijana-iteration-01`
marks the first mixed site/menu prototype before the website and menu were split.
