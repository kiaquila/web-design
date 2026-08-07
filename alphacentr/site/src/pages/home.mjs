import { each, html } from "../lib/html.mjs";
import { layout } from "../templates/layout.mjs";
import {
  frame,
  section,
  sessionGrid,
  subscribeBand
} from "../templates/blocks.mjs";
import { assurances, site } from "../data/site.mjs";
import { categories, sessionsById } from "../data/catalog-categories.mjs";
import { allArticles, excerpt } from "../data/articles.mjs";
import { articleImage, heroPhoto, sessionImage } from "../data/media.mjs";
import { news, testimonials } from "../data/pages.mjs";

/* The original home page opened with a slider of three slogans. Here the
   promise is stated once in a typographic hero. */

function hero() {
  return html`<section class="hero">
    <div class="shell hero__inner">
      <div>
        <span class="eyebrow">Авторские сеансы гипноза и медитации</span>
        <h1 class="hero__title">
          Разбудите скрытые способности своего подсознания
        </h1>
        <p class="hero__lede">
          Медитация поможет вам победить свои страхи, ограничения и вредные
          привычки, избавиться от бессонницы, тревоги и зависимостей, похудеть и
          стать более уверенным, харизматичным и успешным человеком.
        </p>
        <div class="hero__actions">
          <a class="button button--primary" href="/catalog/">Скачать программы</a>
          <a class="button button--ghost" href="/catalog/besplatnye_seansy/"
            >Бесплатные сеансы</a
          >
        </div>
      </div>

      <div class="hero__portrait">
        ${frame(heroPhoto, "Гипнолог Елена Вальяк", {
          ratio: "portrait",
          loading: "eager"
        })}
      </div>
    </div>
  </section>`;
}

function assuranceStrip() {
  return html`<div class="shell">
    <ul class="assurances">
      ${each(
        assurances,
        (item) => html`<li class="assurance">
          <span class="assurance__value">${item.value}</span>
          <span class="assurance__label">${item.label}</span>
        </li>`
      )}
    </ul>
  </div>`;
}

function aboutSplit() {
  return html`<div class="split">
    <div>
      <span class="eyebrow">Об авторе</span>
      <h2>Гипнолог-практик и психолог-консультант</h2>
      <p class="lede" style="margin-top: var(--space-lg)">
        Этот сайт создан гипнологом-практиком Еленой Вальяк и посвящён
        безопасному и эффективному инструменту для решения задач и достижения
        успеха — гипнозу и самогипнозу.
      </p>
      <p style="margin-top: var(--space-md)">
        Окончила Московский Институт Психоанализа по специальности
        «Индивидуальное психологическое консультирование». В работе соединяет
        гипнотерапию и когнитивную терапию: первая обращается к подсознанию,
        вторая работает на сознательном уровне.
      </p>
      <p style="margin-top: var(--space-xl)">
        <a class="button button--ghost button--small" href="/avtor/obo-mne/"
          >Подробнее об авторе</a
        >
      </p>
    </div>
    <div class="split__aside">
      <dl>
        <div>
          <dt>Специализация</dt>
          <dd>
            Никотиновая зависимость, коррекция веса, тревожные расстройства,
            панические атаки, бессонница, управление стрессом, пищевые
            расстройства, эмоциональная зависимость, фобии и страхи,
            психосоматика.
          </dd>
        </div>
        <div>
          <dt>Метод</dt>
          <dd>
            Принципы эриксоновского гипноза: мягкое, недирективное воздействие,
            при котором выбор всегда остаётся за человеком.
          </dd>
        </div>
        <div>
          <dt>Как устроен сеанс</dt>
          <dd>
            40–60 минут и пять частей: индукция транса, углубление, внушения под
            вашу задачу, часть на забывание и мягкий вывод из транса.
          </dd>
        </div>
      </dl>
    </div>
  </div>`;
}

