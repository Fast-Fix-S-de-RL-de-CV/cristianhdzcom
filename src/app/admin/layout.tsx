import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const tp = ctx.tp;
  const user = await getCurrentUser();
  if (!user) redirect(tp("/login?next=/admin"));
  if (user.role !== "admin" && user.role !== "superadmin") redirect(tp("/comunidad"));
  return <>{children}</>;
}
