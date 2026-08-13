/* Single source of truth for every string on the page, in both languages.
   The build renders one static page per language from this file, so a locale
   can never drift out of sync with the markup: a missing key is a build error,
   not a half-translated page in production.

   Anything the client has not supplied yet carries `todo: true`. The build
   prints those sections as a warning on every run, so unfinished copy stays
   visible instead of quietly becoming the final wording. */

/** Kristina has been working in web development since this year. The page
 *  states a duration, so it is derived at build time rather than typed in —
 *  a hardcoded "9 years" silently becomes a lie every January. */
export const CAREER_START_YEAR = 2017;

export const experienceYears = (now = new Date()) =>
  now.getUTCFullYear() - CAREER_START_YEAR;

/** Approved external destinations. Kept in one place so the test that forbids
 *  stray outbound links has a list to check against. */
export const links = {
  linkedin: "https://www.linkedin.com/in/kiaquila",
  telegram: "https://t.me/ks_aquila",
  instagram: "https://www.instagram.com/ks_aquila",
  email: "krisredlips@gmail.com",
  work: {
    chaijana: "https://chaijana.ks-design.workers.dev",
    alexNeon: "https://alex-neon.ks-design.workers.dev"
  }
};

export const languages = {
  ru: { locale: "ru-RU", ogLocale: "ru_RU", label: "RU", path: "/" },
  en: { locale: "en", ogLocale: "en_US", label: "EN", path: "/en/" }
};

/** One social card per language — sharing the English page with a card that
 *  carries the Russian headline is a mixed-language preview. Rendered by
 *  `scripts/make-og.mjs`, copied by the build, referenced by the renderer;
 *  named here so those three cannot disagree. */
export const ogImages = { ru: "og.png", en: "og-en.png" };

