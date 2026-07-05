import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTOS_CATEGORIAS,
  DOCUMENTOS_TIPOS_PERMITIDOS,
  DOCUMENTOS_EXTENSIONES_PERMITIDAS,
  DOCUMENTOS_TAMANO_MAX,
  DOCUMENTOS_TIPO_ERROR,
} from "@/lib/documentos";
import { analizarDocumentoIA } from "@/lib/documentos-ia";
import { guardarDocumentoPersonal } from "@/lib/documentos-storage";

export const runtime = "nodejs";
export const maxDuration = 120;

// Repositorio de documentos del propio usuario. RLS garantiza que solo el
// dueño y el staff (admin/autoridad) puedan leer las filas de la tabla y
// los objetos del bucket; aquí solo validamos el archivo antes de subirlo.
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data, error } = await supabase
    .from("documentos_personales")
    .select("id, categoria, nombre_original, mime_type, tamano_bytes, fecha_documento, created_at")
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
  const categoriaManual = String(form.get("categoria_manual") || "0") === "1";
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }
  if (!DOCUMENTOS_CATEGORIAS.some((c) => c.value === categoria)) {
    return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });
  }
  if (
    !DOCUMENTOS_TIPOS_PERMITIDOS.includes(archivo.type) &&
    !DOCUMENTOS_EXTENSIONES_PERMITIDAS.test(archivo.name)
  ) {
    return NextResponse.json({ error: DOCUMENTOS_TIPO_ERROR }, { status: 400 });
  }
  if (archivo.size > DOCUMENTOS_TAMANO_MAX) {
    return NextResponse.json({ error: "El archivo supera el máximo de 15MB." }, { status: 400 });
  }

  const analisis = await analizarDocumentoIA(archivo);
  const categoriaFinal = categoriaManual ? categoria : analisis.categoria;

  const { data, error } = await guardarDocumentoPersonal(supabase, {
    userId: user.id,
    archivo,
    categoria: categoriaFinal,
    fechaDocumento: analisis.fecha_documento,
    select: "id, categoria, nombre_original, mime_type, tamano_bytes, fecha_documento, created_at",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, documento: data, clasificado_por_ia: !categoriaManual });
}
