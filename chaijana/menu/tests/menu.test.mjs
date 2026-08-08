import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { experiences, menuSections, pick, pickLocalized, ui } from "../src/menu-data.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const languages = ["es", "en", "ru"];
const pages = {
  es: { file: "index.html", back: "../" },
  en: { file: "en.html", back: "../en" },
  ru: { file: "ru.html", back: "../ru" },
};

function assertCopy(copy, label) {
  assert.equal(copy.length, 3, `${label} must have ES, EN and RU values`);
  copy.forEach((value, index) => assert.ok(value.trim(), `${label}[${index}] cannot be empty`));
}

test("canonical menu covers every official section and language", () => {
  assert.equal(menuSections.length, 14);
  assert.deepEqual(
    menuSections.map(({ id }) => id),
    [
      "desayunos",
      "ensaladas",
      "horno",
      "sopas",
      "parrilla",
      "casa",
      "vapor",
      "infantil",
      "postres",
      "cafe-te",
      "bebidas",
      "cocteles",
      "vinos",
      "hookah",
    ],
  );
  assert.equal(experiences.length, 3);

  [...experiences, ...menuSections.flatMap(({ items }) => items)].forEach((item, index) => {
    assertCopy(item.name, `item ${index} name`);
    if (item.description) assertCopy(item.description, `item ${index} description`);
    if (item.badge) assertCopy(item.badge, `item ${index} badge`);
    if (item.note) assertCopy(item.note, `item ${index} note`);
    item.options?.forEach((option, optionIndex) => {
      if (Array.isArray(option.label)) {
        assertCopy(option.label, `item ${index} option ${optionIndex}`);
      } else {
        assert.ok(option.label.trim(), `item ${index} option ${optionIndex} label cannot be empty`);
        assert.ok(option.languages?.length, "single-language option must declare its language");
      }
      const prices = Array.isArray(option.price) ? option.price : [option.price];
      prices.forEach((price) => assert.match(price, /\d/));
    });
  });
});

test("critical current-menu content and prices are present", () => {
  const byId = Object.fromEntries(menuSections.map((section) => [section.id, section]));
  const fruitShakes = byId.bebidas.items.find((item) => pick(item.name, "es") === "Shakes de frutas");
  assert.ok(fruitShakes, "fruit shakes must be restored");
  assert.equal(fruitShakes.options.length, 3);
  assert.ok(fruitShakes.options.some((option) => option.price === "15 000"));

  const plov = byId.casa.items.find((item) => pick(item.name, "en") === "Uzbek plov");
  assert.deepEqual(plov.options.map(({ price }) => price), ["29 900", "109 900"]);
  const crispyEggplant = byId.ensaladas.items.find((item) => pick(item.name, "en") === "Crispy eggplant");
  assert.equal(pickLocalized(crispyEggplant.price, "es"), "18 000");
  assert.equal(pickLocalized(crispyEggplant.price, "en"), "16 000");
  assert.equal(pickLocalized(crispyEggplant.price, "ru"), "18 000");
  const teas = byId["cafe-te"].items;
  const houseTea = teas.find((item) => pick(item.name, "en") === "House teas");
  assert.match(pick(houseTea.description, "en"), /Masala tea: rich black tea/);
  assert.match(pick(houseTea.description, "ru"), /Узбекский чай: ароматный чай/);
  const classicTea = teas.find((item) => pick(item.name, "ru") === "Чай — 600 мл");
  assert.ok(classicTea.options.some((option) => option.languages?.includes("ru") && option.label === "С чабрецом"));
  assert.equal(byId.vinos.items.length, 5);
  assert.equal(byId.hookah.items[0].price, "35 000");

  // The printed carta prices ASADO at 169 000 / 185 000 and Romanoff only as
  // "with vodka" or "with Ivan tea" — Romanoff has no stand-alone price.
  assert.deepEqual(experiences[1].options.map(({ price }) => price), ["169 000", "185 000"]);
  assert.deepEqual(experiences[2].options.map(({ price }) => price), ["150 000", "130 000"]);
  languages.forEach((lang) => assert.match(pick(experiences[2].description, lang), /encurtidos|pickles|соленья/i));

  // Details that only one language of the printed carta carries must survive in all three.
  const ribs = byId.casa.items.find((item) => pick(item.name, "en") === "Lamb ribs");
  languages.forEach((lang) => assert.match(pick(ribs.description, lang), /sous-vide/i));
  assert.deepEqual(ribs.badge, ["Para 3 personas", "For 3 persons", "На 3 персоны"]);
  const borscht = byId.sopas.items.find((item) => pick(item.name, "en") === "Borscht");
  languages.forEach((lang) => assert.match(pick(borscht.description, lang), /borodinsky|бородинск/i));
  const vodkaPickles = byId.ensaladas.items.find((item) => pick(item.name, "ru") === "Под водочку");
  assert.ok(vodkaPickles.note, "the 'perfect with strong spirits' line must be kept");

  // Buckwheat with mushrooms sits on the soup page in ES/EN and among the
  // signature dishes in RU/EN — each locale keeps its printed placement.
  const inSoups = byId.sopas.items.find((item) => pick(item.name, "ru") === "Гречка с грибами");
  const inSignature = byId.casa.items.find((item) => pick(item.name, "ru") === "Гречка с грибами");
  assert.deepEqual(inSoups.languages, ["es", "en"]);
  assert.deepEqual(inSignature.languages, ["en", "ru"]);
  assert.equal(inSoups.price, "18 000");
  assert.equal(inSignature.price, "18 000");
});

