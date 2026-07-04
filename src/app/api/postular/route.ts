import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { askJSON } from "@/lib/ai";

export const maxDuration = 60;

// Cache corto en memoria del último análisis calculado por el servidor para
// (usuario, empleo): evita pagar la llamada a la IA dos veces cuando
// 'confirmar' llega justo después de 'evaluar' sobre la misma oferta. Nunca
// se confía en un análisis enviado por el cliente: si no hay entrada vigente
// (o el proceso se reinició), se recalcula igual en el servidor.
const cacheAnalisis = new Map<string, { analisis: Analisis; vence: number }>();
const TTL_ANALISIS_MS = 5 * 60_000;

function claveAnalisis(userId: string, empleoId: number) {
  return `${userId}:${empleoId}`;
}

type Brecha = { competencia_id: number | null; competencia: string; por_que: string; curso_sugerido: string | null; curso_id: number | null };
type Analisis = {
  match_score: number;
  apto: boolean;
  fortalezas: string[];
  brechas: Brecha[];
  recomendacion: string;
  fuente: "ia" | "heuristica";
};

// Recalcula el análisis de match SIEMPRE en el servidor (nunca confía en un
// analisis enviado por el cliente) para que 'confirmar' no pueda usarse para
// grabar un match_score/ia_analisis falsificado.
async function evaluar(supabase: any, user: { id: string }, empleoId: number): Promise<Analisis> {
  const { data: empleo } = await supabase
    .from("empleos")
    .select("id, titulo, descripcion, empresas(nombre), empleo_competencias(requerida, competencias(id, nombre, descripcion))")
    .eq("id", empleoId)
    .single();
  if (!empleo) throw new Error("Empleo no encontrado");

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

  return analisis;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const empleoId = body?.empleoId;
  const accion = body?.accion;
  if (!empleoId) return NextResponse.json({ error: "Falta empleoId" }, { status: 400 });

  const clave = claveAnalisis(user.id, empleoId);
  const cacheado = cacheAnalisis.get(clave);

  let analisis: Analisis;
  if (cacheado && cacheado.vence > Date.now()) {
    analisis = cacheado.analisis;
  } else {
    try {
      analisis = await evaluar(supabase, user, empleoId);
    } catch (e: any) {
      if (e.message === "Empleo no encontrado") {
        return NextResponse.json({ error: e.message }, { status: 404 });
      }
      return NextResponse.json({ error: "No se pudo evaluar la postulación" }, { status: 500 });
    }
    cacheAnalisis.set(clave, { analisis, vence: Date.now() + TTL_ANALISIS_MS });
    if (cacheAnalisis.size > 5000) {
      const ahora = Date.now();
      for (const [k, v] of cacheAnalisis) if (v.vence <= ahora) cacheAnalisis.delete(k);
    }
  }

  // 'evaluar' es solo un chequeo de elegibilidad: no toca la base de datos, para
  // que revisar el match no equivalga a enviar una postulación real al empleador.
  if (accion !== "confirmar") {
    return NextResponse.json({ analisis });
  }

  // 'confirmar' persiste la postulación. match_score/ia_analisis/estado están
  // protegidos por trigger para escrituras de usuario (ver 0012_rls_hardening.sql),
  // así que el registro real lo hace el servidor con service role, usando el
  // análisis que acaba de recalcular — nunca uno enviado por el cliente.
  const admin = createAdminClient();
  const { data: post, error } = await admin
    .from("postulaciones")
    .upsert(
      { empleo_id: empleoId, profile_id: user.id, estado: analisis.apto ? "enviada" : "borrador", match_score: analisis.match_score, ia_analisis: analisis },
      { onConflict: "empleo_id,profile_id" }
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ analisis, postulacion: post });
}
