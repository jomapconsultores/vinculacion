import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_VALIDOS, type TipoEncuesta } from "@/lib/encuestas";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { tipo?: string; respuestas?: Record<string, unknown> }
    | null;

  const tipo = body?.tipo;
  const respuestas = body?.respuestas;

  if (!tipo || !TIPOS_VALIDOS.includes(tipo as TipoEncuesta)) {
    return NextResponse.json({ error: "Tipo de encuesta inválido" }, { status: 400 });
  }
  if (!respuestas || typeof respuestas !== "object") {
    return NextResponse.json({ error: "Respuestas inválidas" }, { status: 400 });
  }

  const { error } = await supabase.from("encuestas_respuestas").insert({
    profile_id: user.id,
    tipo,
    respuestas,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
