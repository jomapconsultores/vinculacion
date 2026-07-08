import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ROLES_BASE = ["estudiante", "profesional", "empleador"] as const;
// 'autoridad'/'admin' solo se suman a lo autoservicio-permitido si el propio
// perfil tiene autoservicio_staff=true (0034) — excepción puntual para
// cuentas de demostración, no un cambio general de la restricción.
const ROLES_STAFF = ["autoridad", "admin"] as const;
type RolPermitido = (typeof ROLES_BASE)[number] | (typeof ROLES_STAFF)[number];

function esRolPermitido(rol: unknown, permiteStaff: boolean): rol is RolPermitido {
  if (typeof rol !== "string") return false;
  if ((ROLES_BASE as readonly string[]).includes(rol)) return true;
  return permiteStaff && (ROLES_STAFF as readonly string[]).includes(rol);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Cualquier persona puede cambiar su rol activo a CUALQUIER rol que ya tenga
  // otorgado en roles_asignados —sea de staff o no—. Los roles de staff
  // (autoridad/admin) solo llegan a roles_asignados con aprobación del
  // administrador (solicitudes_rol, 0033), así que la pertenencia a esa tabla
  // —verificada más abajo— es la autoridad real. Aquí solo se valida que el rol
  // sea uno conocido. Coherente con el trigger protect_profile_privileges (0035).
  const { rol } = await req.json().catch(() => ({}));
  if (!esRolPermitido(rol, true)) {
    return NextResponse.json({ error: "Rol inválido." }, { status: 400 });
  }

  const { data: asignado } = await supabase
    .from("roles_asignados")
    .select("id")
    .eq("profile_id", user.id)
    .eq("rol", rol)
    .maybeSingle();

  if (!asignado) {
    return NextResponse.json({ error: "No tienes ese rol asignado." }, { status: 403 });
  }

  const { error } = await supabase.from("profiles").update({ rol }).eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rol });
}
