// Mapeo título -> carrera -> facultad.
// GET:   títulos distintos (con nº de graduados) + su fila de mapeo si existe.
// PATCH: edita una fila de mapeo (carrera/facultad/revisado); origen pasa a
//        'manual' y se registra quién la revisó.

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";

export const runtime = "nodejs";

async function autorizar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, perfil: null as null | { id: string } };
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, rol, aprobado")
    .eq("id", user.id)
    .maybeSingle();
  const ok = perfil ? await tieneModulo(perfil, "alumni") : false;
  return { supabase, perfil: ok ? perfil : null };
}

export async function GET() {
  const { supabase, perfil } = await autorizar();
  if (!perfil) return Response.json({ error: "Acceso denegado" }, { status: 403 });

  // Títulos distintos (la vista pagina hasta 2000: hay ~1100 en el reporte).
  const [{ data: titulos, error: e1 }, { data: mapeos, error: e2 }] = await Promise.all([
    supabase.from("v_alumni_titulos_resumen").select("*").limit(2000),
    supabase.from("titulos_mapeo").select("*").limit(2000),
  ]);
  if (e1 || e2) {
    return Response.json(
      { error: `Error leyendo mapeo: ${(e1 || e2)!.message}` },
      { status: 500 }
    );
  }

  const porTitulo = new Map((mapeos ?? []).map((m) => [m.titulo_normalizado, m]));
  const filas = (titulos ?? []).map((t) => ({
    titulo: t.titulo,
    graduados: t.graduados,
    nivel_formacion: t.nivel_formacion,
    instituto: t.instituto,
    mapeo: porTitulo.get(t.titulo) ?? null,
  }));

  return Response.json({ ok: true, filas });
}

export async function PATCH(req: Request) {
  const { supabase, perfil } = await autorizar();
  if (!perfil) return Response.json({ error: "Acceso denegado" }, { status: 403 });

  let body: {
    titulo?: string;
    carrera_nombre?: string | null;
    facultad?: string | null;
    revisado?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const titulo = (body.titulo || "").trim().toUpperCase();
  if (!titulo) return Response.json({ error: "Falta el título" }, { status: 400 });

  const carrera = (body.carrera_nombre || "")?.trim() || null;
  const facultad = (body.facultad || "")?.trim() || null;

  // Resolver (o crear) la carrera en el catálogo. `carreras` es un catálogo
  // sin política de escritura para autoridades: se usa la clave de servicio
  // DESPUÉS de haber verificado el módulo.
  const admin = createAdminClient();
  let carreraId: number | null = null;
  if (carrera) {
    const nivel = /MAGISTER|MAESTR|ESPECIALISTA|DOCTOR/i.test(titulo)
      ? "Cuarto nivel"
      : "Tercer nivel";
    const { data: c, error: eCarrera } = await admin
      .from("carreras")
      .upsert({ nombre: carrera, facultad, nivel }, { onConflict: "nombre" })
      .select("id")
      .maybeSingle();
    if (eCarrera) return Response.json({ error: eCarrera.message }, { status: 500 });
    carreraId = c?.id ?? null;
  }

  const { data, error } = await admin
    .from("titulos_mapeo")
    .upsert(
      {
        titulo_normalizado: titulo,
        carrera_nombre: carrera,
        facultad,
        carrera_id: carreraId,
        origen: "manual",
        confianza: null,
        revisado: body.revisado ?? true,
        revisado_por: perfil.id,
      },
      { onConflict: "titulo_normalizado" }
    )
    .select()
    .maybeSingle();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, mapeo: data });
}
