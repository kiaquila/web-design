/* Single source of truth for every string on the page.
   Nothing here is invented: each block is traceable to the owner's own CV,
   his GitHub profile README, or his public repositories. See
   ../README.md for the provenance table. */

/* Both are derived, never typed. A literal "18 years" passes today and lies
   next January. */
export const IT_START_YEAR = 2008;
export const BACKEND_START_YEAR = 2016;

const currentYear = new Date().getFullYear();

export const years = {
  it: currentYear - IT_START_YEAR,
  backend: currentYear - BACKEND_START_YEAR
};

/** Approved outbound destinations. A test rejects any other origin. */
export const links = {
  /* Placeholder until the owner picks the address this page should publish.
     The build names it on every run for as long as it is this value. */
  email: "example@e-mail.com",
  linkedin: "https://www.linkedin.com/in/chappp",
  telegram: "https://t.me/chapppp",
  github: "https://github.com/cucumberfalse",
  cabadrive: "https://github.com/cucumberfalse/cabadrive",
  takeyourmeds: "https://github.com/cucumberfalse/takeyourmeds",
  designer: "https://ks-design.art"
};

/** The address above is a stand-in, not a decision. */
export const PLACEHOLDER_EMAIL = "example@e-mail.com";

export const meta = {
  lang: "en",
  title: "Mikhail Orlov — Senior Backend Developer",
  description:
    "Senior backend developer and development lead: high-load payment " +
    "processing, distributed systems and legacy modernization in Perl, " +
    "Python and Go.",
  name: "Mikhail Orlov",
  role: "Senior Backend Developer"
};

export const nav = [
  { id: "profile", numeral: "01", label: "Profile" },
  { id: "experience", numeral: "02", label: "Experience" },
  { id: "skills", numeral: "03", label: "Skills" },
  { id: "work", numeral: "04", label: "Open source" },
  { id: "contact", numeral: "05", label: "Contact" }
];

export const hero = {
  name: "Mikhail Orlov",
  role: "Senior Backend Developer",
  /* His own wording, from the GitHub profile README. */
  lead: "Backend lead for high-load payments, distributed systems, and legacy modernization.",
  body:
    "I help engineering teams make production systems calmer, releases " +
    "faster, and delivery more predictable, especially when the platform " +
    "is business-critical and the team is compact.",
  facts: [
    { value: "%IT_YEARS%", label: "years in IT" },
    { value: "%BACKEND_YEARS%", label: "years backend" },
    { value: "Perl · Python · Go", label: "primary stack" },
    { value: "Buenos Aires", label: "remote, UTC−3" }
  ],
  cta: { label: "Get in touch", href: "#contact" },
  secondary: { label: "Download CV", action: "print" }
};

export const profile = {
  numeral: "01",
  title: "Profile",
  /* Condensed from the summary block of his CV; no claim added. */
  summary:
    "Senior backend developer with a vast IT background and practical " +
    "development experience in high-load projects. Scripting languages — " +
    "mainly Perl, some Python — SQL (mostly MySQL, some PostgreSQL), some " +
    "Node.js and Go. Configuring, troubleshooting and supporting Linux " +
    "systems and software (Debian, RHEL, Ubuntu), Jenkins and bash " +
    "scripting. Practical network engineering experience with large " +
    "telecommunication networks.",
  helpTitle: "What I can help with",
  /* Verbatim from the GitHub profile README. */
  help: [
    "Stabilizing legacy backend services and reducing production incidents.",
    "Designing payment-processing architecture, REST APIs, and high-load distributed systems.",
    "Improving CI/CD, release discipline, and engineering workflows.",
    "Refactoring backend services without stopping delivery.",
    "Building PCI DSS/GDPR-aware payment, 3DS, anti-fraud, and incident-response integrations.",
    "Applying AI tools to code review, refactoring, test generation, documentation, automation, and incident analysis.",
    "Mentoring compact teams and making engineering work more consistent under real constraints."
  ]
};

