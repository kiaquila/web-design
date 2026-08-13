/* Renders one complete static page per language from `content.js`.

   Both languages are built at build time rather than swapped by a script, so
   the page a visitor (or a crawler) receives is already in their language and
   stays readable with JavaScript switched off. The language switch is a pair
   of ordinary links between the two rendered documents.

   The page is a deck: each section is a `.slide` sized to one viewport on
   desktop, and the deck scrolls with snap points. Everything still reads as a
   plain document on phones and without CSS. */

import { content, experienceYears, languages, links, ogImages } from "./content.js";

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

/** `%YEARS%` is the only placeholder in the copy: the career length is derived
 *  from a start year so it cannot go stale. */
const fill = (value, years) =>
  escapeHtml(String(value).replaceAll("%YEARS%", String(years)));

/* --- icons: drawn here, so the page pulls no third-party brand assets ----- */

const icon = (body, viewBox = "0 0 24 24", size = 20) =>
  `<svg viewBox="${viewBox}" width="${size}" height="${size}" aria-hidden="true" focusable="false">${body}</svg>`;

const icons = {
  linkedin: icon(
    '<path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76v5.69h-4v-5.04c0-1.2-.02-2.75-1.75-2.75-1.75 0-2.02 1.3-2.02 2.66v5.13h-4v-11Z"/>'
  ),
  telegram: icon(
    '<path fill="currentColor" d="M21.9 4.3 18.9 19c-.2 1-.8 1.2-1.7.75l-4.6-3.4-2.2 2.15c-.25.25-.45.45-.9.45l.32-4.6L18.3 6.8c.36-.32-.08-.5-.56-.18L7.4 13.16l-4.5-1.4c-.98-.3-1-.98.2-1.45l17.6-6.8c.8-.3 1.5.2 1.2 1.8Z"/>'
  ),
  instagram: icon(
    '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.2" cy="6.8" r="1.25" fill="currentColor"/>'
  ),
  arrowUpRight: icon(
    '<path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" d="M7 17 17 7M8 7h9v9"/>'
  ),
  chevronLeft: icon(
    '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/>'
  ),
  chevronRight: icon(
    '<path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>'
  ),
  mail: icon(
    '<rect x="2.8" y="5" width="18.4" height="14" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="m3.6 7 8.4 6 8.4-6"/>',
    "0 0 24 24",
    28
  )
};

/* --- reusable pieces ------------------------------------------------------ */

/** One responsive image with a WebP source and a JPEG fallback. */
function picture({ dir, base, alt, widths, height, sizes, className, lazy = true, decorative = false }) {
  const [small, large] = widths;
  const altAttr = decorative ? 'alt="" aria-hidden="true"' : `alt="${escapeHtml(alt)}"`;
  return `<picture${className ? ` class="${className}"` : ""}>
        <source type="image/webp" sizes="${sizes}" srcset="/assets/${dir}/${base}-${small}.webp ${small}w, /assets/${dir}/${base}-${large}.webp ${large}w">
        <img src="/assets/${dir}/${base}-${small}.jpg" sizes="${sizes}" srcset="/assets/${dir}/${base}-${small}.jpg ${small}w, /assets/${dir}/${base}-${large}.jpg ${large}w" ${altAttr} width="${large}" height="${height}"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high" decoding="async"'}>
      </picture>`;
}

function langSwitch(lang, copy) {
  const entry = (code) => {
    const isCurrent = code === lang;
    const label = escapeHtml(copy.langSwitch[code]);
    return isCurrent
      ? `<span class="lang-current" aria-current="true">${label}</span>`
      : `<a href="${languages[code].path}" hreflang="${code}" lang="${code}">${label}</a>`;
  };
  return `<nav class="lang-switch" aria-label="${escapeHtml(copy.langSwitch.label)}">${entry("ru")}<span class="lang-divider" aria-hidden="true">/</span>${entry("en")}</nav>`;
}

/** `anchorBase` is empty on the landing page, where the sections are on the
 *  page already. The 404 page reuses this header but has none of those ids, so
 *  it passes the home path and the links become `/#work` rather than a `#work`
 *  that silently does nothing. */
