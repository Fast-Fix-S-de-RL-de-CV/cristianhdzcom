"use client";
import Link from "next/link";

type Props = {
  code: string;
  issuedAt: string;
  alumno: { name: string };
  program: { title: string; subtitle: string | null; durationLabel: string | null };
  founder: { name: string } | null;
};

/**
 * Print-friendly certificate. The visible top bar (buttons) is hidden
 * via @media print so window.print() yields a clean A4-landscape PDF.
 *
 * The certificate itself is laid out at 1056×744 (roughly A4 landscape
 * at 96 dpi minus margins) so it looks identical on screen and on paper.
 */
export function CertificateView(props: Props) {
  const { code, issuedAt, alumno, program, founder } = props;
  const date = new Date(issuedAt);
  const dateLabel = date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Top bar — hidden when printing */}
      <div
        className="cert-controls"
        style={{
          padding: "18px 24px",
          background: "white",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/plataforma" className="mono" style={{ color: "var(--muted)", textDecoration: "none", fontSize: 12 }}>
          ← VOLVER A LA PLATAFORMA
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (typeof navigator !== "undefined" && navigator.share) {
                navigator
                  .share({
                    title: `Certificado · ${program.title}`,
                    url: typeof window !== "undefined" ? window.location.href : "",
                  })
                  .catch(() => {});
              } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }
            }}
          >
            Compartir
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            style={{ background: "var(--navy)", color: "white" }}
          >
            Descargar PDF →
          </button>
        </div>
      </div>

      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-2)",
          padding: "40px 24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="cert-paper"
          style={{
            width: "100%",
            maxWidth: 1056,
            aspectRatio: "1056 / 744",
            background: "white",
            position: "relative",
            boxShadow: "0 18px 50px rgba(10,30,58,0.18)",
            border: "1px solid var(--line-2)",
            padding: "60px 80px",
            display: "flex",
            flexDirection: "column",
            color: "var(--navy)",
            fontFamily: "var(--font-serif)",
          }}
        >
          {/* Decorative gold border */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 20,
              border: "2px solid var(--gold)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 28,
              border: "1px solid var(--gold-line)",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div className="ch-logo">
              <img src="/logo.png" alt="Cristian Hernández" style={{ maxWidth: 180 }} />
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
                color: "var(--gold-deep)",
                fontWeight: 700,
              }}
            >
              CERTIFICADO DE FINALIZACIÓN
            </span>
          </div>

          {/* Body */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
            <p style={{ fontFamily: "var(--font-sans, system-ui)", fontSize: 14, color: "var(--ink-2)", letterSpacing: "0.04em" }}>
              Se otorga el presente certificado a
            </p>
            <h1
              style={{
                fontSize: 64,
                lineHeight: 1.05,
                marginTop: 14,
                color: "var(--navy)",
                fontWeight: 600,
              }}
            >
              {alumno.name}
            </h1>
            <div
              aria-hidden
              style={{
                width: 200,
                height: 1.5,
                background: "var(--gold)",
                margin: "18px auto",
              }}
            />
            <p style={{ fontFamily: "var(--font-sans, system-ui)", fontSize: 14, color: "var(--ink-2)", maxWidth: 720, margin: "0 auto", lineHeight: 1.6 }}>
              por haber completado satisfactoriamente todos los módulos del programa
            </p>
            <h2
              style={{
                fontSize: 32,
                marginTop: 16,
                color: "var(--gold-deep)",
                fontWeight: 600,
                lineHeight: 1.2,
                maxWidth: 880,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {program.title}
            </h2>
            {program.durationLabel && (
              <p
                className="mono"
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  marginTop: 10,
                  letterSpacing: "0.12em",
                }}
              >
                {program.durationLabel.toUpperCase()}
              </p>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 30,
              alignItems: "flex-end",
              paddingTop: 30,
              borderTop: "1px solid var(--gold-line)",
              marginTop: 20,
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em" }}>
                FECHA DE EMISIÓN
              </div>
              <div style={{ fontSize: 15, color: "var(--ink)", marginTop: 4, fontFamily: "var(--font-sans, system-ui)" }}>
                {dateLabel}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 22,
                  color: "var(--navy)",
                  fontWeight: 600,
                  fontFamily: "var(--font-serif)",
                  paddingBottom: 4,
                  borderBottom: "1.5px solid var(--gold-deep)",
                  display: "inline-block",
                  paddingLeft: 24,
                  paddingRight: 24,
                }}
              >
                {founder?.name ?? "Cristian Hernández"}
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  letterSpacing: "0.12em",
                  marginTop: 6,
                }}
              >
                FUNDADOR · CRISTIANHDZ.COM
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: "0.12em" }}>
                CÓDIGO DE VERIFICACIÓN
              </div>
              <div
                className="mono"
                style={{
                  fontSize: 14,
                  color: "var(--ink)",
                  marginTop: 4,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                {code}
              </div>
              <div className="mono" style={{ fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
                cristianhdz.com/cert/{code}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: white !important; margin: 0; padding: 0; }
          .cert-controls, nav.ch-nav, footer.ch-foot { display: none !important; }
          .cert-paper {
            box-shadow: none !important;
            border: none !important;
            page-break-inside: avoid;
            width: 100% !important;
            max-width: none !important;
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}
