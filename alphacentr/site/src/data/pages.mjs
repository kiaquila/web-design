/* Editorial pages, FAQ, news, press coverage and testimonials.
   All text is migrated verbatim; see ../../../CONTENT-AUDIT.md. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const contentRoot = join(import.meta.dirname, "..", "content");

function readJson(name) {
  return JSON.parse(readFileSync(join(contentRoot, name), "utf8"));
}

export const editorialPages = readJson("pages.json");
export const pageByPath = new Map(
  editorialPages.map((page) => [page.path, page])
);

export const faq = readJson("faq.json");
export const news = readJson("news.json");
export const press = readJson("press.json");
export const testimonials = readJson("testimonials.json");

/** Short descriptions used for <meta name="description"> and page ledes. */
export const pageLedes = {
  "/avtor/obo-mne/":
    "Кто ведёт проект «Гипноз Альфа-Центр», какое у автора образование и с какими запросами она работает.",
  "/avtor/gipnoz-onlayn/":
    "Работают ли записи гипноза, которые можно скачать онлайн, и как слушать их, чтобы получить результат.",
  "/avtor/psikhologicheskoe-konsultirovanie/":
    "Что такое психологическое консультирование, чем оно отличается от психотерапии и психиатрии.",
  "/avtor/pomoch-avtora-v-podbore-seansov/":
    "Как получить личную рекомендацию автора по подбору сеансов и курсов под вашу задачу.",
  "/o-magazine/":
    "Авторские записи сеансов гипноза и медитации в формате mp3: кому подойдут, как выбрать, как оплатить.",
  "/o-magazine/audio-gipnoz-na-vse-sluchai-zhizni/":
    "Обзор тем, с которыми работают авторские аудио программы.",
  "/o-magazine/10-preimushchestv-pokupki-audio-gipnoza/":
    "Почему аудио гипноз для самостоятельного прослушивания удобнее личного приёма.",
  "/o-magazine/instruktsiya-po-primeneniyu-audio-gipnoza/":
    "Как, когда и сколько раз слушать сеанс, чтобы он сработал. Противопоказания.",
  "/o-magazine/kak-ne-oshibitsya-v-vybore-audio-gipnoza/":
    "На что смотреть при выборе программы и как не ошибиться с темой.",
  "/o-magazine/kak-oplatit-zakaz/":
    "Пошаговая инструкция: корзина, оформление заказа и оплата через ROBOKASSA.",
  "/o-magazine/kak-oplatit-iz-blizhnego-i-dalnego-zarubezhya/":
    "Оплата иностранными картами VISA и MasterCard, PayPal и список стран с ограничениями.",
  "/o-magazine/kak-skachat-oplachennyy-audio-gipnoz/":
    "Какие письма приходят после оплаты и как скачать файлы без потерь.",
  "/o-magazine/sistema-skidok/":
    "Автоматические скидки от 10 до 50%, купоны 5% и 25% и как они суммируются.",
  "/avtorskie-prav/": "Условия использования авторских материалов сайта.",
  "/publichnyy-dogovor-oferta/":
    "Публичный договор-оферта на приобретение аудио программ.",
  "/cookie/": "Как сайт использует файлы cookie."
};
