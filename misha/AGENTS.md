# AGENTS.md — Mikhail Orlov

Original one-page CV portfolio for Mikhail Orlov, senior backend developer.
**English only** — there is no second locale and no language switch, and the
role is fixed to backend developer with no role switcher. Read
[`README.md`](./README.md) first for the verified facts and the open items.

## Identity

The reference is the WOVE page by Polyera: a flat light-grey field, charcoal
ink, a geometric sans and very large pale numerals. Everything below follows
from it.

- **The palette is fully achromatic.** Light-grey ground, charcoal ink, a short
  grey ramp — no accent colour anywhere, not on links and not on buttons. A
  test fails any hex whose RGB channels spread more than 12, so a stray blue
  cannot slip in.
- **One type family: Jost.** It is licensed (OFL) and self-hosted as one 26 KB
  variable latin subset. Do not add a second family, and do not add a webfont
  from a CDN — there are no external origins on this page at all.
- **The favicon is the page's own letter.** `assets/favicon.svg` carries the
  outline of `M` from Jost at weight 500, extracted from the shipped font
  rather than redrawn, so the tab icon and the wordmark cannot drift apart. If
  the display weight or the family ever changes, re-extract it.
- **`--ghost` is ornament, never text.** It carries the section numerals and
  nothing else; a test asserts it appears exactly once in the stylesheet.
- Headings are uppercase with open tracking. The display sizes — the name and
  the numerals — are the only places tracking goes negative.
- Tone: calm, concrete, senior. No urgency, no invented metrics, no
  exclamation marks, and no claim the CV does not already make.

## Content

- Source of truth is [`src/content.js`](./website/src/content.js). Every string
  on the page comes from there.
- **Do not invent facts.** No employer, date, metric, technology, testimonial
  or availability claim may appear that is not in the owner's CV, his GitHub
  profile README, or one of his public repositories. If a number would make the
  page stronger, ask him for it — do not estimate it.
- The years of experience are derived from `IT_START` and `BACKEND_START` via
  the `%IT_YEARS%` and `%BACKEND_YEARS%` placeholders. A test fails if a
  literal is typed instead. **Both constants carry a month, and
  `completedYearsSince` counts only years he has finished.** Subtracting the
  years alone is the quieter version of the same lie: he started in May 2008
  and July 2016, so every build between January and those months would have
  claimed a year early. The CV names months and not days, so that is the
  granularity — do not invent a start date to get finer.
- The two VK roles share one product paragraph in the CV. The page prints it
  **once**, on the more recent role; a test counts it. Restoring the second
  copy makes the page read like a paste error.
- The skills section's "Languages" is programming languages; what he speaks is
  labelled "Spoken". Both were called "Languages" once and sat on the same
  screen.
- **The contact address is a placeholder** (`example@e-mail.com`) and the build
  warns about it on every run, the way it warns about a missing origin. Do not
  quietly substitute the address from the CV — publishing it is the owner's
  decision.
- Social marks are **drawn in `render.js`**, never imported as brand assets,
  and every icon link carries its name in `.visually-hidden` text. An icon with
  no accessible name announces itself as "link". The order is LinkedIn,
  Telegram, GitHub, and a test asserts it.
- Approved outbound destinations are listed in `links`. A test rejects any
  other origin.

## Implementation

- Static, no framework: `src/content.js` (copy), `src/render.js` (markup), four
  style layers `src/styles/{tokens,base,layout,sections}.css` concatenated in
  that order, and one classic script `src/js/site.js`.
- **The layers are concatenated, so a media query in an earlier layer loses to
  a plain rule in a later one.** A component's responsive rules belong in that
  component's layer.
- `site.js` is enhancement only. Nothing may be hidden in the markup waiting
  for a script; the one exception is the print button, which ships `hidden`
  because a page with no script cannot honour it. A test asserts that is the
  only hidden element.
- **Everything below the head is one grid item, `.section-body`.** Split across
  several children, the head's tall numeral set the height of the first grid
  row and left roughly a hundred pixels of nothing between a section's first
  line and its second. A test counts one body per section.
- **`--space-xl` is measured, not chosen.** At 1440×900 the last two sections
  and the footer have to fit one screen together — they come to about 690px of
  the 840px below the masthead. Anything that grows section padding has to be
  re-measured there, not eyeballed.
