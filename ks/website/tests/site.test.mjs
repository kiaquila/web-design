#!/usr/bin/env node
/* Verifies the built site: the client's own wording, the bilingual contract,
   self-contained assets, and the accessibility guarantees the design depends
   on. Everything here reads dist/, so it tests what actually ships. */

import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import test, { before } from "node:test";
import { gzipSync } from "node:zlib";

import { CAREER_START_YEAR, content, experienceYears, links } from "../src/content.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

const pages = {};
let css = "";

/* Compares against what a reader sees: tags dropped and entities decoded, so
   an apostrophe in the copy is matched as "'" and not as "&#039;". */
const stripTags = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&#039;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ");

/** CSS with comments removed, for rules that ask "which selectors do X". */
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

before(async () => {
  pages.ru = await readFile(join(dist, "index.html"), "utf8");
  pages.en = await readFile(join(dist, "en/index.html"), "utf8");
  pages.notFound = await readFile(join(dist, "404.html"), "utf8");
  css = await readFile(join(dist, "assets/styles.css"), "utf8");
  for (const key of ["ru", "en", "notFound"]) {
    pages[`${key}Text`] = stripTags(pages[key]);
  }
});

/* --- the client's wording ------------------------------------------------- */

test("the hero carries the approved headline in both languages", () => {
  assert.match(pages.ruText, /Сделаю вам дизайн, который вовлекает/);
  assert.match(pages.ruText, /И вас точно запомнят и захотят вернуться\./);
  assert.match(pages.enText, /I'll design something that pulls people in/);
});

test("every process step appears in order", () => {
  for (const lang of ["ru", "en"]) {
    const text = pages[`${lang}Text`];
    let cursor = -1;
    for (const step of content[lang].process.steps) {
      const at = text.indexOf(step.body);
      assert.notEqual(at, -1, `${lang}: missing process step "${step.title}"`);
      assert.ok(at > cursor, `${lang}: process step "${step.title}" is out of order`);
      cursor = at;
    }
  }
});

test("the price list is rendered exactly as quoted", () => {
  const expected = {
    ru: ["500 USD", "1 500 USD", "100 USD", "50 USD"],
    en: ["USD 500", "USD 1,500", "USD 100", "USD 50"]
  };
  for (const [lang, prices] of Object.entries(expected)) {
    for (const price of prices) {
      assert.ok(
        pages[`${lang}Text`].includes(price),
        `${lang}: price ${price} is missing from the page`
      );
    }
  }
  /* The menu tiers are a rate plus a per-extra-page rate; both numbers have to
     survive, not just the headline one. */
  assert.match(pages.ruText, /20 USD за каждую следующую/);
  assert.match(pages.enText, /USD 20 for each additional/);
});

test("the years of experience are derived, never hardcoded", () => {
  const years = new Date().getUTCFullYear() - CAREER_START_YEAR;
  assert.equal(experienceYears(), years);
  assert.ok(
    pages.ruText.includes(`${years} лет в вебе`),
    `expected the page to state ${years} years`
  );
  /* A literal "9" in the source would pass today and lie next January. */
  const yearsStat = content.ru.hero.portraitStats.find((stat) =>
    stat.label.includes("лет в вебе")
  );
  assert.equal(yearsStat.value, "%YEARS%");
});

test("placeholder testimonials are still flagged as placeholders", () => {
  /* Kind Words is intentionally unfilled. This test exists so that shipping
     real quotes forces the flag off, and so nobody mistakes TODO copy for
     approved wording. */
  for (const lang of ["ru", "en"]) {
    const block = content[lang].kindWords;
    if (!block.todo) {
      assert.ok(
        !pages[`${lang}Text`].includes("TODO"),
        `${lang}: kindWords is no longer marked todo but still renders TODO text`
      );
      continue;
    }
    assert.ok(block.items.every((item) => item.quote.startsWith("TODO")));
  }
});

/* --- the bilingual contract ------------------------------------------------ */

test("each page declares its own language and links the other one", () => {
  assert.match(pages.ru, /<html lang="ru">/);
  assert.match(pages.en, /<html lang="en">/);

  for (const key of ["ru", "en"]) {
    assert.match(pages[key], /<link rel="alternate" hreflang="ru" href="[^"]+\/">/);
    assert.match(pages[key], /<link rel="alternate" hreflang="en" href="[^"]+\/en\/">/);
    assert.match(pages[key], /hreflang="x-default"/);
  }
  assert.match(pages.ru, /<link rel="canonical" href="[^"]+\/">/);
  assert.match(pages.en, /<link rel="canonical" href="[^"]+\/en\/">/);
});

test("the language switch is a plain link, so it works without scripts", () => {
  assert.match(pages.ru, /<a href="\/en\/" hreflang="en" lang="en">EN<\/a>/);
  assert.match(pages.en, /<a href="\/" hreflang="ru" lang="ru">RU<\/a>/);
  assert.match(pages.ru, /<span class="lang-current" aria-current="true">RU<\/span>/);
});

test("no language leaks into the other page's document", () => {
  /* A Cyrillic word in the English document means a key was never translated.
     Brand names and the @handle are Latin, so this is a safe blanket check. */
  const cyrillic = pages.enText.match(/[А-Яа-яЁё]+/g) ?? [];
  assert.deepEqual(
    cyrillic.filter((word) => word !== "ИИ" && word !== "по" && word !== "делу"),
    [],
    `untranslated Russian in the English page: ${cyrillic.join(", ")}`
  );
});

/* --- self-contained ---------------------------------------------------------- */

test("the only external links are the approved destinations", () => {
  const approved = new Set(
    [
      links.linkedin,
      links.telegram,
      links.instagram,
      links.work.chaijana,
      links.work.alexNeon
    ].map((url) => new URL(url).origin)
  );

  for (const key of ["ru", "en", "notFound"]) {
    for (const [, url] of pages[key].matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
      const { origin } = new URL(url);
      /* Canonical and og:url point at this site's own origin. */
      if (origin.endsWith("ks-design.workers.dev")) continue;
      assert.ok(approved.has(origin), `${key}: unapproved external origin ${origin}`);
    }
  }
});

test("fonts, images and scripts are all served from this origin", async () => {
  for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) {
    assert.ok(url.startsWith("/assets/"), `stylesheet reaches outside dist: ${url}`);
  }
  for (const key of ["ru", "en"]) {
    for (const [, src] of pages[key].matchAll(/<(?:img|script)[^>]+src="([^"]+)"/g)) {
      assert.ok(src.startsWith("/assets/"), `${key}: non-local asset ${src}`);
    }
  }
  /* Every font the stylesheet asks for must exist, or the page silently falls
     back to a system face and the type scale shifts. */
  const fonts = await readdir(join(dist, "assets/fonts"));
  for (const [, url] of css.matchAll(/url\("\/assets\/fonts\/([^"]+)"\)/g)) {
    assert.ok(fonts.includes(url), `missing font file: ${url}`);
  }
});

