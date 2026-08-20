/* Single source of truth for every string on the page, in every language.
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
    alexNeon: "https://alex-neon.ks-design.workers.dev",
    /* Custom domain configured ahead of the rollout; serves once deployed. */
    ember: "https://ember.ks-design.art/",
    misha: "https://misha.ks-design.workers.dev/"
  }
};

/* English is the default: it is what `https://ks-design.art/` serves and what
   `hreflang="x-default"` points at. Argentinian Spanish is the second locale,
   on its own prefix. The declaration order is also the order the language
   switch renders in. */
export const languages = {
  en: { locale: "en", ogLocale: "en_US", label: "EN", path: "/" },
  es: { locale: "es-AR", ogLocale: "es_AR", label: "ES", path: "/es/" }
};

/** Locales whose copy is a translation the owner has not signed off on yet.
 *  The build names them on every run, the way unfinished sections are named,
 *  so a draft translation cannot quietly become the published wording. The
 *  owner approved the current Spanish copy on 2026-08-17 and the ember and
 *  misha work cards on 2026-08-19. */
export const localesAwaitingReview = [];

/** One social card per language — sharing a page with a card that carries
 *  another language's headline is a mixed-language preview. Rendered by
 *  `scripts/make-og.mjs`, copied by the build, referenced by the renderer;
 *  named here so those three cannot disagree. */
export const ogImages = { en: "og-en.png", es: "og-es.png" };

