import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { askJSON } from "@/lib/anthropic";

type IAResultado = {
  score: number;
  fortalezas: string[];
  brechas: string[];
  recomendacion: string;
};

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
  const { data: empleo } = await admin
    .from("empleos")
    .select("id, empresa_id, titulo, descripcion, empleo_competencias(competencias(nombre))")
    .eq("id", empleoId)
    .maybeSingle();

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
  const { data: postulaciones } = await admin
    .from("postulaciones")
    .select(
      `id, profile_id,
       profiles (
         nombres, apellidos, titulo, resumen_profesional, ciudad,
         competencias_graduado ( estado, competencias ( nombre ) ),
         experiencia_laboral ( cargo, empresa, descripcion ),
         habilidades ( nombre, nivel )
       )`
    )
    .eq("empleo_id", empleoId);

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
    return {
      postulacion_id: p.id,
      nombre: `${pr.nombres ?? ""} ${pr.apellidos ?? ""}`.trim(),
      titulo: pr.titulo ?? null,
      resumen: pr.resumen_profesional ?? null,
      competencias: comps,
      experiencia: (pr.experiencia_laboral ?? []).map((x: any) => ({
        cargo: x.cargo,
        empresa: x.empresa,
        descripcion: x.descripcion,
      })),
      habilidades: (pr.habilidades ?? []).map((h: any) => h.nombre),
    };
  });

  const hayIA = !!process.env.ANTHROPIC_API_KEY;
  let resultados: Record<number, IAResultado & { fuente?: string }> = {};
  let mensaje: string | undefined;

  if (hayIA) {
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
        candidatos,
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

  // Fallback heurístico para candidatos sin resultado de IA
  for (const c of candidatos) {
    if (resultados[c.postulacion_id]) continue;
    const setCand = new Set(c.competencias.map((x) => x.toLowerCase()));
    const coinciden = requeridas.filter((r) => setCand.has(r.toLowerCase()));
    const faltan = requeridas.filter((r) => !setCand.has(r.toLowerCase()));
    const score = requeridas.length
      ? Math.round((coinciden.length / requeridas.length) * 100)
      : Math.min(100, c.competencias.length * 10);
    resultados[c.postulacion_id] = {
      score,
      fortalezas: coinciden.length
        ? [`Cumple: ${coinciden.join(", ")}`]
        : c.competencias.slice(0, 3).map((x) => x),
      brechas: faltan.map((f) => `Falta: ${f}`),
      recomendacion:
        score >= 70
          ? "Buen ajuste según competencias declaradas."
          : score >= 40
          ? "Ajuste parcial; considerar entrevista."
          : "Bajo ajuste con el perfil requerido.",
      fuente: "heuristico",
    };
  }

  // Guardar en cada postulación
  const ranking: any[] = [];
  for (const c of candidatos) {
    const r = resultados[c.postulacion_id];
    const ia_analisis = {
      fortalezas: r.fortalezas,
      brechas: r.brechas,
      recomendacion: r.recomendacion,
      score: r.score,
      fuente: r.fuente,
      generado_en: new Date().toISOString(),
    };
    await admin
      .from("postulaciones")
      .update({ match_score: r.score, ia_analisis })
      .eq("id", c.postulacion_id);
    ranking.push({ postulacion_id: c.postulacion_id, nombre: c.nombre, ...r });
  }

  ranking.sort((a, b) => b.score - a.score);
  return NextResponse.json({ ranking, mensaje });
}
