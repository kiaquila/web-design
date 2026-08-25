import type { Metadata } from "next";
import { headers } from "next/headers";

type Lang = "es" | "en" | "ru";

type Copy = {
  skip: string;
  homeLabel: string;
  navigationLabel: string;
  languageLabel: string;
  nav: { story: string; chef: string; events: string; visit: string };
  hero: { eyebrow: string; title: string; descriptor: string };
  menu: string;
  reserve: string;
  facts: { addressLabel: string; address: string; whatsapp: string; hours: string; everyDay: string };
  gallery: { first: string[]; second: string[] };
  story: { kicker: string; title: string; paragraphs: string[] };
  chef: { kicker: string; title: string; role: string; lead: string; paragraphs: string[] };
  events: {
    kicker: string;
    title: string;
    intro: string;
    cards: Array<{ title: string; text: string }>;
  };
  carta: {
    kicker: string;
    title: string;
    intro: string;
    cta: string;
    dishes: Array<{ name: string; text: string }>;
  };
  footer: { visit: string; contacts: string; back: string; rights: string };
};

/* The arch from the Chaijaná wordmark, reused as a quiet ornament. */
function ArchOrnament({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 210"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      aria-hidden="true"
    >
      <path d="M96 172c0-50 10-74 32-96 12-12 22-34 22-60 0 26 10 48 22 60 22 22 32 46 32 96" />
      <path d="M6 172h90M204 172h90" />
      <circle cx="150" cy="112" r="6.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Section rule: hairline — arabesque knot — hairline. */
function RuleOrnament() {
  return (
    <div className="rule-ornament" aria-hidden="true">
      <svg viewBox="0 0 60 14" width="60" height="14" fill="none" stroke="currentColor">
        <path d="M23 7 30 1.5 37 7l-7 5.5z" strokeWidth="1" />
        <circle cx="30" cy="7" r="1.7" fill="currentColor" stroke="none" />
        <path d="M22 7c-4.4 0-6.6-4-11-4-3.3 0-5 1.8-5 4s1.7 4 5 4c4.4 0 6.6-4 11-4z" strokeWidth="1" />
        <path d="M38 7c4.4 0 6.6-4 11-4 3.3 0 5 1.8 5 4s-1.7 4-5 4c-4.4 0-6.6-4-11-4z" strokeWidth="1" />
      </svg>
    </div>
  );
}

const copy: Record<Lang, Copy> = {
  es: {
    skip: "Saltar al contenido",
    homeLabel: "Chaijaná — inicio",
    navigationLabel: "Navegación principal",
    languageLabel: "Selector de idioma",
    nav: { story: "Nuestra historia", chef: "Chef", events: "Eventos", visit: "Visitanos" },
    hero: {
      eyebrow: "Bienvenidos a",
      title: "Un rincón de Asia Central en Buenos Aires",
      descriptor: "Alta gastronomía oriental · Narguile · Halal · Vegetariano",
    },
    menu: "La carta",
    reserve: "Reservar mesa",
    facts: {
      addressLabel: "Dónde estamos",
      address: "Bonpland 1965 · Palermo Hollywood",
      whatsapp: "WhatsApp · +54 9 11 3053 7933",
      hours: "11:00 – 00:00",
      everyDay: "Abierto todos los días",
    },
    gallery: {
      first: [
        "Servicio en el salón de Chaijaná",
        "Fachada de Chaijaná en Bonpland 1965",
        "Bar de Chaijaná",
        "Patio de Chaijaná con narguile",
      ],
      second: ["Samsa de Chaijaná", "Mesa de sabores de Asia Central", "Manti", "Plov uzbeko"],
    },
    story: {
      kicker: "El origen",
      title: "Nuestra historia",
      paragraphs: [
        "Inspirados en las tradicionales chaijanas —casas de té de Asia Central donde se reúne la comunidad—, creamos CHAIJANA para compartir la calidez, la hospitalidad y los sabores ancestrales de Uzbekistán. Cada receta y cada detalle del espacio están pensados para transportar a nuestros invitados a un lugar lejano, pero lleno de alma.",
        "Este proyecto nace de la pasión de Kaplin por la cocina auténtica, la cultura oriental y la experiencia de compartir. CHAIJANA no es solo un restaurante: es un viaje para los sentidos.",
      ],
    },
    chef: {
      kicker: "25 años de trayectoria",
      title: "Dmitry Kaplin",
      role: "Chef",
      lead: "Chef y alma máter de Chaijaná",
      paragraphs: [
        "Con más de 25 años de trayectoria, Dmitry Kaplin ha recorrido un camino que une pasión, técnica y cultura. Se formó en cocinas de prestigio en Francia y Rusia, especializándose en gastrobotánica y técnicas de fermentación. Desde hace dos años ha hecho de Buenos Aires su hogar, trayendo consigo la esencia y el espíritu de la cocina de Asia Central.",
        "Apasionado por rescatar culturas gastronómicas milenarias que aún permanecen desconocidas para gran parte del mundo, creó Chaijaná como un espacio para celebrar esta tradición: las chaikhanas, sus técnicas de cocción ancestrales, los fermentos y una hospitalidad que trasciende fronteras. En una ciudad donde conviven sabores de todo el planeta, Dmitry propone algo más que un menú: una experiencia auténtica, sensorial y profundamente humana.",
      ],
    },
    events: {
      kicker: "Encuentros en Chaijaná",
      title: "Eventos especiales",
      intro:
        "Organizamos experiencias únicas: desde conciertos acústicos llenos de calidez, hasta mágicas cenas temáticas de Las mil y una noches inspiradas en Asia Central y degustaciones exclusivas con menús creados por chefs Michelin invitados.",
      cards: [
        {
          title: "Tus celebraciones",
          text: "Cumpleaños, bodas, aniversarios o eventos corporativos: cualquier ocasión especial merece un lugar único. En Chaijaná podés reservar desde una mesa para una reunión íntima hasta un salón privado o todo el restaurante para vos y tus invitados. Sumale nuestra cocina, ambientación y hospitalidad, y convertí tu evento en una experiencia inolvidable.",
        },
        {
          title: "Música en vivo, todos los sábados",
          text: "Cada sábado por la noche, Chaijaná se llena de melodías y buena energía con presentaciones acústicas en vivo. Un ambiente íntimo, cálido y perfecto para disfrutar de nuestra cocina mientras la música te acompaña en un viaje sensorial por sabores y sonidos.",
        },
        {
          title: "Menús de Chefs Invitados",
          text: "En Chaijaná abrimos nuestras puertas a chefs de renombre de todo el mundo, quienes diseñan menús exclusivos que solo podés disfrutar por tiempo limitado. Cada propuesta combina la esencia de Asia Central con técnicas y sabores internacionales, creando platos únicos que no volverán a repetirse. Una oportunidad para vivir un viaje gastronómico irrepetible en cada visita.",
        },
      ],
    },
    carta: {
      kicker: "Sabores de Oriente",
      title: "La carta",
      intro:
        "Uzbekistán, Rusia y el Cáucaso en una misma mesa: horno de barro, brasas, masas hechas a mano y té de la casa.",
      cta: "Ver la carta completa",
      dishes: [
        { name: "Plov uzbeko", text: "Arroz, carne y zanahoria al fuego en kazan." },
        { name: "Khachapuri estilo Adjarian", text: "Barca de pan dorada con queso y huevo." },
        { name: "Manti", text: "Hechos a mano, al vapor, en el momento." },
        { name: "Medovik", text: "Finas capas de miel con crema suave." },
      ],
    },
    footer: { visit: "Visitanos", contacts: "Contacto", back: "Volver arriba", rights: "Todos los derechos reservados." },
  },
  en: {
    skip: "Skip to content",
    homeLabel: "Chaijaná — home",
    navigationLabel: "Primary navigation",
    languageLabel: "Language selector",
    nav: { story: "Our story", chef: "Chef", events: "Events", visit: "Visit us" },
    hero: {
      eyebrow: "Welcome to",
      title: "A corner of Central Asia in Buenos Aires",
      descriptor: "Fine Eastern cuisine · Hookah · Halal · Vegetarian",
    },
    menu: "Menu",
    reserve: "Reserve a table",
    facts: {
      addressLabel: "Find us",
      address: "Bonpland 1965 · Palermo Hollywood",
      whatsapp: "WhatsApp · +54 9 11 3053 7933",
      hours: "11:00 – 00:00",
      everyDay: "Open every day",
    },
    gallery: {
      first: [
        "Service in the Chaijaná dining room",
        "Chaijaná at Bonpland 1965",
        "The bar at Chaijaná",
        "Chaijaná patio and hookah",
      ],
      second: ["Chaijaná samsa", "A table of Central Asian flavors", "Manti", "Uzbek plov"],
    },
    story: {
      kicker: "The origin",
      title: "Our story",
      paragraphs: [
        "Inspired by the traditional tea houses (chaijana) of Central Asia, where communities gather, we created CHAIJANA to share the warmth, hospitality and time-honored flavors of Uzbekistan. Every recipe and every detail of the space is designed to transport our guests to a distant yet soulful place.",
        "This project stems from Kaplin’s passion for authentic cuisine, Eastern culture and the joy of sharing. CHAIJANA is not just a restaurant; it is a journey for the senses.",
      ],
    },
    chef: {
      kicker: "25 years of experience",
      title: "Dmitry Kaplin",
      role: "Chef",
      lead: "Chef and soul of Chaijaná",
      paragraphs: [
        "With over 25 years of experience, Dmitry Kaplin has traveled a path that unites passion, technique and culture. He trained in prestigious kitchens in France and Russia, specializing in gastrobotany and fermentation techniques. For the past two years, he has made Buenos Aires his home, bringing with him the essence and spirit of Central Asian cuisine.",
        "Passionate about rescuing ancient culinary cultures that remain unknown to much of the world, he created Chaijaná as a space to celebrate this tradition: chaikhanas, their ancestral cooking techniques, ferments and a hospitality that transcends borders. In a city where flavors from around the world coexist, Dmitry offers more than just a menu: an authentic, sensorial and deeply human experience.",
      ],
    },
    events: {
      kicker: "Gatherings at Chaijaná",
      title: "Events",
      intro:
        "We organize unique experiences: from warm acoustic concerts to magical One Thousand and One Nights-themed dinners inspired by Central Asia, and exclusive tastings with menus created by guest Michelin-starred chefs.",
      cards: [
        {
          title: "Your celebrations",
          text: "Birthdays, weddings, anniversaries or corporate events: any special occasion deserves a unique venue. At Chaijaná, you can reserve a table for an intimate gathering, a private room or the entire restaurant for you and your guests. Add our cuisine, ambiance and hospitality to your event and make it an unforgettable experience.",
        },
        {
          title: "Live music every Saturday",
          text: "Every Saturday night, Chaijaná is filled with melodies and good energy with live acoustic performances. An intimate, warm atmosphere, perfect for enjoying our cuisine while the music accompanies you on a sensorial journey through flavors and sounds.",
        },
        {
          title: "Chef's Tables",
          text: "At Chaijaná, we open our doors to renowned chefs from around the world, who design exclusive menus that you can enjoy for a limited time only. Each offering combines the essence of Central Asia with international techniques and flavors, creating unique dishes that will never be repeated. An opportunity to experience a unique gastronomic journey with every visit.",
        },
      ],
    },
    carta: {
      kicker: "Taste of the East",
      title: "The menu",
      intro:
        "Uzbekistan, Russia and the Caucasus at one table: the clay oven, live charcoal, handmade dough and house teas.",
      cta: "See the full menu",
      dishes: [
        { name: "Uzbek plov", text: "Rice, meat and carrot cooked over fire in a kazan." },
        { name: "Adjarian khachapuri", text: "A golden bread boat with cheese and egg." },
        { name: "Manti", text: "Hand-folded and steamed to order." },
        { name: "Medovik", text: "Delicate honey layers with soft cream." },
      ],
    },
    footer: { visit: "Visit us", contacts: "Contact", back: "Back to top", rights: "All rights reserved." },
  },
  ru: {
    skip: "Перейти к содержанию",
    homeLabel: "Chaijaná — на главную",
    navigationLabel: "Основная навигация",
    languageLabel: "Выбор языка",
    nav: { story: "О нас", chef: "Шеф-повар", events: "Мероприятия", visit: "Контакты" },
    hero: {
      eyebrow: "Добро пожаловать",
      title: "В уголок Центральной Азии в самом сердце Буэнос-Айреса",
      descriptor: "Высокая кухня · Кальяны · Халяль · Вегетарианские блюда",
    },
    menu: "Меню",
    reserve: "Забронировать стол",
    facts: {
      addressLabel: "Наш адрес",
      address: "Bonpland 1965 · Palermo Hollywood",
      whatsapp: "WhatsApp · +54 9 11 3053 7933",
      hours: "11:00 – 00:00",
      everyDay: "Ежедневно",
    },
    gallery: {
      first: [
        "Обслуживание в зале Chaijaná",
        "Фасад Chaijaná по адресу Bonpland 1965",
        "Бар Chaijaná",
        "Патио Chaijaná с кальяном",
      ],
      second: ["Самса в Chaijaná", "Стол с блюдами Центральной Азии", "Манты", "Узбекский плов"],
    },
    story: {
      kicker: "Истоки",
      title: "О нас",
      paragraphs: [
        "Вдохновлённые традиционными чайханами — центральноазиатскими чайными домами, где собирается местная община, — мы создали CHAIJANA, чтобы поделиться теплом, гостеприимством и исконными вкусами Узбекистана. Каждый рецепт, каждая деталь пространства призваны перенести наших гостей в далёкое, но в то же время душевное место.",
        "Этот проект родился из страсти Дмитрия Каплина к аутентичной кухне, восточной культуре и стремления делиться. CHAIJANA — это не просто ресторан: это путешествие на Восток.",
      ],
    },
    chef: {
      kicker: "Более 25 лет опыта",
      title: "Дмитрий Каплин",
      role: "Шеф-повар",
      lead: "Шеф-повар и душа Chaijaná",
      paragraphs: [
        "Дмитрий Каплин, обладающий более чем 25-летним опытом, прошёл путь, объединяющий страсть, мастерство и культуру. Он обучался на престижных кухнях Франции и России, специализируясь на гастроботанике и методах ферментации. Последние три года он живёт в Буэнос-Айресе, привнося с собой суть и дух центральноазиатской кухни.",
        "Увлечённый идеей возрождения древних кулинарных культур, остающихся неизвестными большей части мира, он создал Chaijaná как место, где можно воздать должное древней восточной традиции: чайханам, их исконным кулинарным техникам, ферментации и гостеприимству, не знающему границ. В городе, где сосуществуют вкусы со всего мира, Дмитрий предлагает больше, чем просто меню: аутентичный, культурный и глубокий гастрономический опыт.",
      ],
    },
    events: {
      kicker: "Встречи в Chaijaná",
      title: "Мероприятия",
      intro:
        "Мы организуем уникальные впечатления: от тёплых акустических концертов до волшебных ужинов в стиле «Тысячи и одной ночи», вдохновлённых Центральной Азией, и эксклюзивных дегустаций с меню, созданными приглашёнными шеф-поварами, удостоенными звёзд Мишлен.",
      cards: [
        {
          title: "Ваши события",
          text: "Дни рождения, свадьбы, юбилеи или корпоративные мероприятия: любое особое событие заслуживает уникального места. В Chaijaná вы можете забронировать столик для камерной встречи, отдельный зал или весь ресторан для себя и своих гостей. Добавьте к своему мероприятию нашу кухню, атмосферу и гостеприимство, и оно станет незабываемым.",
        },
        {
          title: "Живая музыка каждую субботу",
          text: "Каждую субботу вечером в Chaijaná царит атмосфера вдохновения и позитива благодаря живым акустическим выступлениям. Уютная, тёплая атмосфера идеально подходит для того, чтобы насладиться нашей кухней, пока музыка сопровождает вас в чувственном путешествии сквозь вкусы и звуки.",
        },
        {
          title: "Шеф-тейблы",
          text: "В Chaijaná мы рады приветствовать известных шеф-поваров со всего мира, которые создают эксклюзивные меню, доступные только в течение ограниченного времени. Каждое предложение сочетает в себе традиционную кухню Центральной Азии с международными техниками и вкусами, создавая уникальные блюда, которые невозможно повторить. Это возможность совершить уникальное гастрономическое путешествие с каждым посещением.",
        },
      ],
    },
    carta: {
      kicker: "Вкус Востока",
      title: "Меню",
      intro:
        "Узбекистан, Россия и Кавказ за одним столом: тандыр, живые угли, тесто ручной лепки и фирменный чай.",
      cta: "Смотреть меню целиком",
      dishes: [
        { name: "Узбекский плов", text: "Рис, мясо и морковь на огне в казане." },
        { name: "Хачапури по-аджарски", text: "Румяная лодочка с сыром и яйцом." },
        { name: "Манты", text: "Ручная лепка, готовим на пару под заказ." },
        { name: "Медовик", text: "Тонкие медовые коржи с нежным кремом." },
      ],
    },
    footer: { visit: "Наш адрес", contacts: "Контакты", back: "Наверх", rights: "Все права защищены." },
  },
};

const metadataCopy: Record<Lang, { title: string; description: string; shortDescription: string; locale: string }> = {
  es: {
    title: "Chaijaná — Asia Central en Buenos Aires",
    description: "Alta gastronomía oriental, narguile y cocina halal en Bonpland 1965, Palermo Hollywood.",
    shortDescription: "Un rincón de Asia Central en Palermo Hollywood.",
    locale: "es_AR",
  },
  en: {
    title: "Chaijaná — Central Asia in Buenos Aires",
    description: "Fine Eastern cuisine, hookah and halal cooking at Bonpland 1965 in Palermo Hollywood.",
    shortDescription: "A corner of Central Asia in Palermo Hollywood.",
    locale: "en_US",
  },
  ru: {
    title: "Chaijaná — Центральная Азия в Буэнос-Айресе",
    description: "Высокая восточная кухня, кальяны и халяльные блюда по адресу Bonpland 1965, Palermo Hollywood.",
    shortDescription: "Уголок Центральной Азии в Palermo Hollywood.",
    locale: "ru_RU",
  },
};

export async function buildMetadata(lang: Lang): Promise<Metadata> {
  const incomingHeaders = await headers();
  const localized = metadataCopy[lang];
  const host = incomingHeaders.get("x-forwarded-host") ?? incomingHeaders.get("host") ?? "localhost:3000";
  const protocol = incomingHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const pageUrl = new URL(languageHref(lang), base);
  const imageUrl = new URL("/images/restaurant/social-preview.webp", base).toString();

  return {
    metadataBase: base,
    title: localized.title,
    description: localized.description,
    alternates: {
      canonical: pageUrl,
      languages: { es: "/", en: "/en", ru: "/ru" },
    },
    icons: {
      icon: "/images/restaurant/favicon.webp",
      shortcut: "/images/restaurant/favicon.webp",
    },
    openGraph: {
      title: localized.title,
      description: localized.shortDescription,
      type: "website",
      locale: localized.locale,
      url: pageUrl,
      images: [{ url: imageUrl, width: 1024, height: 1024, alt: "Chaijaná by KaplinЪ" }],
    },
    twitter: {
      card: "summary_large_image",
      title: localized.title,
      description: localized.shortDescription,
      images: [imageUrl],
    },
  };
}

const whatsappUrl = "https://wa.me/5491130537933";
const instagramUrl = "https://www.instagram.com/chaijana.ar";
const tiktokUrl = "https://www.tiktok.com/@chaijana_ba";
const emailUrl = "mailto:chaijana.ba@gmail.com";
const phoneUrl = "tel:+541130537933";
const mapsUrl = "https://maps.google.com/?q=Bonpland+1965+Buenos+Aires";

const firstGalleryImages = [
  "/images/restaurant/restaurant-gallery-01.webp",
  "/images/restaurant/restaurant-gallery-02.webp",
  "/images/restaurant/restaurant-gallery-03.webp",
  "/images/restaurant/restaurant-gallery-04.webp",
];

/* Served from the synchronised standalone menu build. */
const cartaDishImages = [
  "/menu/assets/dishes/uzbek-plov.webp",
  "/menu/assets/dishes/adjarian-khachapuri.webp",
  "/menu/assets/dishes/manti.webp",
  "/menu/assets/dishes/medovik.webp",
];

const secondGalleryImages = [
  "/images/restaurant/restaurant-gallery-05.webp",
  "/images/restaurant/restaurant-gallery-06.webp",
  "/images/restaurant/restaurant-gallery-07.webp",
  "/images/restaurant/restaurant-gallery-08.webp",
];

function languageHref(code: Lang) {
  return code === "es" ? "/" : `/${code}`;
}

export function RestaurantPage({ lang }: { lang: Lang }) {
  const text = copy[lang];
  const menuHref = lang === "es" ? "/menu/index.html" : `/menu/${lang}.html`;

  const restaurantJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Chaijaná by KaplinЪ",
    image: firstGalleryImages.map((image) => image),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bonpland 1965",
      addressLocality: "Buenos Aires",
      addressRegion: "CABA",
      addressCountry: "AR",
    },
    servesCuisine: ["Central Asian", "Uzbek", "Eastern", "Halal"],
    telephone: "+54 9 11 3053-7933",
    email: "chaijana.ba@gmail.com",
    openingHours: "Mo-Su 11:00-00:00",
    sameAs: [instagramUrl, tiktokUrl],
    url: "https://chaijana.com/",
  };

  return (
    <div lang={lang}>
      <script
        type="application/ld+json"
        // JSON.stringify leaves `<` alone, which would let a future value
        // close this element early. Every value here is a literal today; the
        // escape keeps that from becoming load-bearing.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(restaurantJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <a className="skip-link" href="#main-content">
        {text.skip}
      </a>

      <header className="site-header">
        <div className="site-header__inner shell">
          <a className="brand" href="#top" aria-label={text.homeLabel}>
            <img src="/images/restaurant/brand-logo-gold.svg" alt="" width="842" height="595" />
          </a>
          <nav className="primary-nav" aria-label={text.navigationLabel}>
            <a href="#story">{text.nav.story}</a>
            <a href="#chef">{text.nav.chef}</a>
            <a href="#events">{text.nav.events}</a>
            <a href="#visit">{text.nav.visit}</a>
          </nav>
          <nav className="language-switcher" aria-label={text.languageLabel}>
            {(["es", "en", "ru"] as const).map((code) => (
              <a
                key={code}
                href={languageHref(code)}
                className={lang === code ? "active" : undefined}
                aria-current={lang === code ? "page" : undefined}
                lang={code}
                hrefLang={code}
              >
                {code.toUpperCase()}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main id="main-content">
        <section className="hero" id="top" aria-labelledby="hero-title">
          <div className="hero__ornament" aria-hidden="true">
            <ArchOrnament />
          </div>
          <div className="hero__inner shell">
            <div className="hero__copy">
              <p className="eyebrow">{text.hero.eyebrow}</p>
              <h1 id="hero-title">{text.hero.title}</h1>
              <p className="hero__descriptor">{text.hero.descriptor}</p>
              <div className="hero__actions">
                <a className="button button--gold" href={menuHref}>
                  {text.menu} <span aria-hidden="true">↗</span>
                </a>
                <a className="button button--outline" href={whatsappUrl} target="_blank" rel="noreferrer">
                  {text.reserve} <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
            <p className="hero__monogram" aria-hidden="true">
              <span>{text.nav.story}</span>
              <span>↓</span>
            </p>
          </div>
        </section>

        <section className="facts" aria-label={text.nav.visit}>
          <div className="facts__inner shell">
            <a className="fact" href={mapsUrl} target="_blank" rel="noreferrer">
              <img src="/images/restaurant/info-location.svg" alt="" width="80" height="78" />
              <div>
              <span>01 · {text.facts.addressLabel}</span>
              <strong>{text.facts.address}</strong>
              </div>
            </a>
            <a className="fact" href={whatsappUrl} target="_blank" rel="noreferrer">
              <img src="/images/restaurant/info-whatsapp.svg" alt="" width="80" height="78" />
              <div>
              <span>02 · WhatsApp</span>
              <strong>{text.facts.whatsapp.replace("WhatsApp · ", "")}</strong>
              </div>
            </a>
            <div className="fact">
              <img src="/images/restaurant/info-hours.svg" alt="" width="80" height="78" />
              <div>
              <span>03 · {text.facts.everyDay}</span>
              <strong>{text.facts.hours}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="gallery-band" aria-label="Chaijaná">
          {firstGalleryImages.map((src, index) => (
            <figure key={src} className={`gallery-band__item gallery-band__item--${index + 1}`}>
              <img src={src} alt={text.gallery.first[index]} width="1400" height="933" loading="lazy" />
            </figure>
          ))}
        </section>

        <section className="story section shell" id="story">
          <div className="section-marker" aria-hidden="true">01</div>
          <header className="section-heading">
            <RuleOrnament />
            <p className="kicker">{text.story.kicker}</p>
            <h2>{text.story.title}</h2>
          </header>
          <div className="story__body prose">
            {text.story.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <figure className="story__image">
            <img
              src="/images/restaurant/restaurant-story.webp"
              alt={text.gallery.second[1]}
              width="1680"
              height="2520"
              loading="lazy"
            />
          </figure>
          <div className="story__seal" aria-hidden="true"><ArchOrnament /></div>
        </section>

        <section className="gallery-duo" aria-label="Chaijaná interiors">
          {secondGalleryImages.map((src, index) => (
            <figure key={`${src}-${index}`}>
              <img src={src} alt={text.gallery.second[index]} width="1400" height="933" loading="lazy" />
            </figure>
          ))}
        </section>

        <section className="carta section" aria-labelledby="carta-title">
          <div className="shell">
            <header className="carta__head">
              <RuleOrnament />
              <p className="kicker">{text.carta.kicker}</p>
              <h2 id="carta-title">{text.carta.title}</h2>
              <p>{text.carta.intro}</p>
            </header>
            <div className="dish-row">
              {text.carta.dishes.map((dish, index) => (
                <article className="dish-card" key={dish.name}>
                  <figure>
                    <img
                      src={cartaDishImages[index]}
                      alt={dish.name}
                      width="960"
                      height="960"
                      loading="lazy"
                    />
                  </figure>
                  <h3>{dish.name}</h3>
                  <p>{dish.text}</p>
                </article>
              ))}
            </div>
            <div className="carta__action">
              <a className="button button--gold" href={menuHref}>
                {text.carta.cta} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </section>

        <section className="chef section" id="chef">
          <div className="chef__inner shell">
            <figure className="chef__media">
              <img
                src="/images/restaurant/chef-dmitry-kaplin.webp"
                alt={text.chef.title}
                width="1680"
                height="2690"
                loading="lazy"
              />
              <figcaption>{text.chef.kicker}</figcaption>
            </figure>
            <div className="chef__copy">
              <p className="kicker">{text.chef.role}</p>
              <h2>{text.chef.title}</h2>
              <p className="chef__lead">{text.chef.lead}</p>
              <div className="prose prose--dark">
                {text.chef.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="events section" id="events">
          <div className="shell">
            <div className="events__intro">
              <div className="section-marker" aria-hidden="true">02</div>
              <header className="section-heading">
                <RuleOrnament />
                <p className="kicker">{text.events.kicker}</p>
                <h2>{text.events.title}</h2>
              </header>
              <p>{text.events.intro}</p>
            </div>
            <div className="event-list">
              {text.events.cards.map((event, index) => (
                <article className="event-card" key={event.title}>
                  <div className="event-card__number">0{index + 1}</div>
                  <div className="event-card__copy">
                    <h3>{event.title}</h3>
                    <p>{event.text}</p>
                  </div>
                  <figure className={`event-card__media event-card__media--${index + 1}`}>
                    <img
                      src={[
                        "/images/restaurant/restaurant-gallery-01.webp",
                        "/images/restaurant/event-live-music.webp",
                        "/images/restaurant/restaurant-gallery-06.webp",
                      ][index]}
                      alt=""
                      width="1400"
                      height="933"
                      loading="lazy"
                    />
                  </figure>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer" id="visit">
        <div className="footer__inner shell">
          <div className="footer__brand">
            <img src="/images/restaurant/brand-logo-gold.svg" alt="Chaijaná by KaplinЪ" width="842" height="595" loading="lazy" />
          </div>
          <div className="footer__visit">
            <p className="footer__label">{text.footer.visit}</p>
            <a href={mapsUrl} target="_blank" rel="noreferrer">Bonpland 1965<br />Palermo Hollywood</a>
            <p>{text.facts.hours}<br />{text.facts.everyDay}</p>
          </div>
          <div className="footer__contacts">
            <p className="footer__label">{text.footer.contacts}</p>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp ↗</a>
            <a href={phoneUrl}>+54 11 3053 7933</a>
            <a href={emailUrl}>chaijana.ba@gmail.com</a>
          </div>
          <div className="footer__socials">
            <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a>
            <a href={tiktokUrl} target="_blank" rel="noreferrer">TikTok ↗</a>
            <a href="#top">{text.footer.back} ↑</a>
          </div>
        </div>
        <div className="footer__bottom shell">
          <p>© KaplinЪ, 2025</p>
          <p>{text.footer.rights}</p>
        </div>
      </footer>
    </div>
  );
}
