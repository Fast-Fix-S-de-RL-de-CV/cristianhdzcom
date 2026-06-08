import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { requireUser } from "@/lib/auth";
import { r2, r2Configured, R2_BUCKET, publicUrl } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

/** Tipos permitidos → extensión. Imágenes + clips cortos. */
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** POST /api/tools/upload — sube un archivo a R2 bajo el prefijo del usuario. */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!r2Configured || !r2) {
    return NextResponse.json(
      { error: "El almacenamiento aún no está configurado." },
      { status: 503 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Archivo vacío" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera 15 MB" }, { status: 413 });
  }

  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Tipo no permitido (usa JPG, PNG, WEBP, GIF, MP4 o WEBM)" },
      { status: 415 }
    );
  }

  const key = `plans/${user.id}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: file.type,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } catch {
    return NextResponse.json({ error: "No se pudo subir el archivo" }, { status: 502 });
  }

  return NextResponse.json({
    url: publicUrl(key),
    kind: file.type.startsWith("video/") ? "video" : "image",
  });
}
