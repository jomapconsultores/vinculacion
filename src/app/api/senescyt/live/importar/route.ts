import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { partirNombre } from "@/lib/senescyt-live";
import { claveTituloInstitucion, nivelPorTitulo } from "@/lib/senescyt";

// Guarda los títulos consultados en vivo (SENESCYT) en la educación del usuario
// y en el registro espejo, sin duplicar.
//
// Los títulos NO vienen del body del cliente (podían falsificarse): se leen de
// la caché que /api/senescyt/live escribió server-side justo tras un scrape con
// captcha exitoso, y se descarta apenas se usa una vez.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: prof }, { data: cache }] = await Promise.all([
    supabase.from("profiles").select("cedula, nombres, apellidos, titulo").eq("id", user.id).maybeSingle(),
    admin.from("senescyt_live_cache").select("nombre, titulos, cursos, creado").eq("profile_id", user.id).maybeSingle(),
  ]);

  const vigente = cache && Date.now() - new Date(cache.creado).getTime() < 10 * 60 * 1000;
  if (!vigente) {
    return NextResponse.json(
      { error: "No hay una consulta reciente de SENESCYT para importar. Vuelve a consultar." },
      { status: 409 }
    );
  }
  await admin.from("senescyt_live_cache").delete().eq("profile_id", user.id);

  const titulos: any[] = Array.isArray(cache!.titulos) ? cache!.titulos : [];
  const cursos: any[] = Array.isArray(cache!.cursos) ? cache!.cursos : [];
  const nombreSenescyt: string = String(cache!.nombre || "").trim();

  // Colocar el nombre en el perfil si aún no lo tiene (viene de SENESCYT)
  let nombre_actualizado = false;
  if (nombreSenescyt && !prof?.nombres && !prof?.apellidos) {
    const { nombres, apellidos } = partirNombre(nombreSenescyt);
    const upd: Record<string, any> = { nombres, apellidos };
    if (!prof?.titulo && titulos[0]?.titulo) upd.titulo = String(titulos[0].titulo);
    const { error } = await supabase.from("profiles").update(upd).eq("id", user.id);
    if (!error) nombre_actualizado = true;
  }

  // Las dos lecturas de "ya existentes" no dependen entre sí: se piden en paralelo.
  const [{ data: exCur }, { data: exEdu }] = await Promise.all([
    cursos.length > 0
      ? supabase.from("cursos_persona").select("nombre, institucion").eq("profile_id", user.id)
      : Promise.resolve({ data: [] as { nombre: string; institucion: string }[] }),
    titulos.length > 0
      ? supabase.from("educacion").select("titulo, institucion").eq("profile_id", user.id)
      : Promise.resolve({ data: [] as { titulo: string; institucion: string }[] }),
  ]);

  // CURSOS -> tabla cursos_persona (apartado separado de títulos)
  let cursos_importados = 0;
  if (cursos.length > 0) {
    const yaCur = new Set((exCur ?? []).map((c: any) => claveTituloInstitucion(c.nombre, c.institucion)));
    const nuevosCur = cursos
      .filter((c) => c?.titulo && !yaCur.has(claveTituloInstitucion(c.titulo, c.institucion)))
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

  const existentes = new Set((exEdu ?? []).map((e: any) => claveTituloInstitucion(e.titulo, e.institucion)));

  const nuevos = titulos
    .filter((t) => t?.titulo && !existentes.has(claveTituloInstitucion(t.titulo, t.institucion)))
    .map((t) => ({
      profile_id: user.id,
      titulo: String(t.titulo),
      institucion: String(t.institucion || "—"),
      nivel: nivelPorTitulo(t.titulo),
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
      const { data: exTit } = await admin.from("titulos_senescyt").select("titulo, institucion").eq("cedula", prof.cedula);
      const ya = new Set((exTit ?? []).map((t: any) => claveTituloInstitucion(t.titulo, t.institucion)));
      const espejo = titulos
        .filter((t) => t?.titulo && !ya.has(claveTituloInstitucion(t.titulo, t.institucion)))
        .map((t) => ({
          cedula: prof.cedula,
          titulo: String(t.titulo),
          institucion: String(t.institucion || ""),
          tipo: nivelPorTitulo(t.titulo),
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
