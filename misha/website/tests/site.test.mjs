/* The page's contract. These tests exist because each of them protects a
   decision that is easy to undo by accident — the palette, the derived years,
   the local-only assets, the header that must fit a 320px phone. Do not
   weaken one to make a change pass. */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";

import { links, years } from "../src/content.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

execFileSync(process.execPath, [join(root, "scripts/build.mjs")], {
  cwd: root,
  stdio: "ignore"
});

const html = readFileSync(join(dist, "index.html"), "utf8");
const notFound = readFileSync(join(dist, "404.html"), "utf8");
const css = readFileSync(join(dist, "assets/styles.css"), "utf8");
const js = readFileSync(join(dist, "assets/site.js"), "utf8");

/* --- the facts the page exists to carry ------------------------------- */

test("the page carries the owner's name, role and every contact", () => {
  assert.match(html, /Mikhail Orlov/);
  assert.match(html, /Senior Backend Developer/);
  assert.ok(html.includes(`mailto:${links.email}`));
  assert.ok(html.includes(links.linkedin));
  assert.ok(html.includes(links.github));
});

test("every employer and the degree survive a copy edit", () => {
  for (const fact of [
    "My.Games",
    "VK Pay",
    "LitRes",
    "Er-Telecom",
    "Perm State Technical University"
  ]) {
    assert.ok(html.includes(fact), `missing from the page: ${fact}`);
  }
});

test("the years of experience are derived, never typed", () => {
  /* Comments are allowed to name the number they are warning about; the
     shipped strings are not. */
  const content = readFileSync(join(root, "src/content.js"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );
  assert.match(content, /%IT_YEARS%/);
  assert.match(content, /%BACKEND_YEARS%/);
  assert.doesNotMatch(content, /\b\d{2}\s+years\b/i);
  assert.ok(html.includes(`>${years.it}<`), "rendered IT years");
  assert.ok(html.includes(`>${years.backend}<`), "rendered backend years");
});

test("the VK Pay product paragraph is printed once, not twice", () => {
  const occurrences = html.split("VK Pay platform provides").length - 1;
  assert.equal(occurrences, 1);
});

/* --- the design decisions --------------------------------------------- */

function channels(hex) {
  const value = hex.length === 4
    ? hex.slice(1).split("").map((c) => parseInt(c + c, 16))
    : [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((c) => parseInt(c, 16));
  return value;
}

function luminance(hex) {
  const [r, g, b] = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("the palette stays achromatic", () => {
  const hexes = css.match(/#[0-9a-f]{3,6}\b/gi) ?? [];
  assert.ok(hexes.length > 0);
  for (const hex of hexes) {
    const [r, g, b] = channels(hex);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    assert.ok(spread <= 12, `${hex} is not neutral (spread ${spread})`);
  }
});

test("every grey that carries text clears AA on the ground", () => {
  const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))[1];
  const ground = token("ground");
  for (const name of ["ink", "ink-soft", "ink-mute"]) {
    const ratio = contrast(ground, token(name));
    assert.ok(ratio >= 4.5, `--${name} is ${ratio.toFixed(2)}:1 on --ground`);
  }
});

test("the palest grey is ornament only and never lands on text", () => {
  const uses = css.match(/[^\n]*var\(--ghost\)[^\n]*/g) ?? [];
  assert.equal(uses.length, 1);
  assert.match(css, /\.numeral\s*\{[^}]*var\(--ghost\)/s);
});

test("the header budget for a 320px phone is still written down", () => {
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.site-nav ul \{\s*gap: 0;/);
  assert.match(css, /@media \(max-width: 400px\)[\s\S]*?\.wordmark \{/);
});

test("the collapsed navigation keeps its section names for screen readers", () => {
  /* The label is hidden from the eye on phones but must stay in the
     accessibility tree: five links named "01" to "05" are a numbered list of
     nothing. */
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.nav-label \{[^}]*clip-path: inset\(50%\)/s);
  assert.doesNotMatch(css, /@media \(max-width: 720px\)[\s\S]*?\.nav-label \{[^}]*display: none/s);
});

test("navigation targets stay 44px tall", () => {
  assert.match(css, /\.site-nav a \{[^}]*min-height: 44px/s);
  assert.match(css, /\.btn \{[^}]*min-height: 44px/s);
});

test("reduced motion disables the reveal and the smooth scroll", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /prefers-reduced-motion: reduce\)[\s\S]*?scroll-behavior: auto/);
});

