#!/usr/bin/env node
/* Renders one 1200×630 social card per language into assets/.

   The card is laid out as an ordinary HTML page using the site's own fonts,
   portrait and headline copy, then photographed by headless Chrome — which is
   why the wording can never drift from `content.js`.

   The handful of colours below are mirrored from `tokens.css` rather than
   imported, because a 1200×630 card needs its own type sizes anyway and the
   fluid scale does not apply. Change a palette token and change it here too.

   This needs Chrome on the machine, so it is deliberately NOT part of
   `npm run build` — the cards are committed and only regenerated when the hero
   copy, the portrait or the palette changes.

   Run from the project: node scripts/make-og.mjs */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { content, ogImages } from "../src/content.js";

const run = promisify(execFile);
const root = resolve(import.meta.dirname, "..");

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

async function cardHtml(lang) {
  const copy = content[lang];
  /* Match the real page's split @font-face declarations. The Cyrillic subset
     does not contain the English alphabet or every glyph in `ks-design`, so
     both cards need the Latin subset as well. */
  const [manropeCyrillic, manropeLatin, portrait] = await Promise.all([
    dataUri("assets/fonts/manrope-cyrillic.woff2", "font/woff2"),
    dataUri("assets/fonts/manrope-latin.woff2", "font/woff2"),
    dataUri("assets/portrait/calm-776.jpg", "image/jpeg")
  ]);

  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>
  @font-face { font-family: "Manrope"; src: url("${manropeCyrillic}") format("woff2");
               font-weight: 200 800; unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116; }
  @font-face { font-family: "Manrope"; src: url("${manropeLatin}") format("woff2");
               font-weight: 200 800; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA,
                 U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; display: grid; grid-template-columns: 1fr 430px;
         background: #fff; color: #0b0b0c; font-family: "Manrope", sans-serif; overflow: hidden; }
  .copy { padding: 72px 56px 72px 72px; display: flex; flex-direction: column; justify-content: space-between; }
  h1 { font-size: 52px; font-weight: 800; line-height: 1.1; letter-spacing: 0.05em;
       text-transform: uppercase; max-width: 16ch; }
  .sub { margin-top: 20px; font-size: 23px; line-height: 1.35; color: #55565a; max-width: 30ch; }
  .name { font-size: 26px; font-weight: 800; letter-spacing: -0.015em; }
  .shot { position: relative; }
  .shot img { width: 100%; height: 100%; object-fit: cover; object-position: 50% 20%; }
</style></head>
<body>
  <div class="copy">
    <div class="name">ks-design</div>
    <div>
      <h1>${copy.hero.title}</h1>
      <p class="sub">${copy.hero.subtitle}</p>
    </div>
  </div>
  <div class="shot"><img src="${portrait}" alt=""></div>
</body></html>`;
}

/** One card per language: a page would otherwise be shared with a card
 *  carrying another language's headline. */
async function main() {
  const chrome = await findChrome();
  const dir = await mkdtemp(join(tmpdir(), "ks-og-"));

  try {
    for (const lang of Object.keys(content)) {
      const page = join(dir, `card-${lang}.html`);
      const target = join(root, "assets", ogImages[lang]);
      await writeFile(page, await cardHtml(lang), "utf8");
      await run(chrome, [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1200,630",
        "--virtual-time-budget=4000",
        `--screenshot=${target}`,
        `file://${page}`
      ]);
      console.log(`Rendered ${target}`);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

await main();
