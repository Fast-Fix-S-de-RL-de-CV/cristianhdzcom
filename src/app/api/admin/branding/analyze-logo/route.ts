import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;
const SUPPORTED_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const Body = z.object({
  logoUrl: z.string().max(500).optional().nullable(),
  current: z
    .object({
      accent: z.string().max(20).optional(),
      ink: z.string().max(20).optional(),
      bg: z.string().max(20).optional(),
      navBg: z.string().max(20).optional(),
      navText: z.string().max(20).optional(),
      buttonText: z.string().max(20).optional(),
    })
    .optional(),
});
const Suggestion = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  navBg: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  navText: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  buttonText: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontStyle: z.string().max(80),
  tone: z.string().max(120),
  rationale: z.string().max(800),
  confidence: z.number().min(0).max(1).default(0.75),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const ctx = await getTenantCtx();
  if (!ctx) return NextResponse.json({ error: "tenant_not_found" }, { status: 404 });

  const apiKey = ctx.tenant.slug === "cristianhdz" ? process.env.ANTHROPIC_API_KEY : undefined;
  if (!apiKey) {
    return NextResponse.json(
      { error: "anthropic_api_key_missing", message: "Configura ANTHROPIC_API_KEY en el servidor." },
      { status: 503 },
    );
  }

  let data: z.infer<typeof Body>;
  try {
    data = Body.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const logoUrl = data.logoUrl || ctx.branding.logoUrl;
  if (!logoUrl) return NextResponse.json({ error: "logo_missing", message: "Sube un logo antes de analizarlo." }, { status: 400 });

  let image: { bytes: Buffer; mediaType: string };
  try {
    image = await loadImage(logoUrl);
  } catch (e) {
    return NextResponse.json({ error: "logo_load_failed", message: (e as Error).message }, { status: 400 });
  }
  if (image.bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "logo_too_large", maxBytes: MAX_BYTES }, { status: 413 });
  }
  if (!SUPPORTED_MEDIA.has(image.mediaType)) {
    return NextResponse.json(
      {
        error: "unsupported_logo_type",
        message: "La IA puede analizar PNG, JPG, WebP o GIF. Convierte el logo a uno de esos formatos.",
        mediaType: image.mediaType,
        accepted: [...SUPPORTED_MEDIA],
      },
      { status: 415 },
    );
  }

  try {
    const suggestion = await analyzeWithClaude({
      apiKey,
      siteName: ctx.branding.siteName,
      current: data.current ?? {
        accent: ctx.branding.accent,
        ink: ctx.branding.ink,
        bg: ctx.branding.bg,
        navBg: ctx.branding.navBg,
        navText: ctx.branding.navText,
        buttonText: ctx.branding.buttonText,
      },
      image,
    });
    return NextResponse.json({ ok: true, suggestion });
  } catch (e) {
    console.error("[analyze-logo]", e);
    return NextResponse.json({ error: "ai_failed", message: (e as Error).message }, { status: 502 });
  }
}