export const content = {
  ru: {
    meta: {
      title: "ks-design — Кристина Аквила, веб-дизайнер",
      description:
        "Дизайн лендингов и сайтов, который вовлекает и продаёт. Работаю с нейросетями, поэтому получается быстрее и дешевле. Буэнос-Айрес, работаю удалённо.",
      ogTitle: "Сделаю вам дизайн, который вовлекает",
      ogDescription:
        "Веб-дизайн лендингов, сайтов и меню. Концепт, две серии правок, готовый сайт."
    },
    nav: {
      label: "Разделы страницы",
      work: "Работы",
      process: "Процесс",
      services: "Услуги",
      contact: "Контакты",
      cta: "Обсудить проект"
    },
    langSwitch: { label: "Язык", ru: "RU", en: "EN" },
    skipLink: "К содержанию",
    hero: {
      eyebrow: "Веб-дизайнер · Буэнос-Айрес",
      title: "Сделаю вам дизайн, который вовлекает",
      subtitle: "И вас точно запомнят и захотят вернуться.",
      primary: "Обсудить проект",
      secondary: "Смотреть работы",
      portraitAlt: "Кристина Аквила, портрет",
      /* Lives on the frosted panel that rises over the portrait on hover. */
      portraitStats: [
        { value: "%YEARS%", label: "лет в вебе" },
        { value: "2", label: "серии правок включены" },
        { value: "4", label: "шага до готового сайта" },
        { value: "500 USD", label: "лендинг под ключ" }
      ]
    },
    work: {
      id: "work",
      eyebrow: "Работы",
      title: "Избранные проекты",
      intro:
        "Редизайны действующих бизнесов: и концепт, и вёрстка, и запуск — целиком мои.",
      previous: "Предыдущие работы",
      next: "Следующие работы",
      visit: "Открыть сайт",
      items: [
        {
          slug: "chaijana",
          name: "Chaijaná Noir",
          kind: "Ресторан · сайт и меню",
          year: "2026",
          summary:
            "Тёмная и тёплая подача для чайханы в Буэнос-Айресе: сайт, трёхъязычное меню и обработка фотографий блюд.",
          href: links.work.chaijana,
          image: "chaijana",
          alt: "Главная страница сайта Chaijaná Noir"
        },
        {
          slug: "alex-neon",
          name: "Alex Neon",
          kind: "Лендинг",
          year: "2026",
          summary:
            "Редизайн лендинга «ИИ по делу»: тёмная тема, один неоновый акцент и живая нейро-графика на канвасе.",
          href: links.work.alexNeon,
          image: "alex-neon",
          alt: "Первый экран лендинга Alex Neon"
        }
      ]
    },
    process: {
      id: "process",
      eyebrow: "Процесс",
      title: "Как устроен процесс",
      intro: "Четыре шага, без сюрпризов по дороге.",
      steps: [
        {
          n: "01",
          title: "Собираем смыслы",
          body:
            "Аккуратно собираем и формулируем с вами смыслы — всё, что вы считаете важным и хотите отразить в лендинге или сайте."
        },
        { n: "02", title: "Концепт дизайна", body: "Делаю для вас концепт дизайна." },
        { n: "03", title: "Две серии правок", body: "Проходим две серии правок от вас." },
        { n: "04", title: "Готовый сайт", body: "Вы получаете готовый сайт." }
      ]
    },
    services: {
      id: "services",
      eyebrow: "Услуги",
      title: "Services",
      intro: "Фиксированные цены. Что не входит — обсуждаем до старта, а не после.",
      currencyNote: "Цены указаны в долларах США.",
      items: [
        { name: "Лендинг", price: "500 USD", note: "Одностраничный сайт под ключ." },
        {
          name: "Сайт от 5 страниц",
          price: "1 500 USD",
          note: "Многостраничный сайт со сквозной структурой."
        },
        {
          name: "Вёрстка меню",
          price: "100 USD",
          note: "За первую страницу, дальше — 20 USD за каждую следующую."
        },
        {
          name: "Обработка фото блюд",
          price: "50 USD",
          note: "За 10 блюд."
        }
      ],
      cta: "Обсудить проект"
    },
    kindWords: {
      id: "kind-words",
      eyebrow: "Отзывы",
      title: "Kind Words",
      intro: "Что говорят те, с кем мы уже поработали.",
      todo: true,
      todoNote:
        "Заглушка: замените на реальные отзывы клиентов до публикации.",
      items: [
        {
          quote: "TODO: реальная цитата клиента.",
          name: "Alex Oxitocin",
          role: "Alex Neon · лендинг «ИИ по делу»",
          avatar: "alex-oxitocin",
          avatarAlt: "Аватар Alex Oxitocin",
          initials: null
        },
        {
          quote: "TODO: реальная цитата клиента.",
          name: "TODO: имя",
          role: "TODO: роль, компания",
          avatar: null,
          initials: "—"
        },
        {
          quote: "TODO: реальная цитата клиента.",
          name: "TODO: имя",
          role: "TODO: роль, компания",
          avatar: null,
          initials: "—"
        }
      ]
    },
    contact: {
      id: "contact",
      band: {
        title: "Get in touch",
        note: "Пишите — и сделаю вам классный продающий дизайн."
      },
      location: "Buenos Aires, Argentina",
      social: {
        linkedin: "LinkedIn",
        telegram: "Telegram",
        instagram: "Instagram"
      }
    },
    footer: { copyright: "© Kristina Aquila" },
    notFound: {
      title: "Страница не найдена",
      body: "Такой страницы здесь нет. Вернитесь на главную.",
      cta: "На главную"
    }
  },

  en: {
    meta: {
      title: "ks-design — Kristina Aquila, web designer",
      description:
        "Landing pages and websites designed to pull people in and sell. I work with AI, so it lands faster and costs less. Based in Buenos Aires, working remotely.",
      ogTitle: "I'll design something that pulls people in",
      ogDescription:
        "Web design for landing pages, websites and menus. A concept, two rounds of edits, a finished site."
    },
    nav: {
      label: "Page sections",
      work: "Work",
      process: "Process",
      services: "Services",
      contact: "Contact",
      cta: "Start a project"
    },
    langSwitch: { label: "Language", ru: "RU", en: "EN" },
    skipLink: "Skip to content",
    hero: {
      eyebrow: "Web designer · Buenos Aires",
      title: "I'll design something that pulls people in",
      subtitle: "The kind of work people remember — and come back to.",
      primary: "Start a project",
      secondary: "See the work",
      portraitAlt: "Kristina Aquila, portrait",
      portraitStats: [
        { value: "%YEARS%", label: "years in web" },
        { value: "2", label: "rounds of edits included" },
        { value: "4", label: "steps to a finished site" },
        { value: "USD 500", label: "landing page, done" }
      ]
    },
    work: {
      id: "work",
      eyebrow: "Work",
      title: "Selected projects",
      intro:
        "Redesigns of working businesses — concept, build and launch, all mine.",
      previous: "Previous projects",
      next: "Next projects",
      visit: "Open the site",
      items: [
        {
          slug: "chaijana",
          name: "Chaijaná Noir",
          kind: "Restaurant · site and menu",
          year: "2026",
          summary:
            "A dark, warm treatment for a Buenos Aires chaikhana: website, a menu in three languages, and dish photo retouching.",
          href: links.work.chaijana,
          image: "chaijana",
          alt: "Chaijaná Noir website home page"
        },
        {
          slug: "alex-neon",
          name: "Alex Neon",
          kind: "Landing page",
          year: "2026",
          summary:
            "A redesign of the «ИИ по делу» landing: dark theme, a single neon accent, and a live neural canvas.",
          href: links.work.alexNeon,
          image: "alex-neon",
          alt: "Alex Neon landing page, first screen"
        }
      ]
    },
    process: {
      id: "process",
      eyebrow: "Process",
      title: "How the work goes",
      intro: "Four steps, no surprises along the way.",
      steps: [
        {
          n: "01",
          title: "We find the meaning",
          body:
            "We carefully gather and sharpen your meaning together — everything you consider important and want the landing page or site to say."
        },
        { n: "02", title: "A design concept", body: "I design a concept for you." },
        { n: "03", title: "Two rounds of edits", body: "We go through two rounds of your edits." },
        { n: "04", title: "The finished site", body: "You get the finished site." }
      ]
    },
    services: {
      id: "services",
      eyebrow: "Services",
      title: "Services",
      intro: "Fixed prices. Anything outside them we agree before we start, not after.",
      currencyNote: "Prices are in US dollars.",
      items: [
        { name: "Landing page", price: "USD 500", note: "A single-page site, done end to end." },
        {
          name: "Website, 5+ pages",
          price: "USD 1,500",
          note: "A multi-page site with one consistent structure."
        },
        {
          name: "Menu build",
          price: "USD 100",
          note: "For the first page, then USD 20 for each additional one."
        },
        { name: "Dish photo retouching", price: "USD 50", note: "Per 10 dishes." }
      ],
      cta: "Start a project"
    },
    kindWords: {
      id: "kind-words",
      eyebrow: "Testimonials",
      title: "Kind Words",
      intro: "What the people I've worked with say.",
      todo: true,
      todoNote: "Placeholder: replace with real client quotes before publishing.",
      items: [
        {
          quote: "TODO: real client quote.",
          name: "Alex Oxitocin",
          role: "Alex Neon · «ИИ по делу» landing",
          avatar: "alex-oxitocin",
          avatarAlt: "Alex Oxitocin's avatar",
          initials: null
        },
        {
          quote: "TODO: real client quote.",
          name: "TODO: name",
          role: "TODO: role, company",
          avatar: null,
          initials: "—"
        },
        {
          quote: "TODO: real client quote.",
          name: "TODO: name",
          role: "TODO: role, company",
          avatar: null,
          initials: "—"
        }
      ]
    },
    contact: {
      id: "contact",
      band: {
        title: "Get in touch",
        note: "Write me — I'll make you a design that sells."
      },
      location: "Buenos Aires, Argentina",
      social: {
        linkedin: "LinkedIn",
        telegram: "Telegram",
        instagram: "Instagram"
      }
    },
    footer: { copyright: "© Kristina Aquila" },
    notFound: {
      title: "Page not found",
      body: "There is no such page here. Head back to the home page.",
      cta: "Home"
    }
  }
};
