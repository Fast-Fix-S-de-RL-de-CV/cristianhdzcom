export type AboutGallerySlide = {
  img?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  cta?: string;
};

export type AboutExtraSection = {
  eyebrow?: string;
  title?: string;
  body?: string;
};

export type AboutCtaCard = {
  eyebrow?: string;
  title?: string;
  body?: string;
  label?: string;
  href?: string;
};

export type AboutPageContent = {
  gallerySlides?: AboutGallerySlide[];
  storyEyebrow?: string;
  storyTitle?: string;
  storyBody1?: string;
  storyBody2?: string;
  statsEyebrow?: string;
  statsTitle?: string;
  quoteEyebrow?: string;
  quoteText?: string;
  quoteAttrib?: string;
  extraSections?: AboutExtraSection[];
  ctaCards?: AboutCtaCard[];
};

export function defaultAboutPageContent(opts: {
  siteName: string;
  fullName: string;
  role: string;
  bio1?: string | null;
  bio2?: string | null;
  quoteText?: string | null;
  quoteAttrib?: string | null;
}): AboutPageContent {
  return {
    gallerySlides: [
      {
        img: "/galeria-infinita/img/01.jpg",
        title: `${opts.fullName}.`,
        subtitle: opts.role || opts.siteName,
        description: "Programador profesional con IA, autor y fundador. Convierto ideas en software y negocios que de verdad funcionan.",
      },
      {
        img: "/galeria-infinita/img/02.jpg",
        title: "De código a empresa.",
        subtitle: "Productos, apps y sistemas a la medida",
        description: "Empecé escribiendo código y terminé construyendo empresas. Hoy creo plataformas, apps y automatizaciones para que otros también crezcan.",
      },
      {
        img: "/galeria-infinita/img/03.jpg",
        title: "Aprende conmigo.",
        subtitle: "Programas · Libros · Comunidad",
        description: "Comparto todo lo que sé para que construyas con inteligencia artificial: cursos, libros y una comunidad que avanza contigo.",
        cta: "Seguir leyendo",
      },
    ],
    storyEyebrow: "Mi historia",
    storyTitle: "De código a empresa.",
    storyBody1: opts.bio1 ?? "",
    storyBody2: opts.bio2 ?? "",
    statsEyebrow: "Trayectoria",
    statsTitle: "En números.",
    quoteEyebrow: "En lo que creo",
    quoteText: opts.quoteText ?? "",
    quoteAttrib: opts.quoteAttrib ?? "",
    extraSections: [],
    ctaCards: [
      {
        eyebrow: "Trabajemos juntos",
        title: "Conoce mis empresas.",
        body: "SaaS en producción, agencia de software a medida y consultoría. Casos reales que puedes usar en tu negocio.",
        label: "Ver empresas →",
        href: "/empresas",
      },
      {
        eyebrow: "Aprende conmigo",
        title: "Programas y libros.",
        body: "Te enseño a hacer negocios y a programar con IA — desde cero hasta entregar productos reales. Empieza gratis.",
        label: "Ver programas →",
        href: "/programas",
      },
    ],
  };
}
