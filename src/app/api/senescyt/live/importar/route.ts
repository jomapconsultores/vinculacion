import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { partirNombre } from "@/lib/senescyt-live";

// Guarda los títulos consultados en vivo (SENESCYT) en la educación del usuario
// y en el registro espejo, sin duplicar.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: prof } = await supabase
    .from("profiles").select("cedula, nombres, apellidos, titulo").eq("id", user.id).maybeSingle();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const titulos: any[] = Array.isArray(body?.titulos) ? body.titulos : [];
  const cursos: any[] = Array.isArray(body?.cursos) ? body.cursos : [];
  const nombreSenescyt: string = String(body?.nombre || "").trim();

  // Colocar el nombre en el perfil si aún no lo tiene (viene de SENESCYT)
  let nombre_actualizado = false;
  if (nombreSenescyt && !prof?.nombres && !prof?.apellidos) {
    const { nombres, apellidos } = partirNombre(nombreSenescyt);
    const upd: Record<string, any> = { nombres, apellidos };
    if (!prof?.titulo && titulos[0]?.titulo) upd.titulo = String(titulos[0].titulo);
    const { error } = await supabase.from("profiles").update(upd).eq("id", user.id);
    if (!error) nombre_actualizado = true;
  }

  const norm = (v?: string | null) => (v || "").trim().toLowerCase();

  // CURSOS -> tabla cursos_persona (apartado separado de títulos)
  let cursos_importados = 0;
  if (cursos.length > 0) {
    const { data: exCur } = await supabase.from("cursos_persona").select("nombre, institucion").eq("profile_id", user.id);
    const yaCur = new Set((exCur ?? []).map((c: any) => `${norm(c.nombre)}|${norm(c.institucion)}`));
    const nuevosCur = cursos
      .filter((c) => c?.titulo && !yaCur.has(`${norm(c.titulo)}|${norm(c.institucion)}`))
      .map((c) => ({
        profile_id: user.id,
        nombre: String(c.titulo),
        institucion: String(c.institucion || "—"),
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(c.fecha_registro || "") ? c.fecha_registro : null,
        area_nombre: c.area || null,
        numero_registro: c.numero_registro || null,
        fuente: "senescyt",
      }));
    if (nuevosCur.length) {
      const { error } = await supabase.from("cursos_persona").insert(nuevosCur);
      if (!error) cursos_importados = nuevosCur.length;
    }
  }

  if (titulos.length === 0) return NextResponse.json({ importados: 0, cursos_importados, nombre_actualizado });

  const { data: exEdu } = await supabase.from("educacion").select("titulo, institucion").eq("profile_id", user.id);
  const existentes = new Set((exEdu ?? []).map((e: any) => `${norm(e.titulo)}|${norm(e.institucion)}`));

  const nuevos = titulos
    .filter((t) => t?.titulo && !existentes.has(`${norm(t.titulo)}|${norm(t.institucion)}`))
    .map((t) => ({
      profile_id: user.id,
      titulo: String(t.titulo),
      institucion: String(t.institucion || "—"),
      nivel: /magi|master|maestr|doctor|phd|especial/i.test(t.titulo) ? "Cuarto nivel" : "Tercer nivel",
      fecha_fin: /^\d{4}-\d{2}-\d{2}$/.test(t.fecha_registro || "") ? t.fecha_registro : null,
      area_nombre: t.area || null,
    }));

  if (nuevos.length) {
    const { error } = await supabase.from("educacion").insert(nuevos);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Registro espejo (caché) con service role
  if (prof?.cedula) {
    try {
      const admin = createAdminClient();
      const { data: exTit } = await admin.from("titulos_senescyt").select("titulo, institucion").eq("cedula", prof.cedula);
      const ya = new Set((exTit ?? []).map((t: any) => `${norm(t.titulo)}|${norm(t.institucion)}`));
      const espejo = titulos
        .filter((t) => t?.titulo && !ya.has(`${norm(t.titulo)}|${norm(t.institucion)}`))
        .map((t) => ({
          cedula: prof.cedula,
          titulo: String(t.titulo),
          institucion: String(t.institucion || ""),
          tipo: /magi|master|maestr|doctor|phd|especial/i.test(t.titulo) ? "Cuarto nivel" : "Tercer nivel",
          fecha_registro: /^\d{4}-\d{2}-\d{2}$/.test(t.fecha_registro || "") ? t.fecha_registro : null,
          numero_registro: t.numero_registro || null,
          area_nombre: t.area || null,
          fuente: "senescyt_live",
        }));
      if (espejo.length) await admin.from("titulos_senescyt").insert(espejo);
    } catch {}
  }

  return NextResponse.json({ importados: nuevos.length, cursos_importados, nombre_actualizado });
}
