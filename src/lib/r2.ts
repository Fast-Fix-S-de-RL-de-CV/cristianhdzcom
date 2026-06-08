import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cliente de Cloudflare R2 (S3-compatible). Bucket dedicado de cristianhdz.com,
 * con prefijo por usuario (plans/{userId}/…). Las credenciales viven SOLO en el
 * .env del servidor (nunca en el repo ni en el cliente):
 *   R2_ACCOUNT_ID         — id de cuenta Cloudflare
 *   R2_ACCESS_KEY_ID      — access key del token R2
 *   R2_SECRET_ACCESS_KEY  — secret del token R2
 *   R2_BUCKET             — nombre del bucket
 *   R2_PUBLIC_URL         — (opcional) URL pública del bucket. Si NO se define,
 *                           los archivos se sirven por el proxy /api/tools/media
 *                           (bucket privado).
 */
const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

export const R2_BUCKET = process.env.R2_BUCKET || "";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

/** ¿Están las credenciales mínimas? La URL pública es opcional (si falta, se usa proxy). */
export const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && R2_BUCKET);

export const r2 = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

/**
 * URL final con la que el navegador verá el objeto.
 *  - Si hay R2_PUBLIC_URL → URL pública directa del bucket (CDN).
 *  - Si no → proxy autenticado del propio sitio (bucket privado).
 */
export function mediaUrl(key: string): string {
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL}/${key}`;
  return `/api/tools/media?key=${encodeURIComponent(key)}`;
}
