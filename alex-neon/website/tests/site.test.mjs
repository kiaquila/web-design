#!/usr/bin/env node
/* Verifies the built landing: verbatim source content, navigation anchors,
   self-contained assets, and the approved external links — nothing else. */

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import test, { before } from "node:test";
import { promisify } from "node:util";

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
  "Не присылайте конфиденциальные файлы",
  "Индивидуальное обучение практической работе с ИИ."
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

test("interactive hero honours reduced motion", async () => {
  assert.ok(html.includes("<canvas"), "hero canvas missing");
  const neural = await readFile(join(dist, "assets/neural.js"), "utf8");
  assert.ok(
    /prefers-reduced-motion/.test(neural),
    "neural.js must check prefers-reduced-motion"
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
    "assets/og.png"
  ]) {
    await access(join(dist, file));
  }
});
