import {
  LayoutDashboard,
  Target,
  GraduationCap,
  Briefcase,
  Crown,
  Repeat,
  Wallet,
  BookOpen,
  Radio,
  Library,
  Rocket,
  Newspaper,
  MessageSquare,
  Megaphone,
  LifeBuoy,
  Settings,
  MessageCircle,
  CheckCircle2,
  Calendar,
  Flame,
  Sparkles,
  CreditCard,
  Activity,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * Íconos SVG (lucide) para la navegación del admin — reemplazan a los emojis.
 * Una sola fuente de verdad usada por AdminPageShell y el dashboard.
 * Heredan el color del texto (currentColor), así que se ven bien en activo
 * (sobre navy) e inactivo.
 */
const MAP: Record<string, (s: number) => ReactNode> = {
  Dashboard: (s) => <LayoutDashboard size={s} />,
  Prospectos: (s) => <Target size={s} />,
  Alumnos: (s) => <GraduationCap size={s} />,
  Clientes: (s) => <Briefcase size={s} />,
  Membresías: (s) => <Crown size={s} />,
  Suscripciones: (s) => <Repeat size={s} />,
  Pagos: (s) => <Wallet size={s} />,
  Cursos: (s) => <BookOpen size={s} />,
  Talleres: (s) => <Radio size={s} />,
  Libros: (s) => <Library size={s} />,
  Servicios: (s) => <Rocket size={s} />,
  Blog: (s) => <Newspaper size={s} />,
  Comunidad: (s) => <MessageSquare size={s} />,
  Marketing: (s) => <Megaphone size={s} />,
  Soporte: (s) => <LifeBuoy size={s} />,
  Ajustes: (s) => <Settings size={s} />,
};

export function adminIcon(label: string, size = 17): ReactNode {
  const fn = MAP[label];
  return fn ? fn(size) : null;
}

/**
 * Convierte el emoji guardado en `activity.icon` (BD) a un ícono SVG lucide en
 * el render, sin tocar la base. Fallback a un ícono neutral si no se reconoce.
 */
const ACTIVITY: Record<string, ReactNode> = {
  "📖": <BookOpen size={15} />,
  "📕": <BookOpen size={15} />,
  "📗": <BookOpen size={15} />,
  "📘": <BookOpen size={15} />,
  "📚": <BookOpen size={15} />,
  "💬": <MessageCircle size={15} />,
  "🗨️": <MessageCircle size={15} />,
  "💭": <MessageCircle size={15} />,
  "🎓": <GraduationCap size={15} />,
  "✅": <CheckCircle2 size={15} />,
  "☑️": <CheckCircle2 size={15} />,
  "✔️": <CheckCircle2 size={15} />,
  "📅": <Calendar size={15} />,
  "🗓️": <Calendar size={15} />,
  "💳": <CreditCard size={15} />,
  "💰": <Wallet size={15} />,
  "💵": <Wallet size={15} />,
  "💸": <Wallet size={15} />,
  "🚀": <Rocket size={15} />,
  "🔥": <Flame size={15} />,
  "✨": <Sparkles size={15} />,
  "🎉": <Sparkles size={15} />,
  "🎯": <Target size={15} />,
};

export function activityIcon(emoji: string | null | undefined): ReactNode {
  if (emoji && ACTIVITY[emoji]) return ACTIVITY[emoji];
  return <Activity size={15} />;
}
