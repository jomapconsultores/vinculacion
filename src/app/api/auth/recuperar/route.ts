import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { limiteExcedido, ipDe } from "@/lib/seguridad";

// Recuperación de contraseña same-origin.
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const email = body.email?.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  // Límite de tasa: evita spam de correos de recuperación y enumeración de cuentas.
  if (limiteExcedido(`recuperar:${ipDe(req)}:${email.toLowerCase()}`, 5, 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento e intenta de nuevo." }, { status: 429 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://conecta.pensamiento-libre.org";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${site}/auth/callback?next=/restablecer`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
