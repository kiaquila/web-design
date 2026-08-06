import { html, raw } from "../lib/html.mjs";
import { site } from "../data/site.mjs";
import { masthead } from "./header.mjs";
import { colophon } from "./footer.mjs";

/**
 * Wrap page content in the document shell.
 *
 * @param {object} page
 * @param {string} page.title       document title, without the brand suffix
 * @param {string} page.description meta description
 * @param {string} page.path        output path, used for nav highlighting
 * @param {string} [page.canonical] canonical path when this route is an alias
 * @param {string} [page.navId]     primary-nav entry to mark as current
 * @param {import("../lib/html.mjs").raw} page.body
 */
export function layout(page) {
  const title =
    page.path === "/"
      ? `${site.name} — ${site.tagline}`
      : `${page.title} — ${site.name}`;

  return `<!doctype html>
<html lang="ru">
${String(
    html`<head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      <meta name="description" content="${page.description}" />
      <link rel="canonical" href="${site.origin}${page.canonical ?? page.path}" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="${site.name}" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${page.description}" />
      <meta property="og:url" content="${site.origin}${page.path}" />
      <meta property="og:locale" content="ru_RU" />
      <meta name="theme-color" content="#efede7" />
      <link rel="preload" as="font" type="font/woff2"
        href="/assets/fonts/inter-cyrillic.woff2" crossorigin />
      <link rel="stylesheet" href="/assets/styles.css" />
      <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
      <script src="/assets/nav.js" defer></script>
    </head>`
  )}
<body>
${String(
    html`<a class="skip-link" href="#main">Перейти к основному содержанию</a>
      <div class="page">
        ${masthead(page)}
        <main id="main">${page.body}</main>
        ${colophon()}
      </div>`
  )}
</body>
</html>
`;
}

/** Breadcrumb trail. `trail` is a list of `{ label, href }`; the last item is
    rendered as plain text because it is the current page. */
export function crumbs(trail) {
  if (!trail?.length) return raw("");
  return html`<nav class="crumbs shell" aria-label="Хлебные крошки">
    <ol>
      <li><a href="/">Главная</a></li>
      ${trail.map((item, index) =>
        index === trail.length - 1
          ? html`<li aria-current="page">${item.label}</li>`
          : html`<li><a href="${item.href}">${item.label}</a></li>`
      )}
    </ol>
  </nav>`;
}
