import type { Metadata } from "next";
import { experiences, Lang, menuSections, pick, ui } from "./menu-data";

export const metadata: Metadata = {
  title: "Chaijaná — Sabores de Oriente",
  description:
    "Carta de Chaijaná: cocina de Asia Central, Uzbekistán, Rusia y Cáucaso en Palermo Hollywood.",
};

const whatsappUrl = "https://wa.me/5491130537933";
const instagramUrl = "https://www.instagram.com/chaijana.ar";

function MenuCard({
  entry,
  lang,
  featured = false,
}: {
  entry: (typeof experiences)[number];
  lang: Lang;
  featured?: boolean;
}) {
  return (
    <article className={`menu-card${featured ? " menu-card--featured" : ""}`}>
      <div className="menu-card__topline">
        <div>
          {entry.badge && <span className="badge">{pick(entry.badge, lang)}</span>}
          <h3>{pick(entry.name, lang)}</h3>
        </div>
        {entry.price && <span className="price">{entry.price}</span>}
      </div>
      {entry.description && <p>{pick(entry.description, lang)}</p>}
      {entry.note && <p className="note">{pick(entry.note, lang)}</p>}
      {entry.options && (
        <div className="options">
          {entry.options.map((option, index) => (
            <div className="option" key={`${pick(option.label, lang)}-${index}`}>
              <span>{pick(option.label, lang)}</span>
              <span className="option__line" aria-hidden="true" />
              <strong>{option.price}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang: Lang = params?.lang === "en" || params?.lang === "ru" ? params.lang : "es";
  const copy = ui[lang];
  const langQuery = lang === "es" ? "" : `?lang=${lang}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: "Chaijaná",
    image: "/images/restaurant-gallery-3.webp",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Bonpland 1965",
      addressLocality: "Buenos Aires",
      addressRegion: "CABA",
      addressCountry: "AR",
    },
    servesCuisine: ["Central Asian", "Uzbek", "Russian", "Halal"],
    telephone: "+54 9 11 3053-7933",
    url: "https://chaijana.com/",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="language-switcher" aria-label="Language selector">
        {(["es", "en", "ru"] as const).map((code) => (
          <a
            key={code}
            href={code === "es" ? "/" : `/?lang=${code}`}
            className={lang === code ? "active" : undefined}
            aria-current={lang === code ? "page" : undefined}
          >
            {code.toUpperCase()}
          </a>
        ))}
      </div>

      <header className="hero" id="top">
        <div className="hero__veil" />
        <div className="hero__content shell">
          <img
            className="hero__logo"
            src="/images/chaijana-logo.png"
            alt="Chaijaná by Kaplin"
            width="1680"
            height="1799"
          />
          <div className="hero__copy">
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.heroTitle}</h1>
            <p className="hero__intro">{copy.heroText}</p>
            <div className="hero__actions">
              <a className="button button--gold" href="#menu">
                {copy.menu}
              </a>
              <a className="button button--glass" href={whatsappUrl} target="_blank" rel="noreferrer">
                {copy.reserve}
              </a>
            </div>
          </div>
          <div className="hero__facts">
            <a href="https://maps.google.com/?q=Bonpland+1965+Buenos+Aires" target="_blank" rel="noreferrer">
              <span>01</span>
              <strong>{copy.address}</strong>
            </a>
            <div>
              <span>02</span>
              <strong>{copy.hours}</strong>
            </div>
            <div>
              <span>03</span>
              <strong>{copy.discount}</strong>
            </div>
          </div>
        </div>
      </header>

      <nav className="section-nav" aria-label={copy.menu}>
        <div className="section-nav__inner shell">
          <a href={`${langQuery}#experiencias`}>{copy.experiences}</a>
          {menuSections.map((section) => (
            <a key={section.id} href={`${langQuery}#${section.id}`}>
              {pick(section.title, lang)}
            </a>
          ))}
          <a href={`${langQuery}#la-casa`}>{copy.atmosphere}</a>
        </div>
      </nav>

      <main>
        <section className="experiences section shell" id="experiencias">
          <div className="section-heading section-heading--wide">
            <p className="kicker">01 · Chaijaná</p>
            <h2>{copy.experiences}</h2>
            <p>{copy.menuIntro}</p>
          </div>
          <div className="experience-grid">
            {experiences.map((entry, index) => (
              <MenuCard entry={entry} lang={lang} featured key={index} />
            ))}
          </div>
        </section>

        <section className="story">
          <div className="story__image" role="img" aria-label="Chaijaná, Bonpland 1965" />
          <div className="story__copy">
            <p className="kicker">02 · {copy.visit}</p>
            <h2>{copy.aboutTitle}</h2>
            <p>{copy.aboutText}</p>
            <div className="story__details">
              <span>{copy.address}</span>
              <span>{copy.hours}</span>
            </div>
            <a className="text-link" href={whatsappUrl} target="_blank" rel="noreferrer">
              {copy.reserve} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="menu section" id="menu">
          <div className="shell">
            <div className="section-heading section-heading--menu">
              <p className="kicker">03 · {copy.menu}</p>
              <h2>{copy.menu}</h2>
              <p>{copy.menuIntro}</p>
            </div>

            {menuSections.map((section, sectionIndex) => (
              <section className="menu-section" id={section.id} key={section.id}>
                <header className="menu-section__header">
                  <span>{String(sectionIndex + 1).padStart(2, "0")}</span>
                  <div>
                    <h2>{pick(section.title, lang)}</h2>
                    <p>{pick(section.intro, lang)}</p>
                  </div>
                </header>
                <div className="menu-grid">
                  {section.items.map((entry, index) => (
                    <MenuCard entry={entry} lang={lang} key={`${section.id}-${index}`} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="house section" id="la-casa">
          <div className="shell">
            <div className="section-heading section-heading--house">
              <p className="kicker">04 · Bonpland 1965</p>
              <h2>{copy.atmosphere}</h2>
              <p>{copy.atmosphereText}</p>
            </div>
            <div className="gallery">
              <figure className="gallery__wide">
                <img src="/images/restaurant-gallery-3.webp" alt="Bar de Chaijaná" width="1400" height="933" loading="lazy" />
              </figure>
              <figure>
                <img src="/images/restaurant-gallery-1.webp" alt="Servicio en el salón de Chaijaná" width="1400" height="933" loading="lazy" />
              </figure>
              <figure>
                <img src="/images/restaurant-gallery-4.webp" alt="Patio y narguile de Chaijaná" width="1400" height="933" loading="lazy" />
              </figure>
              <figure className="gallery__wide">
                <img src="/images/restaurant-gallery-2.webp" alt="Fachada de Chaijaná en Bonpland 1965" width="1400" height="992" loading="lazy" />
              </figure>
            </div>
          </div>
        </section>

        <section className="contact">
          <div className="contact__inner shell">
            <p className="kicker">WhatsApp · +54 9 11 3053 7933</p>
            <h2>{copy.reserve}</h2>
            <a className="button button--gold" href={whatsappUrl} target="_blank" rel="noreferrer">
              {copy.whatsapp} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer__inner">
          <div>
            <img src="/images/chaijana-logo.png" alt="Chaijaná" width="1680" height="1799" loading="lazy" />
            <p>{copy.footer}</p>
          </div>
          <div className="footer__links">
            <a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
            <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href="#top">{copy.backTop} ↑</a>
          </div>
          <p className="footer__small">{copy.sourceNote}</p>
        </div>
      </footer>
    </>
  );
}
