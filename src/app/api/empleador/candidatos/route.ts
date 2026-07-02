import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

const ESTADOS_VALIDOS = [
  "borrador",
  "enviada",
  "en_revision",
  "preseleccionado",
  "rechazado",
  "contratado",
];

export async function POST(req: Request) {
  const profile = await requireProfile();
  if (profile.rol !== "empleador" || !profile.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const postulacionId = Number(body?.postulacionId);
  if (!Number.isFinite(postulacionId)) {
    return NextResponse.json({ error: "postulacionId inválido" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validar propiedad: la postulación pertenece a un empleo de la empresa del empleador.
  const { data: post } = await admin
    .from("postulaciones")
    .select("id, empleos(empresa_id)")
    .eq("id", postulacionId)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Postulación no encontrada" }, { status: 404 });
  }
  if ((post as any).empleos?.empresa_id !== profile.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Cambio de estado
  if (body.estado !== undefined) {
    if (!ESTADOS_VALIDOS.includes(body.estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    const { error } = await admin
      .from("postulaciones")
      .update({ estado: body.estado })
      .eq("id", postulacionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Retroalimentación
  if (body.comentario !== undefined || body.calificacion !== undefined) {
    const calificacion = Math.max(1, Math.min(5, Number(body.calificacion) || 5));
    const { error } = await admin.from("retroalimentacion_empresa").insert({
      postulacion_id: postulacionId,
      calificacion,
      comentario: body.comentario?.trim() || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
