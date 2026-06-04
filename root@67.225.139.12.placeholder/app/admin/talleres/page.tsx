import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { TalleresManager } from "./TalleresManager";

export const dynamic = "force-dynamic";

export default async function TalleresPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: schema.events.id,
      title: schema.events.title,
      description: schema.events.description,
      host: schema.events.host,
      startsAt: schema.events.startsAt,
      durationMinutes: schema.events.durationMinutes,
      isLive: schema.events.isLive,
      capacity: schema.events.capacity,
      attending: schema.events.attending,
      hot: schema.events.hot,
      link: schema.events.link,
      priceUsd: schema.events.priceUsd,
      recordingUrl: schema.events.recordingUrl,
      includedInMembership: schema.events.includedInMembership,
      coverUrl: schema.events.coverUrl,
      isEvergreen: schema.events.isEvergreen,
      evergreenScheduleHint: schema.events.evergreenScheduleHint,
      tagline: schema.events.tagline,
      isActive: schema.events.isActive,
      badge1Text: schema.events.badge1Text,
      badge1Color: schema.events.badge1Color,
      badge2Text: schema.events.badge2Text,
      badge2Color: schema.events.badge2Color,
    })
    .from(schema.events)
    .orderBy(desc(schema.events.startsAt));

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    host: r.host ?? "",
    startsAt: r.startsAt.toISOString(),
    durationMinutes: r.durationMinutes,
    isLive: r.isLive,
    capacity: r.capacity ?? 300,
    attending: r.attending,
    hot: r.hot,
    link: r.link ?? "",
    priceUsd: r.priceUsd ?? null,
    recordingUrl: r.recordingUrl ?? null,
    includedInMembership: ((r.includedInMembership === "silver" ||
      r.includedInMembership === "gold" ||
      r.includedInMembership === "black"
      ? r.includedInMembership
      : null) as "silver" | "gold" | "black" | null),
    coverUrl: r.coverUrl ?? null,
    isEvergreen: r.isEvergreen ?? false,
    evergreenScheduleHint: r.evergreenScheduleHint ?? null,
    tagline: r.tagline ?? null,
    isActive: r.isActive,
    badge1Text: r.badge1Text ?? null,
    badge1Color: r.badge1Color ?? null,
    badge2Text: r.badge2Text ?? null,
    badge2Color: r.badge2Color ?? null,
  }));

  return (
    <AdminPageShell
      user={user}
      active="/admin/talleres"
      title="Talleres & Eventos"
      subtitle={`${data.length} eventos · ${data.filter((d) => d.isLive).length} en vivo`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="admin-table-wrap">
          <TalleresManager rows={data} />
        </div>
      </Card>
    </AdminPageShell>
  );
}
