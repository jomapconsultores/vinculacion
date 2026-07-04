import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DOCUMENTOS_BUCKET } from "@/lib/documentos";

export const runtime = "nodejs";

// Enlace firmado de descarga. Sirve tanto para el dueño como para el staff
// (admin/autoridad): la fila solo es visible para ellos vía RLS, y el
// storage aplica la misma regla sobre el objeto real.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: doc, error } = await supabase
    .from("documentos_personales")
    .select("storage_path, nombre_original")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { data: firmado, error: urlErr } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(doc.storage_path, 60, { download: doc.nombre_original });
  if (urlErr || !firmado) {
    return NextResponse.json({ error: "No se pudo generar el enlace de descarga." }, { status: 500 });
  }

  return NextResponse.json({ url: firmado.signedUrl });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: doc, error } = await supabase
    .from("documentos_personales")
    .select("storage_path")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { error: delErr } = await supabase.from("documentos_personales").delete().eq("id", params.id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  await supabase.storage.from(DOCUMENTOS_BUCKET).remove([doc.storage_path]);
  return NextResponse.json({ ok: true });
}
