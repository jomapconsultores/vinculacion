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

// Arrastra-y-suelta de certificados de curso/seminario/taller/congreso sobre
// la sección "Cursos y capacitaciones" del perfil: analiza el documento con
// IA y, si reconoce un curso, crea directamente la fila en cursos_persona.
// Además intenta archivar el documento en el repositorio personal, sin que
// un fallo ahí tumbe la respuesta (el curso ya quedó creado).
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
  if (!analisis.curso) {
    return NextResponse.json(
      {
        error:
          "No pudimos reconocer datos de un curso o capacitación en este documento. Agrégalo manualmente con el botón «Agregar».",
      },
      { status: 422 }
    );
  }

  const { data: fila, error } = await supabase
    .from("cursos_persona")
    .insert({
      profile_id: user.id,
      nombre: analisis.curso.nombre,
      institucion: analisis.curso.institucion,
      fecha: analisis.curso.fecha,
      area_nombre: analisis.curso.area_nombre,
      fuente: "ia_documento",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Archivado en el repositorio de documentos: best-effort, no bloquea la
  // creación del curso si falla.
  try {
    await guardarDocumentoPersonal(supabase, {
      userId: user.id,
      archivo,
      categoria: analisis.categoria,
      fechaDocumento: analisis.fecha_documento,
    });
  } catch {
    // No hacemos nada: el curso ya se creó y es lo esencial de este endpoint.
  }

  return NextResponse.json({ ok: true, fila });
}