function header(lang, copy, anchorBase = "") {
  const home = languages[lang].path;
  /* Each nav key is also the id of the section it points at. */
  const navItems = ["work", "process", "services", "contact"]
    .map(
      (key) =>
        `<li><a href="${anchorBase}#${key}">${escapeHtml(copy.nav[key])}</a></li>`
    )
    .join("");

  return `<header class="site-header" data-header>
    <div class="container header-inner">
      <a class="brand" href="${home}">ks-design</a>
      <nav class="site-nav" id="site-nav" aria-label="${escapeHtml(copy.nav.label)}">
        <ul role="list">${navItems}</ul>
      </nav>
      <div class="header-actions">
        ${langSwitch(lang, copy)}
        <a class="btn btn-solid btn-compact header-cta" href="${anchorBase}#contact">${escapeHtml(copy.nav.cta)}</a>
      </div>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" data-nav-toggle>
        <span class="visually-hidden">${escapeHtml(copy.nav.label)}</span>
        <span class="bar" aria-hidden="true"></span>
        <span class="bar" aria-hidden="true"></span>
      </button>
    </div>
  </header>`;
}

function hero(copy, years) {
  /* Two stacked frames that cross-fade. The calm frame carries the alt text;
     the second is decorative, so a screen reader is told about one person, not
     two. The sizes attribute matches the CSS column, not the viewport. */
  const portraitSizes = "(max-width: 899px) min(84vw, 420px), min(34vw, 470px)";
  const frames = ["calm", "wink"]
    .map((state, index) =>
      picture({
        dir: "portrait",
        base: state,
        alt: copy.hero.portraitAlt,
        widths: [520, 776],
        height: 971,
        sizes: portraitSizes,
        className: `portrait-frame portrait-${state}`,
        lazy: false,
        decorative: index === 1
      })
    )
    .join("\n      ");

  /* The stats panel is a sibling of the portrait, not a child: the portrait is
     `role="img"`, which makes its descendants presentational — numbers inside
     it would vanish for screen readers. */
  const stats = copy.hero.portraitStats
    .map(
      (stat) =>
        `<div class="stat"><span class="stat-value">${fill(stat.value, years)}</span><span class="stat-label">${fill(stat.label, years)}</span></div>`
    )
    .join("");

  return `<section class="slide hero" aria-labelledby="hero-title">
    <div class="container hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">${escapeHtml(copy.hero.eyebrow)}</p>
        <h1 id="hero-title">${escapeHtml(copy.hero.title)}</h1>
        <p class="hero-subtitle">${escapeHtml(copy.hero.subtitle)}</p>
        <div class="hero-actions">
          <a class="btn btn-solid" href="#contact">${escapeHtml(copy.hero.primary)}</a>
          <a class="btn btn-ghost" href="#work">${escapeHtml(copy.hero.secondary)}</a>
        </div>
      </div>
      <div class="hero-portrait">
        <div class="portrait-box" data-portrait-box>
          <div class="portrait" data-portrait tabindex="0" role="img" aria-label="${escapeHtml(copy.hero.portraitAlt)}">
      ${frames}
          </div>
          <div class="portrait-stats">${stats}</div>
        </div>
      </div>
    </div>
  </section>`;
}

function work(copy) {
  const cards = copy.work.items
    .map(
      (item) => `<li class="work-card">
          <a class="work-link" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">
            <span class="work-shot">${picture({
              dir: "work",
              base: item.image,
              alt: item.alt,
              widths: [800, 1200],
              height: 750,
              sizes: "(max-width: 719px) 86vw, (max-width: 1099px) 44vw, 36vw"
            })}</span>
            <span class="work-meta">
              <span class="work-kind">${escapeHtml(item.kind)} · ${escapeHtml(item.year)}</span>
              <span class="work-name">${escapeHtml(item.name)}</span>
              <span class="work-summary">${escapeHtml(item.summary)}</span>
              <span class="work-visit">${escapeHtml(copy.work.visit)}${icons.arrowUpRight}</span>
            </span>
          </a>
        </li>`
    )
    .join("\n        ");

  /* The track scrolls natively, so the section is usable with no script at
     all; the buttons stay hidden until the script that drives them runs. */
  return `<section class="slide section work" id="work" aria-labelledby="work-title">
    <div class="container">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(copy.work.eyebrow)}</p>
          <h2 id="work-title">${escapeHtml(copy.work.title)}</h2>
          <p class="section-intro">${escapeHtml(copy.work.intro)}</p>
        </div>
        <div class="carousel-controls" data-carousel-controls hidden>
          <button class="carousel-btn" type="button" data-carousel-prev>
            <span class="visually-hidden">${escapeHtml(copy.work.previous)}</span>${icons.chevronLeft}
          </button>
          <button class="carousel-btn" type="button" data-carousel-next>
            <span class="visually-hidden">${escapeHtml(copy.work.next)}</span>${icons.chevronRight}
          </button>
        </div>
      </div>
      <ul class="work-track" role="list" data-carousel-track tabindex="0">
        ${cards}
      </ul>
    </div>
  </section>`;
}

