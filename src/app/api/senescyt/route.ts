import { NextResponse } from "next/server";
import { consultarSenescyt } from "@/lib/senescyt";
import { createClient } from "@/lib/supabase/server";
import { cedulaFormato, limiteExcedido, ipDe } from "@/lib/seguridad";

// Consulta de títulos por cédula (usada en el registro y en el perfil).
// Para usuarios sin sesión (registro) se limita la tasa y se omite el
// número de registro; un usuario autenticado recibe el detalle completo.
export async function GET(req: Request) {
  if (limiteExcedido(`senescyt:${ipDe(req)}`, 20, 60_000, Date.now())) {
    return NextResponse.json({ encontrado: false, error: "Demasiadas consultas. Espera un momento." }, { status: 429 });
  }

  const cedula = new URL(req.url).searchParams.get("cedula")?.trim() ?? "";
  if (!cedulaFormato(cedula)) {
    return NextResponse.json({ encontrado: false, titulos: [] });
  }

  // ¿Hay sesión? Solo entonces devolvemos el número de registro.
  let autenticado = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    autenticado = !!user;
  } catch {}

  try {
    const titulos = await consultarSenescyt(cedula);
    const salida = autenticado
      ? titulos
      : titulos.map(({ numero_registro, ...resto }) => resto);
    return NextResponse.json({ encontrado: titulos.length > 0, titulos: salida });
  } catch {
    return NextResponse.json({ encontrado: false, titulos: [] });
  }
}
