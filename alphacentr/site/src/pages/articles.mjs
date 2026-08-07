import { blocks, each, html } from "../lib/html.mjs";
import { crumbs, layout } from "../templates/layout.mjs";
import { frame, pageHead, section } from "../templates/blocks.mjs";
import {
  aliasSections,
  articleSections,
  excerpt,
  titleOnlyArticles
} from "../data/articles.mjs";
import { articleImage } from "../data/media.mjs";

/** First article in a section that has artwork represents it in listings. */
function sectionImage(item) {
  for (const article of item.articles) {
    const image = articleImage(article.path);
    if (image) return image;
  }
  return null;
}

function sectionChips(currentSlug) {
  return html`<ul class="chips">
    <li>
      <a class="chip" href="/stati/" ${!currentSlug ? html`aria-current="true"` : ""}
        >Все разделы</a
      >
    </li>
    ${each(
      articleSections,
      (item) => html`<li>
        <a
          class="chip"
          href="/stati/${item.slug}/"
          ${item.slug === currentSlug ? html`aria-current="true"` : ""}
          >${item.name}</a
        >
      </li>`
    )}
  </ul>`;
}

function articleList(articles, { showSection = false } = {}) {
  return html`<ul class="article-list">
    ${each(
      articles,
      (article) => html`<li class="article-row">
        <span class="article-row__kicker"
          >${showSection ? article.section.name : "Статья"}</span
        >
        <div>
          <h3 class="article-row__title">
            <a href="${article.path}">${article.title}</a>
          </h3>
          <p class="article-row__text">${excerpt(article)}</p>
        </div>
      </li>`
    )}
  </ul>`;
}

function articlesIndexRoute() {
  const total = articleSections.reduce(
    (sum, item) => sum + item.articles.length,
    0
  );

  const body = html`${crumbs([{ label: "Статьи" }])}
    ${pageHead({
      eyebrow: "Журнал",
      title: "Статьи о гипнозе и психологии",
      lede: `${total} материалов автора о том, как устроен транс, что делает гипнотерапия и как выбрать подходящий сеанс.`
    })}
    ${section({
      body: html`${sectionChips(null)}
        <div class="grid grid--2" style="margin-top: var(--space-xl)">
          ${each(
            articleSections,
            (item) => html`<article class="card">
              ${frame(sectionImage(item), item.name, { ratio: "landscape" })}
              <h2 class="card__title" style="margin-top: var(--space-2xs)">
                <a href="/stati/${item.slug}/">${item.name}</a>
              </h2>
              <p class="card__text">${item.intro}</p>
              ${!item.standalone
                ? html`<p class="card__text">
                    <strong>${item.articles.length}</strong> материалов
                  </p>`
                : ""}
            </article>`
          )}
        </div>`
    })}`;

  return {
    path: "/stati/",
    html: layout({
      path: "/stati/",
      navId: "articles",
      title: "Статьи",
      description:
        "Статьи практикующего гипнолога Елены Вальяк о гипнозе, самогипнозе, " +
        "тревоге, зависимостях и саморазвитии.",
      body
    })
  };
}

/** A section that has children gets its own index page. */
function sectionRoute(item) {
  const path = `/stati/${item.slug}/`;
  const body = html`${crumbs([
    { label: "Статьи", href: "/stati/" },
    { label: item.name }
  ])}
    ${pageHead({ eyebrow: "Раздел", title: item.name, lede: item.intro })}
    ${section({
      body: html`${sectionChips(item.slug)}
        <div style="margin-top: var(--space-lg)">
          ${articleList(item.articles.map((article) => ({ ...article, section: item })))}
        </div>`
    })}`;

  return {
    path,
    html: layout({
      path,
      navId: "articles",
      title: item.name,
      description: item.intro || `${item.name} — статьи Елены Вальяк.`,
      body
    })
  };
}

