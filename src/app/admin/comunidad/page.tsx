import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { ComunidadManager } from "./ComunidadManager";

export const dynamic = "force-dynamic";

export default async function ComunidadAdminPage() {
  const user = (await getCurrentUser())!;

  const posts = await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      body: schema.posts.body,
      pinned: schema.posts.pinned,
      likesCount: schema.posts.likesCount,
      commentsCount: schema.posts.commentsCount,
      viewsCount: schema.posts.viewsCount,
      createdAt: schema.posts.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.posts)
    .leftJoin(schema.users, eq(schema.users.id, schema.posts.authorId))
    .orderBy(desc(schema.posts.createdAt))
    .limit(200);

  const comments = await db
    .select({
      id: schema.comments.id,
      postId: schema.comments.postId,
      body: schema.comments.body,
      createdAt: schema.comments.createdAt,
      authorName: schema.users.name,
    })
    .from(schema.comments)
    .leftJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
    .orderBy(desc(schema.comments.createdAt))
    .limit(200);

  const categories = await db
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      name: schema.categories.name,
      emoji: schema.categories.emoji,
      color: schema.categories.color,
      sortOrder: schema.categories.sortOrder,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder));

  return (
    <AdminPageShell
      user={user}
      active="/admin/comunidad"
      title="Moderación de Comunidad"
      subtitle={`${posts.length} posts · ${comments.length} comentarios · ${categories.length} categorías`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <ComunidadManager
          posts={posts.map((p) => ({
            id: p.id,
            title: p.title,
            body: p.body,
            pinned: p.pinned,
            likesCount: p.likesCount,
            commentsCount: p.commentsCount,
            viewsCount: p.viewsCount,
            createdAt: p.createdAt.toISOString(),
            authorName: p.authorName || "—",
          }))}
          comments={comments.map((c) => ({
            id: c.id,
            postId: c.postId,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            authorName: c.authorName || "—",
          }))}
          categories={categories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            emoji: c.emoji || "",
            color: c.color || "",
            sortOrder: c.sortOrder,
          }))}
        />
      </Card>
    </AdminPageShell>
  );
}
