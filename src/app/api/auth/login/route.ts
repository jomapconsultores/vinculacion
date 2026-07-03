import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Bitácora de intentos (diagnóstico remoto); nunca guarda la contraseña.
async function logIntento(datos: Record<string, unknown>) {
  try {
    const admin = createAdminClient();
    await admin.from("debug_eventos").insert({ tipo: "login", datos });
  } catch {}
}

// Login same-origin: el navegador solo habla con nuestro dominio;
// el servidor autentica contra Supabase y fija las cookies de sesión.
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Correo y contraseña son obligatorios" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await logIntento({ email, ok: false, error: error.message, ua });
    const msg = /invalid login credentials/i.test(error.message)
      ? "Credenciales inválidas o correo sin verificar."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 401 });
  }
  await logIntento({ email, ok: true, ua });
  return NextResponse.json({ ok: true });
}
