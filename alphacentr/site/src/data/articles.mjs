/* Article library.

   Seven sections migrated from /stati/. Two of them (Альфа-ритм, Волны Шумана)
   are single pages on the original site and stay single pages here.

   Copyright note: the original "Книги на тему психологии" section republished
   the complete texts of two books still under copyright (Э. Росси, М. Эриксон).
   Those two entries keep their bibliographic header and opening paragraphs
   only; the book bodies are not reproduced. See CONTENT-AUDIT.md → «Исключения». */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const contentRoot = join(import.meta.dirname, "..", "content");

function readJson(...segments) {
  return JSON.parse(readFileSync(join(contentRoot, ...segments), "utf8"));
}

const SECTION_INTROS = {
  samorazvitie_i_samosoznanie:
    "Как устроены самооценка, мотивация и привычки — и что с этим можно делать.",
  gipnoz_i_samogipnoz:
    "Что такое транс, как работает внушение и как заниматься самогипнозом.",
  lechenie_zabolevaniy_gipnozom:
    "Гипнотерапия при тревоге, бессоннице, лишнем весе, боли и зависимостях.",
  rekomendatsii_po_vyboru_seansov:
    "Разборы конкретных запросов и подсказки, какие программы подойдут.",
  alfa_ritm: "Об альфа-ритме мозга и состояниях, в которых работает гипноз.",
  volny_shumana: "О резонансе Шумана и фоновых частотах в аудио программах.",
  knigi_na_temu_psikhologii:
    "Книги по гипнозу и психологии, на которые опирается автор."
};

const rawSections = readJson("article-sections.json");

export const articleSections = rawSections.map((section) => ({
  slug: section.slug,
  name: section.name,
  intro: SECTION_INTROS[section.slug] ?? "",
  standalone: section.standalone,
  articles: readJson("articles", `${section.slug}.json`)
}));

export const sectionBySlug = new Map(
  articleSections.map((section) => [section.slug, section])
);

/* Nine additional section paths the original site served. Every article behind
   them already lives in one of the seven canonical sections; these entries only
   preserve the old URLs. */
export const aliasSections = readJson("alias-sections.json");

export const allArticles = articleSections.flatMap((section) =>
  section.articles.map((article) => ({ ...article, section }))
);

/** First paragraph of an article, used as the listing excerpt. */
export function excerpt(article, limit = 190) {
  const first = article.body.find((block) => block.type === "p");
  if (!first) return "";
  const text = first.text;
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}
