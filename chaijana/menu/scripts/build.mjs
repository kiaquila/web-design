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

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const text = (copy, lang) => escapeHtml(pickLocalized(copy, lang));

function renderPrice(price, lang) {
  if (!price) return "";
  return `<span class="menu-price">${escapeHtml(pickLocalized(price, lang))}</span>`;
}

function renderItem(menuItem, lang, index) {
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
    ? `<ul class="option-list">${visibleOptions
        .map(
          (option) =>
            `<li><span>${text(option.label, lang)}</span><span class="option-leader" aria-hidden="true"></span><strong>${escapeHtml(pickLocalized(option.price, lang))}</strong></li>`,
        )
        .join("")}</ul>`
    : "";

  return `<article class="menu-item" data-menu-item style="--item-order:${index}">
    <div class="item-heading">
      <h3>${text(menuItem.name, lang)}</h3>
      ${renderPrice(menuItem.price, lang)}
    </div>
    ${badge}${description}${note}${options}
  </article>`;
}

function renderSection({ id, title, intro, items }, lang) {
  const image = sectionImages[id];
  const hasImage = image && existsSync(join(root, image));
  const imageAlt = sectionImageAlts[id]
    ? pick(sectionImageAlts[id], lang)
    : items[0]
      ? pick(items[0].name, lang)
      : pick(title, lang);
  return `<section class="menu-section" id="${escapeHtml(id)}" data-menu-section>
    <div class="section-heading">
      <div class="section-kicker"><span aria-hidden="true">◆</span>${text(title, lang)}<span aria-hidden="true">◆</span></div>
      <h2>${text(title, lang)}</h2>
      <p>${text(intro, lang)}</p>
    </div>
    ${
      hasImage
        ? `<figure class="section-photo"><img src="${image}" alt="${escapeHtml(imageAlt)}" width="960" height="960" loading="lazy" decoding="async"></figure>`
        : ""
    }
    <div class="menu-grid">${items.map((menuItem, index) => renderItem(menuItem, lang, index)).join("")}</div>
  </section>`;
}

function renderExperiences(lang) {
  const title = ui[lang].experiences;
  const experienceImage = sectionImages.experiences;
  const hasImage = existsSync(join(root, experienceImage));
  return `<section class="menu-section experiences" id="experiences" data-menu-section>
    <div class="section-heading">
      <div class="section-kicker"><span aria-hidden="true">◆</span>${escapeHtml(title)}<span aria-hidden="true">◆</span></div>
      <h2>${escapeHtml(title)}</h2>
    </div>
    ${hasImage ? `<figure class="section-photo"><img src="${experienceImage}" alt="${escapeHtml(title)}" width="960" height="671" loading="lazy" decoding="async"></figure>` : ""}
    <div class="menu-grid experience-grid">${experiences.map((menuItem, index) => renderItem(menuItem, lang, index)).join("")}</div>
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
    ...menuSections.map((section) => ({ id: section.id, title: pick(section.title, lang) })),
  ];
  return links
    .map(
      ({ id, title }) =>
        `<a href="#${escapeHtml(id)}" data-nav-link="${escapeHtml(id)}">${escapeHtml(title)}</a>`,
    )
    .join("");
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
    result.textContent = query ? visible + ' ${escapeHtml(copy.results)}' : '';
    empty.hidden = visible !== 0;
    clear.hidden = !search.value;
  };
  search.addEventListener('input', update);
  clear.addEventListener('click', () => { search.value = ''; update(); search.focus(); });

  const navLinks = new Map([...document.querySelectorAll('[data-nav-link]')].map((link) => [link.dataset.navLink, link]));
  const observer = new IntersectionObserver((entries) => {
    const visibleSection = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visibleSection) return;
    navLinks.forEach((link, id) => {
      if (id === visibleSection.target.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-28% 0px -62% 0px', threshold: [0, 0.1, 0.3] });
  sections.forEach((section) => observer.observe(section));
})();
</script>`;
}

function renderPage(lang) {
  const config = languages[lang];
  const copy = ui[lang];
  const direction = "ltr";
  return `<!doctype html>
<html lang="${lang}" dir="${direction}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#12110e">
  <meta name="description" content="${escapeHtml(copy.heroTitle)} — Chaijaná, ${escapeHtml(copy.address)}">
  <title>${escapeHtml(copy.menu)} · Chaijaná</title>
  <link rel="icon" type="image/png" href="assets/chaijana-logo.png">
  <link rel="stylesheet" href="assets/menu.css?v=${cssVersion}">
</head>
<body>
  <a class="skip-link" href="#menu-content">${escapeHtml(copy.menu)}</a>
  <header class="topbar">
    <a class="back-link" href="${config.back}" aria-label="${escapeHtml(copy.backWebsite)}"><span aria-hidden="true">←</span><span>${escapeHtml(copy.backWebsite)}</span></a>
    <img class="topbar-logo" src="assets/chaijana-logo.png" alt="Chaijaná" width="54" height="58">
    <nav class="language-switch" aria-label="Language">${renderLanguageSwitch(lang)}</nav>
  </header>

  <main id="menu-content">
    <section class="cover" aria-labelledby="menu-title">
      <div class="cover-pattern" aria-hidden="true"></div>
      <div class="cover-frame">
        <img class="cover-logo" src="assets/chaijana-logo.png" alt="Chaijaná" width="180" height="193">
        <p class="eyebrow">${escapeHtml(copy.eyebrow)}</p>
        <h1 id="menu-title">${escapeHtml(copy.heroTitle)}</h1>
        <p class="menu-word">${escapeHtml(copy.menu)}</p>
        <dl class="cover-details">
          <div><dt>⌖</dt><dd>${escapeHtml(copy.address)}</dd></div>
          <div><dt>−10%</dt><dd>${escapeHtml(copy.discount)}</dd></div>
          <div><dt>◷</dt><dd>${escapeHtml(copy.hours)}</dd></div>
        </dl>
        <p class="currency-note">${escapeHtml(copy.menuIntro)}</p>
      </div>
    </section>

    <div class="menu-tools">
      <div class="search-wrap">
        <label class="visually-hidden" for="menu-search">${escapeHtml(copy.search)}</label>
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input id="menu-search" type="search" inputmode="search" autocomplete="off" placeholder="${escapeHtml(copy.searchPlaceholder)}" data-search>
        <button type="button" class="clear-search" aria-label="${escapeHtml(copy.clearSearch)}" data-clear-search hidden>×</button>
        <output class="result-count" for="menu-search" aria-live="polite" data-result-count></output>
      </div>
      <nav class="category-nav" aria-label="${escapeHtml(copy.categories)}">${renderNav(lang)}</nav>
    </div>

    <div class="menu-shell">
      <p class="empty-state" data-empty hidden>${escapeHtml(copy.noResults)}</p>
      ${renderExperiences(lang)}
      ${menuSections.map((section) => renderSection(section, lang)).join("")}
    </div>
  </main>

  <footer class="menu-footer">
    <img src="assets/chaijana-logo.png" alt="" width="56" height="60" loading="lazy">
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
