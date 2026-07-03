import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consultarSenescyt } from "@/lib/senescyt";

// Importa los títulos SENESCYT del usuario autenticado a su sección de educación (sin duplicar).
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("cedula").eq("id", user.id).maybeSingle();
  if (!prof?.cedula) return NextResponse.json({ error: "Tu perfil no tiene cédula registrada." }, { status: 400 });

  const titulos = await consultarSenescyt(prof.cedula);
  if (titulos.length === 0) return NextResponse.json({ importados: 0 });

  const { data: exEdu } = await supabase.from("educacion").select("titulo, institucion").eq("profile_id", user.id);
  const norm = (v?: string | null) => (v || "").trim().toLowerCase();
  const existentes = new Set((exEdu ?? []).map((e: any) => `${norm(e.titulo)}|${norm(e.institucion)}`));

  const nuevos = titulos
    .filter((t) => !existentes.has(`${norm(t.titulo)}|${norm(t.institucion)}`))
    .map((t) => ({
      profile_id: user.id,
      titulo: t.titulo,
      institucion: t.institucion ?? "—",
      nivel: t.tipo,
      fecha_fin: t.fecha_registro,
    }));

  if (nuevos.length) {
    const { error } = await supabase.from("educacion").insert(nuevos);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ importados: nuevos.length });
}
