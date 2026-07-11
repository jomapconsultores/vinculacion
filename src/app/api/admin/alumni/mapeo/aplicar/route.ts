// Aplica el mapeo título -> carrera a los títulos de alumni.
//
// POST { marcarTodosRevisados?: boolean }
// 1. (opcional) marca revisado=true todo mapeo con carrera propuesta.
// 2. Crea en `carreras` las carreras de los mapeos revisados que falten y
//    resuelve titulos_mapeo.carrera_id en bloque.
// 3. Ejecuta el RPC aplicar_mapeo_titulos() (un solo UPDATE masivo, con
//    verificación is_staff+has_modulo dentro de la función).

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { tieneModulo } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  let marcarTodos = false;
  try {
    const body = await req.json();
    marcarTodos = !!body?.marcarTodosRevisados;
  } catch {
    // sin body: solo aplicar
  }

  const admin = createAdminClient();

  if (marcarTodos) {
    const { error } = await admin
      .from("titulos_mapeo")
      .update({ revisado: true, revisado_por: perfil!.id })
      .eq("revisado", false)
      .not("carrera_nombre", "is", null);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  // Mapeos revisados con carrera propuesta pero sin carrera_id resuelto.
  const { data: pendientes, error: e1 } = await admin
    .from("titulos_mapeo")
    .select("id, titulo_normalizado, carrera_nombre, facultad")
    .eq("revisado", true)
    .is("carrera_id", null)
    .not("carrera_nombre", "is", null)
    .limit(3000);
  if (e1) return Response.json({ error: e1.message }, { status: 500 });

  if ((pendientes ?? []).length > 0) {
    // Crear las carreras que falten (nombre único) y resolver ids.
    const distintas = new Map<string, { nombre: string; facultad: string | null }>();
    for (const p of pendientes!) {
      const clave = p.carrera_nombre.trim().toUpperCase();
      if (!distintas.has(clave)) {
        distintas.set(clave, { nombre: p.carrera_nombre.trim(), facultad: p.facultad });
      }
    }
    const nuevas = [...distintas.values()].map((c) => ({
      nombre: c.nombre,
      facultad: c.facultad,
      nivel: "Tercer nivel",
    }));
    // ignoreDuplicates: si la carrera ya existe no se pisa su facultad/nivel.
    const { error: e2 } = await admin
      .from("carreras")
      .upsert(nuevas, { onConflict: "nombre", ignoreDuplicates: true });
    if (e2) return Response.json({ error: e2.message }, { status: 500 });

    const { data: carreras, error: e3 } = await admin.from("carreras").select("id, nombre");
    if (e3) return Response.json({ error: e3.message }, { status: 500 });
    const idPorNombre = new Map(
      (carreras ?? []).map((c: { id: number; nombre: string }) => [
        c.nombre.trim().toUpperCase(),
        c.id,
      ])
    );

    const actualizaciones = pendientes!
      .map((p: { id: number; carrera_nombre: string }) => ({
        id: p.id,
        carrera_id: idPorNombre.get(p.carrera_nombre.trim().toUpperCase()) ?? null,
      }))
      .filter((a: { id: number; carrera_id: number | null }) => a.carrera_id !== null);
    for (const a of actualizaciones) {
      const { error } = await admin
        .from("titulos_mapeo")
        .update({ carrera_id: a.carrera_id })
        .eq("id", a.id);
      if (error) return Response.json({ error: error.message }, { status: 500 });
    }
  }

  // UPDATE masivo con verificación de permisos dentro de la función.
  const { data: cambiados, error: e4 } = await supabase.rpc("aplicar_mapeo_titulos");
  if (e4) return Response.json({ error: e4.message }, { status: 500 });

  return Response.json({ ok: true, titulosActualizados: cambiados ?? 0 });
}
