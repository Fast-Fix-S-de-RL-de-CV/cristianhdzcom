import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { MarketingCanvas } from "@/components/tools/MarketingCanvas";
import type { Node, Edge } from "@xyflow/react";

export const dynamic = "force-dynamic";

export default async function MarketingCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/plataforma/herramientas/marketing/${id}`);

  const [plan] = await db
    .select()
    .from(schema.marketingPlans)
    .where(and(eq(schema.marketingPlans.id, id), eq(schema.marketingPlans.userId, user.id)))
    .limit(1);
  if (!plan) notFound();

  const raw = (plan.data as { nodes?: unknown[]; edges?: unknown[] }) ?? {};
  return (
    <MarketingCanvas
      plan={{
        id: plan.id,
        title: plan.title,
        product: plan.product,
        data: {
          nodes: (raw.nodes as Node[]) ?? [],
          edges: (raw.edges as Edge[]) ?? [],
        },
      }}
    />
  );
}
