import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askJSON } from "@/lib/anthropic";

export const maxDuration = 60;

type Brecha = { competencia_id: number | null; competencia: string; por_que: string; curso_sugerido: string | null; curso_id: number | null };
type Analisis = {
  match_score: number;
  apto: boolean;
  fortalezas: string[];
  brechas: Brecha[];
  recomendacion: string;
  fuente: "ia" | "heuristica";
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { empleoId } = await req.json();
  if (!empleoId) return NextResponse.json({ error: "Falta empleoId" }, { status: 400 });

  // Oferta + competencias requeridas
  const { data: empleo } = await supabase
    .from("empleos")
    .select("id, titulo, descripcion, empresas(nombre), empleo_competencias(requerida, competencias(id, nombre, descripcion))")
    .eq("id", empleoId)
    .single();
  if (!empleo) return NextResponse.json({ error: "Empleo no encontrado" }, { status: 404 });

  const requeridas = (empleo as any).empleo_competencias.map((ec: any) => ({
    id: ec.competencias.id as number,
    nombre: ec.competencias.nombre as string,
    descripcion: ec.competencias.descripcion as string,
    requerida: ec.requerida as boolean,
  }));

  // Perfil del graduado
  const [{ data: compsG }, { data: hab }, { data: exp }, { data: cursos }] = await Promise.all([
    supabase.from("competencias_graduado").select("competencia_id, estado, competencias(nombre)").eq("profile_id", user.id),
    supabase.from("habilidades").select("nombre, nivel").eq("profile_id", user.id),
    supabase.from("experiencia_laboral").select("cargo, empresa, descripcion").eq("profile_id", user.id),
    supabase.from("cursos").select("id, nombre, competencia_id, duracion_horas, modalidad"),
  ]);

  const misComp = new Map<number, string>(); // competencia_id -> estado
  (compsG ?? []).forEach((c: any) => misComp.set(c.competencia_id, c.estado));
  const cursoPorComp = new Map<number, any>();
  (cursos ?? []).forEach((c: any) => { if (c.competencia_id) cursoPorComp.set(c.competencia_id, c); });

  // Heurística base: requeridas avaladas / total requeridas
  const reqs = requeridas.filter((r: any) => r.requerida);
  const avaladas = reqs.filter((r: any) => misComp.get(r.id) === "avalada");
  const faltantes = reqs.filter((r: any) => !misComp.has(r.id) || misComp.get(r.id) !== "avalada");
  const scoreHeur = reqs.length ? Math.round((avaladas.length / reqs.length) * 100) : 60;

  let analisis: Analisis;
  try {
    analisis = await askJSON<Analisis>(
      `Eres un evaluador de talento universitario en Ecuador. Comparas el perfil de un graduado con los requisitos de un empleo y devuelves SOLO JSON:
{"match_score": number(0-100), "apto": boolean, "fortalezas":[string], "brechas":[{"competencia_id":number|null,"competencia":string,"por_que":string,"curso_sugerido":string|null,"curso_id":number|null}], "recomendacion": string}
Reglas:
- Una competencia REQUERIDA solo cuenta como cumplida si el graduado la tiene con estado "avalada" por la universidad. Si la tiene "autodeclarada", menciónalo como parcial.
- "apto" = true solo si cubre TODAS las competencias requeridas con aval.
- Para cada brecha, sugiere el curso de educación continua del catálogo cuya competencia coincida (usa su curso_id y nombre exactos).
- Sé claro y motivador. Español.`,
      JSON.stringify({
        empleo: { titulo: (empleo as any).titulo, empresa: (empleo as any).empresas?.nombre, descripcion: (empleo as any).descripcion },
        competencias_requeridas: requeridas,
        graduado: {
          competencias: (compsG ?? []).map((c: any) => ({ nombre: c.competencias?.nombre, estado: c.estado })),
          habilidades: hab ?? [],
          experiencia: exp ?? [],
        },
        catalogo_cursos: (cursos ?? []),
      }, null, 2),
      2000
    );
    analisis.fuente = "ia";
  } catch {
    // Degradación heurística sin IA
    analisis = {
      match_score: scoreHeur,
      apto: faltantes.length === 0,
      fuente: "heuristica",
      fortalezas: avaladas.map((r: any) => `Competencia avalada: ${r.nombre}`),
      brechas: faltantes.map((r: any) => {
        const curso = cursoPorComp.get(r.id);
        return {
          competencia_id: r.id,
          competencia: r.nombre,
          por_que: misComp.get(r.id) === "autodeclarada"
            ? "La tienes autodeclarada; necesitas el aval de la universidad."
            : "No cuentas con esta competencia avalada.",
          curso_sugerido: curso?.nombre ?? null,
          curso_id: curso?.id ?? null,
        };
      }),
      recomendacion: faltantes.length === 0
        ? "Cumples el perfil requerido. ¡Postula con confianza!"
        : `Te faltan ${faltantes.length} competencia(s) avalada(s). Completa los cursos sugeridos para habilitarte.`,
    };
  }

  // Registrar / actualizar postulación
  const { data: post } = await supabase
    .from("postulaciones")
    .upsert(
      { empleo_id: empleoId, profile_id: user.id, estado: analisis.apto ? "enviada" : "borrador", match_score: analisis.match_score, ia_analisis: analisis },
      { onConflict: "empleo_id,profile_id" }
    )
    .select()
    .single();

  return NextResponse.json({ analisis, postulacion: post });
}
