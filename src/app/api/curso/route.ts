import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Inscribir un curso interno o marcarlo como completado. El aval de la
// competencia lo emite el staff en /api/admin/cursos/revisar, nunca el
// propio graduado (ver 0016_revisar_curso_rpc.sql).
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { cursoId, accion } = await req.json();
  if (!cursoId || !["inscribir", "enviar_revision"].includes(accion))
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

  const { data: curso } = await supabase
    .from("cursos").select("id, nombre, competencia_id").eq("id", cursoId).single();
  if (!curso) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  if (accion === "inscribir") {
    const { error } = await supabase.from("inscripciones_curso").upsert(
      { profile_id: user.id, curso_id: cursoId, estado: "en_progreso" },
      { onConflict: "profile_id,curso_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ estado: "en_progreso" });
  }

  // enviar_revision: solo marca el curso como pendiente de revisión de staff.
  const { data: resultado, error: eRpc } = await supabase.rpc("enviar_revision_curso", { p_curso_id: cursoId });
  if (eRpc) {
    const status = /inscribirte|no está en un estado/.test(eRpc.message) ? 409 : 500;
    return NextResponse.json({ error: eRpc.message }, { status });
  }

  return NextResponse.json(resultado ?? { estado: "pendiente_revision" });
}