- **The masthead is one row that must not overflow a 320px phone.** The budget
  is written into `layout.css` and measured, not assumed: 40px of gutter, the
  wordmark, one 8px gap and five 32px numerals. When something is added to the
  header, re-measure at 320px rather than trusting that it looks fine at 390px.
  The nav loses width before the name loses letters.
- No external origins at all: no CDN, no analytics, no remote fonts or images,
  and no inline `<script>` other than the JSON-LD block. Tests enforce both.
- Budgets: `site.js` under 2 KB gzipped, and HTML + CSS + JS under 25 KB
  gzipped. If a budget is hit, remove behaviour rather than raising the number.
- Accessibility: one `h1`, AA contrast for every grey that carries text,
  visible `:focus-visible`, 44px-tall targets, `prefers-reduced-motion`
  disables the reveal and the smooth scroll.
- **Print is a feature, not an afterthought.** `@media print` is how this CV
  becomes a PDF, so a change that looks right on screen is not finished until
  it has been printed to paper size. It lives in `print.css`, the **last**
  layer, because a print rule in an earlier layer loses to a plain rule in a
  later one — `.hero { min-height: 0 }` written in `layout.css` was overruled
  by the hero's own `min-height: calc(100svh …)` and the printed CV opened with
  most of a blank page.
- **A button cannot be pressed on paper and an icon cannot be typed.** The
  print layer unfolds the contact block back into the address and the three
  URLs, through `data-print-value` and `attr(href)`. Any new control in that
  block needs the same treatment or the printed CV loses a contact.
- **The print layer resets the entrance reveal, and must keep doing so.** The
  script puts `reveal-on` on the root and holds every section at `opacity: 0`
  until it crosses the viewport. Printing never scrolls, so a CV downloaded
  from the top of the page came out as one page followed by blank paper. Any
  new opacity or transform used for entrance has to be undone in `print.css`
  as well. Verify it the way it actually happens — load the page, leave it
  unscrolled, and only then swap `@media print` to `@media screen`; stripping
  `reveal-on` first hides exactly this bug.
- **What prints is a CV document, not the page on paper.** The rail, the
  numerals, the deck padding and every button come off; what is left is one
  column, headings with a rule under them, and dates in a narrow left column —
  the shape of the owner's source CV, set in the site's own type. It measures
  about 1.5 A4 pages and must stay under two. Re-measure by loading the
  stylesheet with `@media print` swapped to `@media screen` at a 688px-wide
  viewport: one A4 page at those margins is roughly 1024px tall.

## Deployment

The stage is a Cloudflare Worker named `misha`, served from `dist/` by Workers
Static Assets, with `worker/index.ts` attaching security headers. Its stable
URL is `https://misha.ks-design.workers.dev` and every pull request gets its own
versioned preview. Configuration lives in `website/wrangler.json` and in
`stageProjects` in the repository's `.repo-guard.json`; the one-time Cloudflare
connection is documented in [`docs/stage-hosting.md`](../docs/stage-hosting.md)
and only the account owner can perform it.

- **The stage is public.** It carries a real person's name, employers and
  career history. The contact address stays the placeholder until the owner
  says otherwise, and nothing else identifying may be added without asking.
- There is no production target. `ks-design.art` belongs to the KS project and
  this page must never be deployed onto it, into the `ks-design-portfolio`
  Compose project, or onto any custom domain without explicit authorization.
- `style-src` is `'self'` with no `'unsafe-inline'`, which is stricter than the
  other projects in this repository and is only possible because this page sets
  no inline styles. Adding a `style` attribute breaks the stage's CSP, not just
  a test.

## Checks

From the repository root:

```bash
node scripts/check-repository.mjs
```

```bash
npm --prefix misha/website run check
```

Visually: 320px, 360px and 1440px, keyboard focus, the scroll-spy in the
masthead, `prefers-reduced-motion`, the print preview, and a console with no
errors.

### Two traps when verifying this project

**The browser pane freezes CSS transitions and `requestAnimationFrame` while
`document.hidden === true`.** The reveal leaves every section at `opacity: 0`,
so a screenshot comes back blank or half-faded and looks like a broken build.
It is not. Remove `reveal-on` from `documentElement` before capturing, and set
`scrollBehavior = "auto"` before scrolling — `scroll-behavior: smooth` is also
rAF-driven and silently does nothing.

**Screenshots after scrolling come back blank in that same state.** Capture
from `scrollY === 0` and set `display: none` on the sections above the one
being photographed instead of scrolling to it.
