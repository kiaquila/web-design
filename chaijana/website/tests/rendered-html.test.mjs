import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(lang = "es") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${lang}`);
  const { default: worker } = await import(workerUrl.href);
  const pathname = lang === "es" ? "/" : `/${lang}`;

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function renderUrl(pathname) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Spanish restaurant website", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Chaijaná — Asia Central en Buenos Aires<\/title>/i);
  assert.match(html, /Un rincón de Asia Central en Buenos Aires/);
  assert.match(html, /Nuestra historia/);
  assert.match(html, /Dmitry Kaplin/);
  assert.match(html, /Eventos especiales/);
  assert.match(html, /Música en vivo, todos los sábados/);
  assert.match(html, /Menús de Chefs Invitados/);
  assert.match(html, /href="\/menu\/index\.html"/);
  // the carta teaser links guests straight into the standalone menu
  assert.match(html, /class="carta section"/);
  assert.equal((html.match(/class="dish-card"/g) ?? []).length, 4);
  assert.match(html, /Ver la carta completa/);
  assert.match(html, /https:\/\/wa\.me\/5491130537933/);
  assert.match(html, /https:\/\/www\.instagram\.com\/chaijana\.ar/);
  assert.match(html, /https:\/\/www\.tiktok\.com\/@chaijana_ba/);
  assert.match(html, /mailto:chaijana\.ba@gmail\.com/);
  assert.match(html, /tel:\+541130537933/);
  assert.doesNotMatch(html, /menu-section|menu-card|10% de descuento/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.equal((html.match(/class="event-card"/g) ?? []).length, 3);
  assert.equal((html.match(/class="gallery-band__item/g) ?? []).length, 4);
  assert.equal((html.match(/class="gallery-duo"/g) ?? []).length, 1);
});

test("renders complete English and Russian variants with localized menu paths", async () => {
  const [english, russian] = await Promise.all([render("en"), render("ru")]);
  const [enHtml, ruHtml] = await Promise.all([english.text(), russian.text()]);

  assert.match(enHtml, /A corner of Central Asia in Buenos Aires/);
  assert.match(enHtml, /<title>Chaijaná — Central Asia in Buenos Aires<\/title>/i);
  assert.match(enHtml, /<html lang="en"/i);
  assert.match(enHtml, /Our story/);
  assert.match(enHtml, /Live music every Saturday/);
  assert.match(enHtml, /Chef&#x27;s Tables|Chef's Tables/);
  assert.match(enHtml, /See the full menu/);
  assert.match(enHtml, /href="\/menu\/en\.html"/);
  assert.doesNotMatch(enHtml, /Alta gastronomia oriental/);

  assert.match(ruHtml, /В уголок Центральной Азии в самом сердце Буэнос-Айреса/);
  assert.match(ruHtml, /<title>Chaijaná — Центральная Азия в Буэнос-Айресе<\/title>/i);
  assert.match(ruHtml, /<html lang="ru"/i);
  assert.match(ruHtml, /Дмитрий Каплин/);
  assert.match(ruHtml, /Живая музыка каждую субботу/);
  assert.match(ruHtml, /Шеф-тейблы/);
  assert.match(ruHtml, /Смотреть меню целиком/);
  assert.match(ruHtml, /href="\/menu\/ru\.html"/);
  assert.doesNotMatch(ruHtml, /Димитрий|вдохновлен ных/);
});

test("redirects legacy language query links to canonical language paths", async () => {
  const [english, russian] = await Promise.all([renderUrl("/?lang=en"), renderUrl("/?lang=ru")]);

  assert.equal(english.status, 308);
  assert.equal(new URL(english.headers.get("location"), "http://localhost").pathname, "/en");
  assert.equal(russian.status, 308);
  assert.equal(new URL(russian.headers.get("location"), "http://localhost").pathname, "/ru");
});

test("ships the official optimized restaurant asset set", async () => {
  const packageJson = await readFile(new URL("package.json", root), "utf8");
  const stylesheet = await readFile(new URL("app/globals.css", root), "utf8");
  assert.match(packageJson, /"name": "chaijana-website"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(packageJson, /tailwindcss/);
  assert.match(stylesheet, /grid-area: navigation/);
  assert.match(stylesheet, /\.primary-nav::-webkit-scrollbar/);
  // the site shares the carta's self-hosted display face; no remote font CSS
  assert.match(stylesheet, /font-family: "Cormorant Garamond"/);
  assert.doesNotMatch(stylesheet, /@import|fonts\.googleapis|fonts\.gstatic/);

  await Promise.all([
    access(new URL("public/images/restaurant/brand-logo-gold.svg", root)),
    access(new URL("public/images/restaurant/hero-restaurant.webp", root)),
    access(new URL("public/images/restaurant/restaurant-story.webp", root)),
    access(new URL("public/images/restaurant/chef-dmitry-kaplin.webp", root)),
    access(new URL("public/images/restaurant/event-live-music.webp", root)),
    access(new URL("public/images/restaurant/social-preview.webp", root)),
    ...[
      "cyrillic",
      "latin",
      "latin-ext",
      "italic-cyrillic",
      "italic-latin",
    ].map((subset) => access(new URL(`public/fonts/cormorant-garamond-${subset}.woff2`, root))),
    ...Array.from({ length: 8 }, (_, index) =>
      access(new URL(`public/images/restaurant/restaurant-gallery-${String(index + 1).padStart(2, "0")}.webp`, root)),
    ),
  ]);
});

test("embeds the standalone multilingual menu at the public menu route", async () => {
  const [es, en, ru] = await Promise.all([
    readFile(new URL("public/menu/index.html", root), "utf8"),
    readFile(new URL("public/menu/en.html", root), "utf8"),
    readFile(new URL("public/menu/ru.html", root), "utf8"),
  ]);

  assert.match(es, /<html lang="es"/);
  assert.match(en, /<html lang="en"/);
  assert.match(ru, /<html lang="ru"/);
  assert.match(es, /Shakes de frutas/);
  assert.match(en, /<h3>Crispy eggplant<\/h3>[\s\S]*?<span class="menu-price">16 000<\/span>/);
  assert.match(ru, /С чабрецом/);
  assert.match(ru, /Масала-чай: насыщенный чёрный чай/);
  assert.doesNotMatch(es, /wa\.me|instagram\.com|restaurant-gallery/i);
  await access(new URL("public/menu/assets/dishes/uzbek-plov.webp", root));
  await access(new URL("public/menu/assets/chaijana-wordmark.svg", root));
  await access(new URL("public/menu/assets/fonts/cormorant-garamond-latin.woff2", root));
});