function articleRoute(article, item, path = article.path) {
  const related = item.articles
    .filter((other) => other.path !== article.path)
    .slice(0, 6);

  const body = html`${crumbs([
    { label: "Статьи", href: "/stati/" },
    ...(item.standalone ? [] : [{ label: item.name, href: `/stati/${item.slug}/` }]),
    { label: article.title }
  ])}
    <div class="shell article">
      <article>
        <span class="eyebrow">${item.name}</span>
        <h1>${article.title}</h1>
        ${articleImage(article.path)
          ? html`<div class="article__lead" style="margin-top: var(--space-lg)">
              ${frame(articleImage(article.path), article.title, {
                ratio: "wide",
                loading: "eager"
              })}
            </div>`
          : ""}
        <div class="prose" style="margin-top: var(--space-lg)">
          ${blocks(article.body)}
        </div>
        ${article.excerptOnly
          ? html`<aside class="notice" style="margin-top: var(--space-lg)">
              <p class="notice__title">О публикации книги</p>
              <p>
                На этой странице приведены выходные данные и вступительная часть.
                Полный текст книги защищён авторским правом и не публикуется
                в этой версии сайта.
              </p>
            </aside>`
          : ""}
      </article>

      ${related.length
        ? html`<aside class="article__aside" aria-label="Другие статьи раздела">
            <h2>Ещё в разделе</h2>
            <ul>
              ${each(
                related,
                (other) => html`<li style="margin-bottom: var(--space-2xs)">
                  <a href="${other.path}">${other.title}</a>
                </li>`
              )}
            </ul>
            <p><a href="/stati/${item.slug}/">Все статьи раздела</a></p>
          </aside>`
        : ""}
    </div>`;

  return {
    path,
    html: layout({
      path,
      canonical: article.path,
      navId: "articles",
      title: article.title,
      description: excerpt(article, 175),
      body
    })
  };
}

/* The original site also exposed nine topical section paths whose articles all
   live in the seven canonical sections. Their URLs are preserved as aliases so
   existing links and search results keep resolving. */
function aliasRoutes() {
  const byPath = new Map(
    articleSections.flatMap((item) =>
      item.articles.map((article) => [article.path, { article, item }])
    )
  );

  return aliasSections.flatMap((alias) => {
    const entries = alias.articles
      .map((entry) => ({ alias: entry.alias, ...byPath.get(entry.canonical) }))
      .filter((entry) => entry.article);

    const indexBody = html`${crumbs([
      { label: "Статьи", href: "/stati/" },
      { label: alias.name }
    ])}
      ${pageHead({ eyebrow: "Раздел", title: alias.name })}
      ${section({
        body: html`${sectionChips(null)}
          <div style="margin-top: var(--space-lg)">
            ${articleList(
              entries.map((entry) => ({ ...entry.article, section: entry.item })),
              { showSection: true }
            )}
          </div>`
      })}`;

    return [
      {
        path: `/stati/${alias.slug}/`,
        html: layout({
          path: `/stati/${alias.slug}/`,
          canonical: "/stati/",
          navId: "articles",
          title: alias.name,
          description: `${alias.name} — статьи Елены Вальяк.`,
          body: indexBody
        })
      },
      ...entries.map((entry) =>
        articleRoute(entry.article, entry.item, entry.alias)
      )
    ];
  });
}

function titleOnlyRoutes() {
  return titleOnlyArticles.map((article) => {
    const body = html`${crumbs([
      { label: "Статьи", href: "/stati/" },
      { label: article.sectionName, href: article.sectionPath },
      { label: article.title }
    ])}
      ${pageHead({ eyebrow: "Архивная страница", title: article.title })}
      ${section({
        body: html`<aside class="notice">
          <p>
            На исходном сайте для этой страницы опубликован только заголовок;
            текст отсутствует.
          </p>
        </aside>`
      })}`;

    return {
      path: article.path,
      html: layout({
        path: article.path,
        navId: "articles",
        title: article.title,
        description: article.title,
        body
      })
    };
  });
}

export function articleRoutes() {
  const routes = [articlesIndexRoute()];

  for (const item of articleSections) {
    if (item.standalone) {
      /* Альфа-ритм and Волны Шумана are single pages: the section URL is the
         article URL, so only the article route is emitted. */
      routes.push(articleRoute(item.articles[0], item));
      continue;
    }
    routes.push(sectionRoute(item));
    for (const article of item.articles) {
      routes.push(articleRoute(article, item));
    }
  }

  return [...routes, ...aliasRoutes(), ...titleOnlyRoutes()];
}
