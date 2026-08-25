/* Information architecture.
   The original site spread the same pages across five top-level menus with
   duplicated sub-lists. Alpha Lumen keeps every destination but groups them
   into six predictable entries: three menus and three direct links.
   Public URLs are preserved so existing links and search results keep working. */

export const primaryNav = [
  {
    id: "catalog",
    label: "Сеансы",
    href: "/catalog/",
    type: "menu",
    /* Filled from catalogue data at render time. */
    source: "categories"
  },
  {
    id: "author",
    label: "Автор",
    href: "/avtor/",
    type: "menu",
    items: [
      { label: "Обо мне", href: "/avtor/obo-mne/" },
      { label: "Гипноз онлайн", href: "/avtor/gipnoz-onlayn/" },
      {
        label: "Психологическое консультирование",
        href: "/avtor/psikhologicheskoe-konsultirovanie/"
      },
      { label: "Пресса и ТВ", href: "/avtor/pressa-i-tv/" },
      {
        label: "Помощь автора в подборе сеансов",
        href: "/avtor/pomoch-avtora-v-podbore-seansov/"
      }
    ]
  },
  { id: "articles", label: "Статьи", href: "/stati/", type: "link" },
  { id: "reviews", label: "Отзывы", href: "/otzyvy/", type: "link" },
  {
    id: "help",
    label: "Помощь",
    href: "/o-magazine/",
    type: "menu",
    items: [
      { label: "О магазине", href: "/o-magazine/" },
      {
        label: "Аудио гипноз на все случаи жизни",
        href: "/o-magazine/audio-gipnoz-na-vse-sluchai-zhizni/"
      },
      {
        label: "10 преимуществ покупки аудио гипноза",
        href: "/o-magazine/10-preimushchestv-pokupki-audio-gipnoza/"
      },
      {
        label: "Инструкция по применению",
        href: "/o-magazine/instruktsiya-po-primeneniyu-audio-gipnoza/"
      },
      {
        label: "Как не ошибиться в выборе",
        href: "/o-magazine/kak-ne-oshibitsya-v-vybore-audio-gipnoza/"
      },
      { label: "Как оплатить заказ", href: "/o-magazine/kak-oplatit-zakaz/" },
      {
        label: "Оплата из-за рубежа",
        href: "/o-magazine/kak-oplatit-iz-blizhnego-i-dalnego-zarubezhya/"
      },
      {
        label: "Как скачать оплаченный сеанс",
        href: "/o-magazine/kak-skachat-oplachennyy-audio-gipnoz/"
      },
      { label: "Система скидок", href: "/o-magazine/sistema-skidok/" },
      { label: "Вопрос-ответ", href: "/info/faq/" }
    ]
  },
  { id: "contacts", label: "Контакты", href: "/avtor/kontakty/", type: "link" }
];

export const footerNav = [
  {
    title: "Сайт",
    items: [
      { label: "Все сеансы", href: "/catalog/" },
      { label: "Бесплатные сеансы", href: "/catalog/besplatnye_seansy/" },
      { label: "Курсы со скидкой", href: "/catalog/kursy_seansov/" },
      { label: "Об авторе", href: "/avtor/obo-mne/" },
      { label: "Новости", href: "/news/" },
      { label: "Статьи о гипнозе", href: "/stati/" },
      { label: "Отзывы", href: "/otzyvy/" }
    ]
  },
  {
    title: "Информация",
    items: [
      { label: "О магазине", href: "/o-magazine/" },
      {
        label: "Инструкция по прослушиванию",
        href: "/o-magazine/instruktsiya-po-primeneniyu-audio-gipnoza/"
      },
      { label: "Система скидок", href: "/o-magazine/sistema-skidok/" },
      { label: "Авторские права", href: "/avtorskie-prav/" },
      { label: "Договор-оферта", href: "/publichnyy-dogovor-oferta/" },
      { label: "Условия использования cookie", href: "/cookie/" }
    ]
  },
  {
    title: "Помощь",
    items: [
      { label: "Вопрос-ответ", href: "/info/faq/" },
      {
        label: "Помощь автора в подборе сеансов",
        href: "/avtor/pomoch-avtora-v-podbore-seansov/"
      },
      { label: "Как оплатить заказ", href: "/o-magazine/kak-oplatit-zakaz/" },
      {
        label: "Как скачать сеанс",
        href: "/o-magazine/kak-skachat-oplachennyy-audio-gipnoz/"
      },
      {
        label: "Консультирование онлайн",
        href: "/avtor/psikhologicheskoe-konsultirovanie/"
      },
      { label: "Обратная связь", href: "/avtor/kontakty/" }
    ]
  }
];
