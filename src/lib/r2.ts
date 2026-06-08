import { S3Client } from "@aws-sdk/client-s3";

/**
 * Cliente de Cloudflare R2 (S3-compatible) — bucket dedicado de cristianhdz.com.
 * Todas las credenciales viven SOLO en el .env del servidor (nunca en el repo ni en el cliente).
 *   R2_ACCOUNT_ID         — id de cuenta Cloudflare
 *   R2_ACCESS_KEY_ID      — access key del token R2
 *   R2_SECRET_ACCESS_KEY  — secret del token R2
 *   R2_BUCKET             — nombre del bucket
 *   R2_PUBLIC_URL         — URL pública del bucket (dominio propio o *.r2.dev), sin slash final
 */
const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

export const R2_BUCKET = process.env.R2_BUCKET || "";
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

/** ¿Están todas las variables presentes? Si no, el endpoint responde 503. */
export const r2Configured = Boolean(
  accountId && accessKeyId && secretAccessKey && R2_BUCKET && R2_PUBLIC_URL
);

export const r2 = r2Configured
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

/** URL pública final de un objeto a partir de su key. */
export function publicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}
