import { blocks, each, html } from "../lib/html.mjs";
import { crumbs, layout } from "../templates/layout.mjs";
import { pageHead, questionForm, section } from "../templates/blocks.mjs";
import { socialList } from "../templates/footer.mjs";
import { site } from "../data/site.mjs";
import { pageByPath, pageLedes, press } from "../data/pages.mjs";
import { primaryNav } from "../data/navigation.mjs";

const authorMenu = primaryNav.find((entry) => entry.id === "author").items;

function authorNav(currentPath) {
  return html`<ul class="chips">
    <li>
      <a
        class="chip"
        href="/avtor/"
        ${currentPath === "/avtor/" ? html`aria-current="true"` : ""}
        >Автор</a
      >
    </li>
    ${each(
      authorMenu,
      (item) => html`<li>
        <a
          class="chip"
          href="${item.href}"
          ${item.href === currentPath ? html`aria-current="true"` : ""}
          >${item.label}</a
        >
      </li>`
    )}
    <li>
      <a
        class="chip"
        href="/avtor/kontakty/"
        ${currentPath === "/avtor/kontakty/" ? html`aria-current="true"` : ""}
        >Контакты</a
      >
    </li>
  </ul>`;
}

/** Body of one migrated editorial page under /avtor/. */
function editorialBody(page, path, eyebrow) {
  return html`${crumbs([
    { label: "Автор", href: "/avtor/" },
    { label: page.title }
  ])}
    ${pageHead({ eyebrow, title: page.title, lede: pageLedes[path] })}
    ${section({
      body: html`${authorNav(path)}
        <div class="prose" style="margin-top: var(--space-lg)">
          ${blocks(page.body)}
        </div>`
    })}`;
}

/**
 * Route for a migrated editorial page.
 *
 * `at` renders the same page under a second URL the original site also served;
 * the canonical link keeps pointing at `path`.
 */
function editorialRoute(path, { eyebrow = "Автор", at = path } = {}) {
  const page = pageByPath.get(path);
  if (!page) throw new Error(`Missing editorial page: ${path}`);

  return {
    path: at,
    html: layout({
      path: at,
      canonical: path,
      navId: "author",
      title: page.title,
      description: pageLedes[path] ?? site.description,
      body: editorialBody(page, path, eyebrow)
    })
  };
}

function authorIndexRoute() {
  const body = html`${crumbs([{ label: "Автор" }])}
    ${pageHead({
      eyebrow: "Автор проекта",
      title: "Елена Вальяк",
      lede:
        "Сертифицированный гипнолог-практик и психолог-консультант. " +
        "Автор всех сеансов, медитаций и аффирмаций на этом сайте."
    })}
    ${section({
      body: html`${authorNav("/avtor/")}
        <div class="grid grid--2" style="margin-top: var(--space-lg)">
          ${each(
            [
              ...authorMenu,
              { label: "Пресса и ТВ", href: "/avtor/pressa-i-tv/" },
              { label: "Контакты", href: "/avtor/kontakty/" }
            ],
            (item) => html`<article class="card card--link">
              <h2 class="card__title">
                <a href="${item.href}">${item.label}</a>
              </h2>
              <p class="card__text">${pageLedes[item.href] ?? ""}</p>
            </article>`
          )}
        </div>`
    })}`;

  return {
    path: "/avtor/",
    html: layout({
      path: "/avtor/",
      navId: "author",
      title: "Автор",
      description:
        "Елена Вальяк — гипнолог-практик и психолог-консультант, автор проекта " +
        "«Гипноз Альфа-Центр».",
      body
    })
  };
}

function pressRoute() {
  const body = html`${crumbs([
    { label: "Автор", href: "/avtor/" },
    { label: "Пресса и ТВ" }
  ])}
    ${pageHead({
      eyebrow: "Автор",
      title: "Пресса и ТВ",
      lede: "Публикации, съёмки и сотрудничество с изданиями и телеканалами."
    })}
    ${section({
      body: html`${authorNav("/avtor/pressa-i-tv/")}
        <ul class="article-list" style="margin-top: var(--space-lg)">
          ${each(
            press,
            (item) => html`<li class="article-row">
              <span class="article-row__kicker">Публикация</span>
              <div>
                <h2 class="article-row__title">${item.title}</h2>
                ${each(
                  item.summary,
                  (line) => html`<p class="article-row__text">${line}</p>`
                )}
              </div>
            </li>`
          )}
        </ul>
        <p class="form__note" style="margin-top: var(--space-md)">
          Материалы изданий и телеканалов принадлежат их правообладателям и здесь
          не воспроизводятся.
        </p>`
    })}`;

  return {
    path: "/avtor/pressa-i-tv/",
    html: layout({
      path: "/avtor/pressa-i-tv/",
      navId: "author",
      title: "Пресса и ТВ",
      description:
        "Публикации и эфиры с участием гипнолога Елены Вальяк: МИФ, «Аргументы " +
        "и факты», РЕН-ТВ, ОРТ и другие.",
      body
    })
  };
}

