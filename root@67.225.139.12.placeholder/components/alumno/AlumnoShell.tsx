import Link from "next/link";
import { AlumnoSidebar } from "./AlumnoSidebar";
import { AlumnoMobileNav } from "./AlumnoMobileNav";

export type AlumnoActiveKey =
  | "sendero"
  | "talleres"
  | "biblioteca"
  | "proyectos"
  | "comunidad"
  | "calendario"
  | "miembros"
  | "mensajes"
  | "ranking"
  | "sobre"
  | "libros"
  | "cuenta";

type ShellUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  level: number;
  xp: number;
  streakDays: number;
  hearts: number;
  tier?: string;
  tierScore?: number;
};

/**
 * AlumnoShell — Persistent layout for the entire alumno (member) experience.
 *
 * Why this exists: previously the alumno experience was split between
 * `CommunityShell` (top tabs) on /comunidad and `PlatformSidebar` (left rail)
 * on /plataforma + /cuenta + /comunidad/*, which felt inconsistent. The user
 * also could not visually tell when they were "inside the alumno area" vs.
 * looking at a public marketing page. This shell:
 *  - Renders a persistent 240px left rail on every alumno-area page,
 *  - Surfaces user identity (name, level, XP, streak) at the bottom,
 *  - Adds an explicit "MODO ADMIN →" button when role is admin/superadmin
 *    so super-admins can switch contexts intentionally.
 *
 * Layout uses the existing `.plat` grid (240/1fr/320). Pages that don't need
 * the right aside should pass `wideMain` so main spans 2 columns.
 */
export function AlumnoShell({
  user,
  active,
  children,
  rightAside,
  wideMain = true,
}: {
  user: ShellUser;
  active: AlumnoActiveKey;
  children: React.ReactNode;
  rightAside?: React.ReactNode;
  /** True (default) makes main span columns 2-3 when no rightAside is provided. */
  wideMain?: boolean;
}) {
  return (
    <>
      <AlumnoMobileNav
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          level: user.level,
          xp: user.xp,
          streakDays: user.streakDays,
          hearts: user.hearts,
          tier: user.tier,
          tierScore: user.tierScore,
        }}
        active={active}
      />
      <div className="plat">
        <AlumnoSidebar
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            level: user.level,
            xp: user.xp,
            streakDays: user.streakDays,
            hearts: user.hearts,
            tier: user.tier,
            tierScore: user.tierScore,
          }}
          active={active}
        />

        <main
          className="plat-main"
          style={rightAside ? undefined : wideMain ? { gridColumn: "span 2" } : undefined}
        >
          {children}
        </main>

        {rightAside ? <aside className="plat-aside">{rightAside}</aside> : null}
      </div>
    </>
  );
}

/**
 * Compact identity strip used at the top-right of alumno content pages.
 * Mirrors what the platform page used to render inline so subpages get a
 * consistent header without re-implementing it.
 */
export function AlumnoHeader({
  eyebrow,
  title,
  subtitle,
  user,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  user: { name: string; level: number; xp: number; streakDays: number };
  actions?: React.ReactNode;
}) {
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return (
    <div className="between" style={{ marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
      <div>
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1 className="serif" style={{ fontSize: 36, marginTop: eyebrow ? 8 : 0 }}>
          {title}
        </h1>
        {subtitle ? (
          <p style={{ color: "var(--muted)", marginTop: 6, fontSize: 14 }}>{subtitle}</p>
        ) : null}
      </div>
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        {actions}
        <span className="streak">{user.streakDays} días</span>
        <span className="chip chip-gold mono">XP · {user.xp.toLocaleString("es-MX")}</span>
        <Link href="/cuenta" aria-label="Mi cuenta">
          <div className="av" style={{ cursor: "pointer", width: 40, height: 40 }} title={user.name}>
            {initials}
          </div>
        </Link>
      </div>
    </div>
  );
}
