/* Catalogue taxonomy and session records.

   Content lives in ../content/ as JSON so that the code modules stay small and
   the migrated text keeps a single, diffable source of truth. Session records
   are keyed by the original Bitrix element id, and each session keeps the
   public URL it had on alphacentr.ru. A session may belong to several
   categories; its canonical path is the one the original site linked to. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const contentRoot = join(import.meta.dirname, "..", "content");

function readJson(...segments) {
  return JSON.parse(readFileSync(join(contentRoot, ...segments), "utf8"));
}

const rawCategories = readJson("categories.json");

/** Short editorial intros written for the redesign to orient the visitor.
    They describe the category, they do not add therapeutic claims. */
const INTROS = {
  besplatnye_seansy:
    "Два пробных сеанса, чтобы составить собственное представление о том, как гипноз действует именно на вас.",
  novye_zapisi: "Программы, записанные автором в последнюю очередь.",
  kursy_seansov:
    "Готовые последовательности сеансов на одну задачу — со скидкой относительно покупки программ по отдельности.",
  samorazvitie_i_lichnostnyy_rost:
    "Уверенность, самооценка, харизма, цели и внутренние опоры.",
  snyatie_stressa_relaksatsiya:
    "Глубокая релаксация, восстановление и практики принятия.",
  rabota_i_dengi: "Отношение к деньгам, мотивация, дело и профессиональный рост.",
  obshchenie_vzaimootnosheniya:
    "Общение, границы, отношения с близкими и с самим собой.",
  korrektsiya_vesa:
    "Пищевые привычки, образ тела и мотивация к снижению веса.",
  vrednye_privychki: "Курение, переедание и другие устойчивые привычки.",
  emotsionalnaya_zavisimost:
    "Любовная и эмоциональная зависимость, расставание, возвращение к себе.",
  krasota_i_zdorove: "Здоровье, самочувствие, тело и внешний образ.",
  seksualnye_vzaimootnosheniya: "Близость, принятие тела и сексуальность.",
  bessonnitsa: "Засыпание, качество сна и вечерние ритуалы.",
  depressiya: "Подавленность, апатия и возвращение интереса к жизни.",
  fobii_i_strakhi:
    "Страх полёта, публичных выступлений, социофобия, агорафобия и другие фобии.",
  trevoga_i_panika: "Тревога, панические атаки и навязчивые мысли.",
  audio_meditatsii: "Медитации для осознанности, покоя и восстановления.",
  affirmatsii_na_kazhdyy_den:
    "Короткие записи позитивных установок для регулярного прослушивания."
};

/** All sessions, keyed by id. */
export const sessionsById = new Map();

/* One file per catalogue section that owns canonical session URLs. */
const SESSION_FILES = [
  "affirmatsii_na_kazhdyy_den",
  "audio_meditatsii",
  "bessonnitsa",
  "depressiya",
  "emotsionalnaya_zavisimost",
  "fobii_i_strakhi",
  "korrektsiya_vesa",
  "krasota_i_zdorove",
  "kursy_seansov",
  "novye_zapisi",
  "obshchenie_vzaimootnosheniya",
  "rabota_i_dengi",
  "samorazvitie_i_lichnostnyy_rost",
  "seksualnye_vzaimootnosheniya",
  "snyatie_stressa_relaksatsiya",
  "trevoga_i_panika",
  "vrednye_privychki"
];

for (const name of SESSION_FILES) {
  const records = readJson("sessions", `${name}.json`);
  for (const [id, session] of Object.entries(records)) {
    sessionsById.set(id, session);
  }
}

export const categories = rawCategories.map((category) => ({
  slug: category.slug,
  name: category.name,
  intro: INTROS[category.slug] ?? "",
  sessions: category.sessions
    .map((id) => sessionsById.get(id))
    .filter(Boolean)
}));

export const categoryBySlug = new Map(
  categories.map((category) => [category.slug, category])
);

/** Every session, ordered by the catalogue order, without duplicates. */
export const allSessions = [...sessionsById.values()];

/** Categories a session appears in — used for cross-links on the detail page. */
export function categoriesForSession(sessionId) {
  return categories.filter((category) =>
    category.sessions.some((session) => session.id === sessionId)
  );
}
