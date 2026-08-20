#!/usr/bin/env node
/* Static build. The study is one self-contained HTML file plus the two baked
   favicon PNGs Safari needs, so the build copies rather than compiles — and
   then checks the two properties the project promises, because a page that
   quietly grew a CDN link or lost its favicon would still "build" fine.

   Run from the project: node ember/website/scripts/build.mjs */

import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const src = join(root, "src");
const dist = join(root, "dist");

/** Everything the Worker serves. A file outside this list is not published. */
const SERVED = ["index.html", "favicon-32.png", "apple-touch-icon.png"];

/* The page must stay dependency-free: no fonts, scripts, styles or images
   fetched from another origin, and no analytics. Only *loaded* references
   count — `<link>` and anything with a `src` — because the footer's credit is
   an ordinary outbound link and is meant to leave the site. */
const LOADED = /<(?:link|script|img|source|iframe|video|audio|embed)\b[^>]*?(?:src|href)\s*=\s*["']([^"']+)["'][^>]*>/gi;
const OFF_ORIGIN = /^(?:[a-z]+:)?\/\//i;

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const name of SERVED) {
    await stat(join(src, name)); // throws a clear ENOENT if the set is incomplete
    await copyFile(join(src, name), join(dist, name));
  }

  const page = await readFile(join(dist, "index.html"), "utf8");
  const offsite = [...page.matchAll(LOADED)]
    .map((match) => match[1])
    .filter((reference) => OFF_ORIGIN.test(reference));
  if (offsite.length > 0) {
    throw new Error(
      `The study must load nothing from another origin, found: ${offsite.join(", ")}`
    );
  }

  const extras = (await readdir(src)).filter((name) => !SERVED.includes(name));
  if (extras.length > 0) {
    throw new Error(
      `src/ holds files the build does not publish: ${extras.join(", ")}. ` +
        "Add them to SERVED or move them out."
    );
  }

  console.log(`Built ember: ${SERVED.length} files in dist/.`);
}

await main();
