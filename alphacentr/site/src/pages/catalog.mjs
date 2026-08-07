import { blocks, each, formatPrice, html } from "../lib/html.mjs";
import { crumbs, layout } from "../templates/layout.mjs";
import { frame, pageHead, section, sessionGrid } from "../templates/blocks.mjs";
import {
  categories,
  categoriesForSession,
  sessionsById
} from "../data/catalog-categories.mjs";
import { categoryImage, sessionImage } from "../data/media.mjs";

function categoryChips(currentSlug) {
  return html`<ul class="chips">
    <li>
      <a class="chip" href="/catalog/" ${!currentSlug ? html`aria-current="true"` : ""}
        >Все темы</a
      >
    </li>
    ${each(
      categories,
      (category) => html`<li>
        <a
          class="chip"
          href="/catalog/${category.slug}/"
          ${category.slug === currentSlug ? html`aria-current="true"` : ""}
          >${category.name}</a
        >
      </li>`
    )}
  </ul>`;
}

function catalogIndexRoute() {
  const total = sessionsById.size;
  const body = html`${crumbs([{ label: "Сеансы гипноза" }])}
    ${pageHead({
      eyebrow: "Каталог",
      title: "Сеансы гипноза, медитации и аффирмации",
      lede:
        `${total} авторских аудио программ, сгруппированных по темам. ` +
        "Каждая программа записана и озвучена Еленой Вальяк, доступна в формате mp3 " +
        "сразу после оплаты."
    })}
    ${section({
      body: html`${categoryChips(null)}
        <div class="grid grid--2" style="margin-top: var(--space-xl)">
          ${each(
            categories,
            (category) => html`<article class="card">
              ${frame(categoryImage(category), category.name, {
                ratio: "wide"
              })}
              <h2 class="card__title" style="margin-top: var(--space-2xs)">
                <a href="/catalog/${category.slug}/">${category.name}</a>
              </h2>
              <p class="card__text">${category.intro}</p>
              <p class="card__text">
                <strong>${category.sessions.length}</strong> программ
              </p>
            </article>`
          )}
        </div>`
    })}`;

  return {
    path: "/catalog/",
    html: layout({
      path: "/catalog/",
      navId: "catalog",
      title: "Сеансы гипноза",
      description:
        `Каталог из ${total} авторских сеансов гипноза, медитаций и аффирмаций ` +
        "в формате mp3 по 18 темам.",
      body
    })
  };
}

function categoryRoute(category) {
  const path = `/catalog/${category.slug}/`;
  const body = html`${crumbs([
    { label: "Сеансы гипноза", href: "/catalog/" },
    { label: category.name }
  ])}
    ${pageHead({
      eyebrow: "Каталог",
      title: category.name,
      lede: category.intro
    })}
    ${section({
      body: html`${categoryChips(category.slug)}
        <p class="form__note" style="margin: var(--space-md) 0">
          ${category.sessions.length} программ в этой теме
        </p>
        ${sessionGrid(category.sessions)}`
    })}`;

  return {
    path,
    html: layout({
      path,
      navId: "catalog",
      title: category.name,
      description:
        category.intro ||
        `${category.name}: ${category.sessions.length} авторских аудио программ.`,
      body
    })
  };
}

function sessionReviews(session) {
  if (!session.reviews.length) return "";
  return section({
    eyebrow: "Отзывы",
    title: `Отзывы о программе (${session.reviews.length})`,
    modifier: "section--alt",
    body: html`<div class="grid grid--prose">
      ${each(
        session.reviews,
        (review) => html`<figure class="review">
          <blockquote class="review__text"><p>${review.text}</p></blockquote>
          <figcaption class="review__author">
            ${review.author}${review.date ? html` · ${review.date}` : ""}
          </figcaption>
        </figure>`
      )}
    </div>`
  });
}

/**
 * Render one session.
 *
 * A session usually belongs to several catalogue sections, and the original
 * site served it under each of them. We render the page at every one of those
 * URLs so no existing link breaks, and point `rel=canonical` at `session.path`.
 */
function sessionRoute(session, path = session.path) {
  const inCategories = categoriesForSession(session.id);
  const primary =
    inCategories.find((category) => path.startsWith(`/catalog/${category.slug}/`)) ??
    inCategories[0];
  const free = !session.price;

  const body = html`${crumbs([
    { label: "Сеансы гипноза", href: "/catalog/" },
    ...(primary
      ? [{ label: primary.name, href: `/catalog/${primary.slug}/` }]
      : []),
    { label: session.title }
  ])}
    <div class="shell session">
      <div class="session__media">
        ${frame(sessionImage(session.id), session.title, {
          ratio: "wide",
          loading: "eager"
        })}
        <aside class="session__buy" aria-label="Условия покупки">
          <p class="session__price">${formatPrice(session.price)}</p>
          <dl class="session__specs">
            ${session.duration
              ? html`<div><dt>Длительность</dt><dd>${session.duration}</dd></div>`
              : ""}
            ${session.fileSize
              ? html`<div><dt>Размер файла</dt><dd>${session.fileSize}</dd></div>`
              : ""}
            <div><dt>Формат</dt><dd>mp3</dd></div>
            <div><dt>Доставка</dt><dd>ссылка на e-mail сразу после оплаты</dd></div>
          </dl>
          <a class="button button--primary" href="/o-magazine/kak-oplatit-zakaz/">
            ${free ? "Как скачать бесплатно" : "Как оформить заказ"}
          </a>
          <p class="form__note">
            Оплата картой, СБП или PayPal. При заказе нескольких программ
            действует
            <a href="/o-magazine/sistema-skidok/">автоматическая скидка</a> от 10 %.
          </p>
          <p class="form__note">
            Не уверены в выборе?
            <a href="/avtor/pomoch-avtora-v-podbore-seansov/">Автор поможет
            подобрать</a> программу под вашу задачу.
          </p>
        </aside>
      </div>

      <div>
        <span class="eyebrow">${primary ? primary.name : "Аудио программа"}</span>
        <h1>${session.title}</h1>
        <div class="prose" style="margin-top: var(--space-lg)">
          ${blocks(session.description)}
        </div>

        ${inCategories.length > 1
          ? html`<div style="margin-top: var(--space-lg)">
              <p class="form__note">Эта программа входит в темы:</p>
              <ul class="chips" style="margin-top: var(--space-2xs)">
                ${each(
                  inCategories,
                  (category) => html`<li>
                    <a class="chip" href="/catalog/${category.slug}/"
                      >${category.name}</a
                    >
                  </li>`
                )}
              </ul>
            </div>`
          : ""}
      </div>
    </div>

    ${sessionReviews(session)}`;

  const first = session.description.find((block) => block.type === "p");
  return {
    path,
    html: layout({
      path,
      canonical: session.path,
      navId: "catalog",
      title: session.title,
      description: first
        ? first.text.slice(0, 180)
        : `${session.title} — авторская аудио программа Елены Вальяк.`,
      body
    })
  };
}

export function catalogRoutes() {
  const routes = [
    catalogIndexRoute(),
    ...categories.map((category) => categoryRoute(category))
  ];

  const emitted = new Set();
  for (const session of sessionsById.values()) {
    routes.push(sessionRoute(session));
    emitted.add(session.path);
  }
  /* Preserve the per-category URLs the original site also served. */
  for (const category of categories) {
    for (const session of category.sessions) {
      const alias = `/catalog/${category.slug}/${session.id}/`;
      if (emitted.has(alias)) continue;
      emitted.add(alias);
      routes.push(sessionRoute(session, alias));
    }
  }
  return routes;
}
