import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { articleImages, sessionImages } from "../src/data/media.mjs";

import { buildRoutes } from "../src/routes.mjs";
import { categories, sessionsById } from "../src/data/catalog-categories.mjs";
import { aliasSections, articleSections } from "../src/data/articles.mjs";
import {
  editorialPages,
  faq,
  news,
  press,
  testimonials
} from "../src/data/pages.mjs";
import { primaryNav, footerNav } from "../src/data/navigation.mjs";

const routes = buildRoutes();
const byPath = new Map(routes.map((route) => [route.path, route]));

test("every route path is unique and normalised", () => {
  assert.equal(byPath.size, routes.length, "duplicate route paths");
  for (const route of routes) {
    assert.ok(route.path.startsWith("/"), `not absolute: ${route.path}`);
    assert.ok(route.path.endsWith("/"), `missing trailing slash: ${route.path}`);
    assert.ok(route.html.startsWith("<!doctype html>"), route.path);
  }
});

test("catalogue is fully migrated", () => {
  assert.equal(categories.length, 18, "18 catalogue sections expected");
  assert.equal(sessionsById.size, 256, "256 unique sessions expected");

  assert.ok(byPath.has("/catalog/"));
  for (const category of categories) {
    assert.ok(
      byPath.has(`/catalog/${category.slug}/`),
      `missing category page: ${category.slug}`
    );
    assert.ok(category.sessions.length > 0, `empty category: ${category.slug}`);
  }
  for (const session of sessionsById.values()) {
    assert.ok(byPath.has(session.path), `missing session page: ${session.path}`);
    assert.ok(session.title.length > 0, `session without title: ${session.id}`);
    assert.ok(
      session.description.length > 0,
      `session without description: ${session.path}`
    );
  }
});

test("every session appears in at least one category", () => {
  const listed = new Set(
    categories.flatMap((category) => category.sessions.map((s) => s.id))
  );
  for (const id of sessionsById.keys()) {
    assert.ok(listed.has(id), `session ${id} is not reachable from a category`);
  }
});

test("articles are fully migrated", () => {
  const total = articleSections.reduce(
    (sum, section) => sum + section.articles.length,
    0
  );
  assert.equal(articleSections.length, 7);
  assert.equal(total, 106, "106 articles expected");

  assert.ok(byPath.has("/stati/"));
  for (const section of articleSections) {
    if (!section.standalone) {
      assert.ok(
        byPath.has(`/stati/${section.slug}/`),
        `missing section page: ${section.slug}`
      );
    }
    for (const article of section.articles) {
      assert.ok(byPath.has(article.path), `missing article: ${article.path}`);
      assert.ok(article.body.length > 0, `empty article: ${article.path}`);
    }
  }
});

test("editorial, legal and help pages are migrated", () => {
  assert.equal(editorialPages.length, 16);
  for (const page of editorialPages) {
    assert.ok(byPath.has(page.path), `missing editorial page: ${page.path}`);
    assert.ok(page.body.length > 0, `empty page: ${page.path}`);
  }
  for (const path of [
    "/avtor/",
    "/avtor/kontakty/",
    "/avtor/pressa-i-tv/",
    "/info/faq/",
    "/otzyvy/",
    "/news/"
  ]) {
    assert.ok(byPath.has(path), `missing page: ${path}`);
  }
});

test("news, FAQ, press and testimonials are migrated", () => {
  assert.equal(news.length, 6);
  assert.equal(faq.length, 10);
  assert.equal(press.length, 8);
  assert.equal(testimonials.length, 84);
  for (const item of news) {
    assert.ok(byPath.has(item.path), `missing news page: ${item.path}`);
  }
});

test("every navigation destination resolves to a built page", () => {
  const targets = [
    ...primaryNav.map((entry) => entry.href),
    ...primaryNav.flatMap((entry) => (entry.items ?? []).map((i) => i.href)),
    ...footerNav.flatMap((group) => group.items.map((i) => i.href))
  ];
  for (const href of targets) {
    assert.ok(byPath.has(href), `navigation points at a missing page: ${href}`);
  }
});

