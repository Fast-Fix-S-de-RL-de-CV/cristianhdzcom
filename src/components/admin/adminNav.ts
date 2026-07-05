export type AdminNavItem = {
  label: string;
  href: string;
  activeKey?: string;
};

export type AdminNavGroup = {
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Operación",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Prospectos", href: "/admin/prospectos" },
      { label: "Alumnos", href: "/admin/alumnos" },
      { label: "Clientes", href: "/admin/clientes" },
      { label: "Membresías", href: "/admin/membresias" },
      { label: "Suscripciones", href: "/admin/suscripciones" },
      { label: "Pagos", href: "/admin/pagos" },
    ],
  },
  {
    label: "Contenido",
    items: [
      { label: "Cursos", href: "/admin/cursos" },
      { label: "Talleres", href: "/admin/talleres" },
      { label: "Libros", href: "/admin/libros" },
      { label: "Empresas", href: "/admin/servicios" },
      { label: "Reservas", href: "/admin/reservas" },
      { label: "Blog", href: "/admin/blog" },
      { label: "Comunidad", href: "/admin/comunidad" },
      { label: "Soporte", href: "/admin/soporte" },
    ],
  },
  {
    label: "Configuración",
    items: [
      { label: "Sitio web", href: "/admin/ajustes/slider", activeKey: "sitio" },
      { label: "Ajustes", href: "/admin/ajustes" },
    ],
  },
];
