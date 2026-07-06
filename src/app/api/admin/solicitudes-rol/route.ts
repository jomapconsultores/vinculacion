import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Aprueba o rechaza una solicitud pendiente de rol 'autoridad'/'admin'
// (0033_solicitudes_rol.sql). Al aprobar: se otorga el rol en roles_asignados
// Y se activa de inmediato como rol actual de la persona (protect_profile_
// privileges(), 0008/0031, deja pasar esta escritura porque quien la hace ya
// es staff) — el autoservicio de cambiar-rol nunca permite subir a
// autoridad/admin por su cuenta, así que sin esto la solicitud quedaría
// otorgada pero inerte. Hasta que se aprueba, la persona no tiene acceso
// extra alguno por haber sido "propuesta".
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (me?.rol !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede resolver solicitudes de rol." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const solicitudId = body?.solicitudId;
  const aprobar = !!body?.aprobar;
  if (!solicitudId) return NextResponse.json({ error: "Falta solicitudId" }, { status: 400 });

  const { data: solicitud } = await supabase
    .from("solicitudes_rol")
    .select("id, profile_id, rol, estado")
    .eq("id", solicitudId)
    .maybeSingle();

  if (!solicitud) return NextResponse.json({ error: "Solicitud no encontrada." }, { status: 404 });
  if (solicitud.estado !== "pendiente") {
    return NextResponse.json({ error: "Esta solicitud ya fue resuelta." }, { status: 400 });
  }

  if (aprobar) {
    const { error: errorRol } = await supabase.from("roles_asignados").upsert(
      {
        profile_id: solicitud.profile_id,
        rol: solicitud.rol,
        empresa_id: null,
        otorgado_por: user.id,
      },
      { onConflict: "profile_id,rol" }
    );
    if (errorRol) return NextResponse.json({ error: errorRol.message }, { status: 500 });

    const cambios: Record<string, unknown> = { rol: solicitud.rol };
    if (solicitud.rol === "autoridad") cambios.aprobado = true;
    const { error: errorActivar } = await supabase.from("profiles").update(cambios).eq("id", solicitud.profile_id);
    if (errorActivar) return NextResponse.json({ error: errorActivar.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("solicitudes_rol")
    .update({
      estado: aprobar ? "aprobado" : "rechazado",
      resuelto_por: user.id,
      resuelto_en: new Date().toISOString(),
    })
    .eq("id", solicitudId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