test("no inline script survives, so the worker can keep script-src 'self'", () => {
  for (const key of ["ru", "en", "notFound"]) {
    const inline = pages[key].match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
    assert.deepEqual(inline, [], `${key}: inline <script> would break the CSP`);
  }
});

/* --- structure and accessibility ---------------------------------------------- */

test("each page has exactly one h1", () => {
  for (const key of ["ru", "en", "notFound"]) {
    const h1s = pages[key].match(/<h1\b/g) ?? [];
    assert.equal(h1s.length, 1, `${key}: expected one h1, found ${h1s.length}`);
  }
});

test("every nav link resolves to a section that exists", () => {
  for (const key of ["ru", "en"]) {
    const html = pages[key];
    const anchors = [...html.matchAll(/<a href="#([a-z-]+)"/g)].map((m) => m[1]);
    assert.ok(anchors.length > 0);
    for (const id of new Set(anchors)) {
      assert.ok(
        html.includes(`id="${id}"`),
        `${key}: nav points at #${id} but no element has that id`
      );
    }
  }
});

test("the portrait exposes one person, not two images", () => {
  for (const key of ["ru", "en"]) {
    const start = pages[key].indexOf('<div class="portrait"');
    const statsAt = pages[key].indexOf('<div class="portrait-stats"');
    assert.ok(start !== -1, `${key}: portrait is missing`);
    assert.ok(statsAt > start, `${key}: stats panel is missing`);

    const portrait = pages[key].slice(start, statsAt);
    const alts = [...portrait.matchAll(/alt="([^"]*)"/g)].map((m) => m[1]);
    assert.equal(alts.length, 2, "expected two frames in the portrait");
    assert.equal(alts.filter(Boolean).length, 1, "exactly one frame may carry alt text");
    assert.match(portrait, /aria-hidden="true"/);
    assert.match(portrait, /role="img"/);
    /* Keyboard users need the swap too. */
    assert.match(portrait, /tabindex="0"/);

    /* The stats live OUTSIDE the role="img" element: descendants of an img
       role are presentational, so numbers inside it would be unreadable to
       assistive tech. The slice above ends where the stats begin, which is
       itself the proof of the ordering. */
    const statsBlock = pages[key].slice(statsAt, pages[key].indexOf("</section>", statsAt));
    for (const stat of content[key].hero.portraitStats) {
      assert.ok(
        statsBlock.includes(stat.label),
        `${key}: stat "${stat.label}" is missing from the panel`
      );
    }
  }
});