function process(copy) {
  const steps = copy.process.steps
    .map(
      (step) => `<li class="step">
          <span class="step-number" aria-hidden="true">${escapeHtml(step.n)}</span>
          <h3 class="step-title">${escapeHtml(step.title)}</h3>
          <p class="step-text">${escapeHtml(step.body)}</p>
        </li>`
    )
    .join("\n        ");

  return `<section class="slide section process" id="process" aria-labelledby="process-title">
    <div class="container">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(copy.process.eyebrow)}</p>
          <h2 id="process-title">${escapeHtml(copy.process.title)}</h2>
          <p class="section-intro">${escapeHtml(copy.process.intro)}</p>
        </div>
      </div>
      <ol class="steps" role="list">
        ${steps}
      </ol>
    </div>
  </section>`;
}

function services(copy) {
  const cards = copy.services.items
    .map(
      /* Name, then what it covers, then the price last and largest — the way a
         pricing package reads, and the reason the price is pinned to the
         bottom edge of the card rather than floating mid-air. */
      (item) => `<li class="service-card">
          <h3 class="service-name">${escapeHtml(item.name)}</h3>
          <p class="service-note">${escapeHtml(item.note)}</p>
          <p class="service-price">${escapeHtml(item.price)}</p>
        </li>`
    )
    .join("\n        ");

  return `<section class="slide section services" id="services" aria-labelledby="services-title">
    <div class="services-blobs" aria-hidden="true"></div>
    <div class="container">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(copy.services.eyebrow)}</p>
          <h2 id="services-title">${escapeHtml(copy.services.title)}</h2>
          <p class="section-intro">${escapeHtml(copy.services.intro)}</p>
        </div>
        <a class="btn btn-solid section-cta" href="#contact">${escapeHtml(copy.services.cta)}</a>
      </div>
      <ul class="service-grid" role="list">
        ${cards}
      </ul>
      <p class="currency-note">${escapeHtml(copy.services.currencyNote)}</p>
    </div>
  </section>`;
}

function kindWords(copy) {
  /* Testimonials are never published until the client-supplied copy has been
     approved. Keeping the draft in content.js preserves the intended layout
     without leaking TODO text into a production build. */
  if (copy.kindWords.todo) return "";

  const cards = copy.kindWords.items
    .map((item) => {
      const face = item.avatar
        ? `<span class="quote-avatar"><img src="/assets/kind/${escapeHtml(item.avatar)}.jpg" alt="${escapeHtml(item.avatarAlt ?? "")}" width="320" height="320" loading="lazy" decoding="async"></span>`
        : `<span class="quote-avatar" aria-hidden="true">${escapeHtml(item.initials)}</span>`;
      return `<li class="quote-card">
          <blockquote class="quote-text">${escapeHtml(item.quote)}</blockquote>
          <div class="quote-person">
            ${face}
            <span class="quote-id">
              <span class="quote-name">${escapeHtml(item.name)}</span>
              <span class="quote-role">${escapeHtml(item.role)}</span>
            </span>
          </div>
        </li>`;
    })
    .join("\n        ");

  return `<section class="slide section kind-words" id="kind-words" aria-labelledby="kind-words-title">
    <div class="container">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(copy.kindWords.eyebrow)}</p>
          <h2 id="kind-words-title">${escapeHtml(copy.kindWords.title)}</h2>
          <p class="section-intro">${escapeHtml(copy.kindWords.intro)}</p>
        </div>
      </div>
      <ul class="quote-grid" role="list">
        ${cards}
      </ul>
    </div>
  </section>`;
}

