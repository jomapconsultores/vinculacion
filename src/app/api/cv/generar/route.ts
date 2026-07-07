import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askJSON } from "@/lib/ai";

export const maxDuration = 60;

type CVGenerado = {
  resumen: string;
  experiencia: { cargo: string; empresa: string; periodo: string; logros: string[] }[];
  educacion: { titulo: string; institucion: string; periodo: string }[];
  habilidades: string[];
  sugerencias: string[];
};

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const [{ data: profile }, { data: exp }, { data: edu }, { data: hab }, { data: cvActual }] = await Promise.all([
    supabase.from("profiles").select("*, carreras(nombre)").eq("id", user.id).single(),
    supabase.from("experiencia_laboral").select("*").eq("profile_id", user.id),
    supabase.from("educacion").select("*").eq("profile_id", user.id),
    supabase.from("habilidades").select("*").eq("profile_id", user.id),
    supabase.from("cvs").select("contenido").eq("profile_id", user.id).maybeSingle(),
  ]);

  const insumos = {
    nombre: `${profile?.nombres ?? ""} ${profile?.apellidos ?? ""}`.trim(),
    titulo: profile?.titulo,
    carrera: (profile as any)?.carreras?.nombre,
    ciudad: profile?.ciudad,
    resumen_actual: profile?.resumen_profesional,
    experiencia: exp ?? [],
    educacion: edu ?? [],
    habilidades: (hab ?? []).map((h: any) => h.nombre),
  };

  let cv: CVGenerado;
  try {
    cv = await askJSON<CVGenerado>(
      `Eres un asesor de carrera experto en Ecuador. Redactas hojas de vida profesionales, concisas y orientadas a logros, en español. Devuelves SOLO un objeto JSON válido con esta forma:
{"resumen": string, "experiencia": [{"cargo","empresa","periodo","logros":[string]}], "educacion":[{"titulo","institucion","periodo"}], "habilidades":[string], "sugerencias":[string]}
- "resumen": 3-4 frases en primera persona profesional.
- "logros": reescribe cada experiencia en 2-3 viñetas orientadas a resultados; si faltan datos, infiere responsabilidades típicas del cargo de forma realista.
- "sugerencias": 3-5 consejos accionables para que el graduado mejore su empleabilidad (qué agregar, qué certificar, qué cuantificar).`,
      `Genera el CV a partir de estos datos del graduado:\n${JSON.stringify(insumos, null, 2)}`,
      2000
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message?.includes("IA no configurada") ? "IA no configurada (define DEEPSEEK_API_KEY, MISTRAL_API_KEY o CODESTRAL_API_KEY)." : "No se pudo generar el CV." },
      { status: 502 }
    );
  }

  // Combina con el contenido existente (p.ej. foto, perfil UNESCO, capacitaciones
  // y certificaciones detectadas por /api/cv/analizar) en vez de reemplazarlo:
  // este flujo solo produce resumen/experiencia/educacion/habilidades/sugerencias.
  const contenido = { ...(cvActual?.contenido as Record<string, unknown> | null), ...cv };

  await supabase.from("cvs").upsert(
    { profile_id: user.id, contenido, generado_ia: true, updated_at: new Date().toISOString() },
    { onConflict: "profile_id" }
  );

  // Si la IA propuso un mejor resumen y el perfil no tenía, lo guardamos
  if (cv.resumen && !profile?.resumen_profesional) {
    await supabase.from("profiles").update({ resumen_profesional: cv.resumen }).eq("id", user.id);
  }

  return NextResponse.json({ cv });
}
