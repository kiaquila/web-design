import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { experiences, menuSections, pick, pickLocalized, ui } from "../src/menu-data.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cssSource = await readFile(join(root, "src", "styles.css"), "utf8");
const cssVersion = createHash("sha256").update(cssSource).digest("hex").slice(0, 10);
const languages = {
  es: { file: "index.html", locale: "es-AR", label: "ES", back: "../" },
  en: { file: "en.html", locale: "en", label: "EN", back: "../en" },
  ru: { file: "ru.html", locale: "ru", label: "RU", back: "../ru" },
};

const sectionImages = {
  experiences: "assets/dishes/chaijana-experiences.webp",
  desayunos: "assets/dishes/draniki-salmon.webp",
  ensaladas: "assets/dishes/crispy-eggplant.webp",
  horno: "assets/dishes/adjarian-khachapuri.webp",
  sopas: "assets/dishes/suyru-lagman.webp",
  parrilla: "assets/dishes/lula-kebab.webp",
  casa: "assets/dishes/uzbek-plov.webp",
  vapor: "assets/dishes/manti.webp",
  infantil: "assets/dishes/kids-menu.webp",
  postres: "assets/dishes/medovik.webp",
  "cafe-te": "assets/dishes/uzbek-tea.webp",
  bebidas: "assets/dishes/fruit-shakes.webp",
  cocteles: "assets/dishes/cocktails.webp",
  vinos: "assets/dishes/wine.webp",
  hookah: "assets/dishes/hookah.webp",
};

const sectionImageAlts = {
  desayunos: ["Draniky o bliny con salmón", "Draniki or bliny with salmon", "Драники или блины с лососем"],
  horno: ["Khachapuri estilo Adjarian", "Adjarian khachapuri", "Хачапури по-аджарски"],
  casa: ["Plov uzbeko", "Uzbek plov", "Узбекский плов"],
  vapor: ["Manti", "Manti", "Манты"],
  infantil: ["Medallones de pollo al vapor", "Steamed chicken medallions", "Куриные котлетки на пару"],
  postres: ["Medovik", "Medovik", "Медовик"],
  "cafe-te": ["Servicio de té", "Tea service", "Чайная подача"],
  bebidas: ["Shakes de frutas", "Fruit shakes", "Фруктовые шейки"],
  hookah: ["Hookah (Shisha)", "Hookah (Shisha)", "Кальян"],
};

/* --- ornaments: hand-drawn gold hairlines, no external assets ------------- */

const svg = (body, attrs) =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs} fill="none" stroke="currentColor" aria-hidden="true">${body}</svg>`;

const ornaments = {
  /* section divider — lotus / arabesque knot */
  knot: svg(
    '<path d="M23 7 30 1.5 37 7l-7 5.5z" stroke-width="1"/><circle cx="30" cy="7" r="1.7" fill="currentColor" stroke="none"/><path d="M22 7c-4.4 0-6.6-4-11-4-3.3 0-5 1.8-5 4s1.7 4 5 4c4.4 0 6.6-4 11-4z" stroke-width="1"/><path d="M38 7c4.4 0 6.6-4 11-4 3.3 0 5 1.8 5 4s-1.7 4-5 4c-4.4 0-6.6-4-11-4z" stroke-width="1"/>',
    'viewBox="0 0 60 14" width="60" height="14"',
  ),
  /* cover frame corner flourish */
  corner: svg(
    '<path d="M2 46V14C2 7.4 7.4 2 14 2h32" stroke-width="1.1"/><path d="M10 46V17c0-3.9 3.1-7 7-7h29" stroke-width="0.8" opacity="0.55"/><path d="M10 30a20 20 0 0 1 20-20" stroke-width="0.7" opacity="0.5"/><circle cx="15.9" cy="15.9" r="1.8" fill="currentColor" stroke="none"/>',
    'viewBox="0 0 46 46" width="46" height="46"',
  ),
  pin: svg(
    '<path d="M10 18s6.5-6.4 6.5-11A6.5 6.5 0 0 0 3.5 7C3.5 11.6 10 18 10 18z" stroke-width="1.2"/><circle cx="10" cy="7" r="2.3" stroke-width="1.2"/>',
    'viewBox="0 0 20 20" width="20" height="20"',
  ),
  clock: svg(
    '<circle cx="10" cy="10" r="8" stroke-width="1.2"/><path d="M10 5.4V10l3.1 2" stroke-width="1.2" stroke-linecap="round"/>',
    'viewBox="0 0 20 20" width="20" height="20"',
  ),
  cash: svg(
    '<rect x="1.6" y="4.6" width="16.8" height="10.8" rx="1.6" stroke-width="1.2"/><circle cx="10" cy="10" r="2.6" stroke-width="1.2"/>',
    'viewBox="0 0 20 20" width="20" height="20"',
  ),
  halal: svg(
    '<circle cx="10" cy="10" r="8.4" stroke-width="0.9"/><path d="M12.9 6.2a4.4 4.4 0 1 0 0 7.6 4.9 4.9 0 0 1 0-7.6z" stroke-width="1.1" stroke-linejoin="round"/><path d="m14.4 8.2.55 1.35 1.45.1-1.12.93.36 1.42-1.24-.78-1.24.78.36-1.42-1.12-.93 1.45-.1z" stroke-width="0.8" stroke-linejoin="round"/>',
    'viewBox="0 0 20 20" width="20" height="20"',
  ),
  search: svg(
    '<circle cx="8.6" cy="8.6" r="5.9" stroke-width="1.3"/><path d="m13.2 13.2 3.4 3.4" stroke-width="1.3" stroke-linecap="round"/>',
    'viewBox="0 0 20 20" width="20" height="20"',
  ),
  chevron: svg('<path d="m1 1 5 5 5-5" stroke-width="1.4" stroke-linecap="round"/>', 'viewBox="0 0 12 8" width="12" height="8"'),
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const text = (copy, lang) => escapeHtml(pickLocalized(copy, lang));

/** Items without a `languages` list appear everywhere. */
const visibleIn = (lang) => (menuItem) => !menuItem.languages || menuItem.languages.includes(lang);

/**
 * Escape a string for a JavaScript *string-literal* context. HTML escaping is
 * wrong inside `<script>`: entities are not decoded there, so an apostrophe
 * would render as a literal `&#039;`, and a backslash or newline would break
 * the literal and take the whole inline script down with it. `<` keeps a
 * stray `</script>` from ending the element early.
 */
