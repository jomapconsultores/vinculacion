import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cedulaOcupada } from "@/lib/registro";
import { limiteExcedido, ipDe } from "@/lib/seguridad";

const ROLES = new Set(["profesional", "empleador", "autoridad"]);

// Registro same-origin para roles con verificación por correo.
// (Los estudiantes usan /api/registro, que confirma directo.)
export async function POST(req: Request) {
  // Límite de tasa: frena el spam de correos de verificación y la
  // enumeración de cuentas vía el mensaje "ya existe una cuenta".
  if (limiteExcedido(`auth-registro:${ipDe(req)}`, 5, 60_000, Date.now())) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un momento e intenta de nuevo." }, { status: 429 });
  }

  let body: { email?: string; password?: string; cedula?: string; rol?: string; empresa_nombre?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { email, password, cedula, rol, empresa_nombre } = body;

  if (!rol || !ROLES.has(rol)) return NextResponse.json({ error: "Nivel inválido" }, { status: 400 });
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });

  const ocupada = await cedulaOcupada(cedula);
  if (ocupada) return NextResponse.json({ error: ocupada }, { status: 409 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://conecta.pensamiento-libre.org";
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${site}/auth/callback`,
      data: { cedula: cedula ?? "", rol, empresa_nombre: empresa_nombre ?? "" },
    },
  });
  if (error) {
    const msg = /already|registered|exists/i.test(error.message)
      ? "Ya existe una cuenta con este correo"
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
