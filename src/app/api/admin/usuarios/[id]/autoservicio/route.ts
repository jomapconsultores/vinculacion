import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Activa/desactiva profiles.autoservicio_staff para una persona. Exclusivo del
// administrador. Con este flag, la persona puede autoservicio-cambiar su rol
// activo a 'autoridad'/'admin' cuando ya tiene ese rol otorgado en
// roles_asignados (ver 0034 y el trigger protect_profile_privileges). Se usa el
// cliente admin (service role) porque el trigger fija autoservicio_staff al
// valor previo para cualquier sesión no-staff; con auth.uid() nulo (service
// role) la protección se omite y el cambio se aplica.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.rol !== "admin") {
    return NextResponse.json(
      { error: "Solo el administrador puede cambiar esta opción." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const activo = !!body?.activo;

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ autoservicio_staff: activo })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, autoservicio_staff: activo });
}
