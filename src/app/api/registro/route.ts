import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { cedulaOcupada } from "@/lib/registro";
import { cedulaFormato, limiteExcedido, ipDe } from "@/lib/seguridad";

export const runtime = "nodejs";

// Registro directo SOLO para estudiantes: crea la cuenta ya confirmada,
// sin correo de verificación. Los demás roles usan el flujo normal (signUp).
export async function POST(req: Request) {
  // Límite de tasa: frena la creación masiva de cuentas.
  if (limiteExcedido(`registro:${ipDe(req)}`, 5, 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento e intenta de nuevo." }, { status: 429 });
  }

  let body: { email?: string; password?: string; cedula?: string; rol?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { email, password, cedula, rol } = body;

  if (rol !== "estudiante") {
    return NextResponse.json({ error: "El registro directo solo está disponible para estudiantes" }, { status: 403 });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }
  if (!cedula || !cedulaFormato(cedula)) {
    return NextResponse.json({ error: "Cédula inválida (10 dígitos)" }, { status: 400 });
  }

  const ocupada = await cedulaOcupada(cedula);
  if (ocupada) return NextResponse.json({ error: ocupada }, { status: 409 });

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { cedula, rol: "estudiante" },
  });
  if (error) {
    const msg = /already|registered|exists/i.test(error.message)
      ? "Ya existe una cuenta con este correo"
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
