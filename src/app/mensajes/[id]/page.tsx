import { notFound, redirect } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getTenantCtx } from "@/lib/tenant";
import { AlumnoShell } from "@/components/alumno/AlumnoShell";
import { ChatRoom } from "./ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getTenantCtx();
  if (!ctx) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(ctx.tp("/login?next=/mensajes"));
  const { id } = await params;

  const [c] = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).limit(1);
  if (!c) notFound();
  if (c.userAId !== user.id && c.userBId !== user.id) notFound();

  const peerId = c.userAId === user.id ? c.userBId : c.userAId;
  const [peer] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.id, peerId), eq(schema.users.tenantId, ctx.tenant.id)))
    .limit(1);
  if (!peer) notFound();

  return (
    <AlumnoShell user={user} active="mensajes">
      <ChatRoom
        conversationId={id}
        currentUser={{ id: user.id, name: user.name }}
        peer={{ id: peer.id, name: peer.name, role: peer.role, level: peer.level }}
      />
    </AlumnoShell>
  );
}
