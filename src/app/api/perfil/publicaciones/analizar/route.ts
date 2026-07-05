import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analizarDocumentoIA } from "@/lib/documentos-ia";
import {
  DOCUMENTOS_TIPOS_PERMITIDOS,
  DOCUMENTOS_EXTENSIONES_PERMITIDAS,
  DOCUMENTOS_TAMANO_MAX,
  DOCUMENTOS_TIPO_ERROR,
} from "@/lib/documentos";
import { guardarDocumentoPersonal } from "@/lib/documentos-storage";

export const runtime = "nodejs";
export const maxDuration = 120;

// Arrastra-y-suelta de artículos científicos, ponencias, libros o capítulos
// sobre la sección "Publicaciones" del perfil: analiza el documento con IA
// y, si reconoce una publicación, crea directamente la fila en
// publicaciones_persona. Además intenta archivar el documento en el
// repositorio personal (best-effort, no bloquea la respuesta si falla).
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
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Selecciona un archivo." }, { status: 400 });
  }
  const tipoValido =
    DOCUMENTOS_TIPOS_PERMITIDOS.includes(archivo.type) ||
    DOCUMENTOS_EXTENSIONES_PERMITIDAS.test(archivo.name);
  if (!tipoValido) {
    return NextResponse.json({ error: DOCUMENTOS_TIPO_ERROR }, { status: 400 });
  }
  if (archivo.size > DOCUMENTOS_TAMANO_MAX) {
    return NextResponse.json({ error: "El archivo supera el máximo de 15MB." }, { status: 400 });
  }

  const analisis = await analizarDocumentoIA(archivo);
  if (!analisis.publicacion) {
    return NextResponse.json(
      {
        error:
          "No pudimos reconocer una publicación (artículo, ponencia o libro) en este documento. Agrégala manualmente con el botón «Agregar».",
      },
      { status: 422 }
    );
  }

  const { data: fila, error } = await supabase
    .from("publicaciones_persona")
    .insert({
      profile_id: user.id,
      titulo: analisis.publicacion.titulo,
      revista: analisis.publicacion.revista,
      tipo: analisis.publicacion.tipo,
      fecha: analisis.publicacion.fecha,
      coautores: analisis.publicacion.coautores,
      enlace: analisis.publicacion.enlace,
      fuente: "ia_documento",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Archivado en el repositorio de documentos: best-effort, no bloquea la
  // creación de la publicación si falla.
  try {
    await guardarDocumentoPersonal(supabase, {
      userId: user.id,
      archivo,
      categoria: analisis.categoria,
      fechaDocumento: analisis.fecha_documento,
    });
  } catch {
    // No hacemos nada: la publicación ya se creó y es lo esencial de este endpoint.
  }

  return NextResponse.json({ ok: true, fila });
}
