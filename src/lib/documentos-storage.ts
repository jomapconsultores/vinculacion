// Lógica compartida para archivar un documento en el bucket de Storage +
// crear su fila en `documentos_personales`, usada por los tres endpoints de
// subida (repositorio general, análisis de experiencia y análisis de
// cursos) para que no diverjan silenciosamente al modificarse por separado.
import { randomUUID } from "crypto";
import type { createClient } from "@/lib/supabase/server";
import { DOCUMENTOS_BUCKET, extensionSegura } from "@/lib/documentos";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function guardarDocumentoPersonal(
  supabase: SupabaseServerClient,
  opts: {
    userId: string;
    archivo: File;
    categoria: string;
    fechaDocumento: string | null;
    select?: string;
  }
): Promise<{ data: any; error: { message: string } | null }> {
  const ext = extensionSegura(opts.archivo.name);
  const path = `${opts.userId}/${randomUUID()}.${ext}`;

  const buf = Buffer.from(await opts.archivo.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(DOCUMENTOS_BUCKET).upload(path, buf, {
    contentType: opts.archivo.type,
    upsert: false,
  });
  if (upErr) return { data: null, error: upErr };

  const insert = supabase.from("documentos_personales").insert({
    profile_id: opts.userId,
    categoria: opts.categoria,
    nombre_original: opts.archivo.name,
    storage_path: path,
    mime_type: opts.archivo.type,
    tamano_bytes: opts.archivo.size,
    fecha_documento: opts.fechaDocumento,
    subido_por: opts.userId,
  });

  const { data, error } = opts.select
    ? await insert.select(opts.select).single()
    : await insert;

  if (error) {
    // La fila no se pudo crear: no dejamos el archivo huérfano en el bucket.
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([path]);
    return { data: null, error };
  }
  return { data, error: null };
}
