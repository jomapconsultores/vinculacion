// Motor de recomendación bidireccional (heurístico, por competencias).
import type { SupabaseClient } from "@supabase/supabase-js";

export type EmpleoRecomendado = {
  id: number;
  titulo: string;
  empresa: string | null;
  ciudad: string | null;
  modalidad: string | null;
  score: number;
  cubiertas: number;
  requeridas: number;
};

export type CandidatoSugerido = {
  id: string;
  nombre: string;
  carrera: string | null;
  score: number;
  cubiertas: number;
  requeridas: number;
};

// Empleos recomendados para un graduado (excluye a los que ya postuló).
// `empleosPrefetch`/`postPrefetch` permiten reutilizar filas que el llamador
// ya haya obtenido (p.ej. la página de empleos), evitando volver a consultarlas.
export async function empleosRecomendados(
  supabase: SupabaseClient,
  profileId: string,
  limite = 4,
  empleosPrefetch?: any[] | null,
  postPrefetch?: any[] | null
): Promise<EmpleoRecomendado[]> {
  const [{ data: comps }, post, empleos] = await Promise.all([
    supabase.from("competencias_graduado").select("competencia_id, estado").eq("profile_id", profileId),
    postPrefetch !== undefined
      ? Promise.resolve(postPrefetch)
      : supabase
          .from("postulaciones")
          .select("empleo_id")
          .eq("profile_id", profileId)
          .then((r) => r.data),
    empleosPrefetch !== undefined
      ? Promise.resolve(empleosPrefetch)
      : supabase
          .from("empleos")
          .select("id, titulo, ciudad, modalidad, empresas(nombre), empleo_competencias(competencia_id, requerida)")
          .eq("estado", "publicado")
          .then((r) => r.data),
  ]);

  const avaladas = new Set<number>();
  const auto = new Set<number>();
  (comps ?? []).forEach((c: any) => (c.estado === "avalada" ? avaladas : auto).add(c.competencia_id));
  const yaPostulo = new Set((post ?? []).map((p: any) => p.empleo_id));

  const res: EmpleoRecomendado[] = [];
  for (const e of (empleos ?? []) as any[]) {
    if (yaPostulo.has(e.id)) continue;
    const req = (e.empleo_competencias ?? []).filter((x: any) => x.requerida).map((x: any) => x.competencia_id);
    let puntos = 0;
    let cubiertas = 0;
    for (const cid of req) {
      if (avaladas.has(cid)) { puntos += 1; cubiertas += 1; }
      else if (auto.has(cid)) { puntos += 0.5; cubiertas += 1; }
    }
    const score = req.length ? Math.round((puntos / req.length) * 100) : 40;
    res.push({
      id: e.id,
      titulo: e.titulo,
      empresa: e.empresas?.nombre ?? null,
      ciudad: e.ciudad,
      modalidad: e.modalidad,
      score,
      cubiertas,
      requeridas: req.length,
    });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, limite);
}

// Candidatos sugeridos para un empleo (graduados que aún no postulan).
// `requeridas` son los competencia_id ya marcados como requeridos para el
// empleo; el llamador (que típicamente ya cargó empleo_competencias) los
// pasa para evitar volver a consultar la tabla empleos.
export async function candidatosSugeridos(
  supabase: SupabaseClient,
  empleoId: number,
  requeridas: number[],
  limite = 5
): Promise<CandidatoSugerido[]> {
  const req = requeridas ?? [];
  if (req.length === 0) return [];

  const [{ data: cg }, { data: post }] = await Promise.all([
    supabase.from("competencias_graduado").select("profile_id, competencia_id").eq("estado", "avalada").in("competencia_id", req),
    supabase.from("postulaciones").select("profile_id").eq("empleo_id", empleoId),
  ]);

  const yaPostularon = new Set((post ?? []).map((p: any) => p.profile_id));
  const porGraduado = new Map<string, Set<number>>();
  (cg ?? []).forEach((r: any) => {
    if (!porGraduado.has(r.profile_id)) porGraduado.set(r.profile_id, new Set());
    porGraduado.get(r.profile_id)!.add(r.competencia_id);
  });

  // Parte de las competencias avaladas (ya filtradas) para saber a quién le
  // interesa la vacante, en vez de traer TODA la tabla de profesionales y
  // descartar la mayoría en JS.
  const idsRelevantes = [...porGraduado.keys()].filter((id) => !yaPostularon.has(id));
  if (idsRelevantes.length === 0) return [];

  const { data: profs } = await supabase
    .from("profiles")
    .select("id, nombres, apellidos, carreras(nombre)")
    .in("id", idsRelevantes);

  const res: CandidatoSugerido[] = [];
  for (const p of (profs ?? []) as any[]) {
    const tiene = porGraduado.get(p.id);
    if (!tiene || tiene.size === 0) continue;
    const cubiertas = req.filter((c: number) => tiene.has(c)).length;
    if (cubiertas === 0) continue;
    res.push({
      id: p.id,
      nombre: `${p.nombres ?? ""} ${p.apellidos ?? ""}`.trim() || "Graduado",
      carrera: p.carreras?.nombre ?? null,
      score: Math.round((cubiertas / req.length) * 100),
      cubiertas,
      requeridas: req.length,
    });
  }
  return res.sort((a, b) => b.score - a.score).slice(0, limite);
}