async function loadImage(url: string): Promise<{ bytes: Buffer; mediaType: string }> {
  const cleanUrl = url.trim();
  if (cleanUrl.startsWith("/")) {
    const withoutQuery = cleanUrl.split(/[?#]/)[0] || cleanUrl;
    const decoded = decodeURIComponent(withoutQuery);
    const uploadIndex = decoded.indexOf("/uploads/");
    const uploadPath = uploadIndex >= 0 ? decoded.slice(uploadIndex) : decoded;
    const safe = normalize(uploadPath).replace(/^(\.\.(\/|\\|$))+/, "");
    if (!safe.startsWith("/uploads/")) throw new Error("Solo se pueden analizar logos subidos al sitio o URLs https.");
    const full = join(process.cwd(), "public", safe);
    try {
      const bytes = await readFile(full);
      return { bytes, mediaType: mimeFromPath(safe) };
    } catch {
      throw new Error("No se encontro el archivo del logo en uploads. Vuelve a subirlo y guarda los cambios.");
    }
  }

  if (!/^https?:\/\//i.test(cleanUrl)) throw new Error("URL de logo inválida.");
  const res = await fetch(cleanUrl, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error("No se pudo descargar el logo.");
  const mediaType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() || mimeFromPath(cleanUrl);
  const bytes = Buffer.from(await res.arrayBuffer());
  return { bytes, mediaType };
}

function mimeFromPath(path: string) {
  if (/\.jpe?g($|\?)/i.test(path)) return "image/jpeg";
  if (/\.png($|\?)/i.test(path)) return "image/png";
  if (/\.webp($|\?)/i.test(path)) return "image/webp";
  if (/\.gif($|\?)/i.test(path)) return "image/gif";
  if (/\.avif($|\?)/i.test(path)) return "image/avif";
  return "application/octet-stream";
}

async function analyzeWithClaude({
  apiKey,
  siteName,
  current,
  image,
}: {
  apiKey: string;
  siteName: string;
  current: { accent?: string; ink?: string; bg?: string; navBg?: string; navText?: string; buttonText?: string };
  image: { bytes: Buffer; mediaType: string };
}) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const prompt = `Analiza este logo para una plataforma web llamada "${siteName}".

Devuelve SOLO JSON válido con esta forma exacta:
{
  "accent": "#RRGGBB",
  "ink": "#RRGGBB",
  "bg": "#RRGGBB",
  "navBg": "#RRGGBB",
  "navText": "#RRGGBB",
  "buttonText": "#RRGGBB",
  "fontStyle": "descripción breve del estilo tipográfico recomendado",
  "tone": "tono visual de la marca",
  "rationale": "explicación breve en español",
  "confidence": 0.0
}

Reglas:
- Sugiere colores accesibles para UI:
  accent: botones, links activos y detalles de marca.
  ink: texto principal del sitio.
  bg: fondo general del sitio.
  navBg: fondo del menu superior publico.
  navText: texto del menu superior publico, con contraste alto sobre navBg.
  buttonText: texto sobre botones principales, con contraste alto sobre accent.
- Evita fondos demasiado oscuros si el logo ya es oscuro, salvo que la marca claramente lo pida.
- Mantén buen contraste entre ink/bg, navText/navBg y buttonText/accent.
- El resultado debe ser usable en una plataforma SaaS/cursos/comunidad.
- Considera los colores actuales solo como contexto, no estás obligado a conservarlos:
  accent actual: ${current.accent ?? "N/A"}
  ink actual: ${current.ink ?? "N/A"}
  bg actual: ${current.bg ?? "N/A"}
  navBg actual: ${current.navBg ?? "N/A"}
  navText actual: ${current.navText ?? "N/A"}
  buttonText actual: ${current.buttonText ?? "N/A"}
- No incluyas markdown ni texto fuera del JSON.`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 900,
    temperature: 0.2,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: image.bytes.toString("base64"),
            },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });
  const textBlock = response.content.find((block) => block.type === "text");
  const raw = textBlock?.type === "text" ? textBlock.text : "";
  const parsed = extractJson(raw);
  const normalized = normalizeSuggestion(parsed);
  const result = Suggestion.safeParse(normalized);
  if (!result.success) {
    console.error("[analyze-logo-invalid]", {
      issues: result.error.issues,
      parsed,
      raw: raw.slice(0, 1200),
    });
    throw new Error("La IA devolvió una sugerencia inválida.");
  }
  return {
    ...result.data,
    accent: result.data.accent.toUpperCase(),
    ink: result.data.ink.toUpperCase(),
    bg: result.data.bg.toUpperCase(),
    navBg: result.data.navBg.toUpperCase(),
    navText: result.data.navText.toUpperCase(),
    buttonText: result.data.buttonText.toUpperCase(),
  };
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {}
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(trimmed.slice(first, last + 1));
    } catch {}
  }
  return null;
}

function normalizeSuggestion(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  return {
    accent: normalizeHex(input.accent, "#C8A951"),
    ink: normalizeHex(input.ink, "#0A1E3A"),
    bg: normalizeHex(input.bg ?? input.background, "#FBFAF5"),
    navBg: normalizeHex(input.navBg ?? input.nav_bg ?? input.menuBg ?? input.menuBackground, "#0B2548"),
    navText: normalizeHex(input.navText ?? input.nav_text ?? input.menuText, "#FFFFFF"),
    buttonText: normalizeHex(input.buttonText ?? input.button_text ?? input.ctaText, "#0A1E3A"),
    fontStyle: text(input.fontStyle ?? input.font_style ?? input.typography, "Tipografia limpia y legible", 80),
    tone: text(input.tone ?? input.styleTone, "Identidad profesional y cercana", 120),
    rationale: text(input.rationale ?? input.reason ?? input.reasoning, "Paleta sugerida a partir de los colores visibles del logo.", 800),
    confidence: normalizeConfidence(input.confidence),
  };
}

function normalizeHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/^0x/i, "#");
  const withHash = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
  const short = withHash.match(/^#([0-9a-fA-F]{3})$/);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const full = withHash.match(/^#[0-9a-fA-F]{6}$/);
  return full ? withHash.toUpperCase() : fallback;
}

function normalizeConfidence(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1 ? Math.min(1, value / 100) : Math.max(0, Math.min(1, value));
  }
  if (typeof value === "string") {
    const n = Number(value.replace("%", "").trim());
    if (Number.isFinite(n)) return n > 1 ? Math.min(1, n / 100) : Math.max(0, Math.min(1, n));
  }
  return 0.75;
}

function text(value: unknown, fallback: string, max: number) {
  const raw = typeof value === "string" ? value.trim() : "";
  return (raw || fallback).slice(0, max);
}
