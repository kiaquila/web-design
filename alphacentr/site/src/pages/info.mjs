import { blocks, each, html } from "../lib/html.mjs";
import { crumbs, layout } from "../templates/layout.mjs";
import {
  accordion,
  pageHead,
  questionForm,
  section
} from "../templates/blocks.mjs";
import { site } from "../data/site.mjs";
import {
  faq,
  news,
  pageByPath,
  pageLedes,
  testimonials
} from "../data/pages.mjs";
import { primaryNav } from "../data/navigation.mjs";

const helpMenu = primaryNav.find((entry) => entry.id === "help").items;

function helpNav(currentPath) {
  return html`<ul class="chips">
    ${each(
      helpMenu,
      (item) => html`<li>
        <a
          class="chip"
          href="${item.href}"
          ${item.href === currentPath ? html`aria-current="true"` : ""}
          >${item.label}</a
        >
      </li>`
    )}
  </ul>`;
}

function shopRoute(path) {
  const page = pageByPath.get(path);
  if (!page) throw new Error(`Missing editorial page: ${path}`);

  const body = html`${crumbs([
    { label: "Помощь", href: "/o-magazine/" },
    { label: page.title }
  ])}
    ${pageHead({ eyebrow: "Помощь", title: page.title, lede: pageLedes[path] })}
    ${section({
      body: html`${helpNav(path)}
        <div class="prose" style="margin-top: var(--space-lg)">
          ${blocks(page.body)}
        </div>`
    })}`;

  return {
    path,
    html: layout({
      path,
      navId: "help",
      title: page.title,
      description: pageLedes[path] ?? site.description,
      body
    })
  };
}

function legalRoute(path) {
  const page = pageByPath.get(path);
  if (!page) throw new Error(`Missing legal page: ${path}`);

  const body = html`${crumbs([{ label: page.title }])}
    ${pageHead({ eyebrow: "Документы", title: page.title, lede: pageLedes[path] })}
    <div class="shell shell--narrow section">
      <div class="prose">${blocks(page.body)}</div>
    </div>`;

  return {
    path,
    html: layout({
      path,
      title: page.title,
      description: pageLedes[path] ?? page.title,
      body
    })
  };
}

/* `at` renders the same page under `/info/`, which the original site served as
   a second entry point to the same questions. */
function faqRoute(at = "/info/faq/") {
  const body = html`${crumbs([
    { label: "Помощь", href: "/o-magazine/" },
    { label: "Вопрос-ответ" }
  ])}
    ${pageHead({
      eyebrow: "Помощь",
      title: "Вопрос-ответ",
      lede:
        "Частые вопросы о гипнозе, трансе и работе с записями — с ответами автора."
    })}
    ${section({
      body: html`${helpNav("/info/faq/")}
        <div style="margin-top: var(--space-lg)">${accordion(faq)}</div>`
    })}
    ${section({
      modifier: "section--alt",
      body: html`<div class="shell--narrow" style="margin-inline: auto">
        ${questionForm({
          id: "faq",
          heading: "Не нашли свой вопрос?",
          note:
            "Вы можете задать любой вопрос на тему продукции или работы интернет-магазина. " +
            "Мы постараемся ответить на него как можно быстрее и подробнее."
        })}
      </div>`
    })}`;

  return {
    path: at,
    html: layout({
      path: at,
      canonical: "/info/faq/",
      navId: "help",
      title: "Вопрос-ответ",
      description:
        "Частые вопросы о гипнозе: можно ли не выйти из транса, кого можно " +
        "загипнотизировать, как бросить курить и похудеть с гипнозом.",
      body
    })
  };
}

function newsIndexRoute() {
  const body = html`${crumbs([{ label: "Новости" }])}
    ${pageHead({
      eyebrow: "Новости",
      title: "Новости и акции",
      lede: "Изменения в работе сайта, способы оплаты и сезонные скидки."
    })}
    ${section({
      body: html`<ul class="article-list">
        ${each(
          news,
          (item) => html`<li class="article-row">
            <span class="article-row__kicker">
              <time datetime="${item.iso}">${item.date}</time>
            </span>
            <div>
              <h2 class="article-row__title">
                <a href="${item.path}">${item.title}</a>
              </h2>
              ${item.body[0]
                ? html`<p class="article-row__text">${item.body[0].text}</p>`
                : ""}
            </div>
          </li>`
        )}
      </ul>`
    })}`;

  return {
    path: "/news/",
    html: layout({
      path: "/news/",
      title: "Новости",
      description: "Новости и акции сайта «Гипноз Альфа-Центр».",
      body
    })
  };
}