export const content = {
  en: {
    meta: {
      title: "ks-design — Kristina Aquila, web designer",
      description:
        "Landing pages and websites designed to pull people in and sell. I work with AI, so it lands faster and costs less. Based in Buenos Aires, working remotely.",
      ogTitle: "I'll design something that pulls people in",
      ogDescription:
        "Web design for landing pages and websites. A concept, two rounds of edits, a finished site."
    },
    nav: {
      label: "Page sections",
      work: "Work",
      process: "Process",
      services: "Services",
      contact: "Contact"
    },
    langSwitch: { label: "Language", en: "EN", es: "ES" },
    skipLink: "Skip to content",
    hero: {
      title: "I'll design something that pulls people in",
      subtitle: "The kind of work people remember — and come back to",
      primary: "Start a project",
      secondary: "See the work",
      portraitAlt: "Kristina Aquila, portrait",
      /* Lives on the frosted panel that rises over the portrait on hover. A
         stat with no label is a single claim, not a number and a caption. */
      portraitStats: [
        { value: "%YEARS%", label: "years of web development experience" }
      ]
    },
    work: {
      id: "work",
      title: "Selected projects",
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
        },
        {
          slug: "ember",
          name: "Ember",
          kind: "Lab study · interactive",
          year: "2026",
          summary:
            "An interactive canvas study: a wireframe figure smolders under the cursor, burns down and reassembles to a synthesized tuning-fork tone.",
          href: links.work.ember,
          image: "ember",
          alt: "Ember study — a dark wireframe figure with golden embers"
        },
        {
          slug: "misha",
          name: "Mikhail Orlov",
          kind: "CV portfolio · one-pager",
          year: "2026",
          summary:
            "An original one-page CV portfolio for a senior backend developer and development lead — one calm scrolling sheet in English.",
          href: links.work.misha,
          image: "misha",
          alt: "Mikhail Orlov one-page CV portfolio, first screen"
        }
      ]
    },
    process: {
      id: "process",
      title: "How the work goes",
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
      title: "Services",
      currencyNote: "Prices are in US dollars.",
      items: [
        { name: "Landing page", price: "USD 500", note: "A single-page site, done end to end." },
        {
          name: "Website, 5+ pages",
          price: "USD 1,500",
          note: "A multi-page site with one consistent structure."
        },
        {
          name: "Illustrations",
          price: "from USD 25",
          note: "Illustration work, priced per image."
        }
      ]
    },
    kindWords: {
      id: "kind-words",
      title: "Kind Words",
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
      location: "Buenos Aires, Argentina (GMT-3)",
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
  },

  es: {
    meta: {
      title: "ks-design — Kristina Aquila, diseñadora web",
      description:
        "Diseño de landings y sitios web que atrapan y venden. Trabajo con IA, así que sale más rápido y más barato. Estoy en Buenos Aires y trabajo en remoto.",
      ogTitle: "Te hago un diseño que atrapa",
      ogDescription:
        "Diseño web para landings y sitios. Un concepto, dos rondas de cambios, un sitio terminado."
    },
    nav: {
      label: "Secciones de la página",
      work: "Trabajos",
      process: "Proceso",
      services: "Servicios",
      contact: "Contacto"
    },
    langSwitch: { label: "Idioma", en: "EN", es: "ES" },
    skipLink: "Ir al contenido",
    hero: {
      title: "Te hago un diseño que atrapa",
      subtitle: "Del tipo que la gente recuerda y al que vuelve",
      primary: "Hablemos del proyecto",
      secondary: "Ver los trabajos",
      portraitAlt: "Kristina Aquila, retrato",
      portraitStats: [
        { value: "%YEARS%", label: "años de experiencia en desarrollo web" }
      ]
    },
    work: {
      id: "work",
      title: "Proyectos seleccionados",
      previous: "Proyectos anteriores",
      next: "Proyectos siguientes",
      visit: "Abrir el sitio",
      items: [
        {
          slug: "chaijana",
          name: "Chaijaná Noir",
          kind: "Restaurante · sitio y menú",
          year: "2026",
          summary:
            "Una puesta oscura y cálida para una chaijaná de Buenos Aires: sitio web, menú en tres idiomas y retoque de las fotos de los platos.",
          href: links.work.chaijana,
          image: "chaijana",
          alt: "Página principal del sitio de Chaijaná Noir"
        },
        {
          slug: "alex-neon",
          name: "Alex Neon",
          kind: "Landing",
          year: "2026",
          summary:
            "Rediseño de la landing «ИИ по делу»: tema oscuro, un solo acento neón y un canvas neuronal en vivo.",
          href: links.work.alexNeon,
          image: "alex-neon",
          alt: "Primera pantalla de la landing de Alex Neon"
        },
        {
          slug: "ember",
          name: "Ember",
          kind: "Estudio de laboratorio · interactivo",
          year: "2026",
          summary:
            "Un estudio interactivo en canvas: una figura de alambre arde bajo el cursor, se consume y se rearma al tono de un diapasón sintetizado.",
          href: links.work.ember,
          image: "ember",
          alt: "Estudio Ember: una figura de alambre oscura con brasas doradas"
        },
        {
          slug: "misha",
          name: "Mikhail Orlov",
          kind: "Portfolio CV · una página",
          year: "2026",
          summary:
            "Un portfolio-CV original de una sola página para un desarrollador backend senior y líder de desarrollo: una hoja serena en inglés.",
          href: links.work.misha,
          image: "misha",
          alt: "Primera pantalla del portfolio CV de una página de Mikhail Orlov"
        }
      ]
    },
    process: {
      id: "process",
      title: "Cómo es el proceso",
      steps: [
        {
          n: "01",
          title: "Encontramos el sentido",
          body:
            "Juntamos y afinamos el sentido con vos — todo lo que te parece importante y querés que la landing o el sitio digan."
        },
        { n: "02", title: "Un concepto de diseño", body: "Diseño un concepto para vos." },
        {
          n: "03",
          title: "Dos rondas de cambios",
          body: "Pasamos dos rondas de cambios tuyos."
        },
        { n: "04", title: "El sitio terminado", body: "Recibís el sitio terminado." }
      ]
    },
    services: {
      id: "services",
      title: "Servicios",
      currencyNote: "Los precios están en dólares estadounidenses.",
      items: [
        { name: "Landing", price: "USD 500", note: "Un sitio de una página, de punta a punta." },
        {
          name: "Sitio de 5+ páginas",
          price: "USD 1.500",
          note: "Un sitio de varias páginas con una estructura consistente."
        },
        {
          name: "Ilustraciones",
          price: "desde USD 25",
          note: "Creación de ilustraciones, precio por imagen."
        }
      ]
    },
    kindWords: {
      id: "kind-words",
      title: "Kind Words",
      todo: true,
      todoNote:
        "Marcador de posición: reemplazar por reseñas reales antes de publicar.",
      items: [
        {
          quote: "TODO: reseña real de un cliente.",
          name: "Alex Oxitocin",
          role: "Alex Neon · landing «ИИ по делу»",
          avatar: "alex-oxitocin",
          avatarAlt: "Avatar de Alex Oxitocin",
          initials: null
        },
        {
          quote: "TODO: reseña real de un cliente.",
          name: "TODO: nombre",
          role: "TODO: rol, empresa",
          avatar: null,
          initials: "—"
        },
        {
          quote: "TODO: reseña real de un cliente.",
          name: "TODO: nombre",
          role: "TODO: rol, empresa",
          avatar: null,
          initials: "—"
        }
      ]
    },
    contact: {
      id: "contact",
      band: {
        title: "Get in touch",
        note: "Escribime y te hago un diseño que vende."
      },
      location: "Buenos Aires, Argentina (GMT-3)",
      social: {
        linkedin: "LinkedIn",
        telegram: "Telegram",
        instagram: "Instagram"
      }
    },
    footer: { copyright: "© Kristina Aquila" },
    notFound: {
      title: "Página no encontrada",
      body: "Acá no hay ninguna página así. Volvé al inicio.",
      cta: "Inicio"
    }
  }
};
