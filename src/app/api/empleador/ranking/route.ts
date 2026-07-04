import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { askJSON, aiConfigurado } from "@/lib/ai";

type IAResultado = {
  score: number;
  fortalezas: string[];
  brechas: string[];
  recomendacion: string;
};

// No se reevalúa con IA un candidato cuyo análisis ya es "reciente": el
// perfil de un graduado y los requisitos de la oferta no cambian de un clic
// a otro, así que recalcular a todos en cada clic solo multiplica el costo
// y la latencia sin cambiar el resultado.
const TTL_RANKING_MS = 24 * 60 * 60_000;

export async function POST(req: Request) {
  const profile = await requireProfile();
  if (profile.rol !== "empleador" || !profile.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const empleoId = Number(body?.empleoId);
  if (!Number.isFinite(empleoId)) {
    return NextResponse.json({ error: "empleoId inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Empleo + competencias requeridas — validar propiedad
  const { data: empleo, error: eEmpleo } = await admin
    .from("empleos")
    .select("id, empresa_id, titulo, descripcion, empleo_competencias(competencias(nombre))")
    .eq("id", empleoId)
    .maybeSingle();

  if (eEmpleo) {
    console.error("[ranking] error leyendo empleo:", eEmpleo.message);
    return NextResponse.json({ error: "No se pudo leer la oferta" }, { status: 500 });
  }
  if (!empleo) {
    return NextResponse.json({ error: "Oferta no encontrada" }, { status: 404 });
  }
  if ((empleo as any).empresa_id !== profile.empresa_id) {
    return NextResponse.json({ error: "No eres dueño de esta oferta" }, { status: 403 });
  }

  const requeridas: string[] = ((empleo as any).empleo_competencias ?? [])
    .map((ec: any) => ec.competencias?.nombre)
    .filter(Boolean);

  // Postulantes + perfil completo
  const { data: postulaciones, error: ePost } = await admin
    .from("postulaciones")
    .select(
      `id, profile_id, match_score, ia_analisis,
       profiles (
         nombres, apellidos, titulo, resumen_profesional, ciudad,
         competencias_graduado ( estado, competencias ( nombre ) ),
         experiencia_laboral ( cargo, empresa, descripcion ),
         habilidades ( nombre, nivel )
       )`
    )
    .eq("empleo_id", empleoId);

  if (ePost) {
    console.error("[ranking] error leyendo postulaciones:", ePost.message);
    return NextResponse.json({ error: "No se pudieron leer los postulantes" }, { status: 500 });
  }

  const lista = (postulaciones ?? []) as any[];
  if (lista.length === 0) {
    return NextResponse.json({ ranking: [], mensaje: "No hay postulantes para rankear." });
  }

  // Preparar resumen de cada candidato
  const candidatos = lista.map((p) => {
    const pr = p.profiles ?? {};
    const comps: string[] = (pr.competencias_graduado ?? [])
      .map((c: any) => c.competencias?.nombre)
      .filter(Boolean);
    // Solo las avaladas por la universidad cuentan para el ranking heurístico
    // (sin IA): la misma política que ya aplican postular() y
    // candidatosSugeridos(). Las autodeclaradas sí se envían a la IA como
    // contexto (`competencias`), pero no "cuentan" por sí solas en el fallback.
    const compsAvaladas: string[] = (pr.competencias_graduado ?? [])
      .filter((c: any) => c.estado === "avalada")
      .map((c: any) => c.competencias?.nombre)
      .filter(Boolean);
    return {
      postulacion_id: p.id,
      nombre: `${pr.nombres ?? ""} ${pr.apellidos ?? ""}`.trim(),
      titulo: pr.titulo ?? null,
      resumen: pr.resumen_profesional ?? null,
      competencias: comps,
      competenciasAvaladas: compsAvaladas,
      experiencia: (pr.experiencia_laboral ?? []).map((x: any) => ({
        cargo: x.cargo,
        empresa: x.empresa,
        descripcion: x.descripcion,
      })),
      habilidades: (pr.habilidades ?? []).map((h: any) => h.nombre),
    };
  });

  const hayIA = aiConfigurado();
  const resultados: Record<number, IAResultado & { fuente?: string }> = {};
  let mensaje: string | undefined;

  // Reutiliza el análisis ya guardado si es reciente; solo se manda a
  // revaluar lo nuevo o lo vencido.
  const ahora = Date.now();
  const analisisPrevios = new Map<number, any>(lista.map((p) => [p.id, p.ia_analisis]));
  for (const c of candidatos) {
    const previo = analisisPrevios.get(c.postulacion_id);
    const generadoEn = previo?.generado_en ? new Date(previo.generado_en).getTime() : 0;
    if (previo && ahora - generadoEn < TTL_RANKING_MS) {
      resultados[c.postulacion_id] = {
        score: previo.score,
        fortalezas: previo.fortalezas ?? [],
        brechas: previo.brechas ?? [],
        recomendacion: previo.recomendacion ?? "",
        fuente: previo.fuente,
      };
    }
  }
  const candidatosPorEvaluar = candidatos.filter((c) => !resultados[c.postulacion_id]);

  // Minimización de datos: el proveedor de IA solo recibe el identificador de la
  // postulación y la información profesional relevante para el match, nunca el
  // nombre del candidato (se reasocia localmente al construir la respuesta).
  const candidatosParaIA = candidatosPorEvaluar.map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nombre, ...resto } = c;
    return resto;
  });

  if (candidatosPorEvaluar.length === 0) {
    mensaje = "Todos los candidatos ya tenían un análisis reciente.";
  } else if (hayIA) {
    try {
      const system =
        "Eres un reclutador técnico experto. Evalúas la compatibilidad de candidatos con una vacante " +
        "según sus competencias, experiencia y las competencias requeridas. Devuelves SOLO JSON válido. " +
        "Sé objetivo y conciso. Responde en español.";
      const user = JSON.stringify({
        instruccion:
          "Evalúa cada candidato frente a la vacante. Asigna un 'score' de 0 a 100 (compatibilidad), " +
          "lista 'fortalezas' (2-4), 'brechas' (0-3, competencias requeridas que faltan o son débiles) y una " +
          "'recomendacion' breve de contratación. Devuelve un objeto con la forma " +
          "{ \"ranking\": [ { \"postulacion_id\": number, \"score\": number, \"fortalezas\": string[], \"brechas\": string[], \"recomendacion\": string } ] }.",
        vacante: {
          titulo: (empleo as any).titulo,
          descripcion: (empleo as any).descripcion,
          competencias_requeridas: requeridas,
        },
        candidatos: candidatosParaIA,
      });

      const json = await askJSON<{ ranking: (IAResultado & { postulacion_id: number })[] }>(
        system,
        user,
        3000
      );
      for (const r of json.ranking ?? []) {
        resultados[Number(r.postulacion_id)] = {
          score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
          fortalezas: Array.isArray(r.fortalezas) ? r.fortalezas : [],
          brechas: Array.isArray(r.brechas) ? r.brechas : [],
          recomendacion: r.recomendacion ?? "",
          fuente: "ia",
        };
      }
    } catch {
      mensaje = "La IA falló; se aplicó ranking heurístico.";
    }
  } else {
    mensaje = "IA no configurada, ranking heurístico";
  }

  // Fallback heurístico para candidatos sin resultado de IA. Solo cuentan las
  // competencias avaladas por la universidad (misma política que postular()
  // y candidatosSugeridos()); una competencia autodeclarada no basta.
  for (const c of candidatos) {
    if (resultados[c.postulacion_id]) continue;
    const setCand = new Set(c.competenciasAvaladas.map((x) => x.toLowerCase()));
    const coinciden = requeridas.filter((r) => setCand.has(r.toLowerCase()));
    const faltan = requeridas.filter((r) => !setCand.has(r.toLowerCase()));
    const score = requeridas.length
      ? Math.round((coinciden.length / requeridas.length) * 100)
      : Math.min(100, c.competenciasAvaladas.length * 10);
    resultados[c.postulacion_id] = {
      score,
      fortalezas: coinciden.length
        ? [`Cumple: ${coinciden.join(", ")}`]
        : c.competenciasAvaladas.slice(0, 3).map((x) => x),
      brechas: faltan.map((f) => `Falta: ${f}`),
      recomendacion:
        score >= 70
          ? "Buen ajuste según competencias avaladas."
          : score >= 40
          ? "Ajuste parcial; considerar entrevista."
          : "Bajo ajuste con el perfil requerido.",
      fuente: "heuristico",
    };
  }

  // Guardar solo lo recién (re)evaluado, en un único batch en vez de un
  // update secuencial por candidato.
  const filasPorGuardar = candidatosPorEvaluar.map((c) => {
    const r = resultados[c.postulacion_id];
    return {
      id: c.postulacion_id,
      match_score: r.score,
      ia_analisis: {
        fortalezas: r.fortalezas,
        brechas: r.brechas,
        recomendacion: r.recomendacion,
        score: r.score,
        fuente: r.fuente,
        generado_en: new Date().toISOString(),
      },
    };
  });
  if (filasPorGuardar.length > 0) {
    await admin.from("postulaciones").upsert(filasPorGuardar, { onConflict: "id" });
  }

  const ranking = candidatos.map((c) => ({
    postulacion_id: c.postulacion_id,
    nombre: c.nombre,
    ...resultados[c.postulacion_id],
  }));

  ranking.sort((a, b) => b.score - a.score);
  return NextResponse.json({ ranking, mensaje });
}
