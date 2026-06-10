import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { createSession, hashPassword } from "@/lib/auth";
import { sendEmail, welcomeEmailHtml } from "@/lib/email";
import { fmtEmail, fmtName } from "@/lib/format";

const body = z.object({
  // Normalización server-side (defensa): minúsculas/sin espacios + Title Case
  // limpiando números/símbolos del nombre.
  email: z.string().trim().email().transform(fmtEmail),
  password: z.string().min(8).max(100),
  name: z
    .string()
    .max(120)
    .transform(fmtName)
    .refine((s) => s.length >= 2, { message: "name_invalid" }),
});

export async function POST(req: Request) {
  try {
    const data = body.parse(await req.json());
    const existing = await db.select().from(schema.users).where(eq(schema.users.email, data.email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "email_in_use" }, { status: 400 });
    }
    const passwordHash = await hashPassword(data.password);
    const [user] = await db
      .insert(schema.users)
      .values({ email: data.email, passwordHash, name: data.name, role: "member" })
      .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name, role: schema.users.role });
    await createSession(user.id);

    // Welcome email — fire and forget, never blocks the signup response.
    const firstName = user.name?.split(" ")[0] ?? "";
    sendEmail({
      to: user.email,
      subject: "Bienvenido a Cristian Hernández",
      html: welcomeEmailHtml(firstName),
      text: `Hola ${firstName},\n\nTu cuenta en cristianhdz.com está lista. Entra aquí: https://cristianhdz.com/plataforma\n\n— Cristian`,
    }).catch((err) => console.error("[register] welcome email failed:", err));

    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: "invalid", details: e.issues }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
