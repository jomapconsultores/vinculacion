import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calcularResultado, respuestasCompletas } from "@/lib/psicometria";
import { limiteExcedido } from "@/lib/seguridad";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Cooldown por persona: evita reenvíos/duplicados accidentales (doble
  // clic, reintentos de red) sin impedir que alguien la repita más adelante.
  if (limiteExcedido(`psicometria:${user.id}`, 3, 5 * 60_000, Date.now())) {
    return NextResponse.json(
      { error: "Ya registraste varios intentos recientes. Espera unos minutos antes de volver a enviar." },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => null)) as { respuestas?: unknown } | null;
  const respuestas = body?.respuestas;

  if (!respuestasCompletas(respuestas)) {
    return NextResponse.json({ error: "Debes responder todos los ítems de la prueba" }, { status: 400 });
  }

  const { puntuaciones, interpretacion, alerta } = calcularResultado(respuestas);

  const { data, error } = await supabase
    .from("psicometria_resultados")
    .insert({
      profile_id: user.id,
      tipo: "perfil_psicolaboral",
      respuestas,
      puntuaciones,
      interpretacion,
      alerta,
    })
    .select("id, tipo, puntuaciones, interpretacion, alerta, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ resultado: data });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("psicometria_resultados")
    .select("id, tipo, puntuaciones, interpretacion, alerta, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ resultados: data ?? [] });
}
