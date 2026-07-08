import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { limiteExcedido, ipDe } from "@/lib/seguridad";

// Recibe el reporte de diagnóstico del navegador del usuario.
export async function POST(req: Request) {
  // Límite de tasa: evita el abuso de escritura anónima a debug_eventos.
  if (limiteExcedido(`diagnostico:${ipDe(req)}`, 10, 60_000, Date.now())) {
    return NextResponse.json({ ok: false, error: "Demasiadas solicitudes. Espera un momento." }, { status: 429 });
  }

  let datos: Record<string, unknown> = {};
  try {
    datos = await req.json();
  } catch {}
  // Acota el tamaño del payload para no inflar la tabla de diagnóstico.
  if (JSON.stringify(datos).length > 10_000) {
    return NextResponse.json({ ok: false, error: "Payload demasiado grande." }, { status: 413 });
  }
  datos.ua = req.headers.get("user-agent") ?? "";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("debug_eventos")
      .insert({ tipo: "diagnostico", datos })
      .select("id")
      .single();
    return NextResponse.json({ ok: true, id: data?.id ?? null });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
