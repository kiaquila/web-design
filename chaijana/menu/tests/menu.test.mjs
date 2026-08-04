import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  assert.equal(experiences[2].options.length, 3, "Romanoff includes no-wine, vodka and tea prices");
  languages.forEach((lang) => assert.match(pick(experiences[2].description, lang), /encurtidos|pickles|соленья/i));
});

test("cover metadata is the official menu metadata", () => {
  assert.equal(ui.es.address, "BONPLAND, 1965");
  assert.equal(ui.es.discount, "10% de descuento pagando en efectivo");
  assert.equal(ui.es.hours, "Lun–Jue 11:00–23:00 / Vie–Dom 11:00–00:00");
  assert.equal(ui.en.heroTitle, "Taste of the East");
  assert.equal(ui.ru.heroTitle, "Вкус Востока");
  assert.equal(ui.ru.hours, "ПН - ЧТ 11:00-23:00 / ПТ - ВС 11:00-24:00");
});

test("built pages are self-contained menu views with safe navigation", async () => {
  const expectedItems = experiences.length + menuSections.reduce((sum, section) => sum + section.items.length, 0);
  for (const [lang, config] of Object.entries(pages)) {
    const html = await readFile(join(root, config.file), "utf8");
    assert.match(html, new RegExp(`<html lang="${lang}"`));
    assert.match(html, new RegExp(`class="back-link" href="${config.back.replaceAll("?", "\\?")}"`));
    assert.equal((html.match(/<section class="menu-section/g) ?? []).length, 15);
    assert.equal((html.match(/<article class="menu-item"/g) ?? []).length, expectedItems);
    assert.match(html, /data-search/);
    assert.match(html, /href="assets\/menu\.css\?v=[a-f0-9]{10}"/);
    assert.match(html, /data-nav-link="vinos"/);
    assert.match(html, /data-nav-link="hookah"/);
    assert.match(html, /href="index\.html"/);
    assert.match(html, /href="en\.html"/);
    assert.match(html, /href="ru\.html"/);
    assert.doesNotMatch(html, /wa\.me|instagram\.com|tiktok\.com|restaurant-gallery/i);
    assert.doesNotMatch(html, /Reservar mesa|Reserve a table|Забронировать стол|Una casa de té|The house|Галере/i);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.ok((await stat(join(root, config.file))).size < 180_000, `${config.file} should stay lightweight`);
  }
});

test("stylesheet has no remote dependency and stays compact", async () => {
  const cssPath = join(root, "assets", "menu.css");
  const css = await readFile(cssPath, "utf8");
  assert.doesNotMatch(css, /@import|https?:\/\//);
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /@media print/);
  assert.ok((await stat(cssPath)).size < 40_000);
});