test("alternative URLs of the original site are preserved", () => {
  /* A session was served under every category it belongs to. */
  for (const category of categories) {
    for (const session of category.sessions) {
      const alias = `/catalog/${category.slug}/${session.id}/`;
      assert.ok(byPath.has(alias), `lost catalogue URL: ${alias}`);
    }
  }

  /* Nine extra article sections plus their articles. */
  for (const alias of aliasSections) {
    assert.ok(
      byPath.has(`/stati/${alias.slug}/`),
      `lost section URL: /stati/${alias.slug}/`
    );
    for (const entry of alias.articles) {
      assert.ok(byPath.has(entry.alias), `lost article URL: ${entry.alias}`);
    }
  }

  for (const path of [
    "/psihologicheskoe-konsultirovanie/",
    "/info/",
    "/news/2018/",
    "/news/2020/",
    "/news/2022/",
    "/news/2023/",
    "/news/2024/",
    "/news/na_moem_sayte_dostupna_oplata_inostrannymi_bankovskimi_kartami_visa_i_mastercard/"
  ]) {
    assert.ok(byPath.has(path), `lost URL: ${path}`);
  }
  for (const item of press) {
    assert.ok(byPath.has(item.href), `lost press URL: ${item.href}`);
  }
});

test("every page declares exactly one canonical URL", () => {
  for (const route of routes) {
    const found = route.html.match(/<link rel="canonical" href="([^"]+)"/g);
    assert.equal(found?.length, 1, `canonical missing on ${route.path}`);
  }
});

test("every referenced image file exists", () => {
  const assets = join(import.meta.dirname, "..", "assets");
  const referenced = new Set();
  for (const route of routes) {
    for (const match of route.html.matchAll(/src="(\/assets\/[^"]+)"/g)) {
      referenced.add(match[1]);
    }
  }
  const missing = [...referenced]
    /* nav.js is copied from src/client at build time, not from assets/. */
    .filter((path) => path !== "/assets/nav.js")
    .filter((path) => !existsSync(join(assets, path.replace("/assets/", ""))));
  assert.deepEqual(missing, [], "referenced assets are missing on disk");

  /* Photography is the point of this design: most sessions must have a cover. */
  const covered = Object.keys(sessionImages).length;
  assert.ok(
    covered >= 250,
    `only ${covered} of ${sessionsById.size} sessions have a cover`
  );
  assert.ok(Object.keys(articleImages).length >= 100);
});

test("internal links in rendered HTML resolve", () => {
  const missing = new Set();
  const legacyHosts = new Set();
  for (const route of routes) {
    for (const match of route.html.matchAll(/href="([^"]+)"/g)) {
      if (
        /^https?:\/\/(?:alf\.mwi\.me|gipnos\.alphacentr\.ru)(?:\/|$)/.test(
          match[1]
        )
      ) {
        legacyHosts.add(`${match[1]} (from ${route.path})`);
      }
    }
    for (const match of route.html.matchAll(/href="(\/[^"#?]*)"/g)) {
      const href = match[1];
      if (href.startsWith("/assets/")) continue;
      if (href === "/sitemap.xml" || href === "/robots.txt") continue;
      if (!byPath.has(href)) missing.add(`${href} (from ${route.path})`);
    }
  }
  assert.deepEqual(
    [...legacyHosts],
    [],
    "legacy Alpha-Centr links must be local"
  );
  assert.deepEqual([...missing], [], "dangling internal links");
});

test("mobile navigation uses the CSS breakpoint", () => {
  const sourceRoot = join(import.meta.dirname, "..", "src");
  const nav = readFileSync(join(sourceRoot, "client", "nav.js"), "utf8");
  const layout = readFileSync(join(sourceRoot, "styles", "layout.css"), "utf8");

  assert.match(nav, /matchMedia\("\(max-width: 960px\)"\)/);
  assert.match(layout, /@media \(max-width: 960px\)/);
});

test("static assets pass through the security-header Worker", () => {
  const wrangler = JSON.parse(
    readFileSync(join(import.meta.dirname, "..", "wrangler.json"), "utf8")
  );

  assert.equal(wrangler.assets.run_worker_first, true);
});