/* The original site kept a page per year under /news/<year>/. */
function newsYearRoutes() {
  const years = [...new Set(news.map((item) => item.iso.slice(0, 4)))];
  return years.map((year) => {
    const items = news.filter((item) => item.iso.startsWith(year));
    const path = `/news/${year}/`;
    const body = html`${crumbs([
      { label: "Новости", href: "/news/" },
      { label: year }
    ])}
      ${pageHead({ eyebrow: "Архив", title: `Новости ${year} года` })}
      ${section({
        body: html`<ul class="article-list">
          ${each(
            items,
            (item) => html`<li class="article-row">
              <span class="article-row__kicker">
                <time datetime="${item.iso}">${item.date}</time>
              </span>
              <div>
                <h2 class="article-row__title">
                  <a href="${item.path}">${item.title}</a>
                </h2>
              </div>
            </li>`
          )}
        </ul>`
      })}`;

    return {
      path,
      html: layout({
        path,
        canonical: "/news/",
        title: `Новости ${year} года`,
        description: `Новости и акции сайта «Гипноз Альфа-Центр» за ${year} год.`,
        body
      })
    };
  });
}

function newsItemRoute(item, path = item.path) {
  const body = html`${crumbs([
    { label: "Новости", href: "/news/" },
    { label: item.title }
  ])}
    <div class="shell shell--narrow section">
      <span class="eyebrow">
        <time datetime="${item.iso}">${item.date}</time>
      </span>
      <h1 style="font-size: var(--step-3)">${item.title}</h1>
      <div class="prose" style="margin-top: var(--space-md)">
        ${blocks(item.body)}
      </div>
      <p style="margin-top: var(--space-lg)">
        <a class="button button--ghost button--small" href="/news/">Все новости</a>
      </p>
    </div>`;

  return {
    path,
    html: layout({
      path,
      canonical: item.path,
      title: item.title,
      description: item.body[0]?.text?.slice(0, 180) ?? item.title,
      body
    })
  };
}

function testimonialsRoute() {
  const body = html`${crumbs([{ label: "Отзывы" }])}
    ${pageHead({
      eyebrow: "Отзывы",
      title: "Отзывы посетителей сайта",
      lede:
        "На этой странице вы можете ознакомиться с отзывами и комментариями " +
        "посетителей сайта «Гипноз Альфа-Центр» о результатах применения сеансов " +
        "аудио гипноза автора Елены Вальяк."
    })}
    ${section({
      body: html`<p class="form__note" style="margin-bottom: var(--space-md)">
          ${testimonials.length} отзывов
        </p>
        <div class="grid grid--prose">
          ${each(
            testimonials,
            (item) => html`<figure class="review">
              <blockquote class="review__text">
                ${each(item.text, (line) => html`<p>${line}</p>`)}
              </blockquote>
              <figcaption class="review__author">${item.author}</figcaption>
            </figure>`
          )}
        </div>`
    })}
    ${section({
      modifier: "section--alt",
      body: html`<div class="notice">
        <p class="notice__title">Хотите оставить отзыв?</p>
        <p>
          Пришлите развёрнутый отзыв о результатах прослушивания на
          <a href="mailto:${site.email}">${site.email}</a> с пометкой «Получить
          купон на скидку» и согласием опубликовать его на сайте (без указания
          фамилии) — в ответ вы получите купон на скидку 25 %. Подробнее в
          <a href="/o-magazine/sistema-skidok/">системе скидок</a>.
        </p>
      </div>`
    })}`;

  return {
    path: "/otzyvy/",
    html: layout({
      path: "/otzyvy/",
      navId: "reviews",
      title: "Отзывы",
      description:
        "Отзывы посетителей сайта «Гипноз Альфа-Центр» о результатах " +
        "прослушивания авторских сеансов аудио гипноза.",
      body
    })
  };
}

export function infoRoutes() {
  return [
    shopRoute("/o-magazine/"),
    shopRoute("/o-magazine/audio-gipnoz-na-vse-sluchai-zhizni/"),
    shopRoute("/o-magazine/10-preimushchestv-pokupki-audio-gipnoza/"),
    shopRoute("/o-magazine/instruktsiya-po-primeneniyu-audio-gipnoza/"),
    shopRoute("/o-magazine/kak-ne-oshibitsya-v-vybore-audio-gipnoza/"),
    shopRoute("/o-magazine/kak-oplatit-zakaz/"),
    shopRoute("/o-magazine/kak-oplatit-iz-blizhnego-i-dalnego-zarubezhya/"),
    shopRoute("/o-magazine/kak-skachat-oplachennyy-audio-gipnoz/"),
    shopRoute("/o-magazine/sistema-skidok/"),
    faqRoute(),
    faqRoute("/info/"),
    testimonialsRoute(),
    newsIndexRoute(),
    ...newsYearRoutes(),
    ...news.map((item) => newsItemRoute(item)),
    /* The 2024 announcement was also linked without its year segment. */
    newsItemRoute(
      news[0],
      "/news/na_moem_sayte_dostupna_oplata_inostrannymi_bankovskimi_kartami_visa_i_mastercard/"
    ),
    legalRoute("/avtorskie-prav/"),
    legalRoute("/publichnyy-dogovor-oferta/"),
    legalRoute("/cookie/")
  ];
}
