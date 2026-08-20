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

/* The page must stay dependency-free: nothing fetched from another origin.
   Enumerating the mechanisms that can pull bytes — element `src`, `srcset`,
   `poster`, `<link href>`, CSS `url()` and `@import` — is a losing game, so
   the check inverts it: the one thing allowed to point outward is an
   anchor's href, and once exactly that attribute is blanked no off-origin
   reference may remain anywhere in the document — an anchor's other
   attributes (an inline background, a `ping`) stay visible to the scan.
   Data URIs are stripped first because their payload is inert and base64
   happily contains `//`. */
const DATA_URI = /data:[^"'\s)]+/gi;
const ANCHOR_HREF = /(<a\b[^>]*?\bhref\s*=\s*)(["'])[^"']*\2/gi;
const OFF_ORIGIN_ANYWHERE = /(?:[a-z][a-z0-9+.-]*:)?\/\/[^\s"'()<>]+/gi;

/* Local references have to resolve to something the build actually publishes,
   or the page ships a request that 404s. */
const LOCAL_REFERENCE =
  /(?:\b(?:src|poster)\s*=\s*["']([^"']+)["']|<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']|\burl\(\s*["']?([^"')]+)["']?\s*\))/gi;

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const name of SERVED) {
    await stat(join(src, name)); // throws a clear ENOENT if the set is incomplete
    await copyFile(join(src, name), join(dist, name));
  }

  const page = await readFile(join(dist, "index.html"), "utf8");

  const scannable = page.replace(DATA_URI, "data:inline").replace(ANCHOR_HREF, '$1$2local$2');
  const offsite = [...scannable.matchAll(OFF_ORIGIN_ANYWHERE)].map((match) => match[0]);
  if (/@import/i.test(scannable)) offsite.push("@import");
  if (offsite.length > 0) {
    throw new Error(
      `The study must load nothing from another origin, found: ${offsite.join(", ")}`
    );
  }

  const unresolved = [...page.matchAll(LOCAL_REFERENCE)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter((reference) => reference && !/^(?:data:|#)/i.test(reference))
    .filter((reference) => !SERVED.includes(reference.replace(/^\.?\//, "")));
  if (unresolved.length > 0) {
    throw new Error(
      `The page references files the build does not publish: ${unresolved.join(", ")}`
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
