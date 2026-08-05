# AGENTS.md — Chaijaná

Chaijaná is an existing restaurant in Buenos Aires. This directory contains its
website and multilingual menu as separate deliverables within one coherent
experience.

## Product Identity

- Approved design concept: **Chaijaná Noir**.
- Direction: warm near-black surfaces, restrained gold-leaf accents,
  Cormorant Garamond display typography, editorial food imagery, and subtle
  Central Asian arabesque references.
- The tone is intimate, premium, and nocturnal. Avoid generic luxury tropes,
  bright SaaS styling, ornamental overload, and visual changes that obscure
  menu readability.

## Sources Of Truth

- `README.md` — deliverables, architecture, and shared design-system contract.
- `CONTENT-AUDIT.md` — provenance, reconciled multilingual content, and client
  confirmations.
- `PHOTO-BRIEF.md` — image gaps, quality constraints, and replacement targets.
- `menu/src/menu-data.ts` — canonical menu content.
- `menu/src/styles.css` — reference design tokens shared manually with the site.

Do not change factual content, prices, translations, hours, contact information,
or claims without updating the audit with a verifiable source or explicit client
confirmation.

## Implementation Rules

- Keep `website/` and `menu/` separately testable. The website may consume the
  generated menu; the standalone menu must not depend on the website runtime.
- Keep the menu usable from a clone without network access or a framework.
- Keep fonts and production imagery local. Do not introduce third-party CDNs,
  trackers, or embeds without explicit approval.
- When changing shared design tokens, update both `menu/src/styles.css` and
  `website/app/globals.css` in the same change and verify their documented
  exception.
- Preserve all three locales: Spanish, English, and Russian.
- Treat generated menu HTML and CSS as build artifacts derived from the
  canonical menu source; validate generated results, but do not create a second
  hand-edited source of truth.

## Validation

Run from the repository root:

```bash
node scripts/check-repository.mjs
npm --prefix chaijana/menu run check
npm --prefix chaijana/website run lint
npm --prefix chaijana/website test
```

For visual changes, also inspect representative mobile and desktop states in all
three locales, including the longest menu entries and keyboard focus states.