function contact(copy) {
  const mailto = `mailto:${links.email}`;
  const social = [
    ["linkedin", links.linkedin],
    ["telegram", links.telegram],
    ["instagram", links.instagram]
  ]
    .map(
      ([name, href]) =>
        `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(copy.contact.social[name])}">${icons[name]}</a>`
    )
    .join("");

  /* The whole band is one link: no separate button, no spelled-out address —
     the envelope says what happens on click. */
  return `<section class="slide contact" id="contact" aria-labelledby="contact-title">
    <div class="contact-middle">
      <a class="contact-band" href="${mailto}">
        <span class="band-inner container">
          <span class="band-icon" aria-hidden="true">${icons.mail}</span>
          <span class="band-copy">
            <span class="band-title" id="contact-title">${escapeHtml(copy.contact.band.title)}</span>
            <span class="band-note">${escapeHtml(copy.contact.band.note)}</span>
          </span>
          <span class="band-arrow" aria-hidden="true">${icons.arrowUpRight}</span>
        </span>
      </a>
    </div>
    <footer class="site-footer">
      <div class="container footer-inner">
        <p class="footer-copyright">${escapeHtml(copy.footer.copyright)}</p>
        <p class="footer-location">${escapeHtml(copy.contact.location)}</p>
        <div class="footer-social">${social}</div>
      </div>
    </footer>
  </section>`;
}

function documentShell({ lang, copy, origin, body, description, title, canonicalPath, extraHead = "" }) {
  const alternates = Object.entries(languages)
    .map(
      ([code, config]) =>
        `<link rel="alternate" hreflang="${code}" href="${origin}${config.path}">`
    )
    .join("\n  ");

  /* Cyrillic is only preloaded for the page that actually sets Russian text
     above the fold; the English page would download it for nothing. */
  const fontPreloads = (lang === "ru"
    ? ["manrope-cyrillic", "manrope-latin"]
    : ["manrope-latin"]
  )
    .map(
      (font) =>
        `<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/${font}.woff2" crossorigin>`
    )
    .join("\n  ");

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${origin}${canonicalPath}">
  ${alternates}
  <link rel="alternate" hreflang="x-default" href="${origin}/">
  <meta property="og:title" content="${escapeHtml(copy.meta.ogTitle)}">
  <meta property="og:description" content="${escapeHtml(copy.meta.ogDescription)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="${languages[lang].ogLocale}">
  <meta property="og:url" content="${origin}${canonicalPath}">
  <meta property="og:image" content="${origin}/assets/${ogImages[lang]}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="theme-color" content="#ffffff">
  <meta name="color-scheme" content="light">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  ${fontPreloads}
  <link rel="stylesheet" href="/assets/styles.css">
  ${extraHead}
</head>
<body>
  <a class="skip-link" href="#main">${escapeHtml(copy.skipLink)}</a>
${body}
  <script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

export function renderPage(lang, origin) {
  const copy = content[lang];
  const years = experienceYears();

  const body = `${header(lang, copy)}
  <main id="main">
    ${hero(copy, years)}
    ${work(copy)}
    ${process(copy)}
    ${services(copy)}
    ${kindWords(copy)}
    ${contact(copy)}
  </main>`;

  return documentShell({
    lang,
    copy,
    origin,
    body,
    title: copy.meta.title,
    description: copy.meta.description,
    canonicalPath: languages[lang].path
  });
}

export function renderNotFound(lang, origin) {
  const copy = content[lang];
  /* None of the section ids exist here, so the header's anchors are qualified
     with the home path instead of pointing at nothing. */
  const body = `${header(lang, copy, languages[lang].path)}
  <main id="main">
    <section class="slide section not-found">
      <div class="container">
        <h1>${escapeHtml(copy.notFound.title)}</h1>
        <p class="section-intro">${escapeHtml(copy.notFound.body)}</p>
        <p><a class="btn btn-solid" href="${languages[lang].path}">${escapeHtml(copy.notFound.cta)}</a></p>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="container footer-inner">
      <p class="footer-copyright">${escapeHtml(copy.footer.copyright)}</p>
    </div>
  </footer>`;

  return documentShell({
    lang,
    copy,
    origin,
    body,
    title: `${copy.notFound.title} · ks-design`,
    description: copy.notFound.body,
    canonicalPath: languages[lang].path,
    extraHead: '<meta name="robots" content="noindex">'
  });
}
