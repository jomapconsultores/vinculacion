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
export async function empleosRecomendados(
  supabase: SupabaseClient,
  profileId: string,
  limite = 4
): Promise<EmpleoRecomendado[]> {
  const [{ data: comps }, { data: post }, { data: empleos }] = await Promise.all([
    supabase.from("competencias_graduado").select("competencia_id, estado").eq("profile_id", profileId),
    supabase.from("postulaciones").select("empleo_id").eq("profile_id", profileId),
    supabase
      .from("empleos")
      .select("id, titulo, ciudad, modalidad, empresas(nombre), empleo_competencias(competencia_id, requerida)")
      .eq("estado", "publicado"),
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
export async function candidatosSugeridos(
  supabase: SupabaseClient,
  empleoId: number,
  limite = 5
): Promise<CandidatoSugerido[]> {
  const { data: empleo } = await supabase
    .from("empleos")
    .select("empleo_competencias(competencia_id, requerida)")
    .eq("id", empleoId)
    .maybeSingle();
  const req = ((empleo as any)?.empleo_competencias ?? []).filter((x: any) => x.requerida).map((x: any) => x.competencia_id);
  if (req.length === 0) return [];

  const [{ data: cg }, { data: profs }, { data: post }] = await Promise.all([
    supabase.from("competencias_graduado").select("profile_id, competencia_id, estado").eq("estado", "avalada").in("competencia_id", req),
    supabase.from("profiles").select("id, nombres, apellidos, carreras(nombre)").eq("rol", "profesional"),
    supabase.from("postulaciones").select("profile_id").eq("empleo_id", empleoId),
  ]);

  const yaPostularon = new Set((post ?? []).map((p: any) => p.profile_id));
  const porGraduado = new Map<string, Set<number>>();
  (cg ?? []).forEach((r: any) => {
    if (!porGraduado.has(r.profile_id)) porGraduado.set(r.profile_id, new Set());
    porGraduado.get(r.profile_id)!.add(r.competencia_id);
  });

  const res: CandidatoSugerido[] = [];
  for (const p of (profs ?? []) as any[]) {
    if (yaPostularon.has(p.id)) continue;
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
