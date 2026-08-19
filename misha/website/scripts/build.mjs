#!/usr/bin/env node
/* Static build. One page, one stylesheet, one script, one font file.
   No framework, no network access, no dependencies outside Node builtins. */

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { links, PLACEHOLDER_EMAIL } from "../src/content.js";
import { renderNotFound, renderPage } from "../src/render.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

/* No domain has been chosen yet, so the build publishes no absolute URLs by
   default: a canonical tag pointing at a host that does not exist is worse
   than no canonical tag. Set SITE_ORIGIN once the page has a home. */
const ORIGIN = (process.env.SITE_ORIGIN ?? "").trim().replace(/\/+$/, "");

/* Order matters: later layers are expected to win, so a component's own media
   query can override the generic frame. */
const STYLE_ORDER = ["tokens.css", "base.css", "layout.css", "sections.css", "print.css"];

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

  const year = new Date().getFullYear();

  await writeFile(join(dist, "index.html"), renderPage({ origin: ORIGIN, year }));
  await writeFile(join(dist, "404.html"), renderNotFound({ origin: ORIGIN }));
  await writeFile(join(dist, "assets/styles.css"), await buildStylesheet());
  await cp(join(root, "src/js/site.js"), join(dist, "assets/site.js"));
  await cp(join(root, "assets/favicon.svg"), join(dist, "assets/favicon.svg"));
  await cp(join(root, "assets/fonts"), join(dist, "assets/fonts"), { recursive: true });

  /* Until the page has a home it is a stage, and a stage carrying a real
     person's name and career must not turn up in a search result under a
     throwaway hostname. No origin therefore means no indexing, in the file and
     in the markup both. */
  const robots = ORIGIN
    ? `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
    : "User-agent: *\nDisallow: /\n";
  await writeFile(join(dist, "robots.txt"), robots);

  if (ORIGIN) {
    await writeFile(
      join(dist, "sitemap.xml"),
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        `  <url><loc>${ORIGIN}/</loc></url>\n` +
        "</urlset>\n"
    );
  } else {
    console.warn(
      "\n  ! SITE_ORIGIN is unset, so this build ships no canonical URL, no\n" +
        "    sitemap, and asks search engines not to index it. Set it to the\n" +
        "    real origin when the page has one.\n"
    );
  }

  if (links.email === PLACEHOLDER_EMAIL) {
    console.warn(
      `\n  ! The contact address is still the placeholder ${PLACEHOLDER_EMAIL}.\n` +
        "    Replace links.email with the owner's real address before this is seen.\n"
    );
  }

  console.log(`  built dist/ ${ORIGIN ? `for ${ORIGIN}` : "(no origin set)"}`);
}

await main();
