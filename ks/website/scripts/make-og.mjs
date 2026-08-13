#!/usr/bin/env node
/* Renders assets/og.png — the 1200×630 social card.

   The card is laid out as an ordinary HTML page using the site's own fonts,
   portrait and headline copy, then photographed by headless Chrome — which is
   why the wording can never drift from `content.js`.

   The handful of colours below are mirrored from `tokens.css` rather than
   imported, because a 1200×630 card needs its own type sizes anyway and the
   fluid scale does not apply. Change a palette token and change it here too.

   This needs Chrome on the machine, so it is deliberately NOT part of
   `npm run build` — og.png is committed and only regenerated when the hero
   copy, the portrait or the palette changes.

   Run from the project: node scripts/make-og.mjs */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { content } from "../src/content.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const out = join(root, "assets", "og.png");

const CHROME_CANDIDATES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium"
];

async function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      /* try the next one */
    }
  }
  throw new Error(
    `No Chrome binary found. Looked in:\n  ${CHROME_CANDIDATES.join("\n  ")}`
  );
}

/** Inlines the font and the portrait as data URIs: the page is loaded over
 *  file:// and relative asset paths would not resolve the same way. */
async function dataUri(relativePath, mime) {
  const bytes = await readFile(join(root, relativePath));
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function cardHtml() {
  const copy = content.ru;
  const [manrope, portrait] = await Promise.all([
    dataUri("assets/fonts/manrope-cyrillic.woff2", "font/woff2"),
    dataUri("assets/portrait/calm-776.jpg", "image/jpeg")
  ]);

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><style>
  @font-face { font-family: "Manrope"; src: url("${manrope}") format("woff2"); font-weight: 200 800; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; display: grid; grid-template-columns: 1fr 430px;
         background: #fff; color: #0b0b0c; font-family: "Manrope", sans-serif; overflow: hidden; }
  .copy { padding: 72px 56px 72px 72px; display: flex; flex-direction: column; justify-content: space-between; }
  .eyebrow { font-size: 18px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
             color: #0b0b0c; padding-top: 14px; border-top: 3px solid #0b0b0c; align-self: flex-start; }
  h1 { font-size: 52px; font-weight: 800; line-height: 1.1; letter-spacing: 0.05em;
       text-transform: uppercase; max-width: 16ch; margin-top: 24px; }
  .sub { margin-top: 20px; font-size: 23px; line-height: 1.35; color: #55565a; max-width: 30ch; }
  .name { font-size: 26px; font-weight: 800; letter-spacing: -0.015em; }
  .shot { position: relative; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
</style></head>
<body>
  <div class="copy">
    <div class="eyebrow">${copy.hero.eyebrow}</div>
    <div>
      <h1>${copy.hero.title}</h1>
      <p class="sub">${copy.hero.subtitle}</p>
    </div>
    <div class="name">ks-design</div>
  </div>
  <div class="shot"><img src="${portrait}" alt=""></div>
</body></html>`;
}

async function main() {
  const chrome = await findChrome();
  const dir = await mkdtemp(join(tmpdir(), "ks-og-"));
  const page = join(dir, "card.html");

  try {
    await writeFile(page, await cardHtml(), "utf8");
    await run(chrome, [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      "--window-size=1200,630",
      "--virtual-time-budget=4000",
      `--screenshot=${out}`,
      `file://${page}`
    ]);
    console.log(`Rendered ${out}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await main();
