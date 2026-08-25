/* Markup. Every string comes from content.js; nothing is written here. */

import {
  contact,
  experience,
  footer,
  hero,
  links,
  meta,
  nav,
  profile,
  skills,
  work,
  years
} from "./content.js";

/* Icons are drawn here rather than pulled in as brand assets: the page has no
   external origins, and the only thing these marks have to do is say which
   profile a link opens. */
const icons = {
  linkedin:
    '<path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.76v5.69h-4v-5.04c0-1.2-.02-2.75-1.75-2.75-1.75 0-2.02 1.3-2.02 2.66v5.13h-4v-11Z"/>',
  telegram:
    '<path fill="currentColor" d="M21.9 4.3 18.9 19c-.2 1-.8 1.2-1.7.75l-4.6-3.4-2.2 2.15c-.25.25-.45.45-.9.45l.32-4.6L18.3 6.8c.36-.32-.08-.5-.56-.18L7.4 13.16l-4.5-1.4c-.98-.3-1-.98.2-1.45l17.6-6.8c.8-.3 1.5.2 1.2 1.8Z"/>',
  github:
    '<path fill="currentColor" d="M12 2.2a9.8 9.8 0 0 0-3.1 19.1c.49.09.67-.21.67-.47v-1.8c-2.72.59-3.3-1.16-3.3-1.16-.45-1.13-1.09-1.43-1.09-1.43-.89-.6.07-.59.07-.59.98.07 1.5 1.01 1.5 1.01.87 1.5 2.29 1.07 2.85.82.09-.63.34-1.07.62-1.31-2.17-.25-4.46-1.09-4.46-4.84 0-1.07.38-1.94 1.01-2.62-.1-.25-.44-1.25.1-2.6 0 0 .82-.26 2.7 1a9.3 9.3 0 0 1 4.92 0c1.87-1.26 2.7-1 2.7-1 .53 1.35.2 2.35.1 2.6.63.68 1 1.55 1 2.62 0 3.76-2.29 4.59-4.47 4.83.35.3.66.9.66 1.82v2.7c0 .26.18.57.68.47A9.8 9.8 0 0 0 12 2.2Z"/>'
};

const iconSvg = (name) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">${icons[name]}</svg>`;

const escapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function esc(value) {
  return String(value).replace(/[&<>"']/g, (character) => escapes[character]);
}

/** The years of experience are derived, so copy carries placeholders. */
function fill(value) {
  return String(value)
    .replaceAll("%IT_YEARS%", String(years.it))
    .replaceAll("%BACKEND_YEARS%", String(years.backend));
}

function text(value) {
  return esc(fill(value));
}

/** External links leave the page; internal anchors and mailto do not. */
function anchor(href, label, className) {
  const external = /^https?:/.test(href);
  const rel = external ? ' target="_blank" rel="noreferrer"' : "";
  const cls = className ? ` class="${className}"` : "";
  return `<a${cls} href="${esc(href)}"${rel}>${label}</a>`;
}

function renderNav() {
  const items = nav
    .map(
      (item) =>
        `<li><a href="#${esc(item.id)}" data-nav="${esc(item.id)}">` +
        `<span class="nav-numeral">${esc(item.numeral)}</span>` +
        `<span class="nav-label">${esc(item.label)}</span></a></li>`
    )
    .join("");
  return `<nav class="site-nav" aria-label="Sections"><ul>${items}</ul></nav>`;
}

function renderMasthead() {
  return `<header class="masthead">
      <a class="wordmark" href="#top">${esc(meta.name)}</a>
      ${renderNav()}
    </header>`;
}

function renderHero() {
  const facts = hero.facts
    .map(
      (fact) =>
        `<div class="fact"><span class="fact-value">${text(fact.value)}</span>` +
        `<span class="fact-label">${text(fact.label)}</span></div>`
    )
    .join("");
  return `<section class="hero" id="top">
      <div class="shell">
        <p class="role">${esc(hero.role)}</p>
        <h1 class="hero-name">${esc(hero.name)}</h1>
        <p class="hero-lead">${text(hero.lead)}</p>
        <p class="hero-body">${text(hero.body)}</p>
        <div class="hero-actions">
          ${anchor(hero.cta.href, esc(hero.cta.label), "btn")}
          <button class="btn btn-quiet" type="button" data-print hidden>${esc(hero.secondary.label)}</button>
        </div>
        <div class="facts">${facts}</div>
      </div>
    </section>`;
}

function sectionHead(numeral, title) {
  return `<div class="section-head">
        <span class="numeral" aria-hidden="true">${esc(numeral)}</span>
        <h2>${esc(title)}</h2>
      </div>`;
}

/* Everything that is not the head goes into one grid item. With the body split
   across several children, the tall numeral set the height of the first grid
   row and left a hundred pixels of nothing between a section's first line and
   its second. */
function sectionBody(...blocks) {
  return `<div class="section-body">${blocks.join("")}</div>`;
}

function renderProfile() {
  const help = profile.help
    .map((item) => `<li>${text(item)}</li>`)
    .join("");
  return `<section class="section profile" id="profile">
      <div class="shell">
        ${sectionHead(profile.numeral, profile.title)}
        ${sectionBody(
          `<div class="profile-grid">
            <p class="summary">${text(profile.summary)}</p>
            <div class="help">
              <h3>${esc(profile.helpTitle)}</h3>
              <ul class="help-list">${help}</ul>
            </div>
          </div>`
        )}
      </div>
    </section>`;
}

function renderExperience() {
  const roles = experience.roles
    .map((role) => {
      const points = role.points.map((point) => `<li>${text(point)}</li>`).join("");
      return `<article class="role-card">
          <p class="role-period">${esc(role.period)}</p>
          <div class="role-body">
            <h3 class="role-title">${esc(role.title)}<span class="role-company">${esc(role.company)}</span></h3>
            <p class="role-place">${esc(role.place)}</p>
            ${role.context ? `<p class="role-context">${text(role.context)}</p>` : ""}
            <ul class="role-points">${points}</ul>
          </div>
        </article>`;
    })
    .join("");
  return `<section class="section experience" id="experience">
      <div class="shell">
        ${sectionHead(experience.numeral, experience.title)}
        ${sectionBody(`<div class="roles">${roles}</div>`)}
      </div>
    </section>`;
}

function renderSkills() {
  const groups = skills.groups
    .map((group) => {
      const items = group.items
        .map((item) => `<li>${text(item)}</li>`)
        .join("");
      return `<div class="stack-group">
          <h3>${esc(group.label)}</h3>
          <ul>${items}</ul>
        </div>`;
    })
    .join("");
  const languages = skills.languages.items
    .map(
      (language) =>
        `<li><span>${esc(language.name)}</span><span class="level">${esc(language.level)}</span></li>`
    )
    .join("");
  return `<section class="section skills" id="skills">
      <div class="shell">
        ${sectionHead(skills.numeral, skills.title)}
        ${sectionBody(
          `<div class="stack-grid">${groups}</div>`,
          `<div class="credentials">
          <div class="credential">
            <h3>${esc(skills.education.label)}</h3>
            <p class="credential-period">${esc(skills.education.period)}</p>
            <p class="credential-name">${esc(skills.education.school)}</p>
            <p class="credential-detail">${text(skills.education.detail)}</p>
          </div>
          <div class="credential">
            <h3>${esc(skills.languages.label)}</h3>
            <ul class="languages">${languages}</ul>
          </div>
        </div>`
        )}
      </div>
    </section>`;
}

function renderWork() {
  const items = work.items
    .map(
      (item) => `<article class="work-card">
          <h3>${anchor(item.href, esc(item.name))}</h3>
          <p class="work-tech">${text(item.tech)}</p>
          <p class="work-description">${text(item.description)}</p>
        </article>`
    )
    .join("");
  return `<section class="section work" id="work">
      <div class="shell">
        ${sectionHead(work.numeral, work.title)}
        ${sectionBody(
          `<p class="section-note">${text(work.note)}</p>`,
          `<div class="work-grid">${items}</div>`
        )}
      </div>
    </section>`;
}

function renderContact() {
  /* The label is the accessible name, not a caption: an icon on its own is
     silent, and "LinkedIn" read aloud is the whole point of the link. */
  const social = contact.social
    .map(
      (item) =>
        `<li>${anchor(
          item.href,
          `<span class="visually-hidden">${esc(item.label)}</span>${iconSvg(item.name)}`,
          "social-link"
        )}</li>`
    )
    .join("");
  return `<section class="section contact" id="contact">
      <div class="shell">
        ${sectionHead(contact.numeral, contact.title)}
        ${sectionBody(
          `<div class="contact-row">
          <p class="contact-lead">${text(contact.lead)}</p>
          <div class="contact-actions">
            <a class="btn" href="${esc(contact.cta.href)}" data-print-value="${esc(links.email)}">${esc(contact.cta.label)}</a>
            <ul class="contact-social">${social}</ul>
          </div>
        </div>`
        )}
      </div>
    </section>`;
}

function renderFooter(year) {
  return `<footer class="site-footer">
      <div class="shell">
        <p>© ${year} ${esc(footer.copyright)}</p>
        <p class="footer-note">${esc(footer.credit.before)}${anchor(
                links.designer,
                esc(footer.credit.name),
                "footer-link"
              )}${esc(footer.credit.after)}</p>
      </div>
    </footer>`;
}

/** JSON-LD so a recruiter's tooling reads the same facts the page shows. */
function structuredData(origin) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: meta.name,
    jobTitle: meta.role,
    email: `mailto:${links.email}`,
    address: { "@type": "PostalAddress", addressLocality: "Buenos Aires", addressCountry: "AR" },
    knowsLanguage: skills.languages.items.map((language) => language.name),
    sameAs: [links.linkedin, links.github],
    knowsAbout: skills.groups.flatMap((group) => group.items)
  };
  if (origin) data.url = `${origin}/`;
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

export function renderPage({ origin = "", year }) {
  return `<!doctype html>
<html lang="${esc(meta.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
${origin ? "" : '<meta name="robots" content="noindex, nofollow">'}
${origin ? `<link rel="canonical" href="${esc(origin)}/">` : ""}
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
${origin ? `<meta property="og:url" content="${esc(origin)}/">` : ""}
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#f0f0ee">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/jost-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/styles.css">
${structuredData(origin)}
</head>
<body>
<a class="skip" href="#profile">Skip to content</a>
${renderMasthead()}
<main>
${renderHero()}
${renderProfile()}
${renderExperience()}
${renderSkills()}
${renderWork()}
${renderContact()}
</main>
${renderFooter(year)}
<script src="/assets/site.js" defer></script>
</body>
</html>
`;
}

export function renderNotFound({ origin = "" }) {
  return `<!doctype html>
<html lang="${esc(meta.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page not found — ${esc(meta.name)}</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="page-404">
<main class="shell">
  <span class="numeral" aria-hidden="true">404</span>
  <h1>This page does not exist</h1>
  <p class="hero-lead">The CV lives on one page, and this is not it.</p>
  <p><a class="btn" href="${esc(origin)}/">Back to the CV</a></p>
</main>
</body>
</html>
`;
}
