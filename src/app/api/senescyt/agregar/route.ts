import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { AREAS_UNESCO } from "@/lib/cv-types";
import { claveTituloInstitucion } from "@/lib/senescyt";

// El usuario declara sus títulos dentro del sistema (sin salir a SENESCYT):
// se guardan en el registro espejo y en su sección de educación.
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: prof } = await supabase.from("profiles").select("cedula").eq("id", user.id).maybeSingle();
  if (!prof?.cedula) return NextResponse.json({ error: "Tu perfil no tiene cédula registrada." }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const titulo = String(body?.titulo || "").trim();
  const institucion = String(body?.institucion || "").trim();
  const tipo = body?.tipo === "Cuarto nivel" ? "Cuarto nivel" : "Tercer nivel";
  const area = AREAS_UNESCO.find((a) => a.codigo === body?.area_codigo);
  const numero_registro = String(body?.numero_registro || "").trim() || null;
  const fecha_registro = /^\d{4}-\d{2}-\d{2}$/.test(body?.fecha_registro || "") ? body.fecha_registro : null;

  if (titulo.length < 5) return NextResponse.json({ error: "Escribe el nombre completo del título" }, { status: 400 });
  if (!institucion) return NextResponse.json({ error: "Indica la institución que otorgó el título" }, { status: 400 });
  if (!area) return NextResponse.json({ error: "Selecciona el área de conocimiento" }, { status: 400 });

  const admin = createAdminClient();

  // Registro espejo (sin duplicar)
  const { data: exTit } = await admin
    .from("titulos_senescyt")
    .select("titulo, institucion")
    .eq("cedula", prof.cedula);
  const claveNueva = claveTituloInstitucion(titulo, institucion);
  const yaEnRegistro = (exTit ?? []).some(
    (t: any) => claveTituloInstitucion(t.titulo, t.institucion) === claveNueva
  );
  if (!yaEnRegistro) {
    const { error: e1 } = await admin.from("titulos_senescyt").insert({
      cedula: prof.cedula,
      titulo,
      institucion,
      tipo,
      fecha_registro,
      numero_registro,
      area_codigo: area.codigo,
      area_nombre: area.nombre,
      fuente: "declarado_usuario",
    });
    if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });
  }

  // Educación del perfil (sin duplicar)
  const { data: exEdu } = await supabase.from("educacion").select("titulo, institucion").eq("profile_id", user.id);
  const yaEnEducacion = (exEdu ?? []).some(
    (e: any) => claveTituloInstitucion(e.titulo, e.institucion) === claveNueva
  );
  if (!yaEnEducacion) {
    const { error: e2 } = await supabase.from("educacion").insert({
      profile_id: user.id,
      titulo,
      institucion,
      nivel: tipo,
      fecha_fin: fecha_registro,
      area_codigo: area.codigo,
      area_nombre: area.nombre,
    });
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
