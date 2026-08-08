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

  // 307, not 308: browsers cache a permanent redirect indefinitely, which would
  // outlive any change of mind about the URL scheme.
  assert.equal(english.status, 307);
  assert.equal(new URL(english.headers.get("location"), "http://localhost").pathname, "/en");
  assert.equal(russian.status, 307);
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
  // the site shares the carta's self-hosted faces; no remote font CSS
  assert.match(stylesheet, /font-family: "Playfair Display"/);
  assert.match(stylesheet, /font-family: Manrope/);
  assert.doesNotMatch(stylesheet, /@import|fonts\.googleapis|fonts\.gstatic/);

  await Promise.all([
    access(new URL("public/images/restaurant/brand-logo-gold.svg", root)),
    access(new URL("public/images/restaurant/hero-restaurant.webp", root)),
    access(new URL("public/images/restaurant/restaurant-story.webp", root)),
    access(new URL("public/images/restaurant/chef-dmitry-kaplin.webp", root)),
    access(new URL("public/images/restaurant/event-live-music.webp", root)),
    access(new URL("public/images/restaurant/social-preview.webp", root)),
    ...[
      "playfair-display-cyrillic",
      "playfair-display-latin",
      "playfair-display-latin-ext",
      "playfair-display-italic-cyrillic",
      "playfair-display-italic-latin",
      "manrope-cyrillic",
      "manrope-latin",
      "manrope-latin-ext",
    ].map((file) => access(new URL(`public/fonts/${file}.woff2`, root))),
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
  await access(new URL("public/menu/assets/bonpunto-logo.svg", root));
  await access(new URL("public/menu/assets/fonts/playfair-display-latin.woff2", root));
  await access(new URL("public/menu/assets/fonts/manrope-latin.woff2", root));
});

test("every local asset the rendered pages reference is actually shipped", async () => {
  // The sync step used to copy a hand-written list of filenames, so adding an
  // asset to the menu shipped a silent 404 while the build stayed green.
  const html = await (await render()).text();
  // Only the directories this repository ships from `public/`; `/assets/*` is
  // Vite's own build output and lives in `dist/`.
  const referenced = [
    ...html.matchAll(/(?:src|href)="(\/(?:menu|fonts|images)\/[^"]+)"/g),
  ].map(([, path]) => path);
  assert.ok(referenced.length >= 10, "expected the page to reference local assets");
  await Promise.all(
    [...new Set(referenced)].map((path) =>
      access(new URL(`public${path}`, root)).catch(() => {
        throw new Error(`referenced but not shipped: ${path}`);
      }),
    ),
  );
});

test("every rendered response carries the baseline security headers", async () => {
  const response = await render();

  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=31536000/);
  assert.match(response.headers.get("permissions-policy") ?? "", /geolocation=\(\)/);

  const csp = response.headers.get("content-security-policy") ?? "";
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
  // The rendered pages need inline scripts for the RSC payload; nothing else may be inline.
  assert.match(csp, /style-src 'self'/);
  assert.ok(!/style-src[^;]*unsafe-inline/.test(csp), "styles must not allow 'unsafe-inline'");
});

test("the menu is served under a strict, hash-pinned policy", async () => {
  const response = await renderUrl("/menu/ru.html");
  const csp = response.headers.get("content-security-policy") ?? "";

  assert.ok(!csp.includes("unsafe-inline"), "the static menu must not allow any inline source");
  assert.match(csp, /connect-src 'none'/);
  assert.match(csp, /form-action 'none'/);
  assert.equal((csp.match(/sha256-/g) ?? []).length, 3, "one hash per built menu language");
});

test("the generated script hashes match the menu that ships", async () => {
  const { MENU_SCRIPT_HASHES } = await import("../worker/menu-script-hashes.generated.ts");
  const { createHash } = await import("node:crypto");

  for (const page of ["index.html", "en.html", "ru.html"]) {
    const html = await readFile(new URL(`public/menu/${page}`, root), "utf8");
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
    assert.ok(inline.length > 0, `${page}: expected an inline script`);

    for (const [, body] of inline) {
      const hash = `sha256-${createHash("sha256").update(body, "utf8").digest("base64")}`;
      assert.ok(
        MENU_SCRIPT_HASHES.includes(hash),
        `${page}: inline script is not pinned in the CSP — re-run the build to refresh the hashes`,
      );
    }
  }
});