export const experience = {
  numeral: "02",
  title: "Experience",
  roles: [
    {
      period: "April 2023 — present",
      title: "Software Development Lead",
      company: "My.Games",
      place: "Remote",
      context:
        "VK Pay platform provides different payment services for VK users, " +
        "various parts of the VK ecosystem and external customers.",
      points: [
        "Developing, optimizing and troubleshooting the backend for the website, mobile apps and internal API.",
        "Close collaboration with managers and QA engineers to test and release.",
        "Refactoring of the payment processing system."
      ]
    },
    {
      period: "July 2021 — April 2023",
      title: "Senior Backend Developer",
      company: "VK Pay",
      place: "Remote",
      context: "",
      points: [
        "Developing, optimizing and troubleshooting the backend for the website, mobile apps and internal API.",
        "Refactoring of the payment processing system (Perl, Kafka).",
        "Close collaboration with managers and QA engineers to test and release."
      ]
    },
    {
      period: "July 2016 — July 2021",
      title: "Backend Developer",
      company: "LitRes",
      place: "Moscow",
      context:
        "Leading online retailer of Russian-language e-books: ebooks and " +
        "audiobooks, a website, mobile applications and an extensive " +
        "partner network.",
      points: [
        "Extensive refactoring of the recommendation system (Perl, MySQL).",
        "Developed the backend for instant search (Perl, Sphinx, MySQL).",
        "Developed the backend for iframe applications in social networks (Perl, MySQL).",
        "Automation tests (Node.js), plus continuous improvements and bug fixes."
      ]
    },
    {
      period: "May 2008 — July 2016",
      title: "Chief Access Network Engineer",
      company: "Er-Telecom",
      place: "Perm",
      context:
        "ISP with more than 300k access switches across about 40 cities on " +
        "a multi-vendor network. Worked as Network Engineer, NOC Engineer, " +
        "Upstream Engineer and Chief Access Network Engineer.",
      points: [
        "Network management processes migrated to the FCAPS model.",
        "Access network migrated to the VLAN-per-customer model.",
        "Authorization migrated from local accounts to a RADIUS server synchronized with Active Directory.",
        "Configuration validation software developed (Python, Perl); access-network configuration unified and automated.",
        "Acceptance and testing processes for new channels developed and implemented; upstream monitoring automated."
      ]
    }
  ]
};

export const skills = {
  numeral: "03",
  title: "Skills",
  groups: [
    { label: "Languages", items: ["Perl", "Python", "Go", "JavaScript", "Node.js", "Bash"] },
    { label: "Data", items: ["MySQL", "PostgreSQL", "Redis", "Sphinx"] },
    { label: "Platform", items: ["Kafka", "Docker", "GitLab CI/CD", "Jenkins", "Linux — Debian, RHEL, Ubuntu"] },
    { label: "Domain", items: ["Payment processing", "High-load distributed systems", "REST APIs", "Network engineering"] }
  ],
  education: {
    label: "Education",
    period: "2003 — 2008",
    school: "Perm State Technical University (PSTU)",
    detail: "Electrical Engineering Faculty — Engineer, Master's degree with merit"
  },
  languages: {
    label: "Spoken",
    items: [
      { name: "English", level: "C1" },
      { name: "Spanish", level: "A1" },
      { name: "Russian", level: "Native" }
    ]
  }
};

export const work = {
  numeral: "04",
  title: "Open source",
  note: "Public repositories I build and maintain on my own time.",
  items: [
    {
      name: "cabadrive",
      href: links.cabadrive,
      tech: "React · Vite · Docker",
      description:
        "Local-first web trainer for the CABA category B driving theory " +
        "exam, for Russian-speaking drivers in Buenos Aires. Exam " +
        "simulation, error analysis, vocabulary and thematic materials; " +
        "works offline after the first load and keeps all progress in the " +
        "browser, with no backend and no cloud sync."
    },
    {
      name: "takeyourmeds",
      href: links.takeyourmeds,
      tech: "Flutter · Dart",
      description:
        "Offline-first mobile medication reminder: local notification " +
        "actions, flexible schedules, swipeable pause and delete, and a " +
        "local intake journal."
    }
  ]
};

export const contact = {
  numeral: "05",
  title: "Contact",
  lead: "Open to senior backend and lead roles, remote",
  cta: { label: "Get in touch", href: `mailto:${links.email}` },
  social: [
    { name: "linkedin", label: "LinkedIn", href: links.linkedin },
    { name: "telegram", label: "Telegram", href: links.telegram },
    { name: "github", label: "GitHub", href: links.github }
  ]
};

export const footer = {
  copyright: "Mikhail Orlov",
  credit: { before: "Designed by ", name: "ks-design", after: " · Built with AI workflows" }
};
