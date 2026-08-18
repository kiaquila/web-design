#!/usr/bin/env node
/* Verifies the built site: the client's own wording, the multilingual contract,
   self-contained assets, and the accessibility guarantees the design depends
   on. Everything here reads dist/, so it tests what actually ships. */

import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import test, { before } from "node:test";
import { gzipSync } from "node:zlib";

import {
  CAREER_START_YEAR,
  content,
  experienceYears,
  languages,
  links,
  localesAwaitingReview,
  ogImages
} from "../src/content.js";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");

/** English first, because English is what `/` serves. */
const LOCALES = Object.keys(languages);
/** Every rendered document, including the error page that reuses the header. */
const DOCUMENTS = [...LOCALES, "notFound"];

const pages = {};
let css = "";
let ogGenerator = "";
let siteScript = "";
let productionCompose = "";
let productionDockerfile = "";
let productionNginx = "";
let productionEdge = "";
let productionDeploy = "";
let productionServerDeploy = "";
let productionEdgeInstaller = "";

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

/** Where each language's document lands in dist/. */
const documentPath = (lang, file) =>
  languages[lang].path === "/" ? file : join(languages[lang].path.slice(1), file);

before(async () => {
  for (const lang of LOCALES) {
    pages[lang] = await readFile(join(dist, documentPath(lang, "index.html")), "utf8");
  }
  /* The root 404 answers the default language, which is now English. */
  pages.notFound = await readFile(join(dist, "404.html"), "utf8");
  css = await readFile(join(dist, "assets/styles.css"), "utf8");
  ogGenerator = await readFile(join(root, "scripts/make-og.mjs"), "utf8");
  siteScript = await readFile(join(root, "src/js/site.js"), "utf8");
  productionCompose = await readFile(
    join(root, "production/docker-compose.yml"),
    "utf8"
  );
  productionDockerfile = await readFile(
    join(root, "production/Dockerfile"),
    "utf8"
  );
  productionNginx = await readFile(
    join(root, "production/nginx.conf"),
    "utf8"
  );
  productionEdge = await readFile(
    join(root, "production/ks-design.art.conf"),
    "utf8"
  );
  productionDeploy = await readFile(join(root, "production/deploy.sh"), "utf8");
  productionServerDeploy = await readFile(
    join(root, "production/server-deploy.sh"),
    "utf8"
  );
  productionEdgeInstaller = await readFile(
    join(root, "production/install-edge.sh"),
    "utf8"
  );
  for (const key of DOCUMENTS) {
    pages[`${key}Text`] = stripTags(pages[key]);
  }
});

/* --- the client's wording ------------------------------------------------- */

