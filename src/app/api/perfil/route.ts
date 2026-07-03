import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// API same-origin del perfil: el navegador solo habla con nuestro dominio;
// el servidor escribe en Supabase con la sesión del usuario (RLS: solo lo suyo).
// Soluciona el guardado cuando la red del usuario bloquea *.supabase.co.

const TABLAS: Record<string, string[]> = {
  experiencia_laboral: ["empresa", "cargo", "ciudad", "fecha_inicio", "fecha_fin", "actual", "descripcion"],
  educacion: ["institucion", "titulo", "nivel", "fecha_inicio", "fecha_fin", "area_nombre", "area_codigo"],
  habilidades: ["nombre", "nivel"],
};

function limpiar(tabla: string, datos: any): Record<string, any> {
  const cols = TABLAS[tabla] || [];
  const out: Record<string, any> = {};
  for (const c of cols) if (c in (datos || {})) out[c] = datos[c] === "" ? null : datos[c];
  return out;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { accion, tabla, id, datos } = body || {};

  // Actualizar datos de contacto / resumen del perfil
  if (accion === "datos") {
    const { data: actual } = await supabase
      .from("profiles")
      .select("origen_padron")
      .eq("id", user.id)
      .maybeSingle();

    const permitido = ["telefono", "ciudad", "linkedin", "resumen_profesional"];
    // El nombre solo es editable cuando NO proviene del padrón institucional (identidad verificada).
    if (!actual?.origen_padron) permitido.push("nombres", "apellidos");

    const upd: Record<string, any> = {};
    for (const k of permitido) if (k in (datos || {})) upd[k] = datos[k];
    const { error } = await supabase.from("profiles").update(upd).eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (!tabla || !TABLAS[tabla]) return NextResponse.json({ error: "Tabla no permitida" }, { status: 400 });

  if (accion === "crear") {
    const fila = { ...limpiar(tabla, datos), profile_id: user.id };
    const { data, error } = await supabase.from(tabla).insert(fila).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, fila: data });
  }

  if (accion === "actualizar") {
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    const { error } = await supabase.from(tabla).update(limpiar(tabla, datos)).eq("id", id).eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (accion === "eliminar") {
    if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
    const { error } = await supabase.from(tabla).delete().eq("id", id).eq("profile_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
}
