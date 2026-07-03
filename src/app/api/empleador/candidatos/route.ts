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
    const fila: { postulacion_id: number; comentario: string | null; calificacion?: number } = {
      postulacion_id: postulacionId,
      comentario: body.comentario?.trim() || null,
    };
    if (body.calificacion !== undefined && body.calificacion !== null && body.calificacion !== "") {
      const n = Number(body.calificacion);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        return NextResponse.json({ error: "La calificación debe ser un entero de 1 a 5" }, { status: 400 });
      }
      fila.calificacion = n;
    }
    const { error } = await admin.from("retroalimentacion_empresa").insert(fila);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
