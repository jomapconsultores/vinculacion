import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cambio de contraseña same-origin (usa la sesión de las cookies,
// incluida la sesión de recuperación creada por /auth/callback).
export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const password = body.password ?? "";
  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

// Estado de sesión (para la página de restablecer).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return NextResponse.json({ authenticated: !!user });
}
