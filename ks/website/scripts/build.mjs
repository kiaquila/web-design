#!/usr/bin/env node
/* Static build for the KS portfolio.

   Renders one page per language plus a 404, concatenates the stylesheet
   layers in order, and copies scripts, fonts and images into dist/. No
   framework runtime and no network access. */

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { content, languages, ogImages } from "../src/content.js";
import { renderNotFound, renderPage } from "../src/render.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

const ORIGIN = "https://ks-design.art";

/* Order matters: later layers are expected to win, so a component's own
   media query can override the generic frame. */
const STYLE_ORDER = [
  "tokens.css",
  "base.css",
  "layout.css",
  "components.css",
  "sections.css"
];

async function buildStylesheet() {
  const parts = [];
  for (const name of STYLE_ORDER) {
    parts.push(await readFile(join(root, "src/styles", name), "utf8"));
  }
  return parts.join("\n");
}

/** Copy sub-trees of assets/ that ship as-is. */
async function copyAssets() {
  for (const dir of ["fonts", "portrait", "work", "kind"]) {
    await cp(join(root, "assets", dir), join(dist, "assets", dir), {
      recursive: true
    });
  }
  for (const file of ["favicon.svg", "apple-touch-icon.png", ...Object.values(ogImages)]) {
    await cp(join(root, "assets", file), join(dist, "assets", file));
  }
}

/** Surfaces copy the client has not supplied yet, so an unfinished section
 *  cannot quietly reach a customer-facing stage unnoticed. */
function reportPlaceholders() {
  const pending = [];
  for (const [lang, copy] of Object.entries(content)) {
    for (const [section, block] of Object.entries(copy)) {
      if (block && typeof block === "object" && block.todo) {
        pending.push(`${lang}.${section}`);
      }
    }
  }
  if (pending.length === 0) return;
  console.warn(
    `\n  ! Placeholder copy still in the build: ${pending.join(", ")}\n` +
      "    Replace it with the client's own words before this goes public.\n"
  );
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, "assets"), { recursive: true });

  for (const lang of Object.keys(languages)) {
    const path = languages[lang].path;
    const target = path === "/" ? join(dist, "index.html") : join(dist, path, "index.html");
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, renderPage(lang, ORIGIN), "utf8");
  }

  /* One 404 per language, each beside the pages it covers. Workers Static
     Assets walks up from the requested path to find the nearest `404.html`,
     so a missing `/en/...` URL lands on the English one instead of answering
     an English visitor in Russian. */
  for (const lang of Object.keys(languages)) {
    const path = languages[lang].path;
    const target = path === "/" ? join(dist, "404.html") : join(dist, path, "404.html");
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, renderNotFound(lang, ORIGIN), "utf8");
  }
  await writeFile(join(dist, "assets/styles.css"), await buildStylesheet(), "utf8");

  for (const file of await readdir(join(root, "src/js"))) {
    if (file.endsWith(".js")) {
      await cp(join(root, "src/js", file), join(dist, "assets", file));
    }
  }

  await copyAssets();

  await writeFile(
    join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`,
    "utf8"
  );

  const urls = Object.values(languages)
    .map((config) => `  <url><loc>${ORIGIN}${config.path}</loc></url>`)
    .join("\n");
  await writeFile(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    "utf8"
  );

  console.log(
    `Built the KS portfolio into dist/ (${Object.keys(languages).join(", ")}).`
  );
  reportPlaceholders();
}

await main();
