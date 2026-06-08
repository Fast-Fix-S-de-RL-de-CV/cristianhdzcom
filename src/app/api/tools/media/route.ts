import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { requireUser } from "@/lib/auth";
import { r2, r2Configured, R2_BUCKET } from "@/lib/r2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/tools/media?key=plans/{userId}/archivo.jpg
 * Proxy autenticado: sirve un objeto de R2 solo si pertenece al prefijo del
 * usuario que lo pide (plans/{su-id}/). El bucket queda privado.
 */
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!r2Configured || !r2) {
    return NextResponse.json({ error: "Almacenamiento no configurado" }, { status: 503 });
  }

  const key = req.nextUrl.searchParams.get("key") || "";
  const prefix = `plans/${user.id}/`;
  // Solo objetos del propio usuario; sin path traversal.
  if (!key.startsWith(prefix) || key.includes("..")) {
    return NextResponse.json({ error: "Prohibido" }, { status: 403 });
  }

  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    if (!obj.Body) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const stream = (obj.Body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": obj.ContentType || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        ...(obj.ContentLength ? { "Content-Length": String(obj.ContentLength) } : {}),
      },
    });
  } catch (e) {
    const code = (e as { name?: string }).name;
    if (code === "NoSuchKey" || code === "NotFound") {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo leer el archivo" }, { status: 502 });
  }
}