function directory() {
  return html`<div class="directory">
    ${each(
      categories,
      (category) => html`<a
        class="directory__item"
        href="/catalog/${category.slug}/"
      >
        <span class="directory__name">${category.name}</span>
        <span class="directory__count"
          >${category.sessions.length} ${plural(category.sessions.length)}</span
        >
      </a>`
    )}
  </div>`;
}

function plural(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "программа";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "программы";
  return "программ";
}

function statement() {
  return html`<section class="statement">
    <div class="shell">
      <p class="statement__text">
        Именно там, внутри вас есть ответы на все вопросы
      </p>
      <p class="statement__source">Елена Вальяк, автор проекта</p>
    </div>
  </section>`;
}

function pick(badge, limit) {
  return [...sessionsById.values()]
    .filter((item) => item.badges.includes(badge))
    .slice(0, limit);
}

function articleTeasers() {
  const picks = allArticles.slice(0, 3);
  return html`<div class="grid grid--3">
    ${each(
      picks,
      (article) => html`<article class="article-card">
        ${frame(articleImage(article.path), article.title, { ratio: "landscape" })}
        <div>
          <span class="article-card__kicker">${article.section.name}</span>
          <h3 class="article-card__title" style="margin-top: var(--space-2xs)">
            <a href="${article.path}">${article.title}</a>
          </h3>
          <p class="card__text" style="margin-top: var(--space-2xs)">
            ${excerpt(article, 130)}
          </p>
        </div>
      </article>`
    )}
  </div>`;
}

function testimonialStrip() {
  return html`<div class="grid grid--prose">
    ${each(
      testimonials.slice(0, 2),
      (item) => html`<figure class="review">
        <blockquote class="review__text">
          <p>${trim(item.text[0], 340)}</p>
        </blockquote>
        <figcaption class="review__author">${item.author}</figcaption>
      </figure>`
    )}
  </div>`;
}

function trim(text, limit) {
  if (!text || text.length <= limit) return text ?? "";
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function latestNews() {
  const item = news[0];
  return html`<div class="notice">
    <p class="notice__title">${item.title}</p>
    <p class="form__note" style="margin-bottom: var(--space-2xs)">${item.date}</p>
    ${each(item.body.slice(0, 1), (block) => html`<p>${block.text}</p>`)}
    <p style="margin-bottom: 0">
      <a href="${item.path}">Читать новость</a> ·
      <a href="/news/">Все новости</a>
    </p>
  </div>`;
}

export function homeRoute() {
  const body = html`${hero()} ${assuranceStrip()}
    ${section({ body: aboutSplit(), modifier: "section--cream" })}
    ${section({
      eyebrow: "Каталог",
      title: "Все сеансы по темам",
      href: "/catalog/",
      hrefLabel: "Открыть каталог",
      body: directory()
    })}
    ${statement()}
    ${section({
      eyebrow: "Выбор автора",
      title: "Советуем послушать",
      href: "/catalog/",
      body: sessionGrid(pick("Советуем", 4))
    })}
    ${section({
      eyebrow: "Новинки",
      title: "Новые записи",
      href: "/catalog/novye_zapisi/",
      body: sessionGrid(pick("Новинка", 4)),
      modifier: "section--cream"
    })}
    ${section({
      eyebrow: "Отзывы",
      title: "Что пишут после прослушивания",
      href: "/otzyvy/",
      hrefLabel: "Все отзывы",
      body: testimonialStrip()
    })}
    ${section({
      eyebrow: "Журнал",
      title: "Интересное о психологии и гипнозе",
      href: "/stati/",
      hrefLabel: "Все статьи",
      body: articleTeasers(),
      modifier: "section--cream"
    })}
    ${section({ eyebrow: "Новости", title: "Что нового", body: latestNews() })}
    ${subscribeBand()}`;

  return {
    path: "/",
    html: layout({
      path: "/",
      navId: "home",
      title: site.name,
      description: site.description,
      body
    })
  };
}
