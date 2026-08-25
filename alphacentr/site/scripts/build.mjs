#!/usr/bin/env node
/* Alpha Lumen static build.
   Renders every route to dist/, concatenates the stylesheet, and copies the
   self-hosted fonts. No network access and no framework runtime. */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { buildRoutes } from "../src/routes.mjs";
import { site } from "../src/data/site.mjs";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

const STYLE_ORDER = [
  "tokens.css",
  "base.css",
  "layout.css",
  "components.css",
  "pages.css"
];

async function buildStylesheet() {
  const parts = [];
  for (const name of STYLE_ORDER) {
    parts.push(await readFile(join(root, "src/styles", name), "utf8"));
  }
  return parts.join("\n");
}

function outputPath(routePath) {
  if (routePath === "/") return join(dist, "index.html");
  return join(dist, routePath.replace(/^\/|\/$/g, ""), "index.html");
}

function sitemap(routes) {
  const urls = routes
    .map(
      (route) =>
        `  <url><loc>${site.origin}${route.path}</loc></url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  const routes = buildRoutes();
  const seen = new Set();
  for (const route of routes) {
    if (seen.has(route.path)) {
      throw new Error(`Duplicate route: ${route.path}`);
    }
    seen.add(route.path);
    const file = outputPath(route.path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, route.html, "utf8");
  }

  await mkdir(join(dist, "assets"), { recursive: true });
  await writeFile(join(dist, "assets/styles.css"), await buildStylesheet());
  await cp(join(root, "src/client/nav.js"), join(dist, "assets/nav.js"));
  await cp(join(root, "assets/favicon.svg"), join(dist, "assets/favicon.svg"));
  await cp(join(root, "assets/logo-mark.svg"), join(dist, "assets/logo-mark.svg"));
  await cp(join(root, "assets/fonts"), join(dist, "assets/fonts"), {
    recursive: true
  });
  await cp(join(root, "assets/media"), join(dist, "assets/media"), {
    recursive: true
  });

  await writeFile(join(dist, "sitemap.xml"), sitemap(routes));
  await writeFile(
    join(dist, "robots.txt"),
    `User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`
  );

  console.log(`Built ${routes.length} pages into dist/`);
}

await main();
