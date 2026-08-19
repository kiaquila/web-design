# Mikhail Orlov — CV portfolio

One-page English CV and portfolio for Mikhail Orlov, senior backend developer
and software development lead. It is an original design rather than a redesign:
the person, the career and the copy are the owner's own.

Implementation lives in [`website/`](./website/): static HTML/CSS/JS with no
framework, no build-time dependencies outside Node builtins, and no network
dependency at runtime. The whole page is one HTML file, one stylesheet, one
script and one font file.

The page is a single scrolling document with a fixed masthead. Five numbered
sections, after the client's reference:

1. Hero — name, role, positioning line and four facts
2. `01` Profile — CV summary and what he can help with
3. `02` Experience — four roles, reverse chronological
4. `03` Skills — languages, data, platform, domain, education, spoken languages
5. `04` Open source — his two public repositories
6. `05` Contact — one line: the offer, a mail button, three profile icons

## Source of truth

Nothing on this page is invented. Every string lives in
[`website/src/content.js`](./website/src/content.js) and comes from one of
three places the owner controls:

| Item | Value | Source |
| --- | --- | --- |
| Name | Mikhail Orlov | CV |
| Role | Senior Backend Developer | CV |
| Email | `example@e-mail.com` — **placeholder**, awaiting the owner's choice | — |
| LinkedIn | [chappp](https://www.linkedin.com/in/chappp) | CV |
| Telegram | `chapppp` — **unverified**, supplied by the owner's wife | client |
| GitHub | [cucumberfalse](https://github.com/cucumberfalse) | GitHub |
| Location | Buenos Aires | GitHub profile |
| Positioning line and "What I can help with" | Verbatim | GitHub profile README |
| Summary, roles, dates, achievements | Condensed, no claim added | CV |
| Education, spoken languages | 2003–2008 PSTU; English C1, Spanish A1, Russian native | CV |
| `cabadrive`, `takeyourmeds` | Descriptions from the repositories | GitHub |

The years of experience are **derived** from `IT_START_YEAR` (2008, Er-Telecom)
and `BACKEND_START_YEAR` (2016, LitRes), never typed. Copy carries `%IT_YEARS%`
and `%BACKEND_YEARS%`; a test fails if a literal appears instead.

The LinkedIn profile could not be read programmatically — LinkedIn answers
automated requests with HTTP 999 — so nothing on the page comes from it. If the
profile carries wording the CV does not, it has to be pasted in by hand.

## Design

The client's reference is the WOVE product page by Polyera: a flat light-grey
field, charcoal ink, a geometric sans, and very large pale section numerals as
the only ornament. Everything follows from that.

- The palette is **achromatic** — light grey ground, charcoal ink, a short grey
  ramp, no accent colour anywhere. A test walks every hex in the compiled
  stylesheet and fails any whose RGB channels spread more than 12.
- Type is **one family, Jost** — a Futura-adjacent geometric sans under the SIL
  Open Font License, self-hosted as a single 26 KB variable latin subset. Do
  not add a second family.
- The section numerals are the page's only decoration and use `--ghost`, the
  one grey too pale for text. A test asserts that token is used exactly once
  and only on `.numeral`.
- Hierarchy is scale, weight, tracking and hairlines. There are no cards, no
  shadows, no rounded corners and no icons.

## Checks

From the repository root:

```bash
node scripts/check-repository.mjs
```

```bash
npm --prefix misha/website run check
```

Local preview:

```bash
npm --prefix misha/website run dev
```

## Open items

- **The contact address is a placeholder.** `links.email` is
  `example@e-mail.com`, and the build says so on every run. The CV carries
  `cucumberfalse@gmail.com`; publishing it is the owner's call, so the page
  waits for that decision rather than making it for him.
- **No domain yet.** `SITE_ORIGIN` is unset, so the build ships no canonical
  URL, no `og:url` and no sitemap, and prints a warning on every run. Set it
  once the page has a home, then rebuild.
- **Staged, not published.** The Cloudflare Worker `misha` serves
  [misha.ks-design.workers.dev](https://misha.ks-design.workers.dev) from
  `main`, and each pull request gets its own preview. There is still no
  production target and no custom domain.
- **The CV itself is thin on numbers.** Every achievement on the page is
  qualitative — "refactoring of the payment processing system" — because that
  is what the source CV says. Scale, load, latency and money are the single
  biggest missing ingredient; see
  [`competitor-review.md`](./competitor-review.md) for where the market puts
  them and what to ask him for.
- **The Telegram handle is one letter away from the LinkedIn one.** LinkedIn
  is `chappp` and Telegram is `chapppp`; both came from the owner's side and
  the second has not been opened to confirm it. Check it before the page is
  shown to anyone.
- **No PDF is committed.** The page *is* the PDF: `print.css` reflows the same
  content into an ordinary one-column CV document — no rail, no numerals, no
  buttons, dates in a narrow left column — set in the same Jost the site uses
  and measured to land inside two A4 pages. The hero's "Download CV" button
  opens the browser's print dialog, where "Save as PDF" is the default
  destination. A separately maintained PDF would drift from `content.js`
  within a month.
