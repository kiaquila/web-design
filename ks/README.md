# KS — Kristina Aquila portfolio

Bilingual selling landing page for Kristina Aquila's web design practice. It is
an original design rather than a redesign: the business, the offer and the
copy are the owner's own.

The page is a **deck**: six sections, each one screen tall on desktop, scrolling
with snap points. On phones it is an ordinary flowing document.

1. Hero — headline and the portrait with its hover state
2. Selected projects
3. Process — `01`–`04`
4. Services — four package cards
5. Kind Words
6. Get in touch — full-width band, then the footer

Implementation lives in `website/`: static HTML/CSS/JS with no framework.
The customer stage remains on Cloudflare Workers; production is
[ks-design.art](https://ks-design.art), served from an isolated Docker Compose
project on the owner's `cz` server.

The hero's rock-expression source is preserved at
[`source-assets/portrait-rock-reference.png`](./source-assets/portrait-rock-reference.png).
The published hover exports rigidly register that exact source to the fixed head
position, preserving its open mouth, complete lower oval and elongated chin
without morphing them toward the calm face. The crown, hair, headband, loose
strands, body, shoulders, background and overall head placement stay fixed to
the calm frame. The viewer-right ear also stays literally fixed to the calm
frame. A narrow curved transition outside the outer cheek and jaw keeps the
complete rock-expression lower oval and its elongating chin shadow intact, then
fades into the fixed calm neck without a double contour, clothing leak or drift.
Immediately outside that single jaw line, the hover frame must read as clean
calm-frame background rather than a face-coloured halo or triangular matte.

## Source of truth

| Item | Value | Source |
| --- | --- | --- |
| Owner | Kristina Aquila | client |
| Location | Buenos Aires, Argentina | client |
| Email | `krisredlips@gmail.com` | client |
| Telegram | [@ks_aquila](https://t.me/ks_aquila) | client |
| LinkedIn | [kiaquila](https://www.linkedin.com/in/kiaquila) | client |
| Instagram | [ks_aquila](https://www.instagram.com/ks_aquila) | client |
| In web development since | 2017 | client |

Every string lives in [`website/src/content.js`](./website/src/content.js).
Nothing on the page is written anywhere else.

### Prices

Quoted by the client, in US dollars:

| Service | Price |
| --- | --- |
| Landing page | 500 |
| Website, 5+ pages | 1 500 |
| Menu build | 100 for the first page, 20 per additional page |
| Dish photo retouching | 50 per 10 dishes |

### Portfolio entries

Both projects live in this repository and are linked to their public stages:
[Chaijaná Noir](https://chaijana.ks-design.workers.dev) and
[Alex Neon](https://alex-neon.ks-design.workers.dev). The card images are
screenshots of those stages, regenerated with the command in
[`AGENTS.md`](./AGENTS.md).

## Open items

- **Kind Words is unfilled and hidden from published pages.** The section is
  built and styled, and the first
  card already carries Alex Oxitocin's name, role and avatar — but all three
  quotes are `TODO` placeholders, because the repository forbids inventing
  testimonials. The build prints a warning naming the section on every run,
  while the renderer omits the entire block until it is approved.
  Replace `kindWords.items` in `content.js` with real quotes and set
  `todo: false`.
- **Three links have no home on the page.** The old "why me" block carried the
  client's Pinterest, the `@vibecodesh` channel and the mentored Telegram
  group. That block was replaced by the numbers-only panel over the portrait,
  and the footer takes LinkedIn, Telegram and Instagram only — so those three
  destinations are currently nowhere. They are still in git history; decide
  whether they belong in the footer before launch.

## Production hosting

The production origin is `https://ks-design.art`; `www.ks-design.art` redirects
to it. Spaceship DNS points the apex to the server's public IPv4 and IPv6
addresses and aliases `www` to the apex. The server layout and repeatable
deployment procedure live in [`website/production/`](./website/production/).

Production uses the Compose project `ks-design-portfolio`, publishes its Nginx
container only on `127.0.0.1:3100`, and is routed by a dedicated host-Nginx
virtual host. It does not join, restart, or edit the `capsule-zero` Compose
project or its ports.

Changes under `ks/**` deploy automatically from merged, fully checked pull
requests after the resulting push reaches `main`. GitHub Environment
configuration, verification, cache purge, and recovery steps are documented in
[`website/production/README.md`](./website/production/README.md). Cloudflare
Workers remains PR-preview-only; its permanent `ks.ks-design.workers.dev` route
is disabled.

## Checks

From the repository root:

```bash
node scripts/check-repository.mjs
```

```bash
npm --prefix ks/website run check
```

Local preview:

```bash
npm --prefix ks/website run dev
```
