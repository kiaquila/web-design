# AGENTS.md — KS

Original selling landing for Kristina Aquila's web design practice. Bilingual
(RU default, EN at `/en/`). Read [`README.md`](./README.md) first for the
verified facts and the open items.

## Identity

The reference is a printed café menu card: white paper, black ink, hairline
rules, heavy tracked capitals. Everything below follows from that.

- **The palette is fully achromatic.** White ground, near-black ink, a short
  grey ramp — no accent colour anywhere, not even on links or buttons.
  Hierarchy is carried by weight, tracking, rules and scale, the way it is on
  paper. A test walks every hex colour in the compiled stylesheet and fails any
  whose RGB channels spread more than 12, so a stray blue cannot slip in.
- Type is two families, both already licensed in this repository: **Manrope**
  for the wordmark, headings, navigation and body; **Playfair Display** for the
  chapter numerals, the pull quotes and the italic line in the contact band —
  nowhere else. Do not add a third family.
- Headings are uppercase with open tracking (`0.06em`–`0.09em`), not tight
  display type. Section labels are small caps sitting under a short black rule.
- The wordmark is **typography, not a mark**: `ks-design`, bold lowercase
  Manrope. There is no logo image; the old gradient monogram is gone and should
  not come back.
- The footer carries three things in this order: copyright, location, and social
  icons with no labels (LinkedIn, Telegram, Instagram).
- Tone: calm, concrete, premium. No urgency timers, no invented counters, no
  exclamation marks.

## The deck

Each section is a `.slide`. Above `900px` wide **and** `660px` tall the page
becomes a deck: every slide is one viewport and the page snaps between them.
Below that it is an ordinary flowing document.

- Slides use `min-height: 100svh`, never a fixed `height` with
  `overflow: hidden`. A slide is exactly one screen whenever its content fits
  and grows instead of clipping when it does not — silently eating the last
  line of copy on a short laptop window is worse than a slide that scrolls.
- The work slide sizes its screenshots from whatever height is left after the
  heading and the card meta. That needs a real constraint to divide, so
  `.work > .container` carries `max-height: calc(100svh - var(--header-h))`.
  Without the cap the `1fr` row resolves to its max-content and the slide grows
  past the screen. If you change that slide, re-measure rather than assume.
- Entrance reveals are claimed by the script (`html.reveal-on`), never written
  into the markup. A visitor without JavaScript, or with reduced motion, gets
  every slide fully visible.

## Content

- Source of truth is [`src/content.js`](./website/src/content.js). Every string
  on the page comes from there, in both languages. A key that exists in one
  language must exist in the other.
- Do not invent facts, prices, testimonials, client names or dates. Kind Words
  is deliberately unfilled; see README.
- The years of experience are **derived** from `CAREER_START_YEAR`, never typed.
  Copy uses the `%YEARS%` placeholder. A test fails if the literal is hardcoded.
- Approved external destinations are listed in `links`. A test rejects any other
  outbound origin.

## Implementation

- Static, no framework: `src/content.js` (copy), `src/render.js` (markup),
  five style layers `src/styles/{tokens,base,layout,components,sections}.css`
  concatenated in that order, and one classic script `src/js/site.js`.
- **The layers are concatenated, so a media query in an earlier layer loses to a
  plain rule in a later one.** A component's responsive rules belong in that
  component's layer. This has already bitten once: `.header-cta { display:none }`
  written in `layout.css` was overridden by `.btn { display:inline-flex }` in
  `components.css`, and the header overflowed every phone. That rule now lives
  in `components.css`.
- `site.js` is enhancement only. Nothing may be hidden in the markup waiting for
  a script: the nav is a visible list until the script collapses it, the
  carousel is a native scroll container until the script adds buttons, and the
  portrait swaps on hover in pure CSS. A test asserts the markup ships nothing
  pre-hidden.
- **The collapsed menu leaves the tab order through CSS `visibility`, and that
  property is never transitioned.** Clip-path, opacity and pointer-events hide
  it from the eye and the mouse but leave every link keyboard-focusable. Every
  way of animating `visibility` — a delay, or `allow-discrete` — holds the
  computed value at `visible` until the animation ends, leaving a window in
  which Shift+Tab reaches a menu that went invisible 100ms ago. Both were tried
  and both were wrong. The menu therefore closes instantly and only opening
  animates; that is the deliberate price of the guarantee.
  Keeping this in CSS rather than toggling `inert` from the script means it
  tracks the media query exactly and cannot go stale — a script-held copy of
  the breakpoint got the desktop navigation inert and keyboard-unreachable
  while this was being built.
