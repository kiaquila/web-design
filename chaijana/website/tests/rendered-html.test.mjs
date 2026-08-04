import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(lang = "es") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${lang}`);
  const { default: worker } = await import(workerUrl.href);
  const query = lang === "es" ? "" : `?lang=${lang}`;

  return worker.fetch(
    new Request(`http://localhost/${query}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the complete Spanish menu", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Chaijaná — Sabores de Oriente<\/title>/i);
  assert.match(html, /Experiencia gourmet/);
  assert.match(html, /Plov uzbeko/);
  assert.match(html, /Gran Enemigo Cabernet Franc/);
  assert.match(html, /Overdose, Blackburn, SENCE y Adalia/);
  assert.match(html, /10% de descuento pagando en efectivo/);
  assert.match(html, /https:\/\/wa\.me\/5491130537933/);
  assert.equal((html.match(/<section class="menu-section"/g) ?? []).length, 14);
  assert.equal((html.match(/<article class="menu-card/g) ?? []).length, 87);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("renders complete English and Russian variants", async () => {
  const [english, russian] = await Promise.all([render("en"), render("ru")]);
  const [enHtml, ruHtml] = await Promise.all([english.text(), russian.text()]);

  assert.match(enHtml, /Gourmet experience/);
  assert.match(enHtml, /House specialities/);
  assert.match(enHtml, /10% discount when paying in cash/);
  assert.match(ruHtml, /Гастрономический сет/);
  assert.match(ruHtml, /Фирменные блюда/);
  assert.match(ruHtml, /Скидка 10% при оплате наличными/);
  assert.equal((enHtml.match(/<section class="menu-section"/g) ?? []).length, 14);
  assert.equal((ruHtml.match(/<section class="menu-section"/g) ?? []).length, 14);
});

test("ships only the intended production assets and metadata", async () => {
  const packageJson = await readFile(new URL("package.json", root), "utf8");
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await Promise.all([
    access(new URL("public/og.png", root)),
    access(new URL("public/images/chaijana-logo.png", root)),
    access(new URL("public/images/restaurant-gallery-1.webp", root)),
    access(new URL("public/images/restaurant-gallery-2.webp", root)),
    access(new URL("public/images/restaurant-gallery-3.webp", root)),
    access(new URL("public/images/restaurant-gallery-4.webp", root)),
  ]);
});
