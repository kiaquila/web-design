import { each, html } from "../lib/html.mjs";
import { site } from "../data/site.mjs";
import { primaryNav } from "../data/navigation.mjs";
import { categories } from "../data/catalog-categories.mjs";

function menuItems(entry) {
  if (entry.source !== "categories") return entry.items;
  return [
    { label: "Все сеансы", href: "/catalog/" },
    ...categories.map((category) => ({
      label: category.name,
      href: `/catalog/${category.slug}/`
    }))
  ];
}

/** Spiral mark redrawn from the original logo, plus the two-line lockup. */
export function wordmark({ className = "wordmark", href = "/" } = {}) {
  return html`<a class="${className}" href="${href}">
    <img
      class="wordmark__mark"
      src="/assets/logo-mark.svg"
      alt=""
      width="44"
      height="44"
    />
    <span class="wordmark__text">
      <span class="wordmark__name">Медитации</span>
      <span class="wordmark__role">Елены Вальяк</span>
    </span>
  </a>`;
}

function navEntry(entry, currentId) {
  const current = entry.id === currentId;

  if (entry.type === "link") {
    return html`<li class="nav-item">
      <a
        class="nav-link"
        href="${entry.href}"
        ${current ? html`aria-current="true"` : ""}
        >${entry.label}</a
      >
    </li>`;
  }

  return html`<li class="nav-item nav-item--menu">
    <details class="nav-menu">
      <summary class="nav-disclosure">${entry.label}</summary>
      <div class="nav-panel">
        <ul class="nav-panel__grid">
          ${each(
            menuItems(entry),
            (item) => html`<li>
              <a class="nav-panel__link" href="${item.href}">${item.label}</a>
            </li>`
          )}
        </ul>
      </div>
    </details>
  </li>`;
}

export function masthead(page) {
  return html`<header class="masthead">
    <div class="shell masthead__bar">
      ${wordmark()}

      <button
        type="button"
        class="nav-toggle"
        aria-expanded="false"
        aria-controls="primary-nav"
      >
        <span class="nav-toggle__bars" aria-hidden="true"
          ><span></span><span></span><span></span
        ></span>
        Меню
      </button>

      <nav class="masthead__nav" id="primary-nav" aria-label="Основная навигация">
        <ul class="nav-list">
          ${each(primaryNav, (entry) => navEntry(entry, page.navId))}
        </ul>
      </nav>

      <div class="masthead__actions">
        <a class="masthead__contact" href="mailto:${site.email}">${site.email}</a>
      </div>
    </div>
  </header>`;
}
