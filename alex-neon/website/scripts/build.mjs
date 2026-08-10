#!/usr/bin/env node
/* Alex Neon static build.
   Renders the single landing page into dist/: copies the HTML, concatenates
   the stylesheet layers, and copies scripts, fonts, and icons. No network
   access and no framework runtime. */

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

const ORIGIN = "https://alex-neon.ks-design.workers.dev";

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

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(join(dist, "assets"), { recursive: true });

  await cp(join(root, "src/index.html"), join(dist, "index.html"));
  await cp(join(root, "src/404.html"), join(dist, "404.html"));
  await writeFile(join(dist, "assets/styles.css"), await buildStylesheet());

  for (const file of await readdir(join(root, "src/js"))) {
    if (file.endsWith(".js")) {
      await cp(join(root, "src/js", file), join(dist, "assets", file));
    }
  }

  await cp(join(root, "assets/fonts"), join(dist, "assets/fonts"), {
    recursive: true
  });
  await cp(join(root, "assets/favicon.svg"), join(dist, "assets/favicon.svg"));
  await cp(join(root, "assets/og.png"), join(dist, "assets/og.png"));

  await writeFile(
    join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`
  );
  await writeFile(
    join(dist, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${ORIGIN}/</loc></url>\n</urlset>\n`
  );

  console.log("Built the Alex Neon landing into dist/");
}

await main();
