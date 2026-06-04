import Link from "next/link";
import type { ReactNode } from "react";
import { TIER_META, type Tier, usdToNextTier } from "@/lib/experience";
import type { PostVisibility } from "@/lib/post-visibility";

/**
 * Overlay glass-blur sobre contenido restringido (body o adjuntos).
 * Muestra CTA personalizado según `reason`.
 *
 *  - `anonymous`           → CTA "Regístrate gratis" → /registro
 *  - `below_min_tier`      → CTA "Sube a {tier}" → /libros
 *  - `below_author_tier`   → idem
 */
export function PostPaywall({
  visibility,
  viewerScore = 0,
  variant = "body",
  children,
}: {
  visibility: PostVisibility;
  viewerScore?: number;
  variant?: "body" | "attachments";
  children: ReactNode;
}) {
  const target = visibility.requiredTier ?? "bronze";
  const meta = TIER_META[target];
  const usdNeeded = visibility.reason === "anonymous" ? 1 : usdToNextTier(viewerScore);

  const copy = {
    anonymous: {
      title: "Regístrate gratis para leer este contenido",
      sub: "1 minuto. Vas a ver el feed completo, podrás comentar y agendarte al próximo taller en vivo.",
      cta: "Crear cuenta gratis →",
      href: "/registro",
    },
    below_min_tier: {
      title: `Contenido exclusivo de ${meta.label} ${meta.emoji}`,
      sub: variant === "attachments"
        ? `Los archivos adjuntos están bloqueados${usdNeeded ? ` — te faltan $${usdNeeded} para desbloquearlos.` : "."}`
        : `Este post es solo para ${meta.label} y superior${usdNeeded ? ` — te faltan $${usdNeeded} para subir.` : "."}`,
      cta: `Subir a ${meta.label} →`,
      href: "/libros",
    },
    below_author_tier: {
      title: variant === "attachments" ? `Adjuntos solo para ${meta.label} ${meta.emoji}` : `Solo para ${meta.label} ${meta.emoji}`,
      sub: variant === "attachments"
        ? `Quien publicó es ${meta.label}. Para ver los archivos necesitas el mismo nivel${usdNeeded ? ` — te faltan $${usdNeeded}.` : "."}`
        : `Para ver este contenido completo necesitas ser ${meta.label}${usdNeeded ? ` — te faltan $${usdNeeded}.` : "."}`,
      cta: `Subir a ${meta.label} →`,
      href: "/libros",
    },
    ok: { title: "", sub: "", cta: "", href: "/" },
  };

  const c = copy[visibility.reason] ?? copy.below_min_tier;

  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
      {/* Contenido real, blureado */}
      <div
        aria-hidden="true"
        style={{
          filter: "blur(8px)",
          opacity: 0.55,
          userSelect: "none",
          pointerEvents: "none",
          maxHeight: variant === "body" ? 240 : 180,
          overflow: "hidden",
          maskImage: "linear-gradient(180deg, black 30%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(180deg, black 30%, transparent 100%)",
        }}
      >
        {children}
      </div>

      {/* Overlay con CTA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.92) 50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            background: meta.bg,
            color: meta.color,
            border: `1px solid ${meta.border}`,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 14 }}>🔒</span> Contenido bloqueado
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", maxWidth: 480, lineHeight: 1.3 }}>
          {c.title}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 520, lineHeight: 1.5 }}>{c.sub}</div>
        <Link
          href={c.href}
          style={{
            marginTop: 6,
            padding: "10px 22px",
            background: meta.color,
            color: "white",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: `0 8px 20px ${meta.bg}`,
          }}
        >
          {c.cta}
        </Link>
      </div>
    </div>
  );
}

/** Renderiza la lista de adjuntos de un post, blureando los que no califican. */
export function AttachmentsList({
  attachments,
  visibility,
  viewerScore,
}: {
  attachments: Array<{ kind: "link" | "video" | "pdf" | "image"; url: string; title: string }>;
  visibility: PostVisibility;
  viewerScore: number;
}) {
  if (attachments.length === 0) return null;

  const list = (
    <div className="col" style={{ gap: 8 }}>
      {attachments.map((a, i) => (
        <a
          key={i}
          href={visibility.canSeeAttachments ? a.url : "#"}
          target={visibility.canSeeAttachments ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={(e) => !visibility.canSeeAttachments && e.preventDefault()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 12,
            border: "1px solid var(--line)",
            borderRadius: 10,
            background: "white",
            textDecoration: "none",
            color: "var(--ink)",
            fontSize: 13,
          }}
        >
          <span style={{ fontSize: 22 }}>{iconForKind(a.kind)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600 }}>{a.title}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {a.kind.toUpperCase()} · {humanHost(a.url)}
            </div>
          </div>
          {visibility.canSeeAttachments && <span style={{ color: "var(--muted)" }}>↗</span>}
        </a>
      ))}
    </div>
  );

  if (visibility.canSeeAttachments) return list;

  return (
    <PostPaywall visibility={visibility} viewerScore={viewerScore} variant="attachments">
      {list}
    </PostPaywall>
  );
}

function iconForKind(kind: string): string {
  return { link: "🔗", video: "🎬", pdf: "📄", image: "🖼️" }[kind] ?? "📎";
}

function humanHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 40);
  }
}

/** Schema.org JSON-LD para que Google entienda el paywall legítimo. */
export function PaywallSchema({
  postTitle,
  authorName,
  createdAt,
}: {
  postTitle: string;
  authorName: string;
  createdAt: string;
}) {
  const json = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: postTitle,
    author: { "@type": "Person", name: authorName },
    datePublished: createdAt,
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: ".paywalled-content",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
