import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Inscribir o aprobar un curso. Al aprobar, la universidad AVALA la competencia.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { cursoId, accion } = await req.json();
  if (!cursoId || !["inscribir", "aprobar"].includes(accion))
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

  const { data: curso } = await supabase
    .from("cursos").select("id, nombre, competencia_id").eq("id", cursoId).single();
  if (!curso) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  if (accion === "inscribir") {
    await supabase.from("inscripciones_curso").upsert(
      { profile_id: user.id, curso_id: cursoId, estado: "en_progreso" },
      { onConflict: "profile_id,curso_id" }
    );
    return NextResponse.json({ estado: "en_progreso" });
  }

  // aprobar
  await supabase.from("inscripciones_curso").upsert(
    { profile_id: user.id, curso_id: cursoId, estado: "aprobado", fecha_aprobacion: new Date().toISOString() },
    { onConflict: "profile_id,curso_id" }
  );

  // Avalar la competencia asociada
  if (curso.competencia_id) {
    await supabase.from("competencias_graduado").upsert(
      {
        profile_id: user.id,
        competencia_id: curso.competencia_id,
        estado: "avalada",
        avalada_por: "Universidad — Educación Continua",
        fecha_aval: new Date().toISOString(),
        curso_id: cursoId,
      },
      { onConflict: "profile_id,competencia_id" }
    );
  }

  return NextResponse.json({ estado: "aprobado", competencia_avalada: !!curso.competencia_id });
}
