import { each, html } from "../lib/html.mjs";
import { site, social, socialIcons } from "../data/site.mjs";
import { footerNav } from "../data/navigation.mjs";
import { wordmark } from "./header.mjs";

export function socialList(className = "social") {
  return html`<ul class="${className}">
    ${each(
      social,
      (item) => html`<li>
        <a href="${item.href}" rel="noopener" target="_blank">
          <span class="visually-hidden">${item.name}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="${socialIcons[item.icon]}" />
          </svg>
        </a>
      </li>`
    )}
  </ul>`;
}

export function colophon() {
  return html`<footer class="colophon">
    <div class="shell">
      <div class="colophon__top">
        <div class="colophon__brand">
          ${wordmark()}
          <p>${site.description}</p>
          <p>
            <a href="mailto:${site.email}">${site.email}</a><br />
            ${site.hours}
          </p>
          ${socialList()}
        </div>

        ${each(
          footerNav,
          (group) => html`<nav aria-label="${group.title}">
            <p class="colophon__title">${group.title}</p>
            <ul class="colophon__list">
              ${each(
                group.items,
                (item) => html`<li><a href="${item.href}">${item.label}</a></li>`
              )}
            </ul>
          </nav>`
        )}
      </div>

      <div class="colophon__bottom">
        <p>
          ${site.copyright}<br />
          ${site.legalEntity}, ${site.taxId}
        </p>
      </div>
    </div>
  </footer>`;
}
