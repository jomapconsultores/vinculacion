import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const profile = await requireProfile();
  if (profile.rol !== "empleador" || !profile.empresa_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.nombre?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  // RLS solo permite a staff escribir empresas; usamos admin acotado a la
  // empresa del propio empleador (validada arriba con profile.empresa_id).
  const admin = createAdminClient();
  const { error } = await admin
    .from("empresas")
    .update({
      nombre: String(body.nombre).trim(),
      ruc: body.ruc?.trim() || null,
      sector: body.sector?.trim() || null,
      descripcion: body.descripcion?.trim() || null,
    })
    .eq("id", profile.empresa_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
