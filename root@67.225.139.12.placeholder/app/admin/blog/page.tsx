import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { AdminPageShell } from "@/components/admin/AdminPageShell";
import { Card } from "@/components/ui/Card";
import { BlogManager } from "./BlogManager";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const user = (await getCurrentUser())!;

  const rows = await db
    .select({
      id: schema.blogPosts.id,
      title: schema.blogPosts.title,
      slug: schema.blogPosts.slug,
      excerpt: schema.blogPosts.excerpt,
      body: schema.blogPosts.body,
      category: schema.blogPosts.category,
      readMinutes: schema.blogPosts.readMinutes,
      isFeatured: schema.blogPosts.isFeatured,
      publishedAt: schema.blogPosts.publishedAt,
      createdAt: schema.blogPosts.createdAt,
    })
    .from(schema.blogPosts)
    .orderBy(desc(schema.blogPosts.createdAt));

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt ?? "",
    body: r.body,
    category: r.category ?? "",
    readMinutes: r.readMinutes ?? 8,
    isFeatured: r.isFeatured,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <AdminPageShell
      user={user}
      active="/admin/blog"
      title="Blog"
      subtitle={`${data.length} posts (${data.filter((d) => d.publishedAt).length} publicados)`}
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div className="admin-table-wrap">
          <BlogManager rows={data} />
        </div>
      </Card>
    </AdminPageShell>
  );
}