test("the carousel buttons have accessible names and start hidden", () => {
  for (const key of ["ru", "en"]) {
    const controls = pages[key].match(
      /<div class="carousel-controls"[\s\S]*?<\/div>/
    )[0];
    assert.match(controls, /hidden/);
    for (const label of [content[key].work.previous, content[key].work.next]) {
      assert.ok(controls.includes(label), `${key}: missing button label ${label}`);
    }
  }
});

test("the page still works with scripts disabled", () => {
  for (const key of ["ru", "en"]) {
    /* Nothing may be hidden in the markup waiting to be revealed: the nav is
       collapsed by the script, not by the document. */
    assert.ok(!/<nav class="site-nav"[^>]*\bdata-collapsed/.test(pages[key]));
    assert.ok(!/<nav class="site-nav"[^>]*\bhidden/.test(pages[key]));
  }
});

test("every grey that carries text clears AA on white", () => {
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const contrast = (hex) => (1.05) / (luminance(hex) + 0.05);

  const token = (name) => {
    const found = css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "i"));
    assert.ok(found, `token ${name} is missing`);
    return found[1];
  };

  /* These three are set on eyebrows, labels, notes, prices and roles. */
  for (const name of ["--ink", "--ink-soft", "--ink-mute"]) {
    const ratio = contrast(token(name));
    assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}:1 on white, below AA`);
  }

  /* --ink-faint is far below AA by design, so it may only ever be ornament:
     the quote glyph and the aria-hidden slash between the language links.
     If it lands on real text this fails and the token has to be darkened. */
  const faintUsers = [
    ...withoutComments(css).matchAll(/([^{}]+)\{[^}]*var\(--ink-faint\)[^}]*\}/g)
  ].map((m) => m[1].trim());
  assert.deepEqual(faintUsers.sort(), [".lang-divider", ".quote-text::before"]);
});

test("the collapsed mobile nav leaves the tab order", () => {
  /* Clipping, opacity and pointer-events hide the closed menu from the eye and
     from the mouse, but leave its links keyboard-focusable — Tab would walk an
     invisible menu. Only `visibility` removes them. */
  const clean = withoutComments(css);
  const closed = clean.match(/\.site-nav\[data-collapsed\]\s*\{[^}]*\}/);
  assert.ok(closed, "the collapsed nav rule is missing");
  assert.match(closed[0], /visibility:\s*hidden/);

  /* `allow-discrete` is what lets the menu animate shut and still drop out of
     the tab order the moment it closes. A delayed transition would look
     equivalent and do nothing: the computed value stays `visible` throughout
     the delay. */
  assert.match(closed[0], /visibility\s+var\(--dur\)\s+allow-discrete/);
  assert.ok(
    !/visibility\s+0s/.test(closed[0]),
    "a delayed visibility transition leaves the links focusable"
  );
});

test("the language links meet the 44 px touch target", () => {
  const rule = withoutComments(css).match(
    /\.lang-switch a,\s*\.lang-current\s*\{[^}]*\}/
  );
  assert.ok(rule, "the language link rule is missing");
  const rems = (property) =>
    Number(rule[0].match(new RegExp(`${property}:\\s*([\\d.]+)rem`))?.[1]);
  assert.ok(rems("min-width") >= 2.75, "language links need a 44 px wide target");
  assert.ok(rems("min-height") >= 2.75, "language links need a 44 px tall target");
});

test("focus is visible and motion can be turned off", () => {
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("the stylesheet layers are concatenated in the declared order", () => {
  /* tokens must precede the layers that consume them, and sections must come
     last or its media queries lose to components.css. */
  const order = [":root {", ".container {", ".btn {", ".hero {"];
  let cursor = -1;
  for (const marker of order) {
    const at = css.indexOf(marker);
    assert.notEqual(at, -1, `stylesheet is missing ${marker}`);
    assert.ok(at > cursor, `stylesheet layer out of order at ${marker}`);
    cursor = at;
  }
});

test("the palette stays fully achromatic", () => {
  /* The design is black-and-white by decision, like the printed menu it
     follows. Any saturated colour sneaking into the stylesheet — a blue link,
     a brand gradient — should trip this before it ships. Neutral greys have
     near-equal RGB channels; 12 covers the slightly warm greys in use. */
  assert.ok(!css.includes("--gradient"), "the old gradient token is back");
  for (const [, hex] of withoutComments(css).matchAll(/#([0-9a-f]{6})\b/gi)) {
    const channels = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const spread = Math.max(...channels) - Math.min(...channels);
    assert.ok(spread <= 12, `#${hex} is a chromatic colour (spread ${spread})`);
  }
});

