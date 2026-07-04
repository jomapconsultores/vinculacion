import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { passwordCorrecta } from "@/lib/verificar-password";
import { limiteExcedido } from "@/lib/seguridad";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  if (limiteExcedido(`confirmar-password:${user.id}`, 5, 5 * 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." }, { status: 429 });
  }

  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
  }
  if (!(await passwordCorrecta(user.email, password || ""))) {
    return NextResponse.json({ error: "Confirma tu contraseña actual para cambiar el correo." }, { status: 403 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://conecta.pensamiento-libre.org";
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${site}/auth/callback` }
  );
  if (error) {
    const msg = /already|registered|exists/i.test(error.message) ? "Ese correo ya está en uso." : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
