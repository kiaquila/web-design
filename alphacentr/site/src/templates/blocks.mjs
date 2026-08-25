import { blocks, each, formatPrice, html, inline } from "../lib/html.mjs";
import { site } from "../data/site.mjs";
import { sessionImage } from "../data/media.mjs";

/** Section wrapper with an optional heading row and "see all" link. */
export function section({ title, eyebrow, href, hrefLabel, body, modifier = "" }) {
  return html`<section class="section ${modifier}">
    <div class="shell">
      ${title
        ? html`<div class="section__head">
            <div>
              ${eyebrow ? html`<span class="eyebrow">${eyebrow}</span>` : ""}
              <h2 class="section__title">${inline(title)}</h2>
            </div>
            ${href
              ? html`<a class="button button--ghost button--small" href="${href}"
                  >${hrefLabel ?? "Смотреть все"}</a
                >`
              : ""}
          </div>`
        : ""}
      ${body}
    </div>
  </section>`;
}

/** Interior page header. */
export function pageHead({ title, lede, eyebrow }) {
  return html`<div class="page-head">
    <div class="shell">
      ${eyebrow ? html`<span class="eyebrow">${eyebrow}</span>` : ""}
      <h1 class="page-head__title">${inline(title)}</h1>
      ${lede ? html`<p class="page-head__lede">${inline(lede)}</p>` : ""}
    </div>
  </div>`;
}

/** Photograph in a rounded frame. */
export function frame(src, alt, { ratio = "landscape", loading = "lazy" } = {}) {
  if (!src) return html`<div class="frame frame--${ratio}"></div>`;
  return html`<div class="frame frame--${ratio}">
    <img src="${src}" alt="${alt}" loading="${loading}" decoding="async" />
  </div>`;
}

const BADGE_CLASS = {
  Советуем: "badge",
  Новинка: "badge badge--new",
  Хит: "badge"
};

/** Catalogue card for one session. */
export function sessionCard(session) {
  const free = !session.price;
  const image = sessionImage(session.id);
  return html`<article class="session-card">
    <div class="session-card__media">
      <div class="session-card__badges">
        ${free ? html`<span class="badge badge--free">Бесплатно</span>` : ""}
        ${each(
          session.badges ?? [],
          (badge) =>
            html`<span class="${BADGE_CLASS[badge] ?? "badge"}">${badge}</span>`
        )}
      </div>
      ${frame(image, session.title, { ratio: "wide" })}
    </div>
    <h3 class="session-card__title">
      <a href="${session.path}">${session.title}</a>
    </h3>
    ${session.duration
      ? html`<p class="session-card__meta">${session.duration}</p>`
      : html`<p class="session-card__meta">Курс программ</p>`}
    <div class="session-card__foot">
      <span class="price ${free ? "price--free" : ""}"
        >${formatPrice(session.price)}</span
      >
    </div>
  </article>`;
}

export function sessionGrid(sessions) {
  return html`<div class="grid grid--3">
    ${each(sessions, (session) => sessionCard(session))}
  </div>`;
}

/** Newsletter band over a photograph. */
export function subscribeBand() {
  return html`<section class="subscribe" id="subscribe">
    <div class="shell subscribe__inner">
      <div>
        <span class="eyebrow">Рассылка</span>
        <h2 class="subscribe__title">
          Подпишитесь и скачайте сеанс гипноза бесплатно
        </h2>
        <p class="subscribe__text">
          Новости и акции сайта «Гипноз Альфа-Центр», а также бесплатный сеанс
          гипноза для снятия стресса — сразу после подписки.
        </p>
      </div>
      <form
        class="form"
        method="post"
        action="mailto:${site.email}"
        enctype="text/plain"
      >
        <div class="field">
          <label class="field__label" for="subscribe-email"
            >Электронная почта</label
          >
          <input
            class="field__control"
            id="subscribe-email"
            name="email"
            type="email"
            required
            autocomplete="email"
            placeholder="Введите ваш e-mail"
          />
        </div>
        <div class="field field--consent">
          <input id="subscribe-consent" name="consent" type="checkbox" required />
          <label for="subscribe-consent">
            Я ознакомлен с <a href="/publichnyy-dogovor-oferta/">пользовательским
            соглашением</a> и согласен на обработку персональных данных
          </label>
        </div>
        <div><button class="button button--primary" type="submit">Подписаться</button></div>
      </form>
    </div>
  </section>`;
}

/** Render a list of content blocks inside the prose container. */
export function prose(items) {
  return html`<div class="prose">${blocks(items)}</div>`;
}

/** Accordion built from `{ question, answer }` pairs. */
export function accordion(items, { open = 0 } = {}) {
  return html`<div class="accordion">
    ${each(
      items,
      (item, index) => html`<details
        class="accordion__item"
        ${index === open ? html`open` : ""}
      >
        <summary>${item.question}</summary>
        <div class="accordion__body">${blocks(item.answer)}</div>
      </details>`
    )}
  </div>`;
}

/** Contact / question form, migrated from the original "Задать вопрос" block. */
export function questionForm({ id = "question", heading, note }) {
  return html`<form
    class="form"
    id="${id}"
    method="post"
    action="mailto:${site.email}"
    enctype="text/plain"
  >
    ${heading ? html`<h2>${heading}</h2>` : ""}
    ${note ? html`<p class="form__note">${inline(note)}</p>` : ""}
    <div class="field">
      <label class="field__label" for="${id}-text">Вопрос *</label>
      <textarea
        class="field__control"
        id="${id}-text"
        name="question"
        required
      ></textarea>
    </div>
    <div class="field">
      <label class="field__label" for="${id}-name">Ваше имя *</label>
      <input
        class="field__control"
        id="${id}-name"
        name="name"
        type="text"
        required
        autocomplete="name"
      />
    </div>
    <div class="field">
      <label class="field__label" for="${id}-phone">Контактный телефон</label>
      <input
        class="field__control"
        id="${id}-phone"
        name="phone"
        type="tel"
        autocomplete="tel"
      />
    </div>
    <div class="field">
      <label class="field__label" for="${id}-email">E-mail *</label>
      <input
        class="field__control"
        id="${id}-email"
        name="email"
        type="email"
        required
        autocomplete="email"
      />
    </div>
    <div class="field field--consent">
      <input id="${id}-consent" name="consent" type="checkbox" required />
      <label for="${id}-consent">
        Я ознакомлен с <a href="/publichnyy-dogovor-oferta/">пользовательским
        соглашением</a> и согласен на обработку персональных данных
      </label>
    </div>
    <div>
      <button class="button button--ink" type="submit">Отправить вопрос</button>
    </div>
    <p class="form__note">
      Форма открывает почтовый клиент и отправляет письмо на
      <a href="mailto:${site.email}">${site.email}</a>. Ответ приходит в течение
      рабочего дня.
    </p>
  </form>`;
}
