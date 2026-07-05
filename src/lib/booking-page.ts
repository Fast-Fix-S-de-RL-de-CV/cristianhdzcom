export type BookingPageContent = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  catalogEyebrow: string;
  catalogTitle: string;
};

export const BOOKING_PAGE_DEFAULTS: BookingPageContent = {
  eyebrow: "Servicios y consultorias",
  title: "Agenda el servicio que necesitas.",
  description:
    "Explora las opciones disponibles, revisa la informacion de cada servicio y elige el horario que mejor se acomode a tu calendario.",
  primaryCtaLabel: "Agendar ahora",
  secondaryCtaLabel: "Ver servicios",
  catalogEyebrow: "Catalogo",
  catalogTitle: "Servicios disponibles",
};

export function resolveBookingPageContent(input?: Partial<BookingPageContent> | null): BookingPageContent {
  return {
    eyebrow: input?.eyebrow?.trim() || BOOKING_PAGE_DEFAULTS.eyebrow,
    title: input?.title?.trim() || BOOKING_PAGE_DEFAULTS.title,
    description: input?.description?.trim() || BOOKING_PAGE_DEFAULTS.description,
    primaryCtaLabel: input?.primaryCtaLabel?.trim() || BOOKING_PAGE_DEFAULTS.primaryCtaLabel,
    secondaryCtaLabel: input?.secondaryCtaLabel?.trim() || BOOKING_PAGE_DEFAULTS.secondaryCtaLabel,
    catalogEyebrow: input?.catalogEyebrow?.trim() || BOOKING_PAGE_DEFAULTS.catalogEyebrow,
    catalogTitle: input?.catalogTitle?.trim() || BOOKING_PAGE_DEFAULTS.catalogTitle,
  };
}
