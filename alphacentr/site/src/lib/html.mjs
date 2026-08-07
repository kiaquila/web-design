/* Tiny HTML helpers. Everything interpolated through `html` is escaped unless
   it is wrapped with `raw`, so content data can stay plain text. */

const ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

export function raw(value) {
  return new Raw(String(value));
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function render(value) {
  if (value === null || value === undefined || value === false) return "";
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += render(values[i]) + strings[i + 1];
  }
  return raw(out);
}

/** Render a list of items with a mapper, joined without separators. */
export function each(items, mapper) {
  return raw(items.map((item, index) => render(mapper(item, index))).join(""));
}

/** Turn plain-text paragraphs into markup. Blank lines separate paragraphs. */
export function paragraphs(text) {
  const blocks = String(text)
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  return raw(blocks.map((block) => `<p>${escapeHtml(block)}</p>`).join(""));
}

const LEGACY_ALPHA_CENTR_PATHS = new Map([
  [
    "/auxpage_instrukciya/",
    "/o-magazine/instruktsiya-po-primeneniyu-audio-gipnoza/"
  ],
  [
    "/auxpage_10-preimushestv-pokupki-audio-gipnoza/",
    "/o-magazine/10-preimushchestv-pokupki-audio-gipnoza/"
  ],
  [
    "/product/audio-gipnoz-ot-straha-publichnyh-vystuplenii/",
    "/catalog/rabota_i_dengi/286/"
  ],
  [
    "/product/charisma/",
    "/catalog/samorazvitie_i_lichnostnyy_rost/585/"
  ],
  [
    "/product/dostizhenie-celej-50-min/",
    "/catalog/samorazvitie_i_lichnostnyy_rost/243/"
  ],
  [
    "/product/ot-straxa-pered-neizvestnym/",
    "/catalog/trevoga_i_panika/386/"
  ],
  [
    "/product/razvitie-intuicii/",
    "/catalog/samorazvitie_i_lichnostnyy_rost/288/"
  ],
  [
    "/product/razvitie-kreativnosti/",
    "/catalog/samorazvitie_i_lichnostnyy_rost/"
  ],
  [
    "/product/umenie-vesti-peregovory-skoro-pojavitsja-dlja-skachivanija/",
    "/catalog/rabota_i_dengi/"
  ],
  [
    "/product/universalnoe-iscelenie-vnutrennij-celitel/",
    "/catalog/krasota_i_zdorove/359/"
  ]
]);

function localizeLegacyAlphaCentrHref(href) {
  const match = href.match(
    /^https?:\/\/(?:alf\.mwi\.me|gipnos\.alphacentr\.ru)(\/[^?#]*)?(?:[?#].*)?$/
  );
  if (!match) return href;
  const path = match[1] || "/";
  return LEGACY_ALPHA_CENTR_PATHS.get(path) ?? path;
}

/**
 * Render a lightweight block list used by the content data modules.
 * Each block is `{ type, ... }`; unknown types throw so a typo in content
 * fails the build instead of silently dropping text.
 */
export function blocks(items) {
  return each(items, (block) => {
    switch (block.type) {
      case "p":
        return html`<p>${inline(block.text)}</p>`;
      case "h2":
        return html`<h2>${block.text}</h2>`;
      case "h3":
        return html`<h3>${block.text}</h3>`;
      case "ul":
        return html`<ul>
          ${each(block.items, (item) => html`<li>${inline(item)}</li>`)}
        </ul>`;
      case "ol":
        return html`<ol>
          ${each(block.items, (item) => html`<li>${inline(item)}</li>`)}
        </ol>`;
      case "quote":
        return html`<blockquote>
          ${each(
            Array.isArray(block.text) ? block.text : [block.text],
            (line) => html`<p>${line}</p>`
          )}
          ${block.source ? html`<footer>— ${block.source}</footer>` : ""}
        </blockquote>`;
      case "note":
        return html`<aside class="notice">
          ${block.title ? html`<p class="notice__title">${block.title}</p>` : ""}
          ${each(
            Array.isArray(block.text) ? block.text : [block.text],
            (line) => html`<p>${inline(line)}</p>`
          )}
        </aside>`;
      default:
        throw new Error(`Unknown content block type: ${block.type}`);
    }
  });
}

/**
 * Inline markup for content strings. Supports two explicit forms so the source
 * data stays readable while links and emphasis survive the migration:
 *   [текст](/путь/)   → anchor
 *   *текст*           → emphasis
 */
export function inline(text) {
  if (text instanceof Raw) return text;
  let out = escapeHtml(text);
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (match, label, href) => {
      const localizedHref = localizeLegacyAlphaCentrHref(href);
      return `<a href="${localizedHref}"${
        localizedHref.startsWith("http") ? ' rel="noopener"' : ""
      }>${label}</a>`;
    }
  );
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return raw(out);
}

/** Format a price in roubles, or the free-of-charge label. */
export function formatPrice(value) {
  if (!value) return "Бесплатно";
  return `${value.toLocaleString("ru-RU")} ₽`;
}