function contactsRoute() {
  const body = html`${crumbs([
    { label: "Автор", href: "/avtor/" },
    { label: "Контакты" }
  ])}
    ${pageHead({
      eyebrow: "Обратная связь",
      title: "Контакты",
      lede: "Напишите, если остались вопросы по программам, оплате или подбору сеансов."
    })}
    ${section({
      body: html`${authorNav("/avtor/kontakty/")}
        <div class="split" style="margin-top: var(--space-lg)">
          <div class="split__aside">
            <dl>
              <div>
                <dt>Электронная почта</dt>
                <dd><a href="mailto:${site.email}">${site.email}</a></dd>
              </div>
              <div>
                <dt>Подбор сеансов</dt>
                <dd>
                  <a href="mailto:${site.emailSelection}">${site.emailSelection}</a>
                </dd>
              </div>
              <div>
                <dt>Телефон</dt>
                <dd><a href="${site.phoneHref}">${site.phone}</a></dd>
              </div>
              <div>
                <dt>Режим работы</dt>
                <dd>${site.hours}</dd>
              </div>
              <div>
                <dt>Реквизиты</dt>
                <dd>${site.legalEntity}, ${site.taxId}</dd>
              </div>
              <div>
                <dt>Соцсети</dt>
                <dd>${socialList("social social--light")}</dd>
              </div>
            </dl>
          </div>
          <div>${questionForm({ id: "contact", heading: "Задать вопрос" })}</div>
        </div>`
    })}`;

  return {
    path: "/avtor/kontakty/",
    html: layout({
      path: "/avtor/kontakty/",
      navId: "contacts",
      title: "Контакты",
      description: `Связаться с автором проекта: ${site.email}, ${site.phone}, ${site.hours}.`,
      body
    })
  };
}

/* The original site gave each press mention its own page. The pages reproduced
   material owned by the publications, so here they keep the URL, the heading
   and the author's own note, and link back to the full list. */
function pressItemRoute(item) {
  const body = html`${crumbs([
    { label: "Автор", href: "/avtor/" },
    { label: "Пресса и ТВ", href: "/avtor/pressa-i-tv/" },
    { label: item.title }
  ])}
    <div class="shell shell--narrow section">
      <span class="eyebrow">Пресса и ТВ</span>
      <h1 style="font-size: var(--step-3)">${item.title}</h1>
      <div class="prose" style="margin-top: var(--space-md)">
        ${each(item.summary, (line) => html`<p>${line}</p>`)}
      </div>
      <p class="form__note" style="margin-top: var(--space-lg)">
        Материал принадлежит изданию и здесь не воспроизводится.
      </p>
      <p><a class="button button--ghost button--small" href="/avtor/pressa-i-tv/"
        >Все публикации</a
      ></p>
    </div>`;

  return {
    path: item.href,
    html: layout({
      path: item.href,
      canonical: "/avtor/pressa-i-tv/",
      navId: "author",
      title: item.title,
      description: item.summary[0] ?? item.title,
      body
    })
  };
}

export function authorRoutes() {
  return [
    authorIndexRoute(),
    editorialRoute("/avtor/obo-mne/"),
    editorialRoute("/avtor/gipnoz-onlayn/"),
    editorialRoute("/avtor/psikhologicheskoe-konsultirovanie/"),
    editorialRoute("/avtor/pomoch-avtora-v-podbore-seansov/"),
    pressRoute(),
    ...press.filter((item) => item.href).map((item) => pressItemRoute(item)),
    contactsRoute(),
    /* Duplicate URL the original site served for the same text. */
    editorialRoute("/avtor/gipnoz-onlayn/", {
      at: "/psihologicheskoe-konsultirovanie/"
    })
  ];
}