const jsString = (value) =>
  JSON.stringify(String(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

function renderPrice(price, lang) {
  if (!price) return "";
  return `<span class="menu-price">${escapeHtml(pickLocalized(price, lang))}</span>`;
}

function renderItem(menuItem, lang) {
  const description = menuItem.description
    ? `<p class="menu-description">${text(menuItem.description, lang)}</p>`
    : "";
  const badge = menuItem.badge
    ? `<span class="menu-badge">${text(menuItem.badge, lang)}</span>`
    : "";
  const note = menuItem.note
    ? `<p class="menu-note">${text(menuItem.note, lang)}</p>`
    : "";
  const visibleOptions = menuItem.options?.filter((option) => !option.languages || option.languages.includes(lang));
  const options = visibleOptions?.length
    ? `<ul class="option-list"${visibleOptions.length >= 7 ? " data-dense" : ""}>${visibleOptions
        .map(
          (option) =>
            `<li><span>${text(option.label, lang)}</span><span class="option-leader" aria-hidden="true"></span><strong>${escapeHtml(pickLocalized(option.price, lang))}</strong></li>`,
        )
        .join("")}</ul>`
    : "";

  // No inline style attribute: nothing reads `--item-order`, and keeping the
  // markup free of inline styles lets the menu ship `style-src 'self'`.
  return `<article class="menu-item" data-menu-item>
    <div class="item-heading">
      <h3>${text(menuItem.name, lang)}</h3>
      ${renderPrice(menuItem.price, lang)}
    </div>
    ${badge}${description}${note}${options}
  </article>`;
}

function renderSectionHeading(title, intro = "") {
  return `<div class="section-heading">
      <div class="section-kicker" aria-hidden="true">${ornaments.knot}</div>
      <h2>${title}</h2>
      ${intro ? `<p>${intro}</p>` : ""}
    </div>`;
}

/** The medallion is a CSS-enforced 1:1 crop, so these attributes exist to
 *  reserve the box before the stylesheet lands, not to describe the file. */
function renderPhoto(image, alt, width = 1254, height = 1254) {
  return `<figure class="section-photo"><img src="${escapeHtml(image)}" alt="${escapeHtml(alt)}" width="${width}" height="${height}" loading="lazy" decoding="async"></figure>`;
}

/** Sections whose every item is scoped away for this language are dropped
 *  outright, so no locale gets a heading and a nav link with nothing under it. */
const sectionsFor = (lang) =>
  menuSections.filter((section) => section.items.some(visibleIn(lang)));

function renderSection({ id, title, intro, items }, lang) {
  const image = sectionImages[id];
  const hasImage = image && existsSync(join(root, image));
  const visibleItems = items.filter(visibleIn(lang));
  const imageAlt = sectionImageAlts[id]
    ? pick(sectionImageAlts[id], lang)
    : visibleItems[0]
      ? pick(visibleItems[0].name, lang)
      : pick(title, lang);
  return `<section class="menu-section" id="${escapeHtml(id)}" data-menu-section>
    ${renderSectionHeading(text(title, lang), text(intro, lang))}
    <div class="section-body">
      ${hasImage ? renderPhoto(image, imageAlt) : ""}
      <div class="menu-grid">${visibleItems.map((menuItem) => renderItem(menuItem, lang)).join("")}</div>
    </div>
  </section>`;
}

function renderExperiences(lang) {
  const title = escapeHtml(ui[lang].experiences);
  const experienceImage = sectionImages.experiences;
  const hasImage = existsSync(join(root, experienceImage));
  return `<section class="menu-section experiences" id="experiences" data-menu-section>
    ${renderSectionHeading(title)}
    <div class="section-body">
      ${hasImage ? renderPhoto(experienceImage, ui[lang].experiences) : ""}
      <div class="menu-grid">${experiences.filter(visibleIn(lang)).map((menuItem) => renderItem(menuItem, lang)).join("")}</div>
    </div>
  </section>`;
}

function renderLanguageSwitch(activeLang) {
  return Object.entries(languages)
    .map(
      ([lang, config]) =>
        `<a href="${config.file}" lang="${lang}" hreflang="${lang}"${lang === activeLang ? ' aria-current="page"' : ""}>${config.label}</a>`,
    )
    .join("");
}

function renderNav(lang) {
  const links = [
    { id: "experiences", title: ui[lang].experiences },
    ...sectionsFor(lang).map((section) => ({ id: section.id, title: pick(section.title, lang) })),
  ];
  return links
    .map(
      ({ id, title }) =>
        `<a href="#${escapeHtml(id)}" data-nav-link="${escapeHtml(id)}">${escapeHtml(title)}</a>`,
    )
    .join("");
}

function renderCover(lang) {
  const copy = ui[lang];
  const detail = (icon, label, value) => `<div>
          <dt>${icon}</dt>
          <dd><span class="detail-label">${escapeHtml(label)}</span><span class="detail-value">${escapeHtml(value)}</span></dd>
        </div>`;

  return `<section class="cover" aria-labelledby="menu-title">
      <div class="cover-pattern" aria-hidden="true"></div>
      <div class="cover-frame">
        <span class="cover-corner cover-corner--tl" aria-hidden="true">${ornaments.corner}</span>
        <span class="cover-corner cover-corner--tr" aria-hidden="true">${ornaments.corner}</span>
        <span class="cover-corner cover-corner--bl" aria-hidden="true">${ornaments.corner}</span>
        <span class="cover-corner cover-corner--br" aria-hidden="true">${ornaments.corner}</span>
        <img class="cover-logo" src="assets/chaijana-wordmark.svg" alt="Chaijaná" width="842" height="595">
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h1 id="menu-title">${escapeHtml(copy.heroTitle)}</h1>
        ${copy.heroSubtitle ? `<p class="cover-subtitle">${escapeHtml(copy.heroSubtitle)}</p>` : ""}
        <p class="menu-word">${escapeHtml(copy.menu)}</p>
        <dl class="cover-details">
          ${detail(ornaments.pin, copy.addressLabel, copy.address)}
          ${detail(ornaments.clock, copy.hoursLabel, copy.hours)}
          ${detail(ornaments.cash, copy.discountLabel, copy.discount)}
        </dl>
        <div class="cover-seals">
          <span class="seal">${ornaments.halal}${escapeHtml(copy.halal)}</span>
        </div>
        <p class="currency-note">${escapeHtml(copy.menuIntro)}</p>
        <div class="cover-partner">
          <span class="detail-label">${escapeHtml(copy.partner)}</span>
          <img src="assets/bonpunto-logo.svg" alt="Bonpunto" width="300" height="80" loading="lazy">
        </div>
        <a class="scroll-cue" href="#experiences"><span>${escapeHtml(copy.scrollCue)}</span><span aria-hidden="true">${ornaments.chevron}</span></a>
      </div>
    </section>`;
}

function inlineScript(lang) {
  const copy = ui[lang];
  return `<script>
(() => {
  const search = document.querySelector('[data-search]');
  const clear = document.querySelector('[data-clear-search]');
  const result = document.querySelector('[data-result-count]');
  const empty = document.querySelector('[data-empty]');
  const items = [...document.querySelectorAll('[data-menu-item]')];
  const sections = [...document.querySelectorAll('[data-menu-section]')];
  const normalize = (value) => value.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('${lang}').trim();
  const update = () => {
    const query = normalize(search.value);
    let visible = 0;
    items.forEach((item) => {
      const matches = !query || normalize(item.textContent).includes(query);
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    sections.forEach((section) => {
      section.hidden = !section.querySelector('[data-menu-item]:not([hidden])');
    });
    result.textContent = query ? visible + ' ' + ${jsString(copy.results)} : '';
    empty.hidden = visible !== 0;
    clear.hidden = !search.value;
  };
  search.addEventListener('input', update);
  clear.addEventListener('click', () => { search.value = ''; update(); search.focus(); });

  const navLinks = new Map([...document.querySelectorAll('[data-nav-link]')].map((link) => [link.dataset.navLink, link]));
  const rail = document.querySelector('[data-category-nav]');
  const observer = new IntersectionObserver((entries) => {
    const visibleSection = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visibleSection) return;
    navLinks.forEach((link, id) => {
      if (id === visibleSection.target.id) {
        link.setAttribute('aria-current', 'true');
        if (rail) {
          const offset = link.offsetLeft - rail.clientWidth / 2 + link.clientWidth / 2;
          rail.scrollTo({ left: Math.max(0, offset), behavior: 'smooth' });
        }
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }, { rootMargin: '-28% 0px -62% 0px', threshold: [0, 0.1, 0.3] });
  sections.forEach((section) => observer.observe(section));
})();
</script>`;
}

function renderPage(lang) {
  const config = languages[lang];
  const copy = ui[lang];
  // Russian pages also render ASCII addresses, hours, prices, percentages and
  // the language switch above the fold, so they need both script subsets.
  const preloadScripts = lang === "ru" ? ["cyrillic", "latin"] : ["latin"];
  const fontPreloads = preloadScripts
    .flatMap((script) =>
      ["playfair-display", "manrope"].map(
        (family) =>
          `<link rel="preload" as="font" type="font/woff2" href="assets/fonts/${family}-${script}.woff2" crossorigin>`,
      ),
    )
    .join("\n  ");
  return `<!doctype html>
<html lang="${lang}" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#0a0907">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="${escapeHtml(copy.heroTitle)} — Chaijaná, ${escapeHtml(copy.address)}">
  <title>${escapeHtml(copy.menu)} · Chaijaná</title>
  <link rel="icon" type="image/png" href="assets/chaijana-logo.png">
  ${fontPreloads}
  <link rel="stylesheet" href="assets/menu.css?v=${cssVersion}">
</head>
<body>
  <a class="skip-link" href="#menu-content">${escapeHtml(copy.menu)}</a>
  <header class="topbar">
    <a class="back-link" href="${config.back}" aria-label="${escapeHtml(copy.backWebsite)}"><span aria-hidden="true">←</span><span>${escapeHtml(copy.backWebsite)}</span></a>
    <img class="topbar-logo" src="assets/chaijana-wordmark.svg" alt="Chaijaná" width="842" height="595">
    <nav class="language-switch" aria-label="Language">${renderLanguageSwitch(lang)}</nav>
  </header>

  <main id="menu-content">
    ${renderCover(lang)}

    <div class="menu-tools">
      <div class="search-wrap">
        <label class="visually-hidden" for="menu-search">${escapeHtml(copy.search)}</label>
        <span class="search-icon" aria-hidden="true">${ornaments.search}</span>
        <input id="menu-search" type="search" inputmode="search" autocomplete="off" placeholder="${escapeHtml(copy.searchPlaceholder)}" data-search>
        <button type="button" class="clear-search" aria-label="${escapeHtml(copy.clearSearch)}" data-clear-search hidden>×</button>
        <output class="result-count" for="menu-search" aria-live="polite" data-result-count></output>
      </div>
      <nav class="category-nav" aria-label="${escapeHtml(copy.categories)}" data-category-nav>${renderNav(lang)}</nav>
    </div>

    <div class="menu-shell">
      <p class="empty-state" data-empty hidden>${escapeHtml(copy.noResults)}</p>
      ${renderExperiences(lang)}
      ${sectionsFor(lang).map((section) => renderSection(section, lang)).join("")}
    </div>
  </main>

  <footer class="menu-footer">
    <img src="assets/chaijana-wordmark.svg" alt="" width="842" height="595" loading="lazy">
    <p class="footer-address">${escapeHtml(copy.address)} · ${escapeHtml(copy.hours)}</p>
    <a href="#menu-content">${escapeHtml(copy.backTop)} ↑</a>
  </footer>
  ${inlineScript(lang)}
</body>
</html>`;
}

await mkdir(join(root, "assets"), { recursive: true });
await copyFile(join(root, "src", "styles.css"), join(root, "assets", "menu.css"));
for (const lang of Object.keys(languages)) {
  const html = renderPage(lang).replace(/[ \t]+$/gm, "");
  await writeFile(join(root, languages[lang].file), html, "utf8");
}

if (!cssSource.includes(".menu-section")) throw new Error("Compiled stylesheet is incomplete.");

console.log(`Built ${Object.keys(languages).length} static menu pages.`);