test("cover metadata is the official menu metadata", () => {
  assert.equal(ui.es.address, "BONPLAND, 1965");
  assert.equal(ui.es.discount, "10% de descuento pagando en efectivo");
  assert.equal(ui.es.hours, "Lun–Jue 11:00–23:00 / Vie–Dom 11:00–00:00");
  assert.equal(ui.en.heroTitle, "Taste of the East");
  assert.equal(ui.ru.heroTitle, "Вкус Востока");
  assert.equal(ui.ru.heroSubtitle, "в каждом блюде");
  assert.equal(ui.ru.hours, "ПН – ЧТ 11:00–23:00 / ПТ – ВС 11:00–24:00");
  languages.forEach((lang) => {
    ["addressLabel", "hoursLabel", "discountLabel", "halal", "partner", "scrollCue"].forEach((key) =>
      assert.ok(ui[lang][key]?.trim(), `ui.${lang}.${key} must be translated`),
    );
  });
});

// Hard-coded on purpose. Deriving these with the same predicate the generator
// uses makes the assertion agree with any distribution of items across
// languages, which is how a duplicate or a dropped dish slips through.
const expectedItemCount = { es: 87, en: 88, ru: 87 };

test("built pages are self-contained menu views with safe navigation", async () => {
  for (const [lang, config] of Object.entries(pages)) {
    const expectedItems = expectedItemCount[lang];
    const html = await readFile(join(root, config.file), "utf8");
    assert.match(html, new RegExp(`<html lang="${lang}"`));
    assert.match(html, new RegExp(`class="back-link" href="${config.back.replaceAll("?", "\\?")}"`));
    assert.equal((html.match(/<section class="menu-section/g) ?? []).length, 15);
    assert.equal((html.match(/<article class="menu-item"/g) ?? []).length, expectedItems);
    assert.match(html, /data-search/);
    assert.match(html, /href="assets\/menu\.css\?v=[a-f0-9]{10}"/);
    assert.match(html, /data-nav-link="vinos"/);
    assert.match(html, /data-nav-link="hookah"/);
    assert.match(html, /assets\/bonpunto-logo\.svg/);
    assert.match(html, /href="index\.html"/);
    assert.match(html, /href="en\.html"/);
    assert.match(html, /href="ru\.html"/);
    assert.doesNotMatch(html, /wa\.me|instagram\.com|tiktok\.com|restaurant-gallery/i);
    assert.doesNotMatch(html, /Reservar mesa|Reserve a table|Забронировать стол|Una casa de té|The house|Галере/i);
    // Inline SVG ornaments legitimately carry the SVG xmlns, so only remote
    // resource references are forbidden.
    assert.doesNotMatch(html, /(?:href|src)=["']https?:\/\//);
    assert.ok((await stat(join(root, config.file))).size < 200_000, `${config.file} should stay lightweight`);
  }
});

test("locale-specific dishes land in the sections their printed carta uses", async () => {
  const html = Object.fromEntries(
    await Promise.all(
      Object.entries(pages).map(async ([lang, config]) => [lang, await readFile(join(root, config.file), "utf8")]),
    ),
  );

  const sectionsContaining = (lang, pattern) =>
    [...html[lang].matchAll(/<section class="menu-section" id="([^"]+)"([\s\S]*?)<\/section>/g)]
      .filter(([, , body]) => pattern.test(body))
      .map(([, id]) => id);

  const buckwheat = /Trigo sarraceno con hongos|uckwheat with mushrooms|Гречка с грибами/;
  // The ES carta prints it once, on the soup page. The RU carta prints it once,
  // among the signature dishes. The EN carta genuinely prints it in both, with
  // two different descriptions — that is the source, not a bug.
  assert.deepEqual(sectionsContaining("es", buckwheat), ["sopas"]);
  assert.deepEqual(sectionsContaining("ru", buckwheat), ["casa"]);
  assert.deepEqual(sectionsContaining("en", buckwheat), ["sopas", "casa"]);

  // A RU-only tea must not leak into the other two pages.
  assert.match(html.ru, /С чабрецом/);
  assert.doesNotMatch(html.es, /С чабрецом/);
  assert.doesNotMatch(html.en, /С чабрецом/);

  // Every category link must point at a section that exists on that page.
  for (const lang of languages) {
    const navIds = [...html[lang].matchAll(/data-nav-link="([^"]+)"/g)].map(([, id]) => id);
    const sectionIds = [...html[lang].matchAll(/<section class="menu-section[^"]*" id="([^"]+)"/g)].map(([, id]) => id);
    assert.deepEqual(navIds, sectionIds, `${lang}: category rail and sections must agree`);
  }
});

test("inline script interpolation is escaped for a script context", async () => {
  const html = await readFile(join(root, pages.ru.file), "utf8");
  const script = html.slice(html.lastIndexOf("<script>"));
  // A JS string literal, not an HTML-escaped fragment: HTML entities are never
  // decoded inside <script>, so `&#039;` would reach the user verbatim.
  assert.match(script, /visible \+ ' ' \+ "позиций"/);
  assert.doesNotMatch(script, /&#0?39;|&amp;|&lt;|&quot;/);
});

test("stylesheet has no remote dependency and stays compact", async () => {
  const cssPath = join(root, "assets", "menu.css");
  const css = await readFile(cssPath, "utf8");
  assert.doesNotMatch(css, /@import/);
  assert.doesNotMatch(css, /url\(\s*["']?https?:/);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media print/);
  assert.ok((await stat(cssPath)).size < 40_000);
});

test("typefaces are self-hosted and subsetted per script", async () => {
  const css = await readFile(join(root, "assets", "menu.css"), "utf8");
  const families = {
    // display face: needs an italic cut for the subtitles and section intros
    "playfair-display": ["cyrillic", "latin", "latin-ext", "italic-cyrillic", "italic-latin"],
    // text/UI face: upright only
    manrope: ["cyrillic", "latin", "latin-ext"],
  };
  for (const [family, subsets] of Object.entries(families)) {
    for (const subset of subsets) {
      const file = join(root, "assets", "fonts", `${family}-${subset}.woff2`);
      assert.ok(existsSync(file), `missing self-hosted subset ${family}-${subset}`);
      assert.match(css, new RegExp(`fonts/${family}-${subset}\\.woff2`));
    }
  }
  assert.match(css, /unicode-range: U\+0301, U\+0400-045F/);
});

test("each page preloads every script subset needed above the fold", async () => {
  for (const [file, expectedPreloads] of [
    [
      "index.html",
      ["playfair-display-latin", "playfair-display-italic-latin", "manrope-latin"],
    ],
    ["en.html", ["playfair-display-latin", "playfair-display-italic-latin", "manrope-latin"]],
    [
      "ru.html",
      [
        "playfair-display-cyrillic",
        "playfair-display-italic-cyrillic",
        "manrope-cyrillic",
        "playfair-display-latin",
        "manrope-latin",
      ],
    ],
  ]) {
    const html = await readFile(join(root, file), "utf8");
    const actualPreloads = [...html.matchAll(/rel="preload"[^>]*href="assets\/fonts\/([^"/]+)\.woff2"/g)].map(
      ([, font]) => font,
    );
    assert.deepEqual(actualPreloads, expectedPreloads, `${file}: preload exactly the fonts visible above the fold`);
  }
});