test("the hero carries the approved headline in every language", () => {
  assert.match(pages.enText, /I'll design something that pulls people in/);
  assert.match(pages.esText, /Te hago un diseño que atrapa/);
  /* The subtitle is a single line with no full stop — it is a caption under the
     headline, not a sentence in a paragraph. */
  assert.match(pages.enText, /The kind of work people remember — and come back to(?!\.)/);
  for (const lang of LOCALES) {
    assert.ok(
      !content[lang].hero.subtitle.endsWith("."),
      `${lang}: the hero subtitle must not end in a full stop`
    );
  }
});

test("every process step appears in order", () => {
  for (const lang of LOCALES) {
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
    en: ["USD 500", "USD 1,500", "from USD 25"],
    es: ["USD 500", "USD 1.500", "desde USD 25"]
  };
  for (const [lang, prices] of Object.entries(expected)) {
    for (const price of prices) {
      assert.ok(
        pages[`${lang}Text`].includes(price),
        `${lang}: price ${price} is missing from the page`
      );
    }
    /* Three packages, no more: a fourth card was the menu build, which the
       owner has taken off the price list. */
    assert.equal(content[lang].services.items.length, 3);
  }
});

test("the retired packages are gone from the price list", () => {
  /* Menu layout and dish retouching are no longer sold from this page. The
     Chaijaná case study still describes them as work that was done, which is a
     different claim, so only the service names are checked. */
  for (const lang of LOCALES) {
    for (const item of content[lang].services.items) {
      assert.doesNotMatch(item.name, /меню|menu|menú|блюд|dish|plato/i);
    }
  }
});

test("the years of experience are derived, never hardcoded", () => {
  const years = new Date().getUTCFullYear() - CAREER_START_YEAR;
  assert.equal(experienceYears(), years);
  assert.ok(
    pages.enText.includes(`${years} years of web development experience`),
    `expected the page to state ${years} years`
  );
  /* A literal "9" in the source would pass today and lie next January. */
  for (const lang of LOCALES) {
    const yearsStat = content[lang].hero.portraitStats[0];
    assert.equal(yearsStat.value, "%YEARS%");
  }
});

test("the hover panel carries only the sourced experience claim", () => {
  for (const lang of LOCALES) {
    const stats = content[lang].hero.portraitStats;
    assert.equal(stats.length, 1, `${lang}: the panel must carry one sourced claim`);
    assert.equal(stats[0].value, "%YEARS%");
    const panel = pages[lang].match(/<div class="portrait-stats">[\s\S]*?<\/div>\s*<\/div>/)[0];
    assert.doesNotMatch(panel, /<span class="stat-label"><\/span>/);
  }
});

test("placeholder testimonials stay out of the published pages", () => {
  /* Kind Words remains in the content model for later client-approved copy,
     but a todo block must never render in a customer-facing build. */
  for (const lang of LOCALES) {
    const block = content[lang].kindWords;
    if (!block.todo) {
      assert.ok(
        !pages[`${lang}Text`].includes("TODO"),
        `${lang}: kindWords is no longer marked todo but still renders TODO text`
      );
      continue;
    }
    assert.ok(block.items.every((item) => item.quote.startsWith("TODO")));
    assert.doesNotMatch(pages[lang], /kind-words|TODO:/);
  }
});

/* --- one meaning per section ------------------------------------------------ */

test("each section is opened by its heading alone", () => {
  /* The label above the heading and the lead paragraph under it repeated what
     the heading already said, so a section head now holds one element: the
     heading, plus the carousel arrows on the work slide. */
  for (const lang of LOCALES) {
    assert.doesNotMatch(pages[lang], /class="eyebrow"/);
    assert.doesNotMatch(pages[lang], /class="section-intro"/);
    for (const [, head] of pages[lang].matchAll(
      /<div class="section-head">([\s\S]*?)<\/div>\s*<(?:ul|ol)/g
    )) {
      const paragraphs = head.match(/<p\b/g) ?? [];
      assert.deepEqual(paragraphs, [], `${lang}: a section head still carries copy`);
    }
  }
  /* The one place a lead paragraph survives is the error page, which has no
     heading hierarchy to explain itself with. */
  assert.match(pages.notFound, /class="section-intro"/);
});

test("the only call to action per screen is the hero's", () => {
  /* "Start a project" appeared in the header, the hero and the services head at
     once. The header now offers Contact and the services head offers nothing,
     so the button appears exactly once on the page. */
  for (const lang of LOCALES) {
    const cta = content[lang].hero.primary;
    const occurrences = pages[`${lang}Text`].split(cta).length - 1;
    assert.equal(occurrences, 1, `${lang}: "${cta}" appears ${occurrences} times`);
    assert.doesNotMatch(pages[lang], /class="btn btn-solid section-cta"/);
  }
});

test("Contact is reachable at every width and duplicated at none", () => {
  /* Above 900px the solid header button carries Contact and the nav row hides
     its own copy; below it the button is hidden and the collapsed menu carries
     it. The two rules are mirrors, so exactly one is visible at any width. */
  const clean = withoutComments(css);
  assert.match(
    clean,
    /@media \(max-width: 899px\) \{\s*\.header-cta \{\s*display: none;/
  );
  assert.match(
    clean,
    /@media \(min-width: 900px\) \{\s*\.nav-contact \{\s*display: none;/
  );
  for (const lang of LOCALES) {
    assert.ok(pages[lang].includes('<li class="nav-contact">'));
    assert.ok(
      pages[lang].includes(
        `<a class="btn btn-solid btn-compact header-cta" href="#contact">${content[lang].nav.contact}</a>`
      ),
      `${lang}: the header button must lead to the contact section`
    );
  }
});

/* --- the multilingual contract --------------------------------------------- */

test("English is the default and Spanish is the prefixed second locale", () => {
  assert.deepEqual(Object.keys(languages), ["en", "es"]);
  assert.deepEqual(localesAwaitingReview, []);
  assert.equal(languages.en.path, "/");
  assert.equal(languages.es.path, "/es/");
  assert.match(pages.en, /<html lang="en">/);
  assert.match(pages.es, /<html lang="es">/);
});

test("each page declares its own language and links the others", () => {
  for (const key of LOCALES) {
    assert.match(pages[key], /<link rel="alternate" hreflang="en" href="[^"]+\/">/);
    assert.match(pages[key], /<link rel="alternate" hreflang="es" href="[^"]+\/es\/">/);
    /* x-default must be the page an unmatched visitor gets, which is now the
       English document at the origin root. */
    assert.match(pages[key], /<link rel="alternate" hreflang="x-default" href="[^"]+\/">/);
  }
  assert.match(pages.en, /<link rel="canonical" href="[^"]+\/">/);
  assert.match(pages.es, /<link rel="canonical" href="[^"]+\/es\/">/);
  for (const key of DOCUMENTS) {
    assert.match(pages[key], /https:\/\/ks-design\.art\//);
    assert.doesNotMatch(pages[key], /ks\.ks-design\.workers\.dev/);
  }
});

test("the language switch is plain links, so it works without scripts", () => {
  const cell = (lang, code) => {
    const label = content[lang].langSwitch[code];
    return code === lang
      ? `<span class="lang-current" aria-current="true">${label}</span>`
      : `<a href="${languages[code].path}" hreflang="${code}" lang="${code}">${label}</a>`;
  };
  for (const lang of LOCALES) {
    for (const code of LOCALES) {
      assert.ok(
        pages[lang].includes(cell(lang, code)),
        `${lang}: the switch is missing its ${code} cell`
      );
    }
    /* Exactly one cell may claim to be the current language. */
    assert.equal((pages[lang].match(/aria-current="true"/g) ?? []).length, 1);
  }
});

test("no language leaks into another page's document", () => {
  /* Cyrillic anywhere means a key was never translated. Brand names are Latin,
     so this is a safe blanket check — the one exception is the Alex Neon
     landing's own Russian title, quoted as the name of the thing that was
     redesigned. */
  for (const lang of LOCALES) {
    const cyrillic = pages[`${lang}Text`].match(/[А-Яа-яЁё]+/g) ?? [];
    assert.deepEqual(
      cyrillic.filter((word) => !["ИИ", "по", "делу"].includes(word)),
      [],
      `untranslated Russian in the ${lang} page: ${cyrillic.join(", ")}`
    );
  }
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

  for (const key of DOCUMENTS) {
    for (const [, url] of pages[key].matchAll(/(?:href|src)="(https?:\/\/[^"]+)"/g)) {
      const { origin } = new URL(url);
      /* Canonical and og:url point at this site's own origin. */
      if (origin === "https://ks-design.art") continue;
      assert.ok(approved.has(origin), `${key}: unapproved external origin ${origin}`);
    }
  }
});

test("fonts, images and scripts are all served from this origin", async () => {
  for (const [, url] of css.matchAll(/url\("([^"]+)"\)/g)) {
    assert.ok(url.startsWith("/assets/"), `stylesheet reaches outside dist: ${url}`);
  }
  for (const key of LOCALES) {
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
  for (const key of DOCUMENTS) {
    const inline = pages[key].match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
    assert.deepEqual(inline, [], `${key}: inline <script> would break the CSP`);
  }
});

/* --- structure and accessibility ---------------------------------------------- */

test("each page has exactly one h1", () => {
  for (const key of DOCUMENTS) {
    const h1s = pages[key].match(/<h1\b/g) ?? [];
    assert.equal(h1s.length, 1, `${key}: expected one h1, found ${h1s.length}`);
  }
});

test("every in-page anchor resolves to a section that exists", () => {
  /* The 404 page is included on purpose: it reuses the site header, and a bare
     `#work` there points at an id the error page does not have, so the whole
     navigation would silently do nothing. Its anchors must be qualified with
     the home path instead. */
  for (const key of DOCUMENTS) {
    const html = pages[key];
    const anchors = [...html.matchAll(/<a[^>]+href="#([a-z-]+)"/g)].map((m) => m[1]);
    for (const id of new Set(anchors)) {
      assert.ok(
        html.includes(`id="${id}"`),
        `${key}: a link points at #${id} but no element on that page has the id`
      );
    }
  }

  /* The landing pages must still carry the real in-page navigation. */
  for (const key of LOCALES) {
    assert.ok(
      [...pages[key].matchAll(/<a[^>]+href="#([a-z-]+)"/g)].length >= 4,
      `${key}: expected the section anchors to be in-page links`
    );
  }
  assert.match(pages.notFound, /href="\/#work"/);
});

test("the portrait exposes one person, not two images", () => {
  for (const key of LOCALES) {
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
        statsBlock.includes(stat.label ?? stat.value),
        `${key}: stat "${stat.label ?? stat.value}" is missing from the panel`
      );
    }
  }
});

test("the carousel buttons have accessible names and start hidden", () => {
  for (const key of LOCALES) {
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
  for (const key of LOCALES) {
    /* Nothing may be hidden in the markup waiting to be revealed: the nav is
       collapsed by the script, not by the document. */
    assert.ok(!/<nav class="site-nav"[^>]*\bdata-collapsed/.test(pages[key]));
    assert.ok(!/<nav class="site-nav"[^>]*\bhidden/.test(pages[key]));
  }
});

test("the footer is one horizontal row under the contact band", () => {
  /* Copyright left, location centred, icons right. The outer columns are `1fr`
     so the middle one is centred on the page rather than on the copyright, and
     the rule that used to sit on top is gone — the black band above it already
     divides the page. */
  const clean = withoutComments(css);
  const rule = clean.match(/\.footer-inner \{[^}]*\}/);
  assert.ok(rule, "the footer rule is missing");
  assert.match(rule[0], /grid-template-columns: 1fr auto 1fr/);
  assert.ok(
    !/border-top/.test(rule[0]),
    "the footer must not carry a rule between itself and the band"
  );
  /* The error page has no band above it, so there the hairline stays. */
  assert.match(
    clean,
    /main \+ \.site-footer \.footer-inner \{[^}]*border-top/
  );
  /* And the contact slide must not reserve a spacer row that pushes the footer
     away from the band it belongs under, nor leave a field of white below the
     footer: the pair closes the page at its bottom edge. */
  const contact = clean.match(/(?:^|\})\s*\.contact \{[^}]*\}/)[0];
  assert.doesNotMatch(contact, /1fr/);
  assert.match(contact, /align-content:\s*end/);
});

test("the work previews are shown at the screenshots' own proportion", async () => {
  /* Every card image in assets/work is 1200×750. The card must neither crop it
     nor stretch it, so the frame sets no height and no object-fit — height
     follows width, and the ratio is the file's own. */
  const shots = await readdir(join(dist, "assets/work"));
  assert.ok(shots.length > 0);

  const clean = withoutComments(css);
  const rule = clean.match(/\.work-shot img \{[^}]*\}/);
  assert.ok(rule, "the work shot rule is missing");
  assert.match(rule[0], /height:\s*auto/);
  assert.ok(!/object-fit/.test(rule[0]), "a fitted image is a cropped image");
  assert.ok(
    !/aspect-ratio|min-height|max-height/.test(rule[0]),
    "the shot must take its proportion from the file, not from CSS"
  );

  /* On the deck the slide still fits one screen — by narrowing the cards, never
     by shortening them out of ratio. */
  assert.match(clean, /\.work-track \{\s*max-width: calc\(\(100svh/);
});

test("switching language keeps the reader in the same section", () => {
  /* The hrefs in the markup stay the plain locale paths — the switch is a link
     first — and the script appends the current slide's id when the reader
     reaches for it. Binding to pointerdown and focusin as well as click is what
     makes a middle-click and a keyboard activation carry the section too, and
     what keeps it working in a tab whose animation frames are suspended. */
  for (const lang of LOCALES) {
    for (const other of LOCALES.filter((code) => code !== lang)) {
      assert.ok(
        pages[lang].includes(`<a href="${languages[other].path}"`),
        `${lang}: the switch must ship the plain ${other} path`
      );
    }
    assert.doesNotMatch(pages[lang], /<a href="\/[^"]*#[a-z-]+" hreflang=/);
  }
  assert.match(siteScript, /const langSwitch = document\.querySelector\("\.lang-switch"\)/);
  assert.match(
    siteScript,
    /for \(const type of \["pointerdown", "focusin", "click"\]\)/
  );
  /* And the arrival: the browser's own fragment scroll is animated by the
     root's smooth behaviour, so the landing is repeated without it. */
  assert.match(siteScript, /root\.style\.scrollBehavior = "auto";/);
  assert.match(siteScript, /addEventListener\("load", land\);/);
  /* The fragment is matched against the page's own slides, never handed to a
     selector, so a hand-typed hash cannot become one. */
  assert.ok(
    !/querySelector\(location\.hash/.test(siteScript),
    "the fragment must not be used as a selector"
  );
});

test("the process numerals answer a pointer", () => {
  /* A light hover on the chapter numeral, layered on top of the elongation it
     already carries so the figure grows instead of un-stretching. Reduced
     motion kills the transition wholesale in base.css. */
  const clean = withoutComments(css);
  assert.match(clean, /\.step-number \{[^}]*transition:\s*transform/);
  const hover = clean.match(
    /\.step:hover \.step-number,\s*\.step:focus-within \.step-number \{[^}]*\}/
  );
  assert.ok(hover, "the step hover rule is missing");
  assert.match(hover[0], /transform:\s*scaleY\(1\.18\) scale\(1\.0[0-9]\)/);
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

  /* These three are set on labels, notes, prices and roles. */
  for (const name of ["--ink", "--ink-soft", "--ink-mute"]) {
    const ratio = contrast(token(name));
    assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}:1 on white, below AA`);
  }

  /* --ink-faint is far below AA by design, so it may only ever be ornament:
     the quote glyph and the hairline between the language cells. If it lands on
     real text this fails and the token has to be darkened. */
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

  /* Visibility must not be transitioned at all. Every way of animating it —
     a delay, or `allow-discrete` — holds the computed value at `visible` until
     the animation ends, which leaves a window where Shift+Tab reaches a menu
     that is already invisible. */
  const transition = closed[0].match(/transition:[^;]*/)?.[0] ?? "";
  assert.ok(
    !/visibility/.test(transition),
    `visibility must not be transitioned, found: ${transition.trim()}`
  );
});

test("the toggle only appears once the script can open the menu", () => {
  /* Without JavaScript `data-collapsed` is never set, so a toggle shown by the
     media query alone would be a dead button beside a menu it cannot open. */
  const clean = withoutComments(css);
  assert.match(clean, /\.site-nav\[data-collapsed\]\s*~\s*\.nav-toggle\s*\{[^}]*display:\s*flex/);
  assert.ok(
    !/(^|\})\s*\.nav-toggle\s*\{[^}]*display:\s*flex/.test(clean),
    "the toggle must not be shown by the breakpoint alone"
  );
});

test("crossing into the mobile breakpoint preserves keyboard focus", () => {
  /* `event.matches` is false when the viewport narrows below 900px. The
     listener must still close through the focus-aware path, while widening
     must not move focus from a visible nav link to the now-hidden toggle. */
  assert.match(
    siteScript,
    /addEventListener\("change",\s*\(event\)\s*=>\s*\{[\s\S]*?setOpen\(false,\s*!event\.matches\);/
  );
});

test("widening from a focused menu toggle moves focus into the nav", () => {
  /* The toggle becomes display:none above 900px. If it owns focus during the
     transition, the first visible nav link must receive focus; a nav link
     that already owns focus is deliberately left alone. */
  assert.match(
    siteScript,
    /if\s*\(event\.matches\s*&&\s*document\.activeElement\s*===\s*toggle\)\s*\{\s*nav\.querySelector\("a"\)\?\.focus\(\);/s
  );
});

test("every touch target clears 44 px", () => {
  /* An earlier version of this test checked three controls and passed while
     the nav links sat at 33 px and the header CTA at 38 px, so the list is
     now explicit. Height is asserted everywhere; width only where the control
     is an icon or a couple of characters and would otherwise be tiny. Text
     buttons and nav links take their width from the label. */
  const clean = withoutComments(css);
  const rules = [
    [/\.lang-switch a,\s*\.lang-current\s*\{[^}]*\}/, "both"],
    [/\.footer-social a\s*\{[^}]*\}/, "both"],
    [/\.carousel-btn\s*\{[^}]*\}/, "both"],
    [/\.brand\s*\{[^}]*\}/, "height"],
    [/\.site-nav a\s*\{[^}]*\}/, "height"],
    [/\.btn-compact\s*\{[^}]*\}/, "height"],
    [/(?:^|\})\s*\.btn\s*\{[^}]*\}/, "height"]
  ];

  for (const [selector, axes] of rules) {
    const rule = clean.match(selector);
    assert.ok(rule, `missing rule for ${selector}`);
    const name = rule[0].split("{")[0].trim();
    const size = (property) => {
      const rems = rule[0].match(new RegExp(`${property}:\\s*([\\d.]+)rem`))?.[1];
      return rems ? Number(rems) : 0;
    };
    assert.ok(
      size("min-height") >= 2.75 || size("height") >= 2.75,
      `${name} needs a 44 px tall target`
    );
    if (axes === "both") {
      assert.ok(
        size("min-width") >= 2.75 || size("width") >= 2.75,
        `${name} needs a 44 px wide target`
      );
    }
  }
});


test("focus is visible and motion can be turned off", () => {
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  const clean = withoutComments(css);
  assert.match(
    clean,
    /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.step:hover,\s*\.step:focus-within\s*\{\s*transform:\s*none/
  );
  assert.match(
    clean,
    /\.step:hover \.step-number,\s*\.step:focus-within \.step-number\s*\{\s*transform:\s*scaleY\(1\.18\)/
  );
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

test("each language gets its own 404 page", async () => {
  /* Workers Static Assets walks up to the nearest 404.html, so a visitor
     hitting a missing /es/ URL must not be answered in English. */
  for (const lang of LOCALES) {
    const page = await readFile(join(dist, documentPath(lang, "404.html")), "utf8");
    assert.match(page, /<meta name="robots" content="noindex">/);
    assert.match(page, new RegExp(`<html lang="${lang}">`));
    assert.ok(
      stripTags(page).includes(content[lang].notFound.title),
      `${lang}: the 404 page is not in its own language`
    );
  }
});

test("each language gets its own social card", async () => {
  /* Sharing one page with a card carrying another language's headline is a
     mixed-language preview. */
  assert.equal(new Set(Object.values(ogImages)).size, LOCALES.length);
  for (const lang of LOCALES) {
    assert.match(
      pages[lang],
      new RegExp(`og:image" content="[^"]+/assets/${ogImages[lang]}"`)
    );
    const info = await stat(join(dist, "assets", ogImages[lang]));
    assert.ok(info.isFile(), `${ogImages[lang]} is referenced but not built`);
  }
});

test("the social-card renderer embeds both Manrope subsets", () => {
  /* The Cyrillic file contains only isolated Latin glyphs. Without the Latin
     face, the English and Spanish cards and the `ks-design` wordmark silently
     use a system fallback even though the Russian headline appears correct. */
  assert.match(ogGenerator, /assets\/fonts\/manrope-cyrillic\.woff2/);
  assert.match(ogGenerator, /assets\/fonts\/manrope-latin\.woff2/);
  assert.match(ogGenerator, /unicode-range:\s*U\+0301,\s*U\+0400-045F/);
  assert.match(ogGenerator, /unicode-range:\s*U\+0000-00FF/);
});

test("robots.txt and the sitemap list every language", async () => {
  const robots = await readFile(join(dist, "robots.txt"), "utf8");
  const sitemap = await readFile(join(dist, "sitemap.xml"), "utf8");
  assert.match(robots, /Sitemap: https:\/\/ks-design\.art\/sitemap\.xml/);
  for (const lang of LOCALES) {
    assert.ok(
      sitemap.includes(`<loc>https://ks-design.art${languages[lang].path}</loc>`),
      `the sitemap is missing ${languages[lang].path}`
    );
  }
});

test("production runs as an isolated, hardened container", () => {
  assert.match(productionCompose, /^name:\s*ks-design-portfolio/m);
  assert.match(productionCompose, /127\.0\.0\.1:3100:8080/);
  assert.match(productionCompose, /read_only:\s*true/);
  assert.match(productionCompose, /cap_drop:\s*\n\s*- ALL/);
  assert.match(productionCompose, /no-new-privileges:true/);
  assert.doesNotMatch(productionCompose, /network_mode:\s*host/);
  assert.doesNotMatch(productionCompose, /capsule-zero/i);

  assert.match(productionDockerfile, /^USER nginx$/m);
  assert.equal(
    productionDockerfile.match(/^FROM .+@sha256:[0-9a-f]{64}/gm)?.length,
    2,
    "both production base images must be pinned by digest"
  );
  assert.match(productionNginx, /listen 8080;/);
  assert.match(productionNginx, /error_page 404 \/404\.html;/);
  assert.match(productionNginx, /Content-Security-Policy/);

  assert.match(productionEdge, /server_name ks-design\.art;/);
  assert.match(productionEdge, /server_name www\.ks-design\.art;/);
  assert.match(productionEdge, /proxy_pass http:\/\/127\.0\.0\.1:3100;/);
  assert.doesNotMatch(productionEdge, /127\.0\.0\.1:(?:3000|8080|4433)/);

  assert.match(productionDeploy, /git .* archive --format=tar/);
  assert.match(productionDeploy, /tar -C "\$payload_dir" -cf - \./);
  assert.match(productionDeploy, /tar -xf - -C \$remote_stage/);
  assert.doesNotMatch(productionDeploy, /"\$website_dir\/" "\$target:/);
  assert.match(productionDeploy, /KS_DESIGN_EXPECTED_REVISION/);
  assert.match(productionDeploy, /"\$target" == "local"/);
  assert.match(productionDeploy, /\/usr\/local\/sbin\/ks-production-deploy/);
  assert.match(productionServerDeploy, /\.State\.Health\.Status/);
  assert.match(productionServerDeploy, /org\.opencontainers\.image\.revision/);
  assert.match(productionServerDeploy, /flock --exclusive 9/);
  assert.match(productionEdgeInstaller, /had_live_tls=false/);
  assert.match(productionEdgeInstaller, /backup_ready=false/);
  assert.match(productionEdgeInstaller, /restore_live_edge/);
  assert.match(productionEdgeInstaller, /trap restore_live_edge EXIT/);
});

test("the retired /en/ prefix still resolves for anyone holding the old link", () => {
  /* English moved from /en/ to the origin root. The prefix was public, so it
     redirects permanently rather than answering 404. */
  assert.match(productionNginx, /location\s*=\s*\/en\/?\s*\{\s*return 301 \//);
});

test("each locale prefix serves its own error page", () => {
  for (const lang of LOCALES.filter((code) => code !== "en")) {
    assert.ok(
      productionNginx.includes(`error_page 404 /${lang}/404.html;`),
      `nginx does not answer /${lang}/ misses in ${lang}`
    );
  }
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
  for (const key of LOCALES) {
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
