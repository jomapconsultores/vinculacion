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

// Arrastra un certificado/contrato sobre la sección "Experiencia laboral" del
// perfil: la IA extrae los datos (empresa, cargo, fechas, etc.) y se crea la
// fila de experiencia_laboral directamente, sin que el usuario tenga que
// tipear nada. Además, intentamos guardar el mismo archivo en el repositorio
// de documentos (best-effort: si falla, no afecta el resultado principal).
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
    DOCUMENTOS_TIPOS_PERMITIDOS.includes(archivo.type) || DOCUMENTOS_EXTENSIONES_PERMITIDAS.test(archivo.name);
  if (!tipoValido) {
    return NextResponse.json({ error: DOCUMENTOS_TIPO_ERROR }, { status: 400 });
  }
  if (archivo.size > DOCUMENTOS_TAMANO_MAX) {
    return NextResponse.json({ error: "El archivo supera el máximo de 15MB." }, { status: 400 });
  }

  const analisis = await analizarDocumentoIA(archivo);
  if (!analisis.experiencia) {
    return NextResponse.json(
      {
        error:
          "No pudimos reconocer datos de experiencia laboral en este documento. Agrégala manualmente con el botón «Agregar».",
      },
      { status: 422 }
    );
  }

  const { empresa, cargo, ciudad, fecha_inicio, fecha_fin, actual, descripcion } = analisis.experiencia;
  const { data, error } = await supabase
    .from("experiencia_laboral")
    .insert({
      profile_id: user.id,
      empresa,
      cargo,
      ciudad,
      fecha_inicio,
      fecha_fin,
      actual,
      descripcion,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort: guardar el archivo en el repositorio de documentos también.
  try {
    await guardarDocumentoPersonal(supabase, {
      userId: user.id,
      archivo,
      categoria: analisis.categoria,
      fechaDocumento: analisis.fecha_documento,
    });
  } catch {
    // Ignorado: el registro de experiencia ya se creó, que es lo importante.
  }

  return NextResponse.json({ ok: true, fila: data });
}
