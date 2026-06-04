import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/upload
 *
 * Multipart upload restricted to admins. Saves the file to
 * `/public/uploads/{date}/{random}.{ext}` so it's served at
 * `/uploads/{date}/{random}.{ext}` by Next's static handler.
 *
 * Body:  multipart/form-data with `file` field
 * Query: ?type=cover  (free-form tag, just for organizing)
 *
 * Returns: { url, kind, size, mime }
 *
 * The `/public/uploads` directory is excluded from rsync deploys, so user
 * uploads persist across releases.
 *
 * Limits:
 *   - Image: up to 8MB (JPEG, PNG, WebP, GIF, AVIF)
 *   - Video: up to 50MB (MP4, WebM, MOV)
 * For larger videos we recommend hosting on Vimeo and pasting the URL.
 */
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const ALLOWED_IMAGE = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);
const ALLOWED_VIDEO = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const isImage = ALLOWED_IMAGE.has(mime);
  const isVideo = ALLOWED_VIDEO.has(mime);
  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "unsupported_mime", mime, allowed: [...ALLOWED_IMAGE, ...ALLOWED_VIDEO] },
      { status: 415 },
    );
  }
  const sizeLimit = isImage ? MAX_IMAGE : MAX_VIDEO;
  if (file.size > sizeLimit) {
    return NextResponse.json(
      { error: "too_large", maxBytes: sizeLimit, gotBytes: file.size },
      { status: 413 },
    );
  }

  // Build a safe path: /public/uploads/YYYY-MM/{nanoid}.{ext}
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const dir = join(process.cwd(), "public", "uploads", ym);
  await mkdir(dir, { recursive: true });
  const id = randomBytes(8).toString("hex");
  const ext = EXT_BY_MIME[mime] ?? "bin";
  const filename = `${id}.${ext}`;
  const fullPath = join(dir, filename);

  const arrayBuf = await file.arrayBuffer();
  await writeFile(fullPath, Buffer.from(arrayBuf));

  const url = `/uploads/${ym}/${filename}`;
  return NextResponse.json({
    url,
    kind: isVideo ? "video" : "image",
    size: file.size,
    mime,
  });
}
