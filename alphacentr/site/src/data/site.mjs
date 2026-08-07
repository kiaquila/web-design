/* Brand, contact, and legal facts.
   Every value here is migrated verbatim from alphacentr.ru — see
   ../../../CONTENT-AUDIT.md for the source of each item. Do not invent or
   "improve" a phone number, address, tax id, or claim. */

export const site = {
  concept: "Альфа Люмен",
  conceptLatin: "Alpha Lumen",
  name: "Гипноз Альфа-Центр",
  author: "Елена Вальяк",
  authorRole: "гипнолог-практик, психолог-консультант",
  tagline: "Авторский сайт гипнолога Елены Вальяк",
  origin: "https://alphacentr.ru",
  description:
    "Авторские сеансы гипноза, медитации и аффирмации в формате mp3 " +
    "от практикующего гипнолога Елены Вальяк.",
  locale: "ru-RU",

  phone: "+7 (495) 227-05-00",
  phoneHref: "tel:+74952270500",
  email: "gipnosalphacentr@gmail.com",
  /* Second address published on the session-selection page. */
  emailSelection: "ElenaValiak@gmail.com",
  hours: "Пн. – Пт.: с 9:00 до 18:00",

  legalEntity: "ИП Вальяк Елена Юрьевна",
  taxId: "ИНН 507902021260",
  copyright: "© Авторский сайт гипнолога Елены Вальяк 2011 – 2026"
};

export const social = [
  {
    name: "ВКонтакте",
    href: "https://vk.com/gipnos_alphacentr_ru",
    icon: "vk"
  },
  {
    name: "Telegram",
    href: "https://t.me/s/elena_valiak",
    icon: "telegram"
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/channel/UCgDyuvWoEK9sQD8MwZ1oWoQ",
    icon: "youtube"
  }
];

/* Home-page assurance strip — migrated from the original benefits row. */
export const assurances = [
  {
    value: "Более 100 000",
    label: "скачиваний авторских программ"
  },
  {
    value: "Мгновенно",
    label: "доступ к скачиванию сразу после оплаты"
  },
  {
    value: "Автоматически",
    label: "оплата картой, СБП и электронными кошельками"
  },
  {
    value: "Лично",
    label: "помощь автора в подборе сеансов и курсов"
  }
];

/* Icon paths are hand-drawn here so the site loads no third-party assets. */
export const socialIcons = {
  vk: "M12.8 15.9s.3-.03.4-.2c.13-.14.13-.4.13-.4s0-1.2.55-1.38c.55-.17 1.25 1.15 2 1.66.56.38 1 .3 1 .3l2-.03s1.03-.06.54-.88c-.04-.07-.29-.6-1.48-1.7-1.25-1.16-1.08-.98.42-2.98.91-1.21 1.28-1.95 1.16-2.27-.11-.3-.78-.22-.78-.22l-2.24.01s-.17-.02-.29.06c-.12.07-.2.24-.2.24s-.36.95-.83 1.75c-1 1.7-1.4 1.79-1.56 1.68-.38-.24-.29-.98-.29-1.5 0-1.63.25-2.31-.48-2.49-.24-.06-.42-.1-1.04-.1-.8-.01-1.47 0-1.85.19-.25.12-.45.4-.33.42.14.02.47.09.64.33.22.3.21.99.21.99s.13 1.87-.3 2.1c-.29.16-.69-.17-1.58-1.71-.46-.79-.8-1.66-.8-1.66s-.07-.16-.19-.25c-.14-.1-.34-.13-.34-.13l-2.13.01s-.32.01-.44.15c-.1.12-.01.38-.01.38s1.67 3.88 3.56 5.84c1.73 1.79 3.7 1.67 3.7 1.67z",
  telegram: "M20.6 4.3 3.5 10.9c-1.17.47-1.16 1.12-.21 1.41l4.38 1.37 1.7 5.19c.2.57.1.8.7.8.47 0 .68-.21.94-.47l2.14-2.08 4.45 3.29c.82.45 1.41.22 1.62-.76l2.93-13.8c.3-1.2-.46-1.75-1.55-1.26zm-11.9 9.8 9.65-6.08c.48-.29.92-.14.56.18l-8.26 7.46-.32 3.43-1.63-4.99z",
  youtube:
    "M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.1V8.9l5.2 3.1-5.2 3.1z"
};
