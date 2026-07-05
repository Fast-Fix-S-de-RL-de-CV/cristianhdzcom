export type NavItem = {
  label: string;
  href: string;
  isVisible?: boolean;
  openInNewTab?: boolean;
};

export const NAV_ITEMS_DEFAULT: NavItem[] = [
  { label: "Inicio", href: "/" },
  { label: "Acerca de", href: "/acerca" },
  { label: "Empresas", href: "/empresas" },
  { label: "Programas", href: "/programas" },
  { label: "Libros", href: "/libros" },
  { label: "Membresía", href: "/membresia" },
  { label: "Comunidad", href: "/comunidad" },
  { label: "Blog", href: "/blog" },
];

export const NAV_TARGETS: Array<{ label: string; href: string }> = [
  { label: "Inicio", href: "/" },
  { label: "Hero / portada", href: "/#inicio" },
  { label: "Bloques destacados", href: "/#bloques" },
  { label: "Talleres / eventos", href: "/#talleres" },
  { label: "Programas / cursos", href: "/#programas" },
  { label: "Empresas / servicios", href: "/#empresas" },
  { label: "Método", href: "/#metodo" },
  { label: "Llamado final", href: "/#empezar" },
  { label: "Acerca de", href: "/acerca" },
  { label: "Programas", href: "/programas" },
  { label: "Libros", href: "/libros" },
  { label: "Servicios / consultorías", href: "/reservas" },
  { label: "Membresía", href: "/membresia" },
  { label: "Comunidad", href: "/comunidad" },
  { label: "Blog", href: "/blog" },
  { label: "Login", href: "/login" },
  { label: "Registro", href: "/registro" },
];

export function resolveNavItems(items: NavItem[] | null | undefined): NavItem[] {
  if (!items?.length) return NAV_ITEMS_DEFAULT;
  const clean = items
    .map((item) => ({
      label: item.label?.trim() ?? "",
      href: item.href?.trim() ?? "",
      isVisible: item.isVisible,
      openInNewTab: item.openInNewTab,
    }))
    .filter((item) => item.label && item.href && item.isVisible !== false);
  return clean.length ? clean : NAV_ITEMS_DEFAULT;
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("tel:");
}