/* --- delivery ------------------------------------------------------------------ */

test("the 404 page is rendered and excluded from indexing", () => {
  assert.match(pages.notFound, /<meta name="robots" content="noindex">/);
  assert.ok(pages.notFoundText.includes(content.ru.notFound.title));
});

test("robots.txt and the sitemap list both languages", async () => {
  const robots = await readFile(join(dist, "robots.txt"), "utf8");
  const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/[^\s]+\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/<\/loc>/);
  assert.match(sitemap, /<loc>https:\/\/[^<]+\/en\/<\/loc>/);
});

test("the shipped JavaScript stays within its budget", async () => {
  let raw = 0;
  let gzip = 0;
  for (const file of await readdir(join(dist, "assets"))) {
    if (!file.endsWith(".js")) continue;
    const bytes = await readFile(join(dist, "assets", file));
    raw += bytes.length;
    gzip += gzipSync(bytes).length;
  }
  /* The page is static and the script is pure enhancement; if this budget is
     ever hit, the answer is to remove behaviour, not to raise the number. */
  assert.ok(gzip <= 4 * 1024, `JS is ${gzip} B gzipped, over the 4 KB budget`);
  assert.ok(raw <= 12 * 1024, `JS is ${raw} B raw, over the 12 KB ceiling`);
});

test("every image referenced by the pages exists in dist", async () => {
  for (const key of ["ru", "en"]) {
    const referenced = new Set();
    for (const [, value] of pages[key].matchAll(/(?:src|srcset)="([^"]+)"/g)) {
      for (const candidate of value.split(",")) {
        const url = candidate.trim().split(/\s+/)[0];
        if (url.startsWith("/assets/")) referenced.add(url);
      }
    }
    assert.ok(referenced.size > 0);
    for (const url of referenced) {
      const info = await stat(join(dist, url.replace(/^\//, "")));
      assert.ok(info.isFile(), `${key}: ${url} is referenced but not built`);
    }
  }
});
