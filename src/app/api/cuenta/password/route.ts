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

  const { actual, nueva } = await req.json().catch(() => ({}));
  if (!nueva || nueva.length < 6) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres." }, { status: 400 });
  }
  if (!(await passwordCorrecta(user.email, actual || ""))) {
    return NextResponse.json({ error: "Tu contraseña actual no es correcta." }, { status: 403 });
  }

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
