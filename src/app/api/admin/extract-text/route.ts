import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/extract-text
 *
 * Multipart upload — extracts plain text from common document formats so
 * the admin can feed it to the AI course generator. Returns `{ text, mime }`.
 *
 * Supported:
 *   - text/plain, text/markdown, text/* → read as UTF-8
 *   - application/pdf → pdf-parse
 *   - application/vnd.openxmlformats-officedocument.wordprocessingml.document → mammoth
 *
 * For unsupported types we return 415 with a list of accepted MIMEs.
 *
 * Limit: 20 MB per file. Larger documents are rejected; we trust the admin
 * to pre-process them (we still cap the extracted text to 60K characters
 * before returning to keep the AI prompt manageable).
 */
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_OUTPUT_CHARS = 60_000;

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "expected_multipart" }, { status: 400 });
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "too_large", maxBytes: MAX_BYTES, gotBytes: file.size },
      { status: 413 },
    );
  }
  const mime = file.type || "application/octet-stream";
  let text = "";
  try {
    if (mime.startsWith("text/") || /\.(md|markdown|txt|csv)$/i.test(file.name)) {
      text = await file.text();
    } else if (mime === "application/pdf" || /\.pdf$/i.test(file.name)) {
      // pdf-parse exports differently between CJS/ESM builds; cover both.
      const mod = (await import("pdf-parse")) as unknown as {
        default?: (b: Buffer) => Promise<{ text: string }>;
      };
      const pdfParse = mod.default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await pdfParse(buf);
      text = result.text ?? "";
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(file.name)
    ) {
      const mammoth = await import("mammoth");
      const buf = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value ?? "";
    } else {
      return NextResponse.json(
        {
          error: "unsupported_mime",
          mime,
          accepted: [
            "text/plain",
            "text/markdown",
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        },
        { status: 415 },
      );
    }
  } catch (e) {
    console.error("[extract-text]", e);
    return NextResponse.json(
      { error: "extract_failed", message: (e as Error).message },
      { status: 500 },
    );
  }
  // Hard cap to keep AI prompts manageable.
  const truncated = text.length > MAX_OUTPUT_CHARS;
  text = text.slice(0, MAX_OUTPUT_CHARS);
  return NextResponse.json({
    text,
    mime,
    truncated,
    size: file.size,
    chars: text.length,
  });
}
