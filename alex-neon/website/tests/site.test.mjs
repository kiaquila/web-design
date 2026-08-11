#!/usr/bin/env node
/* Verifies the built landing: verbatim source content, navigation anchors,
   self-contained assets, and the approved external links — nothing else. */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import test, { before } from "node:test";
import { promisify } from "node:util";
import { gzipSync } from "node:zlib";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

let html = "";
let css = "";
/* index.html with tags stripped: content fidelity must not depend on which
   inline elements the markup happens to use. */
let text = "";

/* Exact strings carried over from the source site; see ../../CONTENT-AUDIT.md. */
const REQUIRED_TEXT = [
  "ИИ умеет больше, чем отвечать в чате.",
  "Научитесь поручать ему реальные дела.",
  "Индивидуальные занятия по ИИ · онлайн",
  "Записаться на бесплатный чек-ап",
  "Посмотреть примеры",
  "30 минут бесплатно",
  "Программирование не требуется",
  "Всё собираем на вашей задаче",
  "Отправь Андрею последний инвойс. Напиши, что оплатить нужно до пятницы",
  "Ждёт вашего подтверждения",
  "Не рассказывать, а показать",
  "Ответ — это ещё не выполненная задача",
  "Автоматизируем работу. Не ответственность.",
  "Что вы сможете собрать для себя",
  "Письмо голосом с телефона",
  "Цифровой двойник из переписок",
  "Циклы и паттерны в Telegram",
  "Учёт, инвойсы и декларации",
  "Статусы и сроки документов",
  "Личный архив документов",
  "Тренер и трекер привычек",
  "Сложный поиск поездок и жилья",
  "Личный ассистент с памятью",
  "И это только начало",
  "Сначала ваша задача. Потом инструменты.",
  "Меня зовут Алексей Грищенко.",
  "Алло, Нейросеточная?",
  "Коротко о важном",
  "Нужно уметь программировать?",
  "Чем это отличается от курса по промптам?",
  "ИИ получит доступ ко всем моим данным?",
  "Он может сам отправлять письма и подавать документы?",
  "Можно ли доверять анализу переписок и фото?",
  "Можно прийти со своей задачей?",
  "Какую задачу вы до сих пор делаете вручную?",
  "Напишите мне слово «задача»",
  "Не присылайте конфиденциальные файлы"
];

/* Dropped from the page on the client's instruction; see ../../CONTENT-AUDIT.md.
   Listed so a copy-paste cannot quietly bring them back. */
const REMOVED_TEXT = [
  "Индивидуальное обучение практической работе с ИИ.",
  "Без привязки к одной модели, сервису или приложению.",
  "Алексей · ИИ по делу"
];

const REQUIRED_LINKS = [
  "https://t.me/AlexOxitocin",
  "https://t.me/+uzk17Dr2rREyNmRi",
  "https://www.linkedin.com/in/aleksei-grishchenko/"
];

/* Any URL in built output must start with one of these. */
const ALLOWED_URL_PREFIXES = [
  ...REQUIRED_LINKS,
  "https://alex-neon.ks-design.workers.dev",
  "http://www.w3.org/",
  "https://www.w3.org/",
  "http://www.sitemaps.org/"
];

async function distFiles(dir = dist) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await distFiles(path)));
    else out.push(path);
  }
  return out;
}

before(async () => {
  await run(process.execPath, [join(root, "scripts/build.mjs")]);
  html = await readFile(join(dist, "index.html"), "utf8");
  css = await readFile(join(dist, "assets/styles.css"), "utf8");
  text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
});

test("landing keeps the verbatim source content", () => {
  for (const phrase of REQUIRED_TEXT) {
    assert.ok(text.includes(phrase), `missing verbatim text: ${phrase}`);
  }
});

test("quotation marks follow the source: guillemets, never low-nine", () => {
  assert.ok(
    !/[„“”]/.test(text),
    "source uses « » throughout, including nested quotes"
  );
  for (const phrase of [
    "«Отправь Андрею последний инвойс и напиши, что оплата до пятницы»",
    "«найди договор аренды за 2024 год»",
    "Помнит не «всё на свете», а нужное и разрешённое.",
    "«Алло, Нейросеточная?»"
  ]) {
    assert.ok(text.includes(phrase), `missing quoted phrase: ${phrase}`);
  }
});

