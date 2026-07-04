import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTOS_BUCKET,
  DOCUMENTOS_CATEGORIAS,
  DOCUMENTOS_TIPOS_PERMITIDOS,
  DOCUMENTOS_TAMANO_MAX,
} from "@/lib/documentos";

export const runtime = "nodejs";

// Repositorio de documentos del propio usuario. RLS garantiza que solo el
// dueño y el staff (admin/autoridad) puedan leer las filas de la tabla y
// los objetos del bucket; aquí solo validamos el archivo antes de subirlo.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("documentos_personales")
    .select("id, categoria, nombre_original, mime_type, tamano_bytes, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documentos: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  }

  const archivo = form.get("archivo");
  const categoria = String(form.get("categoria") || "otro");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }
  if (!DOCUMENTOS_CATEGORIAS.some((c) => c.value === categoria)) {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }
  if (!DOCUMENTOS_TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json({ error: "Solo se aceptan PDF, JPG, PNG o WEBP." }, { status: 400 });
  }
  if (archivo.size > DOCUMENTOS_TAMANO_MAX) {
    return NextResponse.json({ error: "El archivo supera el máximo de 15MB." }, { status: 400 });
  }

  const ext = archivo.name.includes(".") ? archivo.name.split(".").pop() : "bin";
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const buf = Buffer.from(await archivo.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(path, buf, {
    contentType: archivo.type,
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data, error } = await supabase
    .from("documentos_personales")
    .insert({
      profile_id: user.id,
      categoria,
      nombre_original: archivo.name,
      storage_path: path,
      mime_type: archivo.type,
      tamano_bytes: archivo.size,
      subido_por: user.id,
    })
    .select("id, categoria, nombre_original, mime_type, tamano_bytes, created_at")
    .single();

  if (error) {
    // La fila no se pudo crear: no dejamos el archivo huérfano en el bucket.
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([path]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, documento: data });
}
