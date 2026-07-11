// Genera propuestas de mapeo título -> carrera -> facultad con IA.
//
// Procesa hasta 150 títulos pendientes por invocación (5 lotes de 30) para
// no chocar con el tiempo máximo del route; el cliente repite la llamada
// hasta que `restantes` sea 0. Las propuestas quedan con revisado=false: no
// afectan reportes hasta que el administrador las revise y aplique.

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";
import { askJSON, aiConfigurado } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOTE_IA = 30;
const MAX_POR_LLAMADA = 150;

type Pendiente = { titulo: string; nivel_formacion: string | null; instituto: string | null };
type MapeoIA = {
  titulo: string;
  carrera: string | null;
  facultad: string | null;
  confianza: number;
};

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, rol, aprobado")
    .eq("id", user.id)
    .maybeSingle();
  const autorizado = perfil ? await tieneModulo(perfil, "alumni") : false;
  if (!autorizado) return Response.json({ error: "Acceso denegado" }, { status: 403 });

  if (!aiConfigurado()) {
    return Response.json(
      { error: "IA no configurada: define DEEPSEEK_API_KEY o MISTRAL_API_KEY." },
      { status: 503 }
    );
  }

  const admin = createAdminClient();

  // Títulos sin mapeo.
  const [{ data: titulos, error: e1 }, { data: mapeados, error: e2 }] = await Promise.all([
    supabase
      .from("v_alumni_titulos_resumen")
      .select("titulo, nivel_formacion, instituto")
      .limit(2000),
    admin.from("titulos_mapeo").select("titulo_normalizado").limit(3000),
  ]);
  if (e1 || e2) {
    return Response.json({ error: (e1 || e2)!.message }, { status: 500 });
  }
  const ya = new Set((mapeados ?? []).map((m: { titulo_normalizado: string }) => m.titulo_normalizado));
  const pendientes: Pendiente[] = (titulos ?? []).filter((t: Pendiente) => !ya.has(t.titulo));

  if (pendientes.length === 0) {
    return Response.json({ ok: true, procesados: 0, restantes: 0 });
  }

  // Vocabulario de facultades (cerrado) y carreras conocidas (orientativo).
  const [{ data: carreras }, { data: facultadesMapeo }] = await Promise.all([
    admin.from("carreras").select("nombre, facultad"),
    admin.from("titulos_mapeo").select("facultad").not("facultad", "is", null),
  ]);
  const facultades = [
    ...new Set(
      [
        ...(carreras ?? []).map((c: { facultad: string | null }) => c.facultad),
        ...(facultadesMapeo ?? []).map((f: { facultad: string | null }) => f.facultad),
      ].filter((f): f is string => !!f && f.trim().length > 0)
    ),
  ].sort();
  const carrerasConocidas = [
    ...new Set((carreras ?? []).map((c: { nombre: string }) => c.nombre)),
  ].sort();

  const aProcesar = pendientes.slice(0, MAX_POR_LLAMADA);
  let procesados = 0;
  const errores: string[] = [];

  const system = `Eres un experto en la oferta académica de la Universidad de Cuenca (Ecuador).
Recibirás títulos académicos tal como constan en un reporte de graduados y debes asignar a cada uno
la CARRERA (programa académico) y la FACULTAD de la Universidad de Cuenca a la que corresponde.

Reglas estrictas:
- Si el "instituto" del título NO es la Universidad de Cuenca (posgrados en otras universidades),
  devuelve carrera=null y facultad=null.
- La facultad debe ser EXACTAMENTE una de esta lista (o null): ${JSON.stringify(facultades)}.
- Para la carrera usa el nombre oficial del programa (ej. "Medicina", "Derecho", "Contabilidad y
  Auditoría"). Carreras ya registradas en el sistema (prefiérelas si coinciden):
  ${JSON.stringify(carrerasConocidas)}.
- "confianza" entre 0 y 1 según qué tan seguro estés.
- No inventes: si no puedes determinarlo, usa null.
Responde SOLO JSON: {"mapeos":[{"titulo":"...","carrera":"...o null","facultad":"...o null","confianza":0.9}]}`;

  for (let i = 0; i < aProcesar.length; i += LOTE_IA) {
    const lote = aProcesar.slice(i, i + LOTE_IA);
    try {
      const res = await askJSON<{ mapeos: MapeoIA[] }>(
        system,
        JSON.stringify(
          lote.map((t) => ({
            titulo: t.titulo,
            nivel: t.nivel_formacion,
            instituto: t.instituto,
          }))
        ),
        4000
      );
      const validos = (res.mapeos ?? []).filter(
        (m) => typeof m.titulo === "string" && m.titulo.trim().length > 0
      );
      const porTitulo = new Map(validos.map((m) => [m.titulo.trim().toUpperCase(), m]));
      const filas = lote.map((t) => {
        const m = porTitulo.get(t.titulo);
        const conf =
          m && typeof m.confianza === "number"
            ? Math.min(1, Math.max(0, Math.round(m.confianza * 100) / 100))
            : null;
        return {
          titulo_normalizado: t.titulo,
          carrera_nombre: m?.carrera?.trim() || null,
          facultad: m?.facultad && facultades.includes(m.facultad) ? m.facultad : m?.facultad?.trim() || null,
          origen: "ia",
          confianza: conf,
          revisado: false,
        };
      });
      const { error } = await admin
        .from("titulos_mapeo")
        .upsert(filas, { onConflict: "titulo_normalizado", ignoreDuplicates: true });
      if (error) errores.push(error.message);
      else procesados += filas.length;
    } catch (e: any) {
      errores.push(e?.message || String(e));
    }
  }

  return Response.json({
    ok: true,
    procesados,
    restantes: Math.max(0, pendientes.length - procesados),
    errores: errores.length ? errores : undefined,
  });
}