test("document metadata and a single h1", () => {
  assert.ok(html.includes('lang="ru"'), "html lang must be ru");
  assert.ok(html.includes('name="viewport"'), "viewport meta required");
  assert.ok(
    html.includes(
      "<title>ИИ по делу — индивидуальное обучение на ваших задачах</title>"
    ),
    "source page title preserved"
  );
  assert.equal(html.match(/<h1[\s>]/g)?.length, 1, "exactly one h1");
});

test("navigation anchor targets exist", () => {
  for (const id of ["examples", "control", "process", "about", "contact"]) {
    assert.ok(new RegExp(`id="${id}"`).test(html), `missing #${id}`);
  }
});

test("approved outbound links are present", () => {
  for (const link of REQUIRED_LINKS) {
    assert.ok(html.includes(`href="${link}"`), `missing link: ${link}`);
  }
});

test("no unapproved external URLs anywhere in dist", async () => {
  for (const file of await distFiles()) {
    if (![".html", ".css", ".js", ".svg", ".xml", ".txt"].includes(extname(file)))
      continue;
    // Bundled OFL licence texts carry upstream project URLs by design; their
    // provenance lives in ../../third-party-notices.md.
    if (file.includes(join("assets", "fonts"))) continue;
    const content = await readFile(file, "utf8");
    for (const [url] of content.matchAll(/https?:\/\/[^\s"'<>()]+/g)) {
      assert.ok(
        ALLOWED_URL_PREFIXES.some((prefix) => url.startsWith(prefix)),
        `unapproved URL ${url} in ${file}`
      );
    }
  }
});

test("both interactive fields are present and honour reduced motion", async () => {
  assert.ok(html.includes('class="hero-canvas"'), "hero canvas missing");
  assert.ok(
    html.includes('class="process-canvas"'),
    "process canvas missing: the steps answer the pointer too"
  );
  const neural = await readFile(join(dist, "assets/neural.js"), "utf8");
  assert.ok(
    /prefers-reduced-motion/.test(neural),
    "neural.js must check prefers-reduced-motion"
  );
  /* The generator is shared with the social-card renderer. */
  await access(join(dist, "assets/field.js"));
});

test("the wordmark is the ALEX OXITOCIN logo with an accessible name", () => {
  assert.ok(html.includes('id="logo-alex-oxitocin"'), "logo definition missing");
  assert.equal(
    (html.match(/href="#logo-alex-oxitocin"/g) ?? []).length,
    1,
    "the logo is used once, in the header"
  );
  assert.ok(
    /<a class="brand"[^>]*aria-label="Alex Oxitocin/.test(html),
    "the brand link needs an accessible name once its text became a drawing"
  );
  /* A <symbol> would give <use> its own viewport anchored at (0,0) and shift
     the drawing out of a viewBox whose origin is negative, shaving the N. */
  assert.ok(
    !/<symbol[^>]*id="logo-alex-oxitocin"/.test(html),
    "the logo must be a plain group in <defs>, not a <symbol>"
  );
  /* The last letter's stroke has to sit inside the viewBox, cap included —
     that is exactly what was clipping the N. */
  const stroke = Number(html.match(/id="logo-alex-oxitocin"[^>]*stroke-width="([\d.]+)"/)[1]);
  const [nx, nw] = html.match(/d="M(\d+) 106V6l(\d+) 100V6"/).slice(1).map(Number);
  const [vbLeft, , vbWidth] = html
    .match(/<svg class="logo" viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/)
    .slice(1)
    .map(Number);
  assert.ok(
    nx + nw + stroke / 2 <= vbLeft + vbWidth,
    `the N ends at ${nx + nw + stroke / 2}, past the viewBox edge ${vbLeft + vbWidth}`
  );
  assert.ok(vbLeft <= -stroke / 2, "the viewBox needs padding on the left too");
});

test("the field generator survives a degenerate box", async () => {
  const { generateField } = await import(join(root, "src/js/field.js"));
  for (const box of [
    { rx: 0, ry: 0 },
    { rx: -20, ry: 40 },
    { rx: 40, ry: 0 }
  ]) {
    const field = generateField({ cx: 100, cy: 50, nodes: 500, ...box });
    assert.equal(field.count, 0, `${JSON.stringify(box)} must yield no nodes`);
    assert.equal(field.edgeCount, 0);
  }

  /* A real circle: every coordinate and radius has to be a usable number, or
     the canvas silently draws nothing. */
  const field = generateField({
    cx: 300,
    cy: 300,
    rx: 300,
    ry: 300,
    nodes: 800,
    rim: true
  });
  assert.ok(field.count > 400, `only ${field.count} nodes generated`);
  assert.ok(
    field.x.every(Number.isFinite) && field.y.every(Number.isFinite),
    "node coordinates must all be finite"
  );
  assert.ok(
    field.r.every((radius) => Number.isFinite(radius) && radius > 0),
    "node radii must all be positive"
  );
  for (let e = 0; e < field.edgeCount; e++) {
    assert.ok(
      field.ea[e] >= 0 && field.ea[e] < field.count,
      "edge endpoints must index real nodes"
    );
    assert.ok(field.eb[e] >= 0 && field.eb[e] < field.count);
  }
});

test("the footer carries only the copyright line", () => {
  const footer = html.slice(html.indexOf("<footer"));
  assert.ok(footer.includes("© Alex Oxitocin"), "copyright line missing");
  assert.ok(!footer.includes("<use"), "the footer no longer repeats the logo");
  for (const phrase of REMOVED_TEXT) {
    assert.ok(!text.includes(phrase), `text was removed but is still present: ${phrase}`);
  }
});

test("the community mark is self-hosted and described", () => {
  assert.ok(
    html.includes('src="./assets/community-mark.jpg"'),
    "community mark missing"
  );
  assert.ok(
    /community-mark\.jpg"[^>]*alt="[^"]+"/.test(html) ||
      /alt="[^"]*Алло, Нейросеточная[^"]*"/.test(html),
    "community mark needs a meaningful alt text"
  );
});

test("keyboard focus styling exists", () => {
  assert.ok(css.includes(":focus-visible"), "css must style :focus-visible");
});

test("self-hosted fonts are shipped and referenced locally", async () => {
  const fonts = await readdir(join(dist, "assets/fonts"));
  assert.ok(
    fonts.some((file) => file.endsWith(".woff2")),
    "no woff2 fonts in dist"
  );
  assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(css + html));
});

test("every stylesheet url() resolves inside dist", async () => {
  for (const [, ref] of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (ref.startsWith("data:")) continue;
    const clean = ref.replace(/^(\.\/|\/)/, "").split(/[?#]/)[0];
    await access(join(dist, "assets", clean.replace(/^assets\//, "")));
  }
});

test("stage support files are emitted", async () => {
  for (const file of [
    "404.html",
    "robots.txt",
    "sitemap.xml",
    "assets/favicon.svg",
    "assets/og.png",
    "assets/community-mark.jpg"
  ]) {
    await access(join(dist, file));
  }
});

test("nothing extra ships: the payload stays within budget", async () => {
  /* Uncompressed caps per type, with headroom over today's build. */
  const budgets = {
    ".html": 60 * 1024,
    ".css": 60 * 1024,
    ".js": 40 * 1024,
    ".woff2": 160 * 1024,
    ".jpg": 40 * 1024,
    ".png": 400 * 1024 /* og.png is fetched by crawlers, not by the page */
  };
  const totals = {};
  for (const file of await distFiles()) {
    const { size } = await stat(file);
    totals[extname(file)] = (totals[extname(file)] ?? 0) + size;
  }
  for (const [extension, budget] of Object.entries(budgets)) {
    assert.ok(
      (totals[extension] ?? 0) <= budget,
      `${extension} payload ${totals[extension]} exceeds ${budget} bytes`
    );
  }
  assert.deepEqual(
    Object.keys(totals).sort(),
    [".css", ".html", ".jpg", ".js", ".png", ".svg", ".txt", ".woff2", ".xml"],
    "an unexpected file type appeared in dist"
  );

  /* What the browser actually downloads before first render, gzipped. */
  const critical = ["index.html", "assets/styles.css", "assets/site.js", "assets/neural.js", "assets/field.js"];
  let text = "";
  for (const file of critical) text += await readFile(join(dist, file), "utf8");
  const compressed = gzipSync(Buffer.from(text), { level: 9 }).length;
  assert.ok(
    compressed <= 45 * 1024,
    `critical text payload ${compressed} bytes gzipped exceeds 46080`
  );
});
