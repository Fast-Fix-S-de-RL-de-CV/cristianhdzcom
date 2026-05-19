import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: 560, width: "100%", textAlign: "center" }}>
        <Link
          href="/"
          aria-label="Cristian Hernández — Inicio"
          style={{ display: "inline-block", marginBottom: 32 }}
        >
          <img
            src="/logo.png"
            alt="Cristian Hernández"
            style={{ height: 56, width: "auto" }}
          />
        </Link>

        <div
          className="serif gold-text"
          style={{ fontSize: 120, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.04em" }}
        >
          404
        </div>

        <span
          className="gold-rule"
          style={{ display: "inline-block", margin: "16px auto 24px" }}
        />

        <h1
          className="serif"
          style={{
            fontSize: 28,
            color: "var(--navy)",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Esa página no existe.
        </h1>

        <p
          style={{
            color: "var(--muted)",
            fontSize: 15,
            marginTop: 12,
            marginBottom: 32,
            lineHeight: 1.6,
          }}
        >
          Es posible que la hayamos movido, que el link esté roto, o que aún no
          la hayamos construido. Si llegaste aquí desde una sección de la
          comunidad, escríbenos y lo revisamos.
        </p>

        <div
          className="row"
          style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}
        >
          <Link href="/" className="btn btn-primary">
            Volver al inicio
          </Link>
          <Link href="/plataforma" className="btn btn-ghost">
            Ir a mi plataforma
          </Link>
        </div>

        <p
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--muted)",
            marginTop: 40,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ¿Crees que es un bug?{" "}
          <a
            href="mailto:hola@cristianhdz.com"
            style={{ color: "var(--gold-deep)", fontWeight: 600 }}
          >
            avísanos
          </a>
        </p>
      </div>
    </div>
  );
}