- **The hamburger is shown by `.site-nav[data-collapsed] ~ .nav-toggle`, never
  by the breakpoint alone.** `data-collapsed` is set by the script, so without
  JavaScript the toggle stays hidden instead of sitting there dead beside a
  menu it cannot open. In that no-script case the header drops out of `fixed`
  and wraps, because four tracked links plus the wordmark and the language
  switch do not fit one 360px row.
- **Every tap target is at least 44px**, including the language switch, the
  footer social icons and the carousel arrows. A test measures the rules.
- No external origins at all: no CDN, no analytics, no remote fonts or images.
  The Worker's CSP is `script-src 'self'` and there are no inline `<script>`
  elements — the test enforces both.
- JavaScript budget: **4 KB gzipped**. If it is ever hit, remove behaviour
  rather than raising the number.
- Accessibility: one `h1` per page, AA contrast, visible `:focus-visible`, tap
  targets ≥ 44 px, `prefers-reduced-motion` disables every transition.
- Production is `https://ks-design.art`. Keep canonical, Open Graph, sitemap,
  and robots URLs on that origin even when a Cloudflare stage builds the same
  source.
- The production Compose project is `ks-design-portfolio` and may publish only
  `127.0.0.1:3100`. Do not reuse the `capsule-zero` Compose project, networks,
  volumes, images, ports, or Nginx configuration.

## The hero portrait

- Two frames cross-fade in the same box: `assets/portrait/calm-*` and
  `assets/portrait/wink-*`. They are **two halves of one diptych the client
  drew herself**, already identically framed, so the swap needs no compositing,
  no scaling and no alignment work — the build just splits, trims and exports
  them. Do not "improve" the alignment; anything that moves one frame relative
  to the other breaks the illusion of a single continuous shot.
- The frame is `aspect-ratio: 776 / 971`, the exact aspect of the source pair,
  and the images are `object-fit: cover` with no `object-position` shift. Zero
  crop means zero drift between the two states.
- The cross-fade is ~140 ms on purpose. Slower reads as a slideshow dissolve;
  at this speed the eye reads a cut, which is the requested gif feel.
- On hover a frosted panel rises over the **sweater, never the face** — it is
  anchored to the bottom of the frame. It carries the selling numbers only.
- The panel is a **sibling** of `.portrait`, not a child. `.portrait` is
  `role="img"`, and descendants of an `img` role are presentational, so numbers
  nested inside it would be silent for assistive tech. A test asserts the
  ordering.

## Dependencies

The only dependency is `wrangler`, and it is needed for deployment, never for
`npm run build` or the tests — those use Node builtins alone.

`package.json` pins `undici` to `7.29.0` through `overrides` because wrangler
resolves `7.28.0`, which the repository's OSV scan flags. `alex-neon/website`
carries the same pin for the same reason. Drop it once wrangler's own range
moves past the advisory, and regenerate the lockfile with
`npm install --package-lock-only`.

## Regenerating assets

The social card renders the real page fonts through headless Chrome, so it
cannot drift from the design:

```bash
node ks/website/scripts/make-og.mjs
```

Portfolio card screenshots, from the two live stages:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=2 --window-size=1440,900 --virtual-time-budget=9000 --screenshot=shot.png https://chaijana.ks-design.workers.dev
```

Neither is part of `npm run build`; both outputs are committed.

## Checks

From the repository root:

```bash
node scripts/check-repository.mjs
```

```bash
npm --prefix ks/website run check
```

Tests cover the client's wording, the price list, the bilingual contract
(`hreflang`, no untranslated Russian in the English page), approved outbound
links, local-only assets, the no-JavaScript guarantee, the achromatic palette,
grey contrast against AA, the accessibility structure, and the script budget.
Do not weaken a test to make a change pass.

Visually: 360 px and 1280 px+, keyboard focus, the portrait swap on hover and on
tap, the carousel at every breakpoint, `prefers-reduced-motion`, and a console
with no errors.

### Two traps when verifying this project

Both of these have already produced confident, wrong diagnoses. Read them before
concluding that something is broken.

**Headless Chrome cannot photograph this layout directly.** It clamps the layout
viewport to a minimum of 500 px, so a `--window-size=390` capture renders at
500 px and crops — which looks exactly like a horizontal-overflow bug and is not
one. It also screenshots from the top of the document, so `#anchor` captures
come back blank. Measure overflow and slide heights in a real browser; use
headless only for tall full-page captures with the deck's `100svh` temporarily
pinned to a pixel height in `dist/`.

**In a backgrounded browser pane (`document.hidden === true`), CSS transitions
and `requestAnimationFrame` never advance.** Transitioned properties stay stuck
at their pre-transition values, so `getComputedStyle` reports `opacity: 1` and
`visibility: visible` on an element the stylesheet has already hidden, and the
carousel's rAF-scheduled sync never runs. To test anything transitioned, set
`element.style.transition = 'none'`, read the value, then restore it — that
isolates the cascade from the stalled animation clock.
