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

  const { data: yo } = await supabase
    .from("profiles")
    .select("rol, autoservicio_staff")
    .eq("id", user.id)
    .maybeSingle();

  // Coherente con el trigger de BD protect_profile_privileges (0034): quien ya
  // es staff (admin/autoridad) está exento de la protección anti-escalamiento y
  // puede cambiar libremente entre sus roles; un usuario no-staff solo puede
  // autoservicio-cambiarse a un rol de staff si tiene la excepción
  // autoservicio_staff. En ambos casos, más abajo se exige que el rol destino
  // esté realmente en roles_asignados. Antes el endpoint exigía
  // autoservicio_staff incluso a usuarios staff, devolviendo "Rol inválido"
  // donde la BD sí habría permitido el cambio.
  const esStaffActual = yo?.rol === "autoridad" || yo?.rol === "admin";
  const permiteStaff = esStaffActual || !!yo?.autoservicio_staff;

  const { rol } = await req.json().catch(() => ({}));
  if (!esRolPermitido(rol, permiteStaff)) {
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
