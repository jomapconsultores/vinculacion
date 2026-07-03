import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
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
    const { error } = await supabase.from("inscripciones_curso").upsert(
      { profile_id: user.id, curso_id: cursoId, estado: "en_progreso" },
      { onConflict: "profile_id,curso_id" }
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ estado: "en_progreso" });
  }

  // aprobar
  const { error: eInsc } = await supabase.from("inscripciones_curso").upsert(
    { profile_id: user.id, curso_id: cursoId, estado: "aprobado", fecha_aprobacion: new Date().toISOString() },
    { onConflict: "profile_id,curso_id" }
  );
  if (eInsc) return NextResponse.json({ error: eInsc.message }, { status: 500 });

  // Avalar la competencia asociada
  if (curso.competencia_id) {
    const { error: eComp } = await supabase.from("competencias_graduado").upsert(
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
    if (eComp) return NextResponse.json({ error: eComp.message }, { status: 500 });
    // Asignar código de verificación del certificado (solo si aún no tiene)
    const codigo = randomBytes(6).toString("hex").toUpperCase();
    await supabase
      .from("competencias_graduado")
      .update({ codigo_verificacion: codigo })
      .eq("profile_id", user.id)
      .eq("competencia_id", curso.competencia_id)
      .is("codigo_verificacion", null);
  }

  return NextResponse.json({ estado: "aprobado", competencia_avalada: !!curso.competencia_id });
}