test("Ctrl+P produces a CV rather than a screenshot of a website", () => {
  assert.match(css, /@media print/);
  assert.match(css, /@media print[\s\S]*?\.masthead,[\s\S]*?display: none/);
});

/* --- what may leave the page ------------------------------------------ */

test("no origin outside the approved list is reachable from the page", () => {
  const allowed = new Set([
    "https://schema.org",
    ...Object.values(links).filter((value) => value.startsWith("http"))
  ]);
  const urls = html.match(/https?:\/\/[^"'\\ )]+/g) ?? [];
  for (const url of urls) {
    const clean = url.replace(/[.,]$/, "");
    assert.ok(
      [...allowed].some((origin) => clean === origin || clean.startsWith(`${origin}/`)),
      `unapproved outbound URL: ${clean}`
    );
  }
});

test("every asset is served from this origin", () => {
  const outbound = Object.values(links).filter((value) => value.startsWith("http"));
  const assets = html.match(/(?:href|src)="([^"]+)"/g) ?? [];
  for (const asset of assets) {
    const value = asset.slice(asset.indexOf('"') + 1, -1);
    if (value.startsWith("#") || value.startsWith("mailto:")) continue;
    if (outbound.some((origin) => value === origin || value.startsWith(`${origin}/`))) continue;
    assert.ok(value.startsWith("/"), `asset is not local: ${value}`);
  }
  assert.match(html, /rel="preload" href="\/assets\/fonts\/jost-latin\.woff2"/);
});

test("the contact block is one line: an offer, a mailto and three profiles", () => {
  assert.match(html, /class="contact-row"/);
  assert.ok(html.includes(`href="mailto:${links.email}"`));
  assert.doesNotMatch(html, /Buenos Aires, Argentina/);
  const social = html.match(/class="social-link"/g) ?? [];
  assert.equal(social.length, 3);
  /* An icon with no accessible name is a link that announces itself as
     "link". All three carry their name in visually-hidden text. */
  for (const label of ["LinkedIn", "Telegram", "GitHub"]) {
    assert.match(
      html,
      new RegExp(`<span class="visually-hidden">${label}</span><svg`),
      `${label} icon has no accessible name`
    );
  }
  /* Telegram sits between the other two, as asked. */
  assert.ok(
    html.indexOf(">LinkedIn<") < html.indexOf(">Telegram<") &&
      html.indexOf(">Telegram<") < html.indexOf(">GitHub<")
  );
});

test("the offer carries no full stop", () => {
  assert.match(html, /Open to senior backend and lead roles, remote<\/p>/);
});

test("the footer credits the designer and links to her site", () => {
  assert.match(
    html,
    /Designed by <a[^>]*href="https:\/\/ks-design\.art"[^>]*>ks-design<\/a> · Built with AI workflows/
  );
  assert.doesNotMatch(html, /AI workflows\./);
});

test("each section body is one grid item", () => {
  /* Split across several children, the head's tall numeral set the height of
     the first grid row and opened a hundred pixels of nothing between a
     section's first line and its second. */
  const sections = html.match(/<section class="section /g) ?? [];
  const bodies = html.match(/<div class="section-body">/g) ?? [];
  assert.equal(bodies.length, sections.length);
  assert.match(css, /\.section-body \{[^}]*display: grid/s);
});

test("the CV downloads rather than announcing a print dialog", () => {
  assert.match(html, /data-print[^>]*>Download CV</);
  assert.doesNotMatch(html, /Print \/ save as PDF/);
});

test("the printed CV is a document, not the page on paper", () => {
  assert.match(css, /@page \{\s*margin:/);
  /* The rail, the numerals and the deck spacing all come off. */
  assert.match(css, /@media print[\s\S]*?\.numeral,[\s\S]*?display: none/);
  assert.match(css, /@media print[\s\S]*?\.section > \.shell \{\s*display: block/);
});

test("the third section is Skills", () => {
  assert.match(html, /<section class="section skills" id="skills">/);
  assert.match(html, /<h2>Skills<\/h2>/);
  assert.doesNotMatch(html, /<h2>Stack<\/h2>/);
});

test("both lists use the same dot", () => {
  assert.match(
    css,
    /\.help-list li::before,\s*\.role-points li::before \{[^}]*border-radius: 50%/s
  );
  assert.doesNotMatch(css, /\.help-list li::before \{[^}]*height: 1px/s);
});

test("printing resets the entrance reveal", () => {
  /* The script holds every section at opacity 0 until it crosses the viewport.
     Printing does not scroll, so without this the CV came out as one page and
     then blank paper. */
  assert.match(
    css,
    /@media print[\s\S]*?\.reveal-on \.section > \.shell > \*,\s*\.reveal-on \.hero > \.shell > \* \{[^}]*opacity: 1/s
  );
});

test("the favicon is the page's own M, not a second mark", () => {
  const favicon = readFileSync(join(dist, "assets/favicon.svg"), "utf8");
  assert.match(favicon, /<path[^>]*d="M[\d.]/);
  assert.doesNotMatch(favicon, /<circle/);
});

test("printing unfolds the button and the icons into text", () => {
  assert.match(css, /\.btn\[data-print-value\]::after \{\s*content: " — " attr\(data-print-value\)/);
  assert.match(css, /\.social-link::after \{\s*content: " — " attr\(href\)/);
  assert.ok(html.includes(`data-print-value="${links.email}"`));
});

test("a page with no home asks not to be indexed", () => {
  /* The build under test runs without SITE_ORIGIN, which is the stage's own
     configuration. */
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(readFileSync(join(dist, "robots.txt"), "utf8"), /Disallow: \//);
  assert.doesNotMatch(html, /rel="canonical"/);
});

test("the markup carries no inline style", () => {
  /* This is what lets the stage Worker send `style-src 'self'` without
     `'unsafe-inline'`, which every other project in this repository needs. */
  assert.doesNotMatch(html, /<[^>]+\sstyle="/);
  assert.doesNotMatch(notFound, /<[^>]+\sstyle="/);
  const inlineStyleTags = html.match(/<style[\s>]/g) ?? [];
  assert.equal(inlineStyleTags.length, 0);
});

test("the only inline script is the structured data block", () => {
  const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
  assert.equal(inline.length, 1);
  assert.match(inline[0], /type="application\/ld\+json"/);
});

/* --- accessibility and the no-JavaScript guarantee -------------------- */

test("one h1, and it is the person the page is about", () => {
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/g) ?? [];
  assert.equal(h1.length, 1);
  assert.match(h1[0], /Mikhail Orlov/);
});

test("nothing ships hidden except the button a script has to honour", () => {
  /* `hidden` as its own attribute — `aria-hidden` on the decorative
     numerals is a different thing and stays. */
  const hidden = html.match(/<[^>]*\shidden[\s>][^>]*>?/g) ?? [];
  assert.equal(hidden.length, 1);
  assert.match(hidden[0], /data-print/);
});

test("every navigation entry points at a section that exists", () => {
  for (const match of html.matchAll(/data-nav="([^"]+)"/g)) {
    assert.ok(html.includes(`id="${match[1]}"`), `no section for ${match[1]}`);
  }
});

test("the page is English only", () => {
  assert.match(html, /<html lang="en">/);
  assert.doesNotMatch(html, /[Ѐ-ӿ]/);
  assert.doesNotMatch(notFound, /[Ѐ-ӿ]/);
});

test("the script stays inside its budget", () => {
  const gzipped = gzipSync(Buffer.from(js)).length;
  assert.ok(gzipped < 2048, `site.js is ${gzipped} bytes gzipped`);
});

test("the whole page stays inside its weight budget", () => {
  const total = [html, css, js].reduce(
    (sum, part) => sum + gzipSync(Buffer.from(part)).length,
    0
  );
  assert.ok(total < 25_000, `html+css+js is ${total} bytes gzipped`);
});
