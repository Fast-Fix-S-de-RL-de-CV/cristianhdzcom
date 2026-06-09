import {
  Globe,
  Mail,
  MessageSquare,
  Phone,
  Megaphone,
  Search,
  Repeat,
  FileImage,
  Video,
  Users,
  Calendar,
  Star,
  Flag,
  CreditCard,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

/** Un canal = un tipo de card del plan de marketing. */
export type Channel = {
  key: string;
  label: string;
  short: string;
  icon: LucideIcon;
  color: string;
  hint: string;
};

export const CHANNELS: Channel[] = [
  { key: "inicio", label: "Inicio / Lanzamiento", short: "Inicio", icon: Flag, color: "#0b1b34", hint: "Punto de arranque del flujo" },
  { key: "landing", label: "Landing / Web", short: "Landing", icon: Globe, color: "#2563eb", hint: "Página de venta o captura" },
  { key: "registro", label: "Registro / Formulario", short: "Registro", icon: ClipboardList, color: "#4f46e5", hint: "Formulario de registro o captura" },
  { key: "checkout", label: "Checkout / Pago", short: "Checkout", icon: CreditCard, color: "#059669", hint: "Página de pago o cobro" },
  { key: "email", label: "Email", short: "Email", icon: Mail, color: "#7c3aed", hint: "Correo o secuencia" },
  { key: "sms", label: "SMS", short: "SMS", icon: MessageSquare, color: "#0891b2", hint: "Mensaje de texto" },
  { key: "whatsapp", label: "WhatsApp", short: "WhatsApp", icon: Phone, color: "#16a34a", hint: "Mensaje o difusión" },
  { key: "meta_ads", label: "Facebook / Instagram Ads", short: "Meta Ads", icon: Megaphone, color: "#1d4ed8", hint: "Campaña pagada en Meta" },
  { key: "google_ads", label: "Google Ads", short: "Google Ads", icon: Search, color: "#ea4335", hint: "Search · Display · YouTube" },
  { key: "remarketing", label: "Remarketing", short: "Remarketing", icon: Repeat, color: "#db2777", hint: "Reimpacto a visitantes" },
  { key: "flyer", label: "Flyer / Impreso", short: "Flyer", icon: FileImage, color: "#b45309", hint: "Volante físico o digital" },
  { key: "video", label: "Video / Reel", short: "Video", icon: Video, color: "#dc2626", hint: "Contenido en video" },
  { key: "organico", label: "Post orgánico", short: "Orgánico", icon: Users, color: "#0d9488", hint: "Publicación sin pauta" },
  { key: "evento", label: "Evento / Webinar", short: "Evento", icon: Calendar, color: "#9333ea", hint: "En vivo o grabado" },
  { key: "influencer", label: "Influencer / PR", short: "Influencer", icon: Star, color: "#ca8a04", hint: "Colaboración o prensa" },
];

const CHANNEL_MAP: Record<string, Channel> = Object.fromEntries(CHANNELS.map((c) => [c.key, c]));
export function channel(key: string): Channel {
  return CHANNEL_MAP[key] ?? CHANNELS[1];
}

export type StatusKey = "faltante" | "trabajando" | "listo";
export const STATUSES: { key: StatusKey; label: string; color: string; bg: string }[] = [
  { key: "faltante", label: "Faltante", color: "#64748b", bg: "#f1f5f9" },
  { key: "trabajando", label: "Trabajando", color: "#b45309", bg: "#fef3c7" },
  { key: "listo", label: "Listo", color: "#15803d", bg: "#dcfce7" },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.key, s]));
export function status(key: string) {
  return STATUS_MAP[key] ?? STATUSES[0];
}

export type ChecklistItem = { id: string; text: string; done: boolean };

/** Colores sugeridos para las etapas (punto identificador de la card). */
export const STAGE_COLORS = [
  "#0b1b34",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#ca8a04",
];

/** Paleta para el color de identidad de la card (puede sobreescribir al del canal). */
export const CARD_COLORS = [
  "#0b1b34",
  "#2563eb",
  "#1d4ed8",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#b45309",
  "#ca8a04",
  "#16a34a",
  "#0d9488",
  "#0891b2",
];

/** Detecta YouTube/Vimeo de un link y devuelve la miniatura (YT es directa). */
export function parseVideo(url: string): { kind: "youtube" | "vimeo" | "other"; id: string; thumb: string } {
  const u = (url || "").trim();
  if (!u) return { kind: "other", id: "", thumb: "" };
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (m) return { kind: "youtube", id: m[1], thumb: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` };
  m = u.match(/vimeo\.com\/(?:video\/|channels\/[\w]+\/|groups\/[\w]+\/videos\/)?(\d+)/);
  if (m) return { kind: "vimeo", id: m[1], thumb: "" }; // requiere oEmbed
  return { kind: "other", id: "", thumb: "" };
}

/** Datos de cada card (nodo). Es informativo: planeación, no ejecución. */
export type MarketingNodeData = {
  channel: string;
  title: string;
  subtitle: string;
  text: string;
  status: StatusKey;
  /** Color de identidad de la card. Si está vacío usa el color del canal. */
  color: string;
  /** Etapa del embudo (independiente del ad): título + subtítulo + color del punto. */
  stageTitle: string;
  stageSubtitle: string;
  stageColor: string;
  /** Quién trabaja en esta pieza. */
  assignee: string;
  /** Cuándo: "Día 1", "Semana 2", "Lun-Vie", "Final del día"… */
  when: string;
  /** Hora: "09:00". */
  time: string;
  /** Pieza siempre activa (no atada a una fecha). */
  evergreen: boolean;
  /** Checklist de pendientes de esa card. */
  checklist: ChecklistItem[];
  /** Link de referencia del paso (evento, formulario, checkout, página…). */
  linkUrl: string;
  /** Links/recursos visuales. */
  videoUrl: string;
  imageUrl: string;
};

/** Dominio legible de un link para mostrar en la card. */
export function linkHost(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  try {
    const parsed = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
    const host = parsed.hostname.replace(/^www\./, "");
    return parsed.pathname && parsed.pathname !== "/" ? `${host}${parsed.pathname}`.slice(0, 38) : host;
  } catch {
    return u.slice(0, 38);
  }
}

/** Normaliza un link para abrirlo (le agrega https:// si falta). */
export function linkHref(url: string): string {
  const u = (url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

export function makeNodeData(channelKey: string): MarketingNodeData {
  const ch = channel(channelKey);
  return {
    channel: channelKey,
    title: ch.label,
    subtitle: "",
    text: "",
    status: "faltante",
    color: "",
    stageTitle: "",
    stageSubtitle: "",
    stageColor: "",
    assignee: "",
    when: "",
    time: "",
    evergreen: false,
    checklist: [],
    linkUrl: "",
    videoUrl: "",
    imageUrl: "",
  };
}
